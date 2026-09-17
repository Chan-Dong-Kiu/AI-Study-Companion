// =========================================================
// MOCK API — Simulates the real API contract shape.
// Used for prototyping & demoing frontend while backend (Ollama/Qwen) is being built.
// When backend is ready, just set CONFIG.USE_MOCK_API = false without touching app.js.
// =========================================================

const MockAPI = (() => {
  // Temporary session state storage in memory (simulating backend DB)
  const sessions = {};

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomDelay = (min = 900, max = 2000) =>
    delay(min + Math.random() * (max - min));

  const OUT_OF_SCOPE_KEYWORDS = ["cooking", "pizza recipe", "football", "gaming cheat", "movie spoiler"];

  function looksOutOfScope(message) {
    const lower = message.toLowerCase();
    return OUT_OF_SCOPE_KEYWORDS.some((kw) => lower.includes(kw));
  }

  function makeSessionId() {
    return "sess_" + Math.random().toString(36).slice(2, 10);
  }

  const HINT_LIBRARY = [
    "Before diving into formulas, can you identify which familiar category or problem type this belongs to?",
    "Try writing down the very first logical step you'd take — even if you're not 100% sure yet, that's completely okay.",
    "If we break this problem into two smaller parts, which part feels more intuitive to tackle first?",
    "What happens if you test the simplest possible edge case or sample value first?",
  ];

  async function startSession({ student_id, message }) {
    await randomDelay();

    if (looksOutOfScope(message)) {
      const sessionId = makeSessionId();
      sessions[sessionId] = { stage: 0, subject: null, status: "active" };
      return {
        session_id: sessionId,
        stage: 0,
        response_type: "out_of_scope",
        content:
          "This question seems outside our academic focus. Could you provide more context or describe a specific problem you're working on?",
        requires_student_response: true,
        status: "active",
      };
    }

    const sessionId = makeSessionId();
    sessions[sessionId] = { stage: 1, subject: "Data Structures & Algorithms", status: "active" };

    return {
      session_id: sessionId,
      stage: 1,
      response_type: "hint",
      content: HINT_LIBRARY[0],
      question_type: "solve",
      detected_subject: sessions[sessionId].subject,
      requires_student_response: true,
      verified: true,
      status: "active",
    };
  }

  async function respondSession(sessionId, { message, action }) {
    await randomDelay();
    const session = sessions[sessionId];
    if (!session) {
      throw new Error("Session does not exist (mock)");
    }

    // Student proactively requests full solution at any point
    if (action === "request_full_solution") {
      session.status = "resolved";
      session.stage = -1;
      return {
        session_id: sessionId,
        stage: -1,
        response_type: "full_solution",
        content:
          "Here is the comprehensive step-by-step solution:\n\n1. Problem Breakdown: Deconstruct the prompt into knowns and unknowns.\n2. Strategy Selection: Apply the optimal algorithm/technique.\n3. Implementation & Verification: Validate each constraint systematically.\n\n(Sample mock response — the production backend provides complete worked solutions tailored to your original question.)",
        requires_student_response: false,
        status: "resolved",
      };
    }

    if (looksOutOfScope(message || "")) {
      return {
        session_id: sessionId,
        stage: session.stage,
        response_type: "out_of_scope",
        content: "This still seems unrelated to your core topic — could you rephrase your question in terms of your study material?",
        requires_student_response: true,
        status: "active",
      };
    }

    // Low-effort responses -> gentle engagement nudge (no bypass button, reinforcing real reflection)
    const trimmed = (message || "").trim();
    const isLowEffort = trimmed.length < 5 || /^(ok|next|idk|dunno|help|pass|skip|yes|no)$/i.test(trimmed);

    if (isLowEffort) {
      return {
        session_id: sessionId,
        stage: session.stage,
        response_type: "engagement_nudge",
        content:
          "Could you share a tiny piece of how you're thinking about this? Even a wild guess helps us tailor the next hint directly to your perspective.",
        requires_student_response: true,
        status: "active",
      };
    }

    // Valid response -> advance to next stage or automatically present solution when max rounds reached
    const nextStage = session.stage + 1;

    if (nextStage > CONFIG.MAX_HINT_ROUNDS) {
      session.status = "resolved";
      session.stage = -1;
      return {
        session_id: sessionId,
        stage: -1,
        response_type: "full_solution",
        content:
          "Great job working through the hints! Here is the full solution and takeaway:\n\nBy following each milestone and testing your assumptions, the core concept resolves cleanly. Review the final steps above and see how your initial intuition aligned with the complete answer.",
        requires_student_response: false,
        status: "resolved",
      };
    }

    session.stage = nextStage;
    const hintContent =
      HINT_LIBRARY[(nextStage - 1) % HINT_LIBRARY.length] ||
      "Try taking one more step forward based on your latest reflection.";

    return {
      session_id: sessionId,
      stage: nextStage,
      response_type: "hint",
      content: hintContent,
      requires_student_response: true,
      verified: true,
      hint_revision_applied: Math.random() < 0.15,
      status: "active",
    };
  }

  async function fetchWeeklyJournal(studentId) {
    await randomDelay(600, 1200);
    return {
      student_id: studentId,
      week_start: "2026-09-08",
      week_end: "2026-09-14",
      metrics: {
        total_questions: 14,
        question_type_breakdown: { solve: 6, explain: 5, verify: 3 },
        engagement_ratio: 0.78,
        low_effort_hint_requests: 2,
        late_night_direct_answer_count: 1,
      },
      reflection_message:
        "This week, you explored 14 concepts and took time to articulate your own reasoning on 78% of hint rounds. Notice how stepping back before asking for the answer gave you clearer breakthroughs?",
    };
  }

  return { startSession, respondSession, fetchWeeklyJournal };
})();
