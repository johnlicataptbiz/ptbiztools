/**
 * Discovery Grader - Types
 * This module defines discovery-specific type definitions and re-exports shared types.
 * Safe for Phase A extraction: no runtime code, no side effects.
 */

import type {
  PhaseScore,
  CriticalBehavior,
  DeterministicScore,
  ConfidenceMetrics,
  GraderResultData,
} from "@/components/grader/types";
import type { GradeResult } from "@/utils/grader";

/**
 * Phase rubric definition used by the Discovery Call Grader.
 */
export interface PhaseDefinition {
  id: string;
  name: string;
  maxPoints: number;
  great: string[];
  mistakes: string[];
  callout?: string;
}

/**
 * Red flag definition that applies a deduction to the overall score.
 */
export interface RedFlagDefinition {
  id: string;
  label: string;
  deduction: number;
  desc: string;
}

/**
 * Grading stage metadata used for live progress UI.
 */
export interface GradingStage {
  title: string;
  detail: string;
}

/**
 * Standardized discovery outcomes.
 */
export type DiscoveryOutcome = "BOOKED" | "NOT BOOKED" | "UNKNOWN";

/**
 * Re-export shared grader types for convenience in discovery module.
 */
export type {
  PhaseScore,
  CriticalBehavior,
  DeterministicScore,
  ConfidenceMetrics,
  GraderResultData,
};

/**
 * Convenient alias. GradeResult already carries extended fields
 * (criticalBehaviors, deterministic, confidence, prospectSummary, evidence, etc.).
 */
export type DiscoveryGradeResult = GradeResult;

/**
 * UI prop types for extracted components.
 * These are included here to keep presentational components simple and typed.
 */

export interface PhaseCardProps {
  phase: PhaseDefinition;
  score: number;
  notes: string;
  onScore: (id: string, val: number) => void;
  onNotes: (id: string, val: string) => void;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

export interface RedFlagsPanelProps {
  flags: string[];
  onToggle: (id: string) => void;
}
