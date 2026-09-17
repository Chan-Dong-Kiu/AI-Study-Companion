// =========================================================
// StudyCompass — Frontend Logic
// Manages the state machine of a study session & renders UI by response_type
// =========================================================

// ---------- Real API layer (follows backend contract) ----------
const RealAPI = {
  async startSession({ student_id, message }) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, message }),
    });
    if (!res.ok) throw new Error(`API error (${res.status})`);
    return res.json();
  },

  async respondSession(sessionId, { message, action }) {
    const res = await fetch(
      `${CONFIG.API_BASE_URL}/api/session/${sessionId}/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, action }),
      }
    );
    if (!res.ok) throw new Error(`API error (${res.status})`);
    return res.json();
  },

  async fetchWeeklyJournal(studentId) {
    const res = await fetch(
      `${CONFIG.API_BASE_URL}/api/journal/weekly?student_id=${encodeURIComponent(
        studentId
      )}`
    );
    if (!res.ok) throw new Error(`API error (${res.status})`);
    return res.json();
  },
};

// Select API implementation dynamically based on config
const API = CONFIG.USE_MOCK_API ? MockAPI : RealAPI;

// ---------- App state ----------
const state = {
  sessionId: null,
  status: "idle", // idle | active | resolved
  lastMessage: null,
  originalQuestion: "",
  detectedSubject: null,
  isLoading: false,
};

// ---------- DOM refs ----------
const el = {
  tabSession: document.getElementById("tab-session"),
  tabJournal: document.getElementById("tab-journal"),
  viewSession: document.getElementById("view-session"),
  viewJournal: document.getElementById("view-journal"),

  composer: document.getElementById("composer"),
  questionInput: document.getElementById("question-input"),
  btnStart: document.getElementById("btn-start"),

  thread: document.getElementById("thread"),
  studentQuestionCard: document.getElementById("student-question-card"),
  studentQuestionText: document.getElementById("student-question-text"),
  detectedSubjectPill: document.getElementById("detected-subject-pill"),
  responseSlot: document.getElementById("response-slot"),

  thinkingIndicator: document.getElementById("thinking-indicator"),
  thinkingText: document.getElementById("thinking-text"),

  errorBanner: document.getElementById("error-banner"),
  errorText: document.getElementById("error-text"),
  btnRetry: document.getElementById("btn-retry"),

  replyBar: document.getElementById("reply-bar"),
  replyInput: document.getElementById("reply-input"),
  btnSend: document.getElementById("btn-send"),
  btnFullSolution: document.getElementById("btn-full-solution"),

  resolvedBar: document.getElementById("resolved-bar"),
  btnNewQuestion: document.getElementById("btn-new-question"),

  journalLoading: document.getElementById("journal-loading"),
  journalContent: document.getElementById("journal-content"),
  reflectionMessage: document.getElementById("reflection-message"),
  statsRow: document.getElementById("stats-row"),
  journalErrorBanner: document.getElementById("journal-error-banner"),
  btnRetryJournal: document.getElementById("btn-retry-journal"),
};

let pendingRetry = null;

// =========================================================
// Tab Navigation
// =========================================================
function switchView(view) {
  const isSession = view === "session";
  el.viewSession.classList.toggle("hidden", !isSession);
  el.viewJournal.classList.toggle("hidden", isSession);
  el.tabSession.classList.toggle("is-active", isSession);
  el.tabJournal.classList.toggle("is-active", !isSession);
  el.tabSession.setAttribute("aria-selected", String(isSession));
  el.tabJournal.setAttribute("aria-selected", String(!isSession));

  if (!isSession && el.journalContent.classList.contains("hidden") && el.journalErrorBanner.classList.contains("hidden")) {
    loadWeeklyJournal();
  }
}
el.tabSession.addEventListener("click", () => switchView("session"));
el.tabJournal.addEventListener("click", () => switchView("journal"));

// =========================================================
// Study Session — Render by response_type
// Rule: Exactly 1 response block rendered in response-slot at any time.
// =========================================================

function setLoading(isLoading, text) {
  state.isLoading = isLoading;
  el.thinkingIndicator.classList.toggle("hidden", !isLoading);
  if (text) el.thinkingText.textContent = text;
  el.btnStart.disabled = isLoading;
  el.btnSend.disabled = isLoading;
  el.btnFullSolution.disabled = isLoading;
  el.replyInput.disabled = isLoading;
}

function showError(message, retryFn) {
  el.errorText.textContent = message || "A temporary connection issue occurred. Let's try again.";
  el.errorBanner.classList.remove("hidden");
  pendingRetry = retryFn || null;
}

function hideError() {
  el.errorBanner.classList.add("hidden");
  pendingRetry = null;
}

el.btnRetry.addEventListener("click", () => {
  hideError();
  if (pendingRetry) pendingRetry();
});

function renderProgressDots(stage) {
  if (!stage || stage < 1) return "";
  const total = CONFIG.MAX_HINT_ROUNDS;
  let dots = "";
  for (let i = 1; i <= total; i++) {
    const cls = i < stage ? "is-filled" : i === stage ? "is-current" : "";
    dots += `<span class="progress-dot ${cls}"></span>`;
  }
  return `<div class="progress-row"><span>Hint ${stage} of ${total}</span>${dots}</div>`;
}

function renderHintBlock(msg) {
  return `
    ${renderProgressDots(msg.stage)}
    <div class="hint-bubble">
      ${msg.verified ? `<span class="hint-bubble__verified" title="Pedagogically verified">✓</span>` : ""}
      <p class="hint-bubble__title">Hint ${msg.stage ? "#" + msg.stage : ""}</p>
      <p class="hint-bubble__text">${escapeHtml(msg.content)}</p>
    </div>
  `;
}

function renderNudgeBlock(msg) {
  // No skip button by pedagogical design (mandatory substantive reply)
  return `
    <div class="banner banner--nudge">
      <div class="banner__head">
        <span class="banner__icon">✦</span>
        <div>
          <p class="banner__label">One Small Step</p>
          <p class="banner__text">${escapeHtml(msg.content)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderOutOfScopeBlock(msg) {
  return `
    <div class="banner banner--scope">
      <div class="banner__head">
        <span class="banner__icon">◈</span>
        <div>
          <p class="banner__label">Scope Guidance</p>
          <p class="banner__text">${escapeHtml(msg.content)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderFullSolutionBlock(msg) {
  return `
    <div class="solution-card">
      <p class="solution-card__label">✦ Comprehensive Solution</p>
      <p class="solution-card__text">${escapeHtml(msg.content)}</p>
    </div>
  `;
}

function renderResponseSlot(msg) {
  let html = "";
  switch (msg.response_type) {
    case "hint":
      html = renderHintBlock(msg);
      break;
    case "engagement_nudge":
      html = renderNudgeBlock(msg);
      break;
    case "out_of_scope":
      html = renderOutOfScopeBlock(msg);
      break;
    case "full_solution":
      html = renderFullSolutionBlock(msg);
      break;
    default:
      html = "";
  }
  el.responseSlot.innerHTML = html;
}

function updateThreadControls(msg) {
  const isResolved = msg.status === "resolved";
  el.replyBar.classList.toggle("hidden", isResolved || !msg.requires_student_response);
  el.resolvedBar.classList.toggle("hidden", !isResolved);
  if (!isResolved && msg.requires_student_response) {
    el.replyInput.value = "";
    el.replyInput.focus();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// =========================================================
// Actions: Start Session
// =========================================================
async function handleStart() {
  const question = el.questionInput.value.trim();
  if (!question) {
    el.questionInput.focus();
    return;
  }

  hideError();
  setLoading(true, "Formulating your first gentle hint...");

  try {
    const res = await API.startSession({
      student_id: CONFIG.STUDENT_ID,
      message: question,
    });

    state.sessionId = res.session_id;
    state.status = res.status;
    state.lastMessage = res;
    state.originalQuestion = question;
    state.detectedSubject = res.detected_subject || null;

    el.composer.classList.add("hidden");
    el.thread.classList.remove("hidden");

    el.studentQuestionText.textContent = question;
    if (state.detectedSubject) {
      el.detectedSubjectPill.textContent = "Topic: " + state.detectedSubject;
      el.detectedSubjectPill.classList.remove("hidden");
    } else {
      el.detectedSubjectPill.classList.add("hidden");
    }

    renderResponseSlot(res);
    updateThreadControls(res);
  } catch (err) {
    showError("Unable to start the session right now. Please try again.", handleStart);
  } finally {
    setLoading(false);
  }
}
el.btnStart.addEventListener("click", handleStart);

// =========================================================
// Actions: Send Response (action = "continue")
// =========================================================
async function handleSend() {
  const message = el.replyInput.value.trim();
  if (!message || !state.sessionId) return;
  await sendToSession({ message, action: "continue" });
}
el.btnSend.addEventListener("click", handleSend);
el.replyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSend();
});

// =========================================================
// Actions: Request Full Solution (action = "request_full_solution")
// =========================================================
async function handleRequestFullSolution() {
  if (!state.sessionId) return;
  await sendToSession({ message: "", action: "request_full_solution" });
}
el.btnFullSolution.addEventListener("click", handleRequestFullSolution);

async function sendToSession({ message, action }) {
  hideError();
  setLoading(
    true,
    action === "request_full_solution"
      ? "Synthesizing full solution & takeaways..."
      : "Reviewing your reflection..."
  );

  try {
    const res = await API.respondSession(state.sessionId, { message, action });
    state.status = res.status;
    state.lastMessage = res;

    renderResponseSlot(res);
    updateThreadControls(res);
  } catch (err) {
    showError("Could not send your response. Please try again.", () =>
      sendToSession({ message, action })
    );
  } finally {
    setLoading(false);
  }
}

// =========================================================
// Actions: Ask New Question (Reset to composer)
// =========================================================
function resetSession() {
  state.sessionId = null;
  state.status = "idle";
  state.lastMessage = null;
  state.originalQuestion = "";
  state.detectedSubject = null;

  el.questionInput.value = "";
  el.responseSlot.innerHTML = "";
  el.thread.classList.add("hidden");
  el.composer.classList.remove("hidden");
  el.replyBar.classList.add("hidden");
  el.resolvedBar.classList.add("hidden");
  hideError();
  el.questionInput.focus();
}
el.btnNewQuestion.addEventListener("click", resetSession);

// =========================================================
// Weekly Journal
// =========================================================
async function loadWeeklyJournal() {
  el.journalLoading.classList.remove("hidden");
  el.journalContent.classList.add("hidden");
  el.journalErrorBanner.classList.add("hidden");

  try {
    const data = await API.fetchWeeklyJournal(CONFIG.STUDENT_ID);
    el.reflectionMessage.textContent = data.reflection_message;
    el.statsRow.innerHTML = buildStatsPills(data.metrics);

    el.journalLoading.classList.add("hidden");
    el.journalContent.classList.remove("hidden");
  } catch (err) {
    el.journalLoading.classList.add("hidden");
    el.journalErrorBanner.classList.remove("hidden");
  }
}
el.btnRetryJournal.addEventListener("click", loadWeeklyJournal);

function buildStatsPills(metrics) {
  if (!metrics) return "";
  const breakdown = metrics.question_type_breakdown || {};
  const pills = [
    `📚 ${metrics.total_questions ?? 0} questions explored this week`,
    `✦ ${Math.round((metrics.engagement_ratio ?? 0) * 100)}% thoughtful reflections`,
    `⚖️ Solve: ${breakdown.solve ?? 0} · Explain: ${breakdown.explain ?? 0} · Verify: ${breakdown.verify ?? 0}`,
    `🌙 ${metrics.late_night_direct_answer_count ?? 0} late-night sessions`,
  ];
  return pills.map((text) => `<span class="stat-pill">${escapeHtml(text)}</span>`).join("");
}

// =========================================================
// Initialize
// =========================================================
el.questionInput.focus();
