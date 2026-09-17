import React, { useState } from 'react';
import { API, CONFIG } from '../api';

export default function StudySession() {
  const [question, setQuestion] = useState(() => localStorage.getItem("study_question") || "");
  const [reply, setReply] = useState(() => localStorage.getItem("study_reply") || "");
  
  const [sessionState, setSessionState] = useState(() => {
    const saved = localStorage.getItem("study_sessionState");
    if (saved) return JSON.parse(saved);
    return {
      id: null,
      status: "idle",
      detectedSubject: null,
      originalQuestion: "",
      lastMessage: null,
    };
  });

  React.useEffect(() => {
    localStorage.setItem("study_question", question);
  }, [question]);

  React.useEffect(() => {
    localStorage.setItem("study_reply", reply);
  }, [reply]);

  React.useEffect(() => {
    localStorage.setItem("study_sessionState", JSON.stringify(sessionState));
  }, [sessionState]);

  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState(null);

  const handleStart = async () => {
    if (!question.trim()) return;
    setError(null);
    setLoadingText("Formulating your first gentle hint...");
    try {
      const res = await API.startSession({ student_id: CONFIG.STUDENT_ID, message: question.trim() });
      setSessionState({
        id: res.session_id,
        status: res.status,
        detectedSubject: res.detected_subject || null,
        originalQuestion: question.trim(),
        lastMessage: res,
      });
    } catch (err) {
      setError(`Unable to start the session right now. Error: ${err.message} (Target URL: ${CONFIG.API_BASE_URL})`);
    } finally {
      setLoadingText("");
    }
  };

  const handleSend = async (action = "continue") => {
    if (action === "continue" && !reply.trim()) return;
    setError(null);
    setLoadingText(action === "request_full_solution" ? "Synthesizing full solution & takeaways..." : "Reviewing your reflection...");
    try {
      const res = await API.respondSession(sessionState.id, { message: reply.trim(), action });
      setSessionState(prev => ({ ...prev, status: res.status, lastMessage: res }));
      setReply("");
    } catch (err) {
      setError(`Could not send your response. Error: ${err.message}`);
    } finally {
      setLoadingText("");
    }
  };

  const resetSession = () => {
    setSessionState({ id: null, status: "idle", detectedSubject: null, originalQuestion: "", lastMessage: null });
    setQuestion("");
    setReply("");
    setError(null);
    localStorage.removeItem("study_question");
    localStorage.removeItem("study_reply");
    localStorage.removeItem("study_sessionState");
  };

  const renderResponseSlot = () => {
    const msg = sessionState.lastMessage;
    if (!msg) return null;

    if (msg.response_type === "hint") {
      const total = CONFIG.MAX_HINT_ROUNDS;
      const stage = msg.stage || 1;
      return (
        <>
          <div className="progress-row">
            <span>Hint {stage} of {total}</span>
            {[...Array(total)].map((_, i) => (
              <span key={i} className={`progress-dot ${i + 1 < stage ? "is-filled" : i + 1 === stage ? "is-current" : ""}`}></span>
            ))}
          </div>
          <div className="hint-bubble">
            {msg.verified && <span className="hint-bubble__verified" title="Pedagogically verified">✓</span>}
            <p className="hint-bubble__title">Hint #{stage}</p>
            <p className="hint-bubble__text">{msg.content}</p>
          </div>
        </>
      );
    }
    if (msg.response_type === "engagement_nudge") {
      return (
        <div className="banner banner--nudge">
          <div className="banner__head">
            <span className="banner__icon">✦</span>
            <div>
              <p className="banner__label">One Small Step</p>
              <p className="banner__text">{msg.content}</p>
            </div>
          </div>
        </div>
      );
    }
    if (msg.response_type === "full_solution") {
      return (
        <div className="solution-card">
          <p className="solution-card__label">✦ Comprehensive Solution</p>
          <p className="solution-card__text">{msg.content}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <section id="view-session" className="view">
      <div className="view-intro">
        <h1 className="view-title">Study Session</h1>
        <p className="view-subtitle">Ask anything you are stuck on — we will walk you through step by step, with zero pressure.</p>
      </div>

      {!sessionState.id ? (
        <section className="card composer">
          <div className="composer__head">
            <label className="composer__label">Your Question <span className="tag-soft">Freeform text</span></label>
          </div>
          <textarea rows="3" placeholder="e.g. Can you guide me through solving this integral: ∫ x · e^x dx?" value={question} onChange={e => setQuestion(e.target.value)} disabled={!!loadingText}></textarea>
          
          {loadingText && (
            <div className="thinking" style={{ marginTop: '1rem' }}>
              <span className="thinking__dot"></span><span className="thinking__dot"></span><span className="thinking__dot"></span>
              <span>{loadingText}</span>
            </div>
          )}

          {error && (
            <div className="banner banner--calm-error" style={{ marginTop: '1rem' }}>
              <p>{error}</p>
            </div>
          )}

          <div className="composer__footer">
            <p className="composer__note">✦ Ask freely — we'll untangle each step together.</p>
            <button className="btn btn-primary" onClick={handleStart} disabled={!!loadingText}>
              <span>Start with 1 hint</span><span className="btn-arrow">→</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="thread">
          <div className="thread__divider">
            <span></span>
            <p>Current Dialogue</p>
            <span></span>
            <button 
              className="link-btn" 
              style={{ padding: 0, marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }} 
              onClick={resetSession}
              title="Abandon this session and ask a new question"
            >
              Start over
            </button>
          </div>
          
          <div className="student-question">
            <div className="student-question__meta">
              {sessionState.detectedSubject && <span className="tag-soft">Topic: {sessionState.detectedSubject}</span>}
            </div>
            <p className="student-question__text">{sessionState.originalQuestion}</p>
          </div>

          <div id="response-slot">{renderResponseSlot()}</div>

          {loadingText && (
            <div className="thinking">
              <span className="thinking__dot"></span><span className="thinking__dot"></span><span className="thinking__dot"></span>
              <span>{loadingText}</span>
            </div>
          )}

          {error && (
            <div className="banner banner--calm-error">
              <p>{error}</p>
            </div>
          )}

          {sessionState.status !== "resolved" && sessionState.lastMessage?.requires_student_response && (
            <div className="reply-bar">
              <div className="reply-bar__row">
                <input type="text" placeholder="Share your thoughts or first intuition..." value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend("continue")} disabled={!!loadingText} />
                <button className="btn btn-primary btn-round" onClick={() => handleSend("continue")} disabled={!!loadingText}>Send</button>
              </div>
              <div className="reply-bar__footer">
                <p className="reply-bar__note">Press Enter to send · Take all the time you need</p>
                <button className="link-btn" onClick={() => handleSend("request_full_solution")} disabled={!!loadingText}>View full solution</button>
              </div>
            </div>
          )}

          {sessionState.status === "resolved" && (
            <div className="resolved-bar">
              <div className="resolved-message">
                <span className="resolved-icon">✦</span>
                <p>This study session is complete. You did great today!</p>
              </div>
              <button className="btn btn-primary" onClick={resetSession}>Ask a new question</button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
