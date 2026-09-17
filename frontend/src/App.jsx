import React, { useState } from 'react';
import Stickers from './components/Stickers';
import StudySession from './components/StudySession';
import WeeklyJournal from './components/WeeklyJournal';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState("session");

  return (
    <>
      <Stickers />
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <div className="brand__mark" aria-hidden="true">✦</div>
            <div className="brand__text">
              <span className="brand__name">StudyCompass</span>
            </div>
          </div>
          <nav className="tabs" role="tablist">
            <button 
              className={`tab ${activeTab === 'session' ? 'is-active' : ''}`} 
              onClick={() => setActiveTab('session')}
            >
              <span className="tab-icon">✦</span>
              <span>Study Session</span>
            </button>
            <button 
              className={`tab ${activeTab === 'journal' ? 'is-active' : ''}`} 
              onClick={() => setActiveTab('journal')}
            >
              <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span>Weekly Journal</span>
            </button>
          </nav>
        </div>
      </header>
      
      <main className="app-main">
        <div style={{ display: activeTab === 'session' ? 'block' : 'none' }}>
          <StudySession />
        </div>
        <div style={{ display: activeTab === 'journal' ? 'block' : 'none' }}>
          <WeeklyJournal />
        </div>
      </main>


    </>
  );
}
