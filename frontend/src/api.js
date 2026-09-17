export const CONFIG = {
  API_BASE_URL: "http://127.0.0.1:4040",
  MAX_HINT_ROUNDS: 4,
  STUDENT_ID: "stu_001",
};

export const API = {
  async startSession({ student_id, message }) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, subject: "General", message }),
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
