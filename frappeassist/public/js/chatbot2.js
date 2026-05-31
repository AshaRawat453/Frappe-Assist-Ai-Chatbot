$(document).ready(async function () {
	
	if ($("#frappeassist-fab").length) return;

	let session_name = null;

	try {
		const session = await frappe.call({
			method: "frappeassist.frappeassist.api.create_session"
		});

		session_name = session.message.session_name;
		window.frappeassist_session = session_name;

	} catch (e) {
		console.error("Unable to create session", e);
	}

	$("body").append(`
		<div id="frappeassist-fab">
			🤖
		</div>

		<div id="frappeassist-chat">

			<div id="fa-header">
				<span>FrappeAssist</span>
				<span id="fa-close">✕</span>
			</div>

			<div id="fa-messages">
				<div class="fa-bot-msg">
					Hello! How can I help you today?
				</div>
			</div>

			<div id="fa-input-area">
				<input
					type="text"
					id="fa-input"
					placeholder="Ask anything..."
				/>

				<button id="fa-send">
					Send
				</button>
			</div>

		</div>
	`);

	// Open Chat
	$(document).on("click", "#frappeassist-fab", function () {
		$("#frappeassist-chat").show();
	});

	// Close Chat
	$(document).on("click", "#fa-close", function () {
		$("#frappeassist-chat").hide();
	});

	async function sendMessage() {

		let message = $("#fa-input").val().trim();

		if (!message) return;

		$("#fa-messages").append(`
			<div class="fa-user-msg">
				${message}
			</div>
		`);

		$("#fa-input").val("");

		try {

			const r = await frappe.call({
				method: "frappeassist.frappeassist.api.ask_ai",
				args: {
					message: message,
					session_name: window.frappeassist_session
				}
			});

			$("#fa-messages").append(`
				<div class="fa-bot-msg">
					${r.message.reply}
				</div>
			`);

			let chat = document.getElementById("fa-messages");
			chat.scrollTop = chat.scrollHeight;

		} catch (e) {

			console.error(e);

			$("#fa-messages").append(`
				<div class="fa-bot-msg">
					Something went wrong.
				</div>
			`);
		}
	}

	$(document).on("click", "#fa-send", function () {
		sendMessage();
	});

	$(document).on("keypress", "#fa-input", function (e) {
		if (e.which === 13) {
			sendMessage();
		}
	});

	// CSS Injected Automatically
	$("head").append(`
	<style>

	#frappeassist-fab{
		position:fixed;
		bottom:25px;
		right:25px;
		width:65px;
		height:65px;
		border-radius:50%;
		background:#2490ef;
		color:#fff;
		display:flex;
		align-items:center;
		justify-content:center;
		font-size:30px;
		cursor:pointer;
		z-index:99999;
		box-shadow:0 4px 12px rgba(0,0,0,.25);
	}

	#frappeassist-chat{
		position:fixed;
		right:25px;
		bottom:100px;
		width:380px;
		height:550px;
		background:#fff;
		border-radius:12px;
		box-shadow:0 6px 25px rgba(0,0,0,.15);
		display:none;
		z-index:99999;
		overflow:hidden;
		border:1px solid #ddd;
	}

	#fa-header{
		height:55px;
		background:#2490ef;
		color:white;
		padding:15px;
		display:flex;
		justify-content:space-between;
		align-items:center;
		font-weight:600;
	}

	#fa-close{
		cursor:pointer;
		font-size:18px;
	}

	#fa-messages{
		height:430px;
		overflow-y:auto;
		padding:15px;
		background:#f7f7f7;
	}

	.fa-user-msg{
		background:#2490ef;
		color:white;
		padding:10px 14px;
		border-radius:12px;
		margin-bottom:10px;
		margin-left:50px;
		text-align:right;
	}

	.fa-bot-msg{
		background:white;
		padding:10px 14px;
		border-radius:12px;
		margin-bottom:10px;
		margin-right:50px;
		border:1px solid #ddd;
	}

	#fa-input-area{
		height:65px;
		display:flex;
		gap:10px;
		padding:10px;
		border-top:1px solid #ddd;
	}

	#fa-input{
		flex:1;
		padding:10px;
		border:1px solid #ccc;
		border-radius:8px;
	}

	#fa-send{
		padding:10px 15px;
		border:none;
		background:#2490ef;
		color:white;
		border-radius:8px;
		cursor:pointer;
	}

	</style>
	`);
});