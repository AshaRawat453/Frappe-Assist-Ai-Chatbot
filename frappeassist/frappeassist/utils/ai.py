import json
import re

import frappe

from google import genai
from google.genai.errors import ClientError, ServerError

from openai import AuthenticationError, BadRequestError, OpenAI, RateLimitError
from anthropic import Anthropic


DATA_QUERY_SYSTEM_PROMPT = """
You convert user questions into read-only Frappe query JSON.
Return only valid JSON. Do not include markdown.

Use only the DocTypes and fields listed in the schema.
Use frappe filters format.
If the user is not asking for actual system data, return {"action": "chat"}.
If the request cannot be answered with the schema, return {"action": "unsupported"}.

JSON shape:
{
  "action": "query",
  "doctype": "Customer",
  "fields": ["customer_name"],
  "filters": {"disabled": 0},
  "order_by": "modified desc",
  "limit": 20,
  "answer_field": "customer_name"
}

Rules:
- Never generate SQL.
- Never request password, api_key, secret, token, access key, or private key fields.
- For enabled records, prefer disabled = 0 when that field exists.
- For disabled records, prefer disabled = 1 when that field exists.
- Keep limit between 1 and 50.
"""

STANDARD_FIELDS = {
    "name",
    "owner",
    "creation",
    "modified",
    "modified_by",
    "docstatus",
    "idx",
}

BLOCKED_FIELD_TYPES = {
    "Password",
    "Attach",
    "Attach Image",
    "Code",
    "HTML",
    "Table",
    "Table MultiSelect",
}

BLOCKED_FIELD_KEYWORDS = (
    "password",
    "api_key",
    "secret",
    "token",
    "access_key",
    "private_key",
)

DATA_QUERY_WORDS = {
    "actual",
    "available",
    "count",
    "data",
    "fetch",
    "find",
    "get",
    "give",
    "list",
    "name",
    "names",
    "number",
    "records",
    "show",
    "system",
    "total",
    "which",
}

CHAT_ONLY_PHRASES = (
    "how to",
    "what is",
    "why",
    "explain",
    "write",
    "draft",
    "create a message",
    "summarize",
    "help me",
)


def get_ai_response(message):
    settings = frappe.get_single("AI Settings")

    if not settings.enabled:
        frappe.throw("AI Assistant is disabled")

    provider = settings.provider

    try:
        data_reply = get_frappe_data_response(message, settings)
        if data_reply:
            return data_reply

        if provider == "Google Gemini":
            return get_gemini_response(message, settings)

        elif provider == "OpenAI (GPT)":
            return get_openai_response(message, settings)

        elif provider == "Anthropic (Claude)":
            return get_claude_response(message, settings)

        frappe.throw("Unsupported AI Provider")

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "AI Provider Error"
        )
        return "⚠️ AI service is currently unavailable. Please try again later."


def get_frappe_data_response(message, settings):
    if not is_data_query_request(message):
        return None

    schema = get_relevant_schema(message)
    if not schema:
        return None

    query_prompt = (
        f"{DATA_QUERY_SYSTEM_PROMPT}\n\n"
        f"Schema:\n{json.dumps(schema, indent=2)}\n\n"
        f"User question: {message}"
    )

    try:
        query_text = call_ai_text(query_prompt, settings)
        query = parse_json_response(query_text)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "FrappeAssist Query Planner Error"
        )
        return None

    if not query or query.get("action") == "chat":
        return None

    if query.get("action") != "query":
        return "I could not find a matching readable DocType/field for that request."

    try:
        rows = run_frappe_query(query)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "FrappeAssist Data Query Error"
        )
        return "⚠️ I could not safely fetch that data from Frappe."

    return format_query_answer(query, rows)


def is_data_query_request(message):
    normalized_message = message.lower().strip()
    message_words = get_words(message)

    if not message_words & DATA_QUERY_WORDS:
        return False

    if any(phrase in normalized_message for phrase in CHAT_ONLY_PHRASES):
        if not {"system", "data", "records"} & message_words:
            return False

    return True


def get_relevant_schema(message):
    candidates = get_candidate_doctypes(message)
    schema = []

    for doctype in candidates[:8]:
        if not frappe.has_permission(doctype, "read"):
            continue

        meta = frappe.get_meta(doctype)
        fields = sorted(STANDARD_FIELDS | {
            df.fieldname
            for df in meta.fields
            if df.fieldname and is_safe_field(df.fieldname, df.fieldtype)
        })

        schema.append({
            "doctype": doctype,
            "fields": fields[:80],
        })

    return schema


def get_candidate_doctypes(message):
    message_words = get_words(message)
    doctypes = frappe.get_all("DocType", pluck="name")
    scored = []

    for doctype in doctypes:
        doctype_words = get_words(doctype)
        score = len(message_words & doctype_words)

        if doctype.lower() in message.lower():
            score += 3

        singular_matches = {
            word[:-1]
            for word in message_words
            if word.endswith("s") and len(word) > 3
        } & doctype_words

        score += len(singular_matches)

        if score:
            scored.append((score, doctype))

    return [
        doctype
        for _score, doctype in sorted(scored, key=lambda item: (-item[0], item[1]))
    ]


def get_words(text):
    return {
        word
        for word in re.findall(r"[a-z0-9]+", text.lower())
        if len(word) > 2
    }


def is_safe_field(fieldname, fieldtype=None):
    if not re.match(r"^[A-Za-z0-9_]+$", fieldname):
        return False

    if fieldtype in BLOCKED_FIELD_TYPES:
        return False

    return not any(keyword in fieldname.lower() for keyword in BLOCKED_FIELD_KEYWORDS)


def parse_json_response(text):
    if not text:
        return None

    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except ValueError:
        match = re.search(r"\{.*\}", cleaned, re.S)
        if not match:
            return None
        return json.loads(match.group(0))


def run_frappe_query(query):
    doctype = query.get("doctype")
    if not doctype or not frappe.db.exists("DocType", doctype):
        frappe.throw("Invalid DocType")

    if not frappe.has_permission(doctype, "read"):
        frappe.throw("Not permitted")

    meta = frappe.get_meta(doctype)
    allowed_fields = STANDARD_FIELDS | {
        df.fieldname
        for df in meta.fields
        if df.fieldname and is_safe_field(df.fieldname, df.fieldtype)
    }

    fields = query.get("fields") or ["name"]
    fields = [
        field
        for field in fields
        if field in allowed_fields and is_safe_field(field)
    ]

    if not fields:
        fields = ["name"]

    filters = sanitize_filters(query.get("filters") or {}, allowed_fields)
    order_by = sanitize_order_by(query.get("order_by"), allowed_fields)
    limit = max(1, min(int(query.get("limit") or 20), 50))

    return frappe.get_list(
        doctype,
        fields=fields,
        filters=filters,
        order_by=order_by,
        limit_page_length=limit,
    )


def sanitize_filters(filters, allowed_fields):
    clean_filters = {}
    allowed_operators = {
        "=",
        "!=",
        ">",
        "<",
        ">=",
        "<=",
        "like",
        "not like",
        "in",
        "not in",
        "between",
        "is",
    }

    if not isinstance(filters, dict):
        return clean_filters

    for field, value in filters.items():
        if field not in allowed_fields or not is_safe_field(field):
            continue

        if isinstance(value, list):
            if not value:
                continue

            operator = str(value[0]).lower()
            if operator not in allowed_operators:
                continue

            clean_filters[field] = value
        else:
            clean_filters[field] = value

    return clean_filters


def sanitize_order_by(order_by, allowed_fields):
    if not order_by:
        return "modified desc"

    parts = str(order_by).split()
    field = parts[0]
    direction = parts[1].lower() if len(parts) > 1 else "asc"

    if field not in allowed_fields or direction not in {"asc", "desc"}:
        return "modified desc"

    return f"{field} {direction}"


def format_query_answer(query, rows):
    doctype = query.get("doctype")
    answer_field = query.get("answer_field")

    if not rows:
        return f"No {doctype} records found."

    if answer_field and all(answer_field in row for row in rows):
        values = [str(row.get(answer_field)) for row in rows if row.get(answer_field)]
        if values:
            return "\n".join(f"{idx}. {value}" for idx, value in enumerate(values, 1))

    lines = []
    for idx, row in enumerate(rows, 1):
        values = [
            f"{field}: {value}"
            for field, value in row.items()
            if value not in (None, "")
        ]
        lines.append(f"{idx}. " + ", ".join(values))

    return "\n".join(lines)


def call_ai_text(prompt, settings):
    provider = settings.provider

    if provider == "Google Gemini":
        client = genai.Client(
            api_key=settings.get_password("api_key")
        )
        response = client.models.generate_content(
            model=(settings.model or "gemini-2.5-flash").strip(),
            contents=prompt
        )
        return response.text

    if provider == "OpenAI (GPT)":
        client = OpenAI(
            api_key=settings.get_password("api_key")
        )
        response = client.chat.completions.create(
            model=settings.model or "gpt-5.5",
            messages=[
                {
                    "role": "system",
                    "content": "Return only the requested JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response.choices[0].message.content

    if provider == "Anthropic (Claude)":
        client = Anthropic(
            api_key=settings.get_password("api_key")
        )
        response = client.messages.create(
            model=settings.model or "claude-sonnet-4-0",
            max_tokens=1024,
            system="Return only the requested JSON.",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response.content[0].text

    return None


def get_gemini_response(message, settings):
    try:
        client = genai.Client(
            api_key=settings.get_password("api_key")
        )

        response = client.models.generate_content(
            model=(settings.model or "gemini-2.5-flash").strip(),
            contents=f"{settings.system_prompt or ''}\n\n{message}"
        )

        return response.text

    except ClientError as e:
        error_text = str(e)

        if "RESOURCE_EXHAUSTED" in error_text:
            return "⚠️ Gemini quota exceeded. Please check billing or try again later."

        if "API_KEY_INVALID" in error_text:
            return "⚠️ Invalid Gemini API Key."

        return f"⚠️ Gemini Error: {error_text}"

    except ServerError:
        return "⚠️ Gemini service is temporarily busy. Please try again in a few moments."

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Gemini Error"
        )
        return "⚠️ Unable to get response from Gemini."


def get_openai_response(message, settings):
    try:
        client = OpenAI(
            api_key=settings.get_password("api_key")
        )

        response = client.chat.completions.create(
            model=settings.model or "gpt-5.5",
            messages=[
                {
                    "role": "system",
                    "content": settings.system_prompt or ""
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        return response.choices[0].message.content

    except RateLimitError as e:
        error_code = getattr(e, "code", None)

        if error_code == "insufficient_quota" or "insufficient_quota" in str(e):
            return "⚠️ OpenAI quota exceeded. Please check your OpenAI billing, credits, or project limits."

        return "⚠️ OpenAI rate limit reached. Please try again in a few moments."

    except AuthenticationError:
        return "⚠️ Invalid OpenAI API Key. Please check the key saved in AI Settings."

    except BadRequestError as e:
        return f"⚠️ OpenAI request error: {e}"

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "OpenAI Error"
        )
        return "⚠️ Unable to get response from OpenAI."


def get_claude_response(message, settings):
    try:
        client = Anthropic(
            api_key=settings.get_password("api_key")
        )

        response = client.messages.create(
            model=settings.model or "claude-sonnet-4-0",
            max_tokens=2048,
            system=settings.system_prompt or "",
            messages=[
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        return response.content[0].text

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Claude Error"
        )
        return "⚠️ Unable to get response from Claude."
