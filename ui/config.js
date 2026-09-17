// =========================================================
// Global Configuration — switch USE_MOCK_API = false when backend is ready
// =========================================================
const CONFIG = {
  // Change to real backend address (e.g., "http://localhost:3000")
  API_BASE_URL: "http://localhost:3000",

  // true  -> use mock-api.js, runs independently without backend (for demo/frontend dev)
  // false -> real calls to API_BASE_URL following the API contract
  USE_MOCK_API: false,

  // Maximum hint rounds before full solution is recommended
  MAX_HINT_ROUNDS: 4,

  // Demo student_id — in production, retrieved from auth session
  STUDENT_ID: "stu_001",
};
