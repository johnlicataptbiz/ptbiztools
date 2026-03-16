"use client";

import { sc, sl } from "./utils";

interface ScoreBarProps {
  baseScore: number;
  deductions: number;
  totalScore: number;
}

export function ScoreBar({ baseScore, deductions, totalScore }: ScoreBarProps) {
  return (
    <div className="score-bar" style={{ marginTop: "16px" }}>
      <span className="score-bar-label">
        Phase Total: <strong>{baseScore}</strong>
        {deductions < 0 && (
          <span style={{ color: "var(--color-error)", marginLeft: "12px" }}>
            Red Flags: <strong>{deductions}</strong>
          </span>
        )}
      </span>
      <span className="score-bar-value" style={{ color: sc(totalScore) }}>
        {totalScore}/100 — {sl(totalScore)}
      </span>
    </div>
  );
}
