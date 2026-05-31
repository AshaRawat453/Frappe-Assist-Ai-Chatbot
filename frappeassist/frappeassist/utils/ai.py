import frappe

from google import genai
from openai import OpenAI
from anthropic import Anthropic


def get_ai_response(message):
    settings = frappe.get_single("AI Settings")

    if not settings.enabled:
        frappe.throw("AI Assistant is disabled")

    provider = settings.provider

    if provider == "Google Gemini":
        return get_gemini_response(message, settings)

    elif provider == "OpenAI (GPT)":
        return get_openai_response(message, settings)

    elif provider == "Anthropic (Claude)":
        return get_claude_response(message, settings)

    frappe.throw("Unsupported AI Provider")


def get_gemini_response(message, settings):
    client = genai.Client(
        api_key=settings.get_password("api_key")
    )

    response = client.models.generate_content(
        model=settings.model or "gemini-2.5-flash",
        contents=f"{settings.system_prompt or ''}\n\n{message}"
    )

    return response.text


def get_openai_response(message, settings):
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


def get_claude_response(message, settings):
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