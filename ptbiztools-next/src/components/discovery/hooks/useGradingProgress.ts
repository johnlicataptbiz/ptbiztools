/**
 * useGradingProgress
 * Manages the grading timer, elapsed seconds, and stage index.
 * Resets automatically when isGrading becomes false (via effect cleanup).
 */

import { useState, useEffect } from "react";
import { DISCOVERY_GRADING_STAGES } from "../constants";

export interface GradingProgressState {
  gradingElapsed: number;
  gradingStageIndex: number;
  gradingPulseDots: string;
  gradingProgressPct: number;
  activeStage: (typeof DISCOVERY_GRADING_STAGES)[number];
}

export function useGradingProgress(isGrading: boolean): GradingProgressState {
  const [gradingElapsed, setGradingElapsed] = useState(0);
  const [gradingStageIndex, setGradingStageIndex] = useState(0);

  useEffect(() => {
    // Only run the timer while grading is active
    if (!isGrading) return;

    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );
      setGradingElapsed(elapsed);
      setGradingStageIndex(
        Math.min(
          DISCOVERY_GRADING_STAGES.length - 1,
          Math.floor(elapsed / 3)
        )
      );
    }, 1000);

    // Cleanup: clear timer and reset counters when grading stops
    return () => {
      window.clearInterval(timer);
      setGradingElapsed(0);
      setGradingStageIndex(0);
    };
  }, [isGrading]);

  return {
    gradingElapsed,
    gradingStageIndex,
    gradingPulseDots: ".".repeat((gradingElapsed % 3) + 1),
    gradingProgressPct: Math.min(96, 16 + gradingElapsed * 8),
    activeStage: DISCOVERY_GRADING_STAGES[gradingStageIndex],
  };
}
