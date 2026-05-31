frappe.pages['frappe-assist'].on_page_load = async function(wrapper) {

	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'FrappeAssist',
		single_column: true
	});

	let session_name = null;

	$(page.body).html(`
		<div class="frappe-assist-container">

			<div id="chat-box"
				style="
					height: 500px;
					overflow-y: auto;
					border: 1px solid #d1d8dd;
					border-radius: 8px;
					padding: 15px;
					background: #fafbfc;
					margin-bottom: 15px;
				">
			</div>

			<div style="display:flex; gap:10px;">
				<input
					type="text"
					id="user-message"
					class="form-control"
					placeholder="Ask anything about Frappe or ERPNext..."
				/>

				<button
					id="send-btn"
					class="btn btn-primary">
					Send
				</button>
			</div>

		</div>
	`);

	// Create Chat Session
	try {

		const session = await frappe.call({
			method: "frappeassist.frappeassist.api.create_session"
		});

		session_name = session.message.session_name;

		$("#chat-box").append(`
			<div style="margin-bottom:10px;">
				<b>FrappeAssist:</b>
				Hello! How can I help you today?
			</div>
		`);

	} catch (err) {

		frappe.msgprint("Unable to create chat session.");
		console.error(err);
	}

	// Send Message Function
	async function send_message() {

		let message = $("#user-message").val().trim();

		if (!message) return;

		// Show user message
		$("#chat-box").append(`
			<div style="text-align:right;margin-bottom:10px;">
				<span style="
					background:#e9f5ff;
					padding:8px 12px;
					border-radius:10px;
					display:inline-block;
				">
					${message}
				</span>
			</div>
		`);

		$("#user-message").val("");

		try {

			const r = await frappe.call({
				method: "frappeassist.frappeassist.api.ask_ai",
				args: {
					message: message,
					session_name: session_name
				}
			});

			$("#chat-box").append(`
				<div style="margin-bottom:15px;">
					<span style="
						background:#f3f3f3;
						padding:8px 12px;
						border-radius:10px;
						display:inline-block;
					">
						${r.message.reply}
					</span>
				</div>
			`);

			let chat_box = document.getElementById("chat-box");
			chat_box.scrollTop = chat_box.scrollHeight;

		} catch (err) {

			console.error(err);

			$("#chat-box").append(`
				<div style="color:red;">
					Failed to get AI response.
				</div>
			`);
		}
	}

	// Send button click
	$(document).on("click", "#send-btn", function() {
		send_message();
	});

	// Enter key support
	$(document).on("keypress", "#user-message", function(e) {
		if (e.which === 13) {
			send_message();
		}
	});
};