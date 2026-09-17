import React from 'react';

export default function Stickers() {
  return (
    <div className="bg-stickers-layer" aria-hidden="true">
      {/* Top Left: Study Compass */}
      <div className="sticker sticker--compass" title="Follow your direction">
        <svg viewBox="0 0 64 64" width="60" height="60" fill="none">
          <circle cx="32" cy="32" r="28" fill="#FFF2F4" stroke="var(--color-primary)" strokeWidth="2.5" strokeDasharray="3 3"/>
          <circle cx="32" cy="32" r="24" fill="var(--color-surface)" stroke="var(--color-primary-container)" strokeWidth="1.5"/>
          <polygon points="32,12 36,30 32,27 28,30" fill="var(--color-primary)"/>
          <polygon points="32,52 36,34 32,37 28,34" fill="var(--color-outline-variant)"/>
          <circle cx="32" cy="32" r="3" fill="var(--color-primary)"/>
        </svg>
        <span className="sticker-badge">Explore</span>
      </div>

      {/* Top Right: Lightbulb */}
      <div className="sticker sticker--lightbulb" title="Aha moment!">
        <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
          <ellipse cx="32" cy="27" rx="18" ry="19" fill="#FFF8E7" stroke="var(--color-secondary)" strokeWidth="2"/>
          <path d="M25 45h14M26 49h12M28 53h8" stroke="var(--color-on-surface-variant)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M23 34c1 4 4 7 9 7s8-3 9-7" stroke="var(--color-primary-container)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="32" y1="3" x2="32" y2="7" stroke="var(--color-primary-container)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="49" y1="12" x2="46" y2="15" stroke="var(--color-primary-container)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="15" y1="12" x2="18" y2="15" stroke="var(--color-primary-container)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="sticker-badge sticker-badge--warm">Think ✦</span>
      </div>

      {/* Mid Left: Sticky Note */}
      <div className="sticker sticker--note" title="Step by step">
        <div className="sticker-note">
          <span className="sticker-pin"></span>
          <p className="sticker-note__heading">Step 1</p>
          <div className="sticker-note__lines">
            <span></span><span></span><span></span>
          </div>
          <span className="sticker-note__tag">one bite at a time</span>
        </div>
      </div>

      {/* Mid Right: Cozy Mug */}
      <div className="sticker sticker--mug" title="Take your time">
        <svg viewBox="0 0 64 64" width="54" height="54" fill="none">
          <path d="M18 24h24v22a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8V24z" fill="var(--color-surface-container)" stroke="var(--color-tertiary)" strokeWidth="2"/>
          <path d="M42 28h5a5 5 0 0 1 5 5v4a5 5 0 0 1-5 5h-5" stroke="var(--color-tertiary)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M24 16c0-4 4-4 4-8" stroke="var(--color-primary-container)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
          <path d="M34 16c0-4 4-4 4-8" stroke="var(--color-primary-container)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
        </svg>
        <span className="sticker-badge sticker-badge--cozy">No Rush ☕</span>
      </div>

      {/* Bottom Left: Paper Plane */}
      <div className="sticker sticker--plane" title="Continuous progress">
        <svg viewBox="0 0 64 64" width="52" height="52" fill="none">
          <path d="M12 32l40-18-16 38-6-14-18-6z" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M30 38l22-24" stroke="var(--color-primary)" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Sparkles */}
      <div className="ambient-sparkle sparkle-1">✦</div>
      <div className="ambient-sparkle sparkle-2">✧</div>
      <div className="ambient-sparkle sparkle-3">✴</div>
      <div className="ambient-sparkle sparkle-4">✦</div>
      <div className="ambient-sparkle sparkle-5">✧</div>
    </div>
  );
}
