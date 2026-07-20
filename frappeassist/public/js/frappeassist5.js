$(document).ready(async function () {
	if ($("#frappeassist-fab").length) return;
	window.frappeassist_session = null;

	// ── Simple Markdown renderer ──────────────────────────────────────────────
	function renderMarkdown(text) {
		return text
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			// Bold + italic
			.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			// Inline code
			.replace(/`([^`]+)`/g, '<code class="fpa-md-code">$1</code>')
			// Headers
			.replace(/^### (.+)$/gm, '<h3 class="fpa-md-h3">$1</h3>')
			.replace(/^## (.+)$/gm, '<h2 class="fpa-md-h2">$1</h2>')
			.replace(/^# (.+)$/gm, '<h1 class="fpa-md-h1">$1</h1>')
			// Bullet lists
			.replace(/^\* (.+)$/gm, '<li>$1</li>')
			.replace(/^- (.+)$/gm, '<li>$1</li>')
			// Numbered lists
			.replace(/^\d+\. (.+)$/gm, '<li class="fpa-md-li-num">$1</li>')
			// Wrap consecutive <li> in <ul>
			.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="fpa-md-list">${match}</ul>`)
			// Links
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="fpa-md-link">$1</a>')
			// Line breaks
			.replace(/\n/g, "<br>");
	}

	async function loadSessions() {
		try {
			const r = await frappe.call({ method: "frappeassist.frappeassist.api.get_sessions" });
			let html = "";
			r.message.forEach(chat => {
				const isActive = chat.name === window.frappeassist_session ? "active" : "";
				html += `<div class="fa-session ${isActive}" data-name="${chat.name}" title="${chat.title || 'New Chat'}">${chat.title || "New Chat"}</div>`;
			});
			$("#fa-chat-list").html(html);
		} catch (e) { console.error(e); }
	}

	async function loadChatHistory(session_name) {
		try {
			const r = await frappe.call({
				method: "frappeassist.frappeassist.api.get_chat_history",
				args: { session_name }
			});
			$("#fa-messages").html("");
			r.message.forEach(msg => {
				const isUser = msg.role === "User";
				if (isUser) {
					appendUserBubble(msg.message, false);
				} else {
					appendBotBubble(msg.message, false);
				}
			});
			scrollToBottom();
		} catch (e) { console.error(e); }
	}

	// ── SVG Icons ─────────────────────────────────────────────────────────────
	const BOT_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="12" cy="12" r="3" fill="currentColor"/>
		<circle cx="5" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
		<circle cx="19" cy="7" r="1.2" fill="currentColor" opacity="0.6"/>
		<circle cx="5" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
		<circle cx="19" cy="17" r="1.2" fill="currentColor" opacity="0.6"/>
		<line x1="5" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
		<line x1="19" y1="7" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
		<line x1="5" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
		<line x1="19" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
	</svg>`;

	const USER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
		<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
		<circle cx="12" cy="7" r="4"/>
	</svg>`;

	const FULLSCREEN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
		<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
		<line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
	</svg>`;

	const EXIT_FULLSCREEN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
		<polyline points="8 3 3 3 3 8"/><polyline points="21 16 21 21 16 21"/>
		<line x1="3" y1="3" x2="10" y2="10"/><line x1="21" y1="21" x2="14" y2="14"/>
	</svg>`;

	const MINIMIZE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
		<line x1="5" y1="12" x2="19" y2="12"/>
	</svg>`;

	const RESTORE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
		<rect x="3" y="8" width="13" height="13" rx="2"/><path d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"/>
	</svg>`;

	const SIDEBAR_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
		<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
	</svg>`;

	// ── DOM ────────────────────────────────────────────────────────────────────
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

			<!-- Mobile sidebar overlay -->
			<div id="fa-sidebar-overlay"></div>

			<div id="fa-sidebar">
				<div id="fa-sidebar-header">
					<span class="fa-sidebar-title">Chats</span>
					<button class="fa-icon-btn" id="fa-sidebar-close" title="Close sidebar">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
				<button id="fa-new-chat">+ New Chat</button>
				<div id="fa-chat-list"></div>
			</div>

			<div id="fa-main">
				<div id="fa-header">
					<div class="fa-header-left">
						<button class="fa-icon-btn" id="fa-sidebar-toggle" title="Toggle sidebar">${SIDEBAR_SVG}</button>
						<div class="fa-status-dot"></div>
						<div>
							<div class="fa-title">FrappeAssist</div>
							<div class="fa-subtitle">AI · Online</div>
						</div>
					</div>
					<div class="fa-header-actions">
						<button class="fa-icon-btn" id="fa-minimize" title="Minimize">${MINIMIZE_SVG}</button>
						<button class="fa-icon-btn" id="fa-fullscreen" title="Fullscreen">${FULLSCREEN_SVG}</button>
						<button class="fa-icon-btn" id="fa-clear" title="Clear chat">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
								<path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
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
					<div class="fa-welcome">
						<div class="fa-welcome-icon">${BOT_SVG}</div>
						<div class="fa-welcome-text">
							<strong>Hello! I'm FrappeAssist.</strong><br>
							Ask me anything about your ERPNext system.
						</div>
					</div>
				</div>

				<div id="fa-typing-indicator" style="display:none;">
					<div class="fa-msg-wrap fa-bot-wrap">
						<div class="fa-avatar fa-bot-avatar">${BOT_SVG}</div>
						<div class="fa-bot-msg fa-typing-bubble">
							<span class="fa-dot"></span>
							<span class="fa-dot"></span>
							<span class="fa-dot"></span>
						</div>
					</div>
				</div>

				<div id="fa-input-area">
					<div id="fa-input-wrap">
						<textarea id="fa-input" placeholder="Ask anything…" rows="1"></textarea>
						<button id="fa-send">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="22" y1="2" x2="11" y2="13"/>
								<polygon points="22 2 15 22 11 13 2 9 22 2"/>
							</svg>
						</button>
					</div>
					<div id="fa-footer-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</div>
				</div>
			</div>

			<!-- Resize handle (desktop only) -->
			<div id="fa-resize-handle" title="Drag to resize"></div>
		</div>
	`);

	// ── State ─────────────────────────────────────────────────────────────────
	let isFullscreen = false;
	let isMinimized = false;
	let sidebarOpen = true;

	function isMobile() { return window.innerWidth <= 768; }

	// ── Particle canvas ────────────────────────────────────────────────────────
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
		particles.forEach(p => {
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(56,189,248,${p.opacity})`;
			ctx.fill();
			p.x += p.vx; p.y += p.vy;
			if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
			if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
		});
		animFrame = requestAnimationFrame(drawParticles);
	}
	function startCanvas() { resizeCanvas(); initParticles(); drawParticles(); }
	function stopCanvas() { cancelAnimationFrame(animFrame); }

	// ── Helpers ────────────────────────────────────────────────────────────────
	function getTime() {
		return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
	function autoResize() {
		const ta = document.getElementById("fa-input");
		ta.style.height = "auto";
		ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
	}
	function scrollToBottom() {
		const el = document.getElementById("fa-messages");
		el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
	}
	function escapeForAttr(text) {
		return text.replace(/"/g, "&quot;");
	}

	function appendUserBubble(message, animate = true) {
		const cls = animate ? "fa-slide-in" : "";
		$("#fa-messages").append(`
			<div class="fa-msg-wrap fa-user-wrap ${cls}">
				<div class="fa-user-msg">
					<span class="fa-msg-text">${escapeForAttr(message).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\n/g,'<br>')}</span>
					<span class="fa-msg-time">${getTime()}</span>
				</div>
				<div class="fa-avatar fa-user-avatar">${USER_SVG}</div>
			</div>
		`);
	}
	function appendBotBubble(reply, animate = true) {
		const cls = animate ? "fa-slide-in" : "";
		$("#fa-messages").append(`
			<div class="fa-msg-wrap fa-bot-wrap ${cls}">
				<div class="fa-avatar fa-bot-avatar">${BOT_SVG}</div>
				<div class="fa-bot-msg">
					<div class="fa-msg-text">${renderMarkdown(reply)}</div>
					<span class="fa-msg-time">${getTime()}</span>
				</div>
			</div>
		`);
	}

	// ── Open / Close ──────────────────────────────────────────────────────────
	$(document).on("click", "#frappeassist-fab", function () {
		const chat = $("#frappeassist-chat");
		chat.addClass("fa-open");
		isMinimized = false;
		chat.removeClass("fa-minimized");
		// On mobile, hide sidebar by default
		if (isMobile()) {
			$("#fa-sidebar").removeClass("fa-sidebar-open");
			$("#fa-sidebar-overlay").hide();
		}
		setTimeout(startCanvas, 50);
	});

	$(document).on("click", "#fa-close", function () {
		$("#frappeassist-chat").removeClass("fa-open fa-fullscreen fa-minimized");
		isFullscreen = false; isMinimized = false;
		$("body").removeClass("fa-body-fullscreen");
		stopCanvas();
		updateFullscreenBtn();
	});

	// ── Minimize ──────────────────────────────────────────────────────────────
	$(document).on("click", "#fa-minimize", function () {
		const chat = $("#frappeassist-chat");
		if (isMinimized) {
			chat.removeClass("fa-minimized");
			isMinimized = false;
			$(this).html(MINIMIZE_SVG).attr("title", "Minimize");
			setTimeout(startCanvas, 50);
		} else {
			chat.addClass("fa-minimized");
			isMinimized = true;
			$(this).html(RESTORE_SVG).attr("title", "Restore");
			stopCanvas();
		}
	});

	// ── Fullscreen ────────────────────────────────────────────────────────────
	function updateFullscreenBtn() {
		$("#fa-fullscreen").html(isFullscreen ? EXIT_FULLSCREEN_SVG : FULLSCREEN_SVG);
		$("#fa-fullscreen").attr("title", isFullscreen ? "Exit fullscreen" : "Fullscreen");
	}

	$(document).on("click", "#fa-fullscreen", function () {
		const chat = $("#frappeassist-chat");
		isFullscreen = !isFullscreen;
		chat.toggleClass("fa-fullscreen", isFullscreen);
		$("body").toggleClass("fa-body-fullscreen", isFullscreen);
		updateFullscreenBtn();
		setTimeout(() => { resizeCanvas(); }, 300);
	});

	// ── Sidebar toggle ────────────────────────────────────────────────────────
	$(document).on("click", "#fa-sidebar-toggle", function () {
		if (isMobile()) {
			$("#fa-sidebar").toggleClass("fa-sidebar-open");
			const open = $("#fa-sidebar").hasClass("fa-sidebar-open");
			$("#fa-sidebar-overlay").toggle(open);
		} else {
			sidebarOpen = !sidebarOpen;
			$("#fa-sidebar").toggleClass("fa-sidebar-hidden", !sidebarOpen);
		}
	});

	$(document).on("click", "#fa-sidebar-close", function () {
		$("#fa-sidebar").removeClass("fa-sidebar-open");
		$("#fa-sidebar-overlay").hide();
	});

	$(document).on("click", "#fa-sidebar-overlay", function () {
		$("#fa-sidebar").removeClass("fa-sidebar-open");
		$(this).hide();
	});

	// ── Clear ─────────────────────────────────────────────────────────────────
	$(document).on("click", "#fa-clear", function () {
		window.frappeassist_session = null;
		$("#fa-messages").html(`
			<div class="fa-welcome">
				<div class="fa-welcome-icon">${BOT_SVG}</div>
				<div class="fa-welcome-text"><strong>Chat cleared.</strong><br>How can I help you?</div>
			</div>
		`);
	});

	// ── Send ──────────────────────────────────────────────────────────────────
	async function sendMessage() {
		const message = $("#fa-input").val().trim();
		if (!message) return;

		if (!window.frappeassist_session) {
			try {
				const session = await frappe.call({ method: "frappeassist.frappeassist.api.create_session" });
				window.frappeassist_session = session.message.session_name;
				loadSessions();
			} catch (e) {
				console.error(e);
				return;
			}
		}

		// Remove welcome screen
		$(".fa-welcome").remove();

		appendUserBubble(message);
		$("#fa-input").val("").trigger("input");
		scrollToBottom();

		$("#fa-typing-indicator").show();
		scrollToBottom();

		try {
			const r = await frappe.call({
				method: "frappeassist.frappeassist.api.ask_ai",
				args: { message, session_name: window.frappeassist_session }
			});
			$("#fa-typing-indicator").hide();
			appendBotBubble(r.message.reply);
			scrollToBottom();
		} catch (e) {
			console.error(e);
			$("#fa-typing-indicator").hide();
			$("#fa-messages").append(`
				<div class="fa-msg-wrap fa-bot-wrap fa-slide-in">
					<div class="fa-avatar fa-bot-avatar">${BOT_SVG}</div>
					<div class="fa-bot-msg fa-error-msg">
						<span class="fa-msg-text">Something went wrong. Please try again.</span>
						<span class="fa-msg-time">${getTime()}</span>
					</div>
				</div>
			`);
			scrollToBottom();
		}
	}

	// ── Session events ────────────────────────────────────────────────────────
	$(document).on("click", ".fa-session", function () {
		$(".fa-session").removeClass("active");
		$(this).addClass("active");
		window.frappeassist_session = $(this).data("name");
		loadChatHistory(window.frappeassist_session);
		if (isMobile()) {
			$("#fa-sidebar").removeClass("fa-sidebar-open");
			$("#fa-sidebar-overlay").hide();
		}
	});

	$(document).on("click", "#fa-new-chat", function () {
		$(".fa-session").removeClass("active");
		window.frappeassist_session = null;
		$(".fa-welcome").remove();
		$("#fa-messages").html(`
			<div class="fa-welcome">
				<div class="fa-welcome-icon">${BOT_SVG}</div>
				<div class="fa-welcome-text"><strong>New conversation started.</strong><br>How can I help you?</div>
			</div>
		`);
		if (isMobile()) {
			$("#fa-sidebar").removeClass("fa-sidebar-open");
			$("#fa-sidebar-overlay").hide();
		}
	});

	$(document).on("click", "#fa-send", sendMessage);
	$(document).on("input", "#fa-input", autoResize);
	$(document).on("keydown", "#fa-input", function (e) {
		if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
	});

	// ── Resize handle (desktop) ───────────────────────────────────────────────
	let resizing = false, startX, startY, startW, startH;
	const handle = document.getElementById("fa-resize-handle");

	handle.addEventListener("mousedown", function (e) {
		if (isFullscreen) return;
		resizing = true;
		startX = e.clientX; startY = e.clientY;
		const chat = document.getElementById("frappeassist-chat");
		startW = chat.offsetWidth; startH = chat.offsetHeight;
		document.body.style.userSelect = "none";
	});
	document.addEventListener("mousemove", function (e) {
		if (!resizing) return;
		const chat = document.getElementById("frappeassist-chat");
		const newW = Math.max(420, startW - (e.clientX - startX));
		const newH = Math.max(320, startH - (e.clientY - startY));
		chat.style.width = newW + "px";
		chat.style.height = newH + "px";
	});
	document.addEventListener("mouseup", function () {
		resizing = false;
		document.body.style.userSelect = "";
	});

	// ── Window resize handler ─────────────────────────────────────────────────
	$(window).on("resize", function () {
		if (isMobile()) {
			// Ensure sidebar overlay is removed on resize to mobile
			if (!$("#fa-sidebar").hasClass("fa-sidebar-open")) {
				$("#fa-sidebar-overlay").hide();
			}
		}
		if ($("#frappeassist-chat").hasClass("fa-open")) {
			resizeCanvas();
		}
	});

	// ── Styles ────────────────────────────────────────────────────────────────
	$("head").append(`<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

	/* ── Body lock for fullscreen ── */
	body.fa-body-fullscreen { overflow: hidden; }

	/* ── FAB ── */
	#frappeassist-fab {
		position: fixed;
		bottom: 28px; right: 28px;
		width: 60px; height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
		color: #fff;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer;
		z-index: 99999;
		box-shadow: 0 0 0 0 rgba(14,165,233,0.4), 0 8px 24px rgba(14,165,233,0.35);
		animation: fabPulse 2.8s ease-in-out infinite;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	#frappeassist-fab:hover { transform: scale(1.1); }
	.fab-icon { width: 28px; height: 28px; position: relative; z-index: 2; }
	.fab-ring {
		position: absolute; inset: -4px; border-radius: 50%;
		border: 1.5px solid rgba(14,165,233,0.45);
		animation: ringExpand 2.8s ease-out infinite;
	}
	.fab-ring-2 { animation-delay: 1.4s; }
	@keyframes fabPulse {
		0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4), 0 8px 24px rgba(14,165,233,0.35); }
		50%      { box-shadow: 0 0 0 10px rgba(14,165,233,0), 0 8px 24px rgba(14,165,233,0.35); }
	}
	@keyframes ringExpand {
		0%   { transform: scale(1); opacity: 0.6; }
		100% { transform: scale(1.7); opacity: 0; }
	}

	/* ── Chat window ── */
	#frappeassist-chat {
		position: fixed;
		right: 28px; bottom: 100px;
		width: 700px; height: 600px;
		min-width: 320px; min-height: 260px;
		background: #0d1117;
		border-radius: 20px;
		box-shadow: 0 24px 64px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(56,189,248,0.12);
		z-index: 99998;
		overflow: hidden;
		font-family: 'Inter', system-ui, sans-serif;
		display: none;
		flex-direction: row;
		opacity: 0;
		transform: translateY(24px) scale(0.96);
		pointer-events: none;
		transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
		            width 0.25s ease, height 0.25s ease,
		            right 0.25s ease, bottom 0.25s ease, border-radius 0.25s ease;
	}
	#frappeassist-chat.fa-open {
		display: flex;
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: all;
	}

	/* ── Fullscreen mode ── */
	#frappeassist-chat.fa-fullscreen {
		right: 0 !important; bottom: 0 !important;
		width: 100vw !important; height: 100vh !important;
		border-radius: 0 !important;
	}

	/* ── Minimized mode ── */
	#frappeassist-chat.fa-minimized {
		height: 56px !important;
		min-height: 56px !important;
		overflow: hidden;
	}
	#frappeassist-chat.fa-minimized #fa-canvas,
	#frappeassist-chat.fa-minimized #fa-messages,
	#frappeassist-chat.fa-minimized #fa-typing-indicator,
	#frappeassist-chat.fa-minimized #fa-input-area,
	#frappeassist-chat.fa-minimized #fa-sidebar,
	#frappeassist-chat.fa-minimized #fa-resize-handle { display: none !important; }

	/* ── Resize handle ── */
	#fa-resize-handle {
		position: absolute;
		top: 0; left: 0;
		width: 18px; height: 18px;
		cursor: nw-resize;
		z-index: 10;
	}
	#fa-resize-handle::before {
		content: '';
		position: absolute;
		top: 4px; left: 4px;
		width: 10px; height: 10px;
		border-top: 2px solid rgba(56,189,248,0.3);
		border-left: 2px solid rgba(56,189,248,0.3);
		border-radius: 2px 0 0 0;
	}
	#frappeassist-chat.fa-fullscreen #fa-resize-handle { display: none; }

	/* ── Particle canvas ── */
	#fa-canvas {
		position: absolute; inset: 0;
		width: 100%; height: 100%;
		pointer-events: none; z-index: 0; opacity: 0.5;
	}

	/* ── Sidebar overlay (mobile) ── */
	#fa-sidebar-overlay {
		display: none;
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.5);
		z-index: 5;
		backdrop-filter: blur(2px);
	}

	/* ── Sidebar ── */
	#fa-sidebar {
		position: relative;
		z-index: 6;
		width: 220px;
		flex-shrink: 0;
		background: rgba(17,24,39,0.97);
		border-right: 1px solid rgba(255,255,255,0.07);
		display: flex;
		flex-direction: column;
		height: 100%; min-height: 0;
		transition: width 0.22s ease, transform 0.22s ease;
		overflow: hidden;
	}
	#fa-sidebar.fa-sidebar-hidden {
		width: 0 !important;
		border-right: none;
	}
	#fa-sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 12px 8px;
		flex-shrink: 0;
	}
	.fa-sidebar-title {
		font-size: 11px;
		font-weight: 600;
		color: rgba(148,163,184,0.5);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	#fa-sidebar-close { display: none; }
	#fa-new-chat {
		flex-shrink: 0;
		margin: 0 10px 8px;
		border: none;
		padding: 10px 12px;
		border-radius: 10px;
		background: linear-gradient(135deg, #0ea5e9, #6366f1);
		color: white;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0.01em;
		transition: opacity 0.15s, transform 0.15s;
	}
	#fa-new-chat:hover { opacity: 0.9; transform: scale(1.01); }
	#fa-chat-list {
		margin: 0 8px;
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(56,189,248,0.15) transparent;
	}
	.fa-session {
		padding: 9px 10px;
		border-radius: 8px;
		cursor: pointer;
		color: rgba(203,213,225,0.8);
		margin-bottom: 3px;
		background: transparent;
		font-size: 12.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: background 0.12s, color 0.12s;
	}
	.fa-session:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
	.fa-session.active {
		background: rgba(56,189,248,0.14);
		color: #7dd3fc;
		border: 1px solid rgba(56,189,248,0.25);
	}

	/* ── Main column ── */
	#fa-main {
		position: relative; z-index: 2;
		flex: 1; min-width: 0; min-height: 0;
		display: flex; flex-direction: column;
		height: 100%; overflow: hidden;
	}

	/* ── Header ── */
	#fa-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 10px 12px;
		background: rgba(13,17,23,0.9);
		backdrop-filter: blur(16px);
		border-bottom: 1px solid rgba(56,189,248,0.1);
		flex-shrink: 0;
		gap: 8px;
		min-height: 56px;
	}
	.fa-header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
	.fa-status-dot {
		width: 7px; height: 7px; border-radius: 50%;
		background: #22d3ee;
		box-shadow: 0 0 8px rgba(34,211,238,0.7);
		flex-shrink: 0;
		animation: statusBlink 2.5s ease-in-out infinite;
	}
	@keyframes statusBlink {
		0%,100% { opacity: 1; } 50% { opacity: 0.4; }
	}
	.fa-title {
		font-size: 14px; font-weight: 600;
		background: linear-gradient(90deg, #38bdf8, #818cf8);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
	}
	.fa-subtitle { font-size: 11px; color: rgba(148,163,184,0.6); margin-top: 1px; }
	.fa-header-actions { display: flex; gap: 2px; flex-shrink: 0; }
	.fa-icon-btn {
		width: 32px; height: 32px;
		border: none; background: transparent; cursor: pointer; border-radius: 8px;
		display: flex; align-items: center; justify-content: center;
		color: rgba(148,163,184,0.55);
		transition: background 0.15s, color 0.15s;
		flex-shrink: 0;
	}
	.fa-icon-btn:hover { background: rgba(56,189,248,0.1); color: #38bdf8; }
	.fa-icon-btn svg { width: 15px; height: 15px; }
	#fa-sidebar-toggle svg { width: 16px; height: 16px; }

	/* ── Messages ── */
	#fa-messages {
		flex: 1;
		min-height: 0;        /* THE key fix: lets this shrink inside flex column */
		overflow-y: auto;
		padding: 16px 14px 8px;
		display: flex; flex-direction: column; gap: 12px;
		align-items: stretch;
		justify-content: flex-start;
		scrollbar-width: thin;
		scrollbar-color: rgba(56,189,248,0.15) transparent;
	}
	#fa-messages::-webkit-scrollbar { width: 4px; }
	#fa-messages::-webkit-scrollbar-track { background: transparent; }
	#fa-messages::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.18); border-radius: 4px; }

	/* ── Welcome screen ── */
	.fa-welcome {
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		gap: 14px; padding: 32px 20px;
		text-align: center;
		/* Do NOT use flex:1 — it stretches and pushes real messages out of position */
		align-self: center;
		width: 100%;
	}
	.fa-welcome-icon {
		width: 56px; height: 56px; border-radius: 50%;
		background: linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2));
		border: 1px solid rgba(56,189,248,0.2);
		display: flex; align-items: center; justify-content: center;
		color: #38bdf8;
	}
	.fa-welcome-icon svg { width: 28px; height: 28px; }
	.fa-welcome-text {
		font-size: 14px; color: rgba(148,163,184,0.8); line-height: 1.6;
	}
	.fa-welcome-text strong { color: #e2e8f0; }

	/* ── Message wrappers ── */
	.fa-msg-wrap { display: flex; align-items: flex-end; gap: 8px; width: 100%; flex-shrink: 0; }
	.fa-user-wrap { flex-direction: row-reverse; justify-content: flex-start; }
	.fa-bot-wrap  { flex-direction: row; justify-content: flex-start; }
	.fa-slide-in { animation: slideIn 0.22s cubic-bezier(0.34,1.3,0.64,1) both; }
	@keyframes slideIn {
		from { opacity: 0; transform: translateY(10px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Avatars ── */
	.fa-avatar {
		width: 30px; height: 30px; border-radius: 50%;
		flex-shrink: 0;
		display: flex; align-items: center; justify-content: center;
		align-self: flex-end;
	}
	.fa-bot-avatar {
		background: linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2));
		color: #38bdf8; border: 1px solid rgba(56,189,248,0.2);
	}
	.fa-bot-avatar svg { width: 16px; height: 16px; }
	.fa-user-avatar {
		background: rgba(99,102,241,0.18);
		color: #818cf8; border: 1px solid rgba(129,140,248,0.2);
	}
	.fa-user-avatar svg { width: 15px; height: 15px; }

	/* ── Bubbles ── */
	.fa-bot-msg {
		max-width: 76%;
		background: rgba(30,41,59,0.75);
		border: 1px solid rgba(56,189,248,0.1);
		border-radius: 4px 16px 16px 16px;
		padding: 10px 13px;
		backdrop-filter: blur(8px);
		display: flex; flex-direction: column; gap: 5px;
	}
	.fa-user-msg {
		max-width: 76%;
		background: linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2));
		border: 1px solid rgba(56,189,248,0.2);
		border-radius: 16px 4px 16px 16px;
		padding: 10px 13px;
		backdrop-filter: blur(8px);
		display: flex; flex-direction: column; gap: 5px;
		align-items: flex-end;
	}
	.fa-msg-text {
		font-size: 13.5px; line-height: 1.6; color: #e2e8f0;
		word-break: break-word;
	}
	.fa-msg-time { font-size: 10px; color: rgba(100,116,139,0.7); }
	.fa-error-msg { border-color: rgba(239,68,68,0.25) !important; }
	.fa-error-msg .fa-msg-text { color: #fca5a5; }

	/* ── Markdown styles ── */
	.fa-msg-text strong { color: #f1f5f9; font-weight: 600; }
	.fa-msg-text em { color: #cbd5e1; font-style: italic; }
	.fa-msg-text .fpa-md-h1 { font-size: 17px; font-weight: 700; color: #f8fafc; margin: 6px 0 4px; }
	.fa-msg-text .fpa-md-h2 { font-size: 15px; font-weight: 600; color: #f1f5f9; margin: 5px 0 3px; }
	.fa-msg-text .fpa-md-h3 { font-size: 13.5px; font-weight: 600; color: #e2e8f0; margin: 4px 0 2px; }
	.fa-msg-text .fpa-md-list {
		padding-left: 18px; margin: 4px 0;
		list-style: disc;         /* override Frappe's ul reset */
	}
	/* Neutralize Frappe/FontAwesome ::before injection on our lists */
	.fa-msg-text .fpa-md-list::before,
	.fa-msg-text .fpa-md-list li::before {
		content: none !important;
		display: none !important;
	}
	.fa-msg-text .fpa-md-list li { margin-bottom: 3px; list-style: disc; }
	.fa-msg-text .fpa-md-list .fpa-md-li-num { list-style: decimal; }
	.fpa-md-code {
		background: rgba(56,189,248,0.12);
		border: 1px solid rgba(56,189,248,0.2);
		border-radius: 4px;
		padding: 1px 5px;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 12px;
		color: #7dd3fc;
	}
	.fpa-md-link { color: #38bdf8; text-decoration: underline; text-underline-offset: 2px; }
	.fpa-md-link:hover { color: #7dd3fc; }

	/* ── Typing dots ── */
	.fa-typing-bubble {
		display: flex !important; align-items: center !important; gap: 5px !important;
		padding: 14px 18px !important;
		border-radius: 4px 16px 16px 16px !important;
	}
	.fa-dot {
		width: 7px; height: 7px; border-radius: 50%;
		background: #38bdf8;
		animation: dotBounce 1.2s ease-in-out infinite;
	}
	.fa-dot:nth-child(2) { animation-delay: 0.2s; }
	.fa-dot:nth-child(3) { animation-delay: 0.4s; }
	@keyframes dotBounce {
		0%,80%,100% { transform: translateY(0) scale(0.7); opacity: 0.4; }
		40%          { transform: translateY(-5px) scale(1); opacity: 1; }
	}
	#fa-typing-indicator { padding: 0 14px 4px; }

	/* ── Input ── */
	#fa-input-area {
		padding: 10px 12px 12px;
		background: rgba(13,17,23,0.92);
		backdrop-filter: blur(16px);
		border-top: 1px solid rgba(56,189,248,0.08);
		flex-shrink: 0;
	}
	#fa-input-wrap {
		display: flex; align-items: flex-end; gap: 8px;
		background: rgba(30,41,59,0.65);
		border: 1px solid rgba(56,189,248,0.14);
		border-radius: 14px;
		padding: 8px 8px 8px 13px;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	#fa-input-wrap:focus-within {
		border-color: rgba(56,189,248,0.38);
		box-shadow: 0 0 0 3px rgba(14,165,233,0.08);
	}
	#fa-input {
		flex: 1; background: transparent;
		border: none; outline: none;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 13.5px; color: #e2e8f0;
		resize: none; line-height: 1.55;
		max-height: 120px; overflow-y: auto;
	}
	#fa-input::placeholder { color: rgba(100,116,139,0.5); }
	#fa-send {
		width: 36px; height: 36px; flex-shrink: 0;
		border-radius: 10px; border: none;
		background: linear-gradient(135deg, #0ea5e9, #6366f1);
		color: white; cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: transform 0.15s, opacity 0.15s;
	}
	#fa-send:hover { transform: scale(1.06); }
	#fa-send:active { transform: scale(0.94); }
	#fa-send svg { width: 15px; height: 15px; }
	#fa-footer-hint {
		font-size: 10.5px; color: rgba(71,85,105,0.6);
		text-align: center; margin-top: 7px;
	}
	#fa-footer-hint kbd {
		font-family: inherit; font-size: 10px;
		background: rgba(56,189,248,0.1);
		border: 1px solid rgba(56,189,248,0.2);
		border-radius: 3px; padding: 0 4px;
		color: rgba(125,211,252,0.7);
	}

	/* ══════════════════════════════════════
	   MOBILE (≤ 768px)
	══════════════════════════════════════ */
	@media (max-width: 768px) {
		#frappeassist-fab {
			bottom: 20px; right: 20px;
			width: 54px; height: 54px;
		}

		#frappeassist-chat {
			right: 0 !important; bottom: 0 !important;
			width: 100vw !important; height: 100svh !important;
			border-radius: 0 !important;
		}
		#frappeassist-chat.fa-open {
			display: flex;
		}

		/* On mobile the sidebar is an overlay drawer */
		#fa-sidebar {
			position: absolute;
			top: 0; left: 0;
			height: 100%;
			width: 260px !important;
			transform: translateX(-100%);
			border-right: 1px solid rgba(56,189,248,0.12);
			transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
			z-index: 7;
		}
		#fa-sidebar.fa-sidebar-open {
			transform: translateX(0);
		}
		#fa-sidebar-close { display: flex !important; }
		#fa-sidebar-overlay { z-index: 6; }

		/* Hide resize handle on mobile */
		#fa-resize-handle { display: none; }

		/* Larger touch targets */
		.fa-icon-btn { width: 36px; height: 36px; }
		.fa-session { padding: 12px 10px; font-size: 13px; }

		/* Bubbles use more width on mobile */
		.fa-bot-msg, .fa-user-msg { max-width: 88%; }

		/* Hide minimize / fullscreen on mobile (already full screen) */
		#fa-minimize, #fa-fullscreen { display: none !important; }

		#fa-footer-hint { display: none; }
	}

	/* ══════════════════════════════════════
	   TABLET (769–1024px)
	══════════════════════════════════════ */
	@media (min-width: 769px) and (max-width: 1024px) {
		#frappeassist-chat {
			width: 580px !important;
			height: 560px;
		}
		#fa-sidebar { width: 180px; }
	}
	</style>`);

	loadSessions();
});