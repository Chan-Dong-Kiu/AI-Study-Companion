import React, { useState, useEffect } from 'react';
import { API, CONFIG } from '../api';

export default function WeeklyJournal() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const loadJournal = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await API.fetchWeeklyJournal(CONFIG.STUDENT_ID);
      setData(result);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournal();
  }, []);

  return (
    <section id="view-journal" className="view">
      <div className="view-intro">
        <span className="eyebrow-pill">
          <span className="eyebrow-pill__dot"></span>
          A quiet look back
        </span>
        <h1 className="view-title">Weekly Journal</h1>
        <p className="view-subtitle">No scores, no leaderboards — just meaningful insights about your learning momentum.</p>
      </div>

      {loading && (
        <div className="journal-loading">
          <span className="thinking__dot"></span>
          <span className="thinking__dot"></span>
          <span className="thinking__dot"></span>
          <span>Reflecting on your week...</span>
        </div>
      )}

      {error && !loading && (
        <div className="banner banner--calm-error">
          <p>Unable to retrieve this week's journal right now. Please try again.</p>
          <button className="btn btn-ghost" onClick={loadJournal}>Retry</button>
        </div>
      )}

      {data && !loading && (
        <div id="journal-content">
          <section className="card reflection-card">
            <div className="reflection-card__badge">
              <span>✦ Personalized Weekly Reflection</span>
            </div>
            <p className="reflection-card__text">{data.reflection_message}</p>
          </section>

          <section className="stats-row">
            <span className="stat-pill">• {data.metrics?.total_questions || 0} questions explored</span>
            <span className="stat-pill">• {Math.round((data.metrics?.engagement_ratio || 0) * 100)}% thoughtful reflections</span>
            <span className="stat-pill">• Solve: {data.metrics?.question_type_breakdown?.solve || 0} · Explain: {data.metrics?.question_type_breakdown?.explain || 0} · Verify: {data.metrics?.question_type_breakdown?.verify || 0}</span>
            <span className="stat-pill">• {data.metrics?.late_night_direct_answer_count || 0} late-night sessions</span>
          </section>
        </div>
      )}
    </section>
  );
}
