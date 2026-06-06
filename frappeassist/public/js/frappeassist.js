$(document).ready(async function () {

	if ($("#frappeassist-fab").length) return;
	window.frappeassist_session = null;
	
	$("body").append(`
		<div id="frappeassist-fab" title="FrappeAssist AI">
			<div class="fab-ring"></div>
			<div class="fab-ring fab-ring-2"></div>
			<svg class="fab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.9"/>
				<circle cx="4" cy="6" r="1.5" fill="currentColor" opacity="0.6"/>
				<circle cx="20" cy="6" r="1.5" fill="currentColor" opacity="0.6"/>
				<circle cx="4" cy="18" r="1.5" fill="currentColor" opacity="0.6"/>
				<circle cx="20" cy="18" r="1.5" fill="currentColor" opacity="0.6"/>
				<circle cx="12" cy="3" r="1.5" fill="currentColor" opacity="0.6"/>
				<circle cx="12" cy="21" r="1.5" fill="currentColor" opacity="0.6"/>
				<line x1="4" y1="6" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
				<line x1="20" y1="6" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
				<line x1="4" y1="18" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
				<line x1="20" y1="18" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
				<line x1="12" y1="3" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
				<line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
			</svg>
		</div>

		<div id="frappeassist-chat">

			<canvas id="fa-canvas"></canvas>

			<div id="fa-header">
				<div class="fa-header-left">
					<div class="fa-status-dot"></div>
					<div>
						<div class="fa-title">FrappeAssist</div>
						<div class="fa-subtitle">AI · Online</div>
					</div>
				</div>
				<div class="fa-header-actions">
					<button class="fa-icon-btn" id="fa-clear" title="Clear chat">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
						</svg>
					</button>
					<button class="fa-icon-btn" id="fa-close" title="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			</div>

			<div id="fa-messages">
				<div class="fa-msg-wrap fa-bot-wrap">
					<div class="fa-avatar fa-bot-avatar">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="12" cy="12" r="3" fill="currentColor"/>
							<circle cx="5" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="19" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="5" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="19" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
							<line x1="5" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="19" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="5" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="19" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
						</svg>
					</div>
					<div class="fa-bot-msg">
						<span class="fa-msg-text">Hello! I'm your AI assistant. How can I help you today?</span>
						<span class="fa-msg-time">${getTime()}</span>
					</div>
				</div>
			</div>

			<div id="fa-typing-indicator" style="display:none;">
				<div class="fa-msg-wrap fa-bot-wrap">
					<div class="fa-avatar fa-bot-avatar">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="12" cy="12" r="3" fill="currentColor"/>
							<circle cx="5" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="19" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="5" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="19" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
							<line x1="5" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="19" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="5" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="19" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
						</svg>
					</div>
					<div class="fa-bot-msg fa-typing-bubble">
						<span class="fa-dot"></span>
						<span class="fa-dot"></span>
						<span class="fa-dot"></span>
					</div>
				</div>
			</div>

			<div id="fa-input-area">
				<div id="fa-input-wrap">
					<textarea
						id="fa-input"
						placeholder="Ask anything..."
						rows="1"
					></textarea>
					<button id="fa-send">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="22" y1="2" x2="11" y2="13"/>
							<polygon points="22 2 15 22 11 13 2 9 22 2"/>
						</svg>
					</button>
				</div>
			</div>

		</div>
	`);

	// ── Particle canvas ─────────────────────────────────────────────────────────
	const canvas = document.getElementById("fa-canvas");
	const ctx = canvas.getContext("2d");
	let animFrame;
	const particles = [];
	const PARTICLE_COUNT = 28;

	function resizeCanvas() {
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}

	function initParticles() {
		particles.length = 0;
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			particles.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				r: Math.random() * 1.8 + 0.4,
				vx: (Math.random() - 0.5) * 0.25,
				vy: (Math.random() - 0.5) * 0.25,
				opacity: Math.random() * 0.5 + 0.15,
			});
		}
	}

	function drawParticles() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Draw connecting lines
		for (let i = 0; i < particles.length; i++) {
			for (let j = i + 1; j < particles.length; j++) {
				const dx = particles[i].x - particles[j].x;
				const dy = particles[i].y - particles[j].y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < 110) {
					ctx.beginPath();
					ctx.strokeStyle = `rgba(56,189,248,${0.12 * (1 - dist / 110)})`;
					ctx.lineWidth = 0.6;
					ctx.moveTo(particles[i].x, particles[i].y);
					ctx.lineTo(particles[j].x, particles[j].y);
					ctx.stroke();
				}
			}
		}
		// Draw dots
		particles.forEach(p => {
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(56,189,248,${p.opacity})`;
			ctx.fill();

			p.x += p.vx;
			p.y += p.vy;
			if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
			if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
		});

		animFrame = requestAnimationFrame(drawParticles);
	}

	function startCanvas() {
		resizeCanvas();
		initParticles();
		drawParticles();
	}

	function stopCanvas() {
		cancelAnimationFrame(animFrame);
	}

	// ── Helpers ─────────────────────────────────────────────────────────────────
	function getTime() {
		return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function autoResize() {
		const ta = document.getElementById("fa-input");
		ta.style.height = "auto";
		ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
	}

	// ── Open / Close ─────────────────────────────────────────────────────────────
	$(document).on("click", "#frappeassist-fab", function () {
		const chat = $("#frappeassist-chat");
		chat.addClass("fa-open");
		setTimeout(startCanvas, 50);
	});

	$(document).on("click", "#fa-close", function () {
		$("#frappeassist-chat").removeClass("fa-open");
		stopCanvas();
	});

	// ── Clear ────────────────────────────────────────────────────────────────────
	$(document).on("click", "#fa-clear", function () {
		$("#fa-messages").html(`
			<div class="fa-msg-wrap fa-bot-wrap">
				<div class="fa-avatar fa-bot-avatar">
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="12" cy="12" r="3" fill="currentColor"/>
						<circle cx="5" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
						<circle cx="19" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
						<circle cx="5" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
						<circle cx="19" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
						<line x1="5" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
						<line x1="19" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
						<line x1="5" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
						<line x1="19" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
					</svg>
				</div>
				<div class="fa-bot-msg">
					<span class="fa-msg-text">Chat cleared. How can I help you?</span>
					<span class="fa-msg-time">${getTime()}</span>
				</div>
			</div>
		`);
	});

	// ── char counter ─────────────────────────────────────────────────────────────
	$(document).on("input", "#fa-input", function () {
		autoResize();
		$("#fa-char-count").text($(this).val().length);
	});

	// ── Send ─────────────────────────────────────────────────────────────────────
	async function sendMessage() {
		const message = $("#fa-input").val().trim();
		if (!message) return;
		if (!window.frappeassist_session) {
		const session = await frappe.call({
			method: "frappeassist.frappeassist.api.create_session"
		});

		window.frappeassist_session = session.message.session_name;
	}
		// User bubble
		$("#fa-messages").append(`
			<div class="fa-msg-wrap fa-user-wrap fa-slide-in">
				<div class="fa-user-msg">
					<span class="fa-msg-text">${escapeHtml(message)}</span>
					<span class="fa-msg-time">${getTime()}</span>
				</div>
				<div class="fa-avatar fa-user-avatar">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
				</div>
			</div>
		`);

		$("#fa-input").val("").trigger("input");
		scrollToBottom();

		// Typing indicator
		$("#fa-typing-indicator").show();
		scrollToBottom();

		try {
			const r = await frappe.call({
				method: "frappeassist.frappeassist.api.ask_ai",
				args: {
					message: message,
					session_name: window.frappeassist_session
				}
			});

			$("#fa-typing-indicator").hide();
			$("#fa-messages").append(`
				<div class="fa-msg-wrap fa-bot-wrap fa-slide-in">
					<div class="fa-avatar fa-bot-avatar">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="12" cy="12" r="3" fill="currentColor"/>
							<circle cx="5" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="19" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="5" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
							<circle cx="19" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
							<line x1="5" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="19" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="5" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
							<line x1="19" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
						</svg>
					</div>
					<div class="fa-bot-msg">
						<span class="fa-msg-text">${escapeHtml(r.message.reply)}</span>
						<span class="fa-msg-time">${getTime()}</span>
					</div>
				</div>
			`);
			scrollToBottom();

		} catch (e) {
			console.error(e);
			$("#fa-typing-indicator").hide();
			$("#fa-messages").append(`
				<div class="fa-msg-wrap fa-bot-wrap fa-slide-in">
					<div class="fa-avatar fa-bot-avatar"></div>
					<div class="fa-bot-msg fa-error-msg">
						<span class="fa-msg-text">Something went wrong. Please try again.</span>
						<span class="fa-msg-time">${getTime()}</span>
					</div>
				</div>
			`);
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		const el = document.getElementById("fa-messages");
		el.scrollTop = el.scrollHeight;
	}

	function escapeHtml(text) {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/\n/g, "<br>");
	}

	$(document).on("click", "#fa-send", sendMessage);

	$(document).on("keydown", "#fa-input", function (e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	});

	// ── Styles ───────────────────────────────────────────────────────────────────
	$("head").append(`<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

	/* ── FAB ── */
	#frappeassist-fab {
		position: fixed;
		bottom: 28px;
		right: 28px;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 99999;
		box-shadow: 0 0 0 0 rgba(14,165,233,0.4), 0 8px 24px rgba(14,165,233,0.35);
		animation: fabPulse 2.8s ease-in-out infinite;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	#frappeassist-fab:hover {
		transform: scale(1.1);
		box-shadow: 0 0 0 0 rgba(14,165,233,0), 0 12px 32px rgba(14,165,233,0.5);
	}
	.fab-icon { width: 28px; height: 28px; position: relative; z-index: 2; }
	.fab-ring {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 1.5px solid rgba(14,165,233,0.45);
		animation: ringExpand 2.8s ease-out infinite;
	}
	.fab-ring-2 { animation-delay: 1.4s; }

	@keyframes fabPulse {
		0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4), 0 8px 24px rgba(14,165,233,0.35); }
		50%      { box-shadow: 0 0 0 8px rgba(14,165,233,0),  0 8px 24px rgba(14,165,233,0.35); }
	}
	@keyframes ringExpand {
		0%   { transform: scale(1); opacity: 0.6; }
		100% { transform: scale(1.7); opacity: 0; }
	}

	/* ── Chat window ── */
	#frappeassist-chat {
		position: fixed;
		right: 28px;
		bottom: 100px;
		width: 390px;
		height: 580px;
		background: #0d1117;
		border-radius: 20px;
		box-shadow: 0 24px 64px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(56,189,248,0.12);
		z-index: 99998;
		overflow: hidden;
		font-family: 'Inter', system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		opacity: 0;
		transform: translateY(20px) scale(0.96);
		pointer-events: none;
		transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
	}
	#frappeassist-chat.fa-open {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: all;
	}

	/* ── Particle canvas ── */
	#fa-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
		opacity: 0.6;
	}

	/* ── Header ── */
	#fa-header {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: rgba(13,17,23,0.85);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(56,189,248,0.12);
	}
	.fa-header-left { display: flex; align-items: center; gap: 10px; }
	.fa-status-dot {
		width: 8px; height: 8px; border-radius: 50%;
		background: #22d3ee;
		box-shadow: 0 0 8px rgba(34,211,238,0.8);
		animation: statusBlink 2.5s ease-in-out infinite;
	}
	@keyframes statusBlink {
		0%,100% { opacity: 1; } 50% { opacity: 0.4; }
	}
	.fa-title {
		font-size: 14px; font-weight: 600;
		background: linear-gradient(90deg, #38bdf8, #818cf8);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
		letter-spacing: 0.01em;
	}
	.fa-subtitle { font-size: 11px; color: rgba(148,163,184,0.7); margin-top: 1px; }
	.fa-header-actions { display: flex; gap: 4px; }
	.fa-icon-btn {
		width: 30px; height: 30px;
		border: none; background: transparent; cursor: pointer; border-radius: 8px;
		display: flex; align-items: center; justify-content: center;
		color: rgba(148,163,184,0.6);
		transition: background 0.15s, color 0.15s;
	}
	.fa-icon-btn:hover { background: rgba(56,189,248,0.1); color: #38bdf8; }
	.fa-icon-btn svg { width: 15px; height: 15px; }

	/* ── Messages ── */
	#fa-messages {
		position: relative; z-index: 2;
		flex: 1;
		overflow-y: auto;
		padding: 16px 14px 8px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		scrollbar-width: thin;
		scrollbar-color: rgba(56,189,248,0.2) transparent;
	}
	#fa-messages::-webkit-scrollbar { width: 4px; }
	#fa-messages::-webkit-scrollbar-track { background: transparent; }
	#fa-messages::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.2); border-radius: 4px; }

	.fa-msg-wrap { display: flex; align-items: flex-end; gap: 8px; }
	.fa-user-wrap { flex-direction: row-reverse; }
	.fa-bot-wrap  { flex-direction: row; }

	.fa-slide-in {
		animation: slideIn 0.22s cubic-bezier(0.34,1.3,0.64,1) both;
	}
	@keyframes slideIn {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Avatar ── */
	.fa-avatar {
		width: 30px; height: 30px; border-radius: 50%;
		flex-shrink: 0;
		display: flex; align-items: center; justify-content: center;
	}
	.fa-bot-avatar {
		background: linear-gradient(135deg, rgba(14,165,233,0.25), rgba(99,102,241,0.25));
		color: #38bdf8;
		border: 1px solid rgba(56,189,248,0.25);
	}
	.fa-bot-avatar svg { width: 16px; height: 16px; }
	.fa-user-avatar {
		background: rgba(99,102,241,0.2);
		color: #818cf8;
		border: 1px solid rgba(129,140,248,0.25);
	}
	.fa-user-avatar svg { width: 15px; height: 15px; }

	/* ── Bubbles ── */
	.fa-bot-msg {
		max-width: 74%;
		background: rgba(30,41,59,0.8);
		border: 1px solid rgba(56,189,248,0.12);
		border-radius: 16px 16px 16px 4px;
		padding: 10px 13px;
		backdrop-filter: blur(8px);
		display: flex; flex-direction: column; gap: 4px;
	}
	.fa-user-msg {
		max-width: 74%;
		background: linear-gradient(135deg, rgba(14,165,233,0.22), rgba(99,102,241,0.22));
		border: 1px solid rgba(56,189,248,0.22);
		border-radius: 16px 16px 4px 16px;
		padding: 10px 13px;
		backdrop-filter: blur(8px);
		display: flex; flex-direction: column; gap: 4px;
		align-items: flex-end;
	}
	.fa-msg-text {
		font-size: 13.5px;
		line-height: 1.55;
		color: #e2e8f0;
	}
	.fa-msg-time {
		font-size: 10px;
		color: rgba(100,116,139,0.8);
	}
	.fa-error-msg { border-color: rgba(239,68,68,0.25) !important; }
	.fa-error-msg .fa-msg-text { color: #fca5a5; }

	/* ── Typing dots ── */
	.fa-typing-bubble {
		display: flex; align-items: center; gap: 5px;
		padding: 12px 16px !important;
	}
	.fa-dot {
		width: 7px; height: 7px; border-radius: 50%;
		background: #38bdf8;
		animation: dotBounce 1.1s ease-in-out infinite;
	}
	.fa-dot:nth-child(2) { animation-delay: 0.18s; }
	.fa-dot:nth-child(3) { animation-delay: 0.36s; }
	@keyframes dotBounce {
		0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
		40%          { transform: scale(1); opacity: 1; }
	}

	/* ── Input area ── */
	#fa-input-area {
		position: relative; z-index: 2;
		padding: 10px 12px 12px;
		background: rgba(13,17,23,0.9);
		backdrop-filter: blur(12px);
		border-top: 1px solid rgba(56,189,248,0.1);
	}
	#fa-input-wrap {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		background: rgba(30,41,59,0.7);
		border: 1px solid rgba(56,189,248,0.15);
		border-radius: 14px;
		padding: 8px 8px 8px 12px;
		transition: border-color 0.2s;
	}
	#fa-input-wrap:focus-within {
		border-color: rgba(56,189,248,0.4);
		box-shadow: 0 0 0 3px rgba(14,165,233,0.08);
	}
	#fa-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 13.5px;
		color: #e2e8f0;
		resize: none;
		line-height: 1.5;
		max-height: 100px;
		overflow-y: auto;
	}
	#fa-input::placeholder { color: rgba(100,116,139,0.6); }
	#fa-send {
		width: 34px; height: 34px; flex-shrink: 0;
		border-radius: 10px;
		border: none;
		background: linear-gradient(135deg, #0ea5e9, #6366f1);
		color: white;
		cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: transform 0.15s, opacity 0.15s;
	}
	#fa-send:hover { transform: scale(1.05); opacity: 0.9; }
	#fa-send:active { transform: scale(0.95); }
	#fa-send svg { width: 15px; height: 15px; }
	#fa-footer-hint {
		font-size: 10.5px;
		color: rgba(71,85,105,0.8);
		text-align: center;
		margin-top: 6px;
		letter-spacing: 0.01em;
	}
	#fa-typing-indicator { padding: 0 14px; }
	</style>`);
});