const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';

/**
 * Call Ollama Generate API
 */
async function callOllama(prompt, format = null) {
  const body = {
    model: OLLAMA_MODEL,
    prompt: prompt,
    stream: false
  };
  if (format === 'json') {
    body.format = 'json';
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Ollama API Error:", error);
    throw new Error("Failed to communicate with local AI.");
  }
}

/**
 * Deterministic Hint Verification (Rule-based)
 * Returns { valid: boolean, reason?: string, revisedHint?: string }
 */
export function deterministicHintVerification(hint) {
  let revisedHint = hint.trim();
  
  // Rule 1: No Markdown Code Blocks
  if (revisedHint.includes('```')) {
    return { valid: false, reason: "Hint contains code blocks. This is likely spoon-feeding the answer." };
  }
  
  // Rule 2: Must contain a question mark
  if (!revisedHint.includes('?')) {
    return { valid: false, reason: "Hint does not contain a question mark. It must be a guiding question." };
  }
  
  // Rule 3: Length constraint (< 50 words)
  const wordCount = revisedHint.split(/\s+/).length;
  if (wordCount > 50) {
    return { valid: false, reason: `Hint is too long (${wordCount} words). Keep it under 50 words.` };
  }

  // Rule 4: Keyword Blacklist
  const blacklist = [
    "the answer is",
    "solution:",
    "here is the code",
    "just copy this",
    "step 1"
  ];
  const lowerHint = revisedHint.toLowerCase();
  for (const word of blacklist) {
    if (lowerHint.includes(word)) {
      return { valid: false, reason: `Hint contains forbidden phrase: "${word}".` };
    }
  }

  return { valid: true, revisedHint };
}

export async function classifyQuestion(question) {
  const prompt = `Classify the following student question into exactly one category: "Solve" (wants the direct answer), "Explain" (wants a concept explained), or "Verify" (wants their own attempt checked).

Question: """${question}"""

Reply with ONLY a JSON object like {"category":"Solve"}.`;

  const responseText = await callOllama(prompt, 'json');
  try {
    const data = JSON.parse(responseText);
    return data.category || "Unclassified";
  } catch (e) {
    return "Unclassified";
  }
}

export async function verifyEngagement(reply) {
  const prompt = `A student was given a hint and asked to share their own thinking before the next hint. Judge whether this reply shows genuine engagement (an attempt, a guess, a specific question, or an honest "I don't know where to start" WITH some context) versus a low-effort non-answer (like "ok", "next", "idk" alone, or near-empty text).

Student's reply: """${reply}"""

Reply with ONLY a JSON object like {"genuine": true}.`;

  const responseText = await callOllama(prompt, 'json');
  try {
    const data = JSON.parse(responseText);
    return data.genuine === true;
  } catch (e) {
    return true; // fail open
  }
}

export async function verifyCorrectness(question, reply) {
  const prompt = `A student is trying to solve the following problem:
Problem: """${question}"""

The student provided this answer/thought:
Student's reply: """${reply}"""

Does the student's reply contain the correct and complete final answer or the correct core methodology to solve the problem?
Reply with ONLY a JSON object like {"correct": true} or {"correct": false}. Be strict but fair.`;

  const responseText = await callOllama(prompt, 'json');
  try {
    const data = JSON.parse(responseText);
    return data.correct === true;
  } catch (e) {
    return false; // fail safe (assume not completely correct)
  }
}

export async function generateHint(subject, question, historyBlock, currentRound) {
  const prompt = `You are a Socratic tutor for a first- or second-year Computer Science / Engineering student, subject: ${subject}.
Never give away the final answer or solve the problem outright. Give exactly ONE short guiding question or minimal directional hint appropriate to hint round ${currentRound} (round 1 = gentle nudge, higher rounds = progressively more specific, but still never the full solution).

Student's original question: """${question}"""

${historyBlock}

Give hint round ${currentRound} now. 
CRITICAL RULES:
- You MUST end your hint with a question mark "?".
- Keep it under 40 words.
- DO NOT use markdown code blocks (\`\`\`).

Reply with ONLY a JSON object exactly matching this schema:
{
  "reasoning": "your step-by-step thinking before giving the hint",
  "confidence": 0.9,
  "hint": "the actual Socratic hint text"
}`;

  let retries = 3;
  let lastError = "";

  while (retries > 0) {
    let tryPrompt = prompt;
    if (lastError) {
      console.log('\\x1b[33m%s\\x1b[0m', `[Harness] Bơm feedback cho AI: "${lastError}"`);
      tryPrompt += `\n\nYour previous attempt was rejected because: ${lastError}. Fix this and try again.`;
    }
    
    let candidateHint = "";
    try {
      const responseText = await callOllama(tryPrompt, 'json');
      const data = JSON.parse(responseText);
      candidateHint = data.hint || "";
      if (lastError) {
        console.log('\\x1b[32m%s\\x1b[0m', `[Harness] AI đã suy nghĩ lại và trả lời: "${candidateHint}"`);
      }
    } catch (err) {
      console.log('\\x1b[31m%s\\x1b[0m', `[Harness] Lỗi parse JSON từ AI`);
      lastError = "Your output was not valid JSON. Please return exactly the JSON schema requested.";
      retries--;
      continue;
    }

    const verification = deterministicHintVerification(candidateHint);
    
    if (verification.valid) {
      if (retries < 3) console.log('\\x1b[32m%s\\x1b[0m', `[Harness] AI tự sửa lỗi thành công!`);
      return { text: verification.revisedHint, revision_applied: retries < 3 };
    } else {
      console.log('\\x1b[31m%s\\x1b[0m', `[Harness] Phát hiện lỗi ở Hint: ${verification.reason}`);
      lastError = verification.reason;
      retries--;
    }
  }
  
  console.log('\\x1b[31m%s\\x1b[0m', `[Harness] Đã hết số lần thử lại (retries), kích hoạt Fallback an toàn.`);
  // Fallback
  return { text: "Could you break down your thinking a bit more on this step?", revision_applied: true };
}

export async function generateFullSolution(question) {
  const prompt = `Give the complete, correct, step-by-step solution to this problem for a first/second-year CS/Engineering student. Be thorough and correct.

Question: """${question}"""

Write the full solution now.`;
  return await callOllama(prompt);
}

export async function generateWeeklyReflection(statsSummaryStr) {
  const prompt = `You write short, warm, non-judgmental weekly reflections for a student about their own AI study-tool usage. Never use words like "addiction", never lecture, never compare to other students, no red flags or alarm language. Phrase observations as open, curious questions the student can sit with, similar in tone to: "Did you notice most of your direct-answer requests happened after 9pm, in Probability?"

Here is this week's usage data (private to the student only): ${statsSummaryStr}

Write a short reflection (4-6 sentences) noticing one or two real patterns in this data, phrased gently and curiously, ending on an encouraging note. Do not just restate the numbers.`;
  return await callOllama(prompt);
}

export async function verifyCorrectness(question, message) {
  const prompt = `You are a strict but fair teacher evaluating a student's answer.
Question: """${question}"""
Student's Answer: """${message}"""

Does the student's answer correctly solve the question or demonstrate complete understanding of the core concept?
Return EXACTLY a JSON object with a single boolean property "correct".

Example output format:
{
  "correct": true
}`;
  try {
    const responseText = await callOllama(prompt, 'json');
    const data = JSON.parse(responseText);
    return data.correct === true;
  } catch (err) {
    return false;
  }
}
