import express from 'express';
import crypto from 'crypto';
import db from '../db/database.js';
import { 
  classifyQuestion, 
  generateHint, 
  verifyEngagement, 
  generateFullSolution,
  generateWeeklyReflection,
  verifyCorrectness
} from '../services/ollamaService.js';

const router = express.Router();

/**
 * Helper to build history block for the prompt
 */
function buildHistoryBlock(sessionId) {
  const rows = db.prepare('SELECT round, role, content FROM messages WHERE session_id = ? ORDER BY id ASC').all(sessionId);
  let block = "";
  for (const row of rows) {
    if (row.role === 'ai') {
      block += `Hint round ${row.round}: "${row.content}"\n`;
    } else if (row.role === 'student') {
      block += `Student's reply: "${row.content}"\n`;
    }
  }
  return block;
}

/**
 * 1. Bắt đầu phiên hỏi bài
 * POST /api/session
 */
router.post('/session', async (req, res) => {
  try {
    const { student_id, subject, message } = req.body;
    if (!student_id || !subject || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sessionId = 'sess_' + crypto.randomBytes(8).toString('hex');
    const stage = 1;

    const insertSession = db.prepare(`
      INSERT INTO sessions (id, student_id, subject, question, stage, status) 
      VALUES (?, ?, ?, ?, ?, 'active')
    `);
    insertSession.run(sessionId, student_id, subject, message, stage);

    const questionType = await classifyQuestion(message);
    db.prepare('UPDATE sessions SET question_type = ? WHERE id = ?').run(questionType, sessionId);

    const historyBlock = buildHistoryBlock(sessionId);
    const hintResult = await generateHint(subject, message, historyBlock, stage);

    db.prepare(`
      INSERT INTO messages (session_id, round, role, content) 
      VALUES (?, ?, 'ai', ?)
    `).run(sessionId, stage, hintResult.text);

    return res.json({
      session_id: sessionId,
      stage: stage,
      response_type: "hint",
      content: hintResult.text,
      question_type: questionType,
      requires_student_response: true,
      verified: true, 
      hint_revision_applied: hintResult.revision_applied,
      status: "active"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * 2. Sinh viên phản hồi / xin gợi ý tiếp / xin đáp án
 * POST /api/session/:session_id/respond
 */
router.post('/session/:session_id/respond', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { message, action } = req.body;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.status === 'resolved') {
      return res.status(400).json({ error: "Session already resolved" });
    }

    // SOFT CAP check: Max 4 rounds
    const MAX_ROUNDS = 4;
    let effectiveAction = action;
    if (action === 'continue' && session.stage >= MAX_ROUNDS) {
      effectiveAction = 'request_full_solution';
    }

    if (effectiveAction === 'request_full_solution') {
      const solution = await generateFullSolution(session.question);
      
      db.prepare('UPDATE sessions SET stage = -1, status = "resolved" WHERE id = ?').run(session_id);
      db.prepare('INSERT INTO messages (session_id, round, role, content) VALUES (?, ?, ?, ?)').run(session_id, session.stage, 'ai', solution);

      return res.json({
        session_id,
        stage: -1,
        response_type: "full_solution",
        content: solution,
        requires_student_response: false,
        status: "resolved"
      });
    }

    if (effectiveAction === 'continue') {
      const isGenuine = await verifyEngagement(message);
      
      db.prepare('INSERT INTO messages (session_id, round, role, content, is_genuine) VALUES (?, ?, ?, ?, ?)').run(session_id, session.stage, 'student', message, isGenuine ? 1 : 0);

      if (!isGenuine) {
        return res.json({
          session_id,
          stage: session.stage,
          response_type: "engagement_nudge",
          content: "Could you try sharing your current train of thought, even if you're not sure it's correct?",
          requires_student_response: true,
          status: "active"
        });
      }

      const isCorrect = await verifyCorrectness(session.question, message);
      if (isCorrect) {
        const congratsMsg = "Spot on! That is exactly correct. You did a great job figuring it out! Here is the complete breakdown for your reference:\n\n" + await generateFullSolution(session.question);
        
        db.prepare('UPDATE sessions SET stage = -1, status = "resolved" WHERE id = ?').run(session_id);
        db.prepare('INSERT INTO messages (session_id, round, role, content) VALUES (?, ?, ?, ?)').run(session_id, session.stage, 'ai', congratsMsg);

        return res.json({
          session_id,
          stage: -1,
          response_type: "full_solution",
          content: congratsMsg,
          requires_student_response: false,
          status: "resolved"
        });
      }

      const nextStage = session.stage + 1;
      db.prepare('UPDATE sessions SET stage = ? WHERE id = ?').run(nextStage, session_id);
      
      const historyBlock = buildHistoryBlock(session_id);
      const hintResult = await generateHint(session.subject, session.question, historyBlock, nextStage);

      db.prepare('INSERT INTO messages (session_id, round, role, content) VALUES (?, ?, ?, ?)').run(session_id, nextStage, 'ai', hintResult.text);

      return res.json({
        session_id,
        stage: nextStage,
        response_type: "hint",
        content: hintResult.text,
        requires_student_response: true,
        verified: true,
        hint_revision_applied: hintResult.revision_applied,
        status: "active"
      });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message, stack: error.stack });
  }
});

/**
 * 3. Lấy nhật ký phản chiếu tuần
 * GET /api/journal/weekly
 */
router.get('/journal/weekly', async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: "Missing student_id" });

    const sessions = db.prepare('SELECT * FROM sessions WHERE student_id = ?').all(student_id);
    
    let total_questions = sessions.length;
    let typeCounts = { solve: 0, explain: 0, verify: 0 };
    sessions.forEach(s => {
      const type = (s.question_type || "").toLowerCase();
      if (typeCounts[type] !== undefined) typeCounts[type]++;
    });

    const messages = db.prepare(`
      SELECT m.is_genuine 
      FROM messages m 
      JOIN sessions s ON m.session_id = s.id 
      WHERE s.student_id = ? AND m.role = 'student'
    `).all(student_id);

    let totalReplies = messages.length;
    let genuineReplies = messages.filter(m => m.is_genuine === 1).length;
    let engagement_ratio = totalReplies > 0 ? (genuineReplies / totalReplies).toFixed(2) : 1.0;
    let low_effort = totalReplies - genuineReplies;

    let statsObj = {
      total_questions,
      question_type_breakdown: typeCounts,
      engagement_ratio: parseFloat(engagement_ratio),
      low_effort_hint_requests: low_effort,
      late_night_direct_answer_count: 0
    };

    let reflectionMsg = "Chưa đủ dữ liệu để tạo nhật ký.";
    if (total_questions > 0) {
       reflectionMsg = await generateWeeklyReflection(JSON.stringify(statsObj));
    }

    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return res.json({
      student_id,
      week_start: lastWeek.toISOString().split('T')[0],
      week_end: today.toISOString().split('T')[0],
      metrics: statsObj,
      reflection_message: reflectionMsg
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
