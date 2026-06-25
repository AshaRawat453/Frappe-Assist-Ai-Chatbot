import frappe

from google import genai
from google.genai.errors import ClientError, ServerError

from openai import OpenAI
from anthropic import Anthropic


def get_ai_response(message):
    settings = frappe.get_single("AI Settings")

    if not settings.enabled:
        frappe.throw("AI Assistant is disabled")

    provider = settings.provider

    try:
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