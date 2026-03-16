"use client";

import type { TranscriptStats } from "./utils";

interface SidePanelProps {
  stats: TranscriptStats | null;
  redFlagCount: number;
  totalScore: number;
}

const QUALITY_TIPS = [
  "Ensure the transcript includes both coach and client turns",
  "Minimum 300 words for accurate grading",
  "Include timestamps if available for better analysis",
  "Remove any personally identifiable information before uploading",
];

const CHECKLIST = [
  "Transcript uploaded or pasted",
  "Coach and client names entered",
  "Call date selected",
  "Call outcome selected",
  "All phases reviewed",
];

export function SidePanel({ stats, redFlagCount, totalScore }: SidePanelProps) {
  return (
    <aside className="grader-side-panel">
      {stats && (
        <div className="side-panel-section">
          <h4 className="side-panel-heading">Transcript Diagnostics</h4>
          <ul className="side-panel-list">
            <li>
              <span>Words</span>
              <strong>{stats.wordCount.toLocaleString()}</strong>
            </li>
            <li>
              <span>Characters</span>
              <strong>{stats.charCount.toLocaleString()}</strong>
            </li>
            <li>
              <span>Lines</span>
              <strong>{stats.lineCount}</strong>
            </li>
            <li>
              <span>Questions</span>
              <strong>{stats.questionCount}</strong>
            </li>
            <li>
              <span>Clinician mentions</span>
              <strong>{stats.clinicianMentions}</strong>
            </li>
            <li>
              <span>Prospect mentions</span>
              <strong>{stats.prospectMentions}</strong>
            </li>
            <li>
              <span>Est. duration</span>
              <strong>~{stats.estimatedMinutes} min</strong>
            </li>
          </ul>
        </div>
      )}

      <div className="side-panel-section">
        <h4 className="side-panel-heading">Session Summary</h4>
        <ul className="side-panel-list">
          <li>
            <span>Red flags</span>
            <strong
              style={{ color: redFlagCount > 0 ? "var(--color-error)" : undefined }}
            >
              {redFlagCount}
            </strong>
          </li>
          <li>
            <span>Current score</span>
            <strong>{totalScore}/100</strong>
          </li>
        </ul>
      </div>

      <div className="side-panel-section">
        <h4 className="side-panel-heading">Pre-Grade Checklist</h4>
        <ul className="side-panel-checklist">
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="side-panel-section">
        <h4 className="side-panel-heading">Quality Tips</h4>
        <ul className="side-panel-tips">
          {QUALITY_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
