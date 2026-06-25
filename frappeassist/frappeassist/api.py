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
    session.last_message_on = now()

    session.insert(ignore_permissions=True)

    return {
        "session_name": session.name
    }


@frappe.whitelist()
def get_sessions():

    return frappe.get_all(
        "Chat Session",
        filters={
            "user": frappe.session.user
        },
        fields=[
            "name",
            "title",
            "modified",
            "last_message_on"
        ],
        order_by="modified desc"
    )


@frappe.whitelist()
def get_chat_history(session_name):

    doc = frappe.get_doc(
        "Chat Session",
        session_name
    )

    return doc.conversation_history


@frappe.whitelist()
def ask_ai(message, session_name):

    session = frappe.get_doc(
        "Chat Session",
        session_name
    )

    # First message becomes title
    if not session.title or session.title == "New Chat":
        session.title = message[:50]

    # Save user message
    session.append("conversation_history", {
        "role": "User",
        "message": message,
        "timestamp": now()
    })

    session.last_message_on = now()

    session.save(ignore_permissions=True)
    frappe.db.commit()

    # AI Response
    ai_reply = get_ai_response(message)

    session.reload()

    session.append("conversation_history", {
        "role": "Assistant",
        "message": ai_reply,
        "timestamp": now()
    })

    session.last_message_on = now()

    session.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "reply": ai_reply
    }