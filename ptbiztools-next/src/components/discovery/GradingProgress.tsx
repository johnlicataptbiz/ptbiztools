"use client";

import { formatElapsed } from "./utils";
import type { GradingStage } from "./types";

interface GradingProgressProps {
  gradingElapsed: number;
  gradingPulseDots: string;
  gradingProgressPct: number;
  activeStage: GradingStage;
}

export function GradingProgress({
  gradingElapsed,
  gradingPulseDots,
  gradingProgressPct,
  activeStage,
}: GradingProgressProps) {
  return (
    <div className="grading-progress-card" role="status" aria-live="polite">
      <div className="grading-progress-head">
        <span className="grading-progress-status">
          Live Analysis{gradingPulseDots}
        </span>
        <span className="grading-progress-time">
          {formatElapsed(gradingElapsed)}
        </span>
      </div>
      <div className="grading-progress-title">{activeStage.title}</div>
      <p className="grading-progress-detail">{activeStage.detail}</p>
      <div className="grading-progress-track">
        <div
          className="grading-progress-fill"
          style={{ width: `${gradingProgressPct}%` }}
        />
      </div>
    </div>
  );
}
