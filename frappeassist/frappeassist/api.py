import frappe
from frappe.utils import now
from frappeassist.frappeassist.utils.ai import get_ai_response

@frappe.whitelist()
def create_session():

    session = frappe.new_doc("Chat Session")
    session.title = "New Chat"
    session.user = frappe.session.user
    session.status = "Active"
    session.started_on = now()

    session.insert(ignore_permissions=True)

    return {
        "session_name": session.name
    }

@frappe.whitelist()
def ask_ai(message, session_name):

    session = frappe.get_doc(
        "Chat Session",
        session_name
    )

    session.append(
        "conversation_history",
        {
            "role": "User",
            "message": message,
            "timestamp": now()
        }
    )

    ai_reply = get_ai_response(message)

    session.append(
        "conversation_history",
        {
            "role": "Assistant",
            "message": ai_reply,
            "timestamp": now()
        }
    )

    session.last_message_on = now()

    session.save()

    return {
        "reply": ai_reply
    }