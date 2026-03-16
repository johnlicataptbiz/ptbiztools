/**
 * Discovery Grader - Utilities
 * Pure functions: adapters, formatters, score helpers, transcript utilities.
 * Depends on: ./constants, @/utils/grader, @/components/grader/types, @/lib/ptbiz-api
 */

import type { GradeResult } from "@/utils/grader";
import type { GraderResultData } from "@/components/grader/types";
import type { SalesGradeV2Response } from "@/lib/ptbiz-api";
import { LEGACY_PHASE_MAP, LEGACY_PHASE_MAX_POINTS } from "./constants";

// ---------------------------------------------------------------------------
// Outcome mapping
// ---------------------------------------------------------------------------

export function mapOutcome(outcome?: string): GradeResult["outcome"] {
  if (outcome === "Won") return "BOOKED";
  if (outcome === "Lost") return "NOT BOOKED";
  return "UNKNOWN";
}

// ---------------------------------------------------------------------------
// V2 API response → GradeResult
// ---------------------------------------------------------------------------

export function adaptV2ToGradeResult(v2: SalesGradeV2Response): GradeResult {
  const phaseScores = LEGACY_PHASE_MAP.map((phase) => ({
    name: phase.name,
    score: v2.phaseScores[phase.id]?.score ?? 0,
    maxScore: LEGACY_PHASE_MAX_POINTS[phase.id] ?? 100,
    summary: v2.phaseScores[phase.id]?.summary ?? "",
    evidence: v2.phaseScores[phase.id]?.evidence ?? [],
  }));

  const redFlags = Object.entries(v2.criticalBehaviors)
    .filter(([, value]) => value.status === "fail")
    .map(([key]) => key);

  const criticalBehaviors = Object.entries(v2.criticalBehaviors).map(
    ([id, cb]) => ({
      id,
      name: getBehaviorName(id),
      status: cb.status,
      note: cb.note,
      evidence: cb.evidence,
    })
  );

  return {
    score: v2.deterministic.overallScore,
    outcome: mapOutcome(v2.metadata.outcome),
    summary: `Deterministic score ${v2.deterministic.overallScore}/100. Confidence ${v2.confidence.score}/100.`,
    phaseScores,
    strengths: v2.highlights?.topStrength
      ? [v2.highlights.topStrength]
      : ["Good effort on the call"],
    improvements: v2.highlights?.topImprovement
      ? [v2.highlights.topImprovement]
      : ["Continue practicing the discovery framework"],
    redFlags,
    deidentifiedTranscript: v2.storage?.redactedTranscript || "",
    criticalBehaviors,
    deterministic: {
      weightedPhaseScore: v2.deterministic.weightedPhaseScore,
      penaltyPoints: v2.deterministic.penaltyPoints,
      unknownPenalty: v2.deterministic.unknownPenalty,
      overallScore: v2.deterministic.overallScore,
    },
    confidence: {
      score: v2.confidence.score,
      evidenceCoverage: v2.confidence.evidenceCoverage,
      quoteVerificationRate: v2.confidence.quoteVerificationRate,
      transcriptQuality: v2.confidence.transcriptQuality,
    },
    prospectSummary: v2.highlights.prospectSummary,
    evidence: {
      phases: v2.phaseScores as unknown as Record<
        string,
        import("@/utils/grader").PhaseScore
      >,
      criticalBehaviors: v2.criticalBehaviors as unknown as Record<
        string,
        import("@/utils/grader").CriticalBehavior
      >,
    },
  };
}

// ---------------------------------------------------------------------------
// Critical behavior name lookup
// ---------------------------------------------------------------------------

export function getBehaviorName(id: string): string {
  const names: Record<string, string> = {
    free_consulting: "No Free Consulting",
    discount_discipline: "Discount Discipline",
    emotional_depth: "Emotional Depth",
    time_management: "Time Management",
    personal_story: "Story Deployment",
  };
  return names[id] || id;
}

// ---------------------------------------------------------------------------
// Legacy GradeResult → GraderResultData adapter
// ---------------------------------------------------------------------------

export function adaptLegacyGradeToResult(grade: GradeResult): GraderResultData {
  const extendedGrade = grade as GradeResult &
    Pick<GraderResultData, "qualityGate" | "storage">;

  return {
    score: grade.score,
    outcome: grade.outcome,
    summary: grade.summary,
    phaseScores: grade.phaseScores.map((p) => ({
      name: p.name,
      score: p.score,
      maxScore: p.maxScore,
      summary: p.summary,
      evidence: p.evidence,
    })),
    strengths: grade.strengths,
    improvements: grade.improvements,
    redFlags: grade.redFlags,
    criticalBehaviors: grade.criticalBehaviors?.map((cb) => ({
      id: cb.id,
      name: cb.name,
      status: cb.status,
      note: cb.note,
      evidence: cb.evidence,
    })),
    deterministic: grade.deterministic,
    confidence: grade.confidence,
    prospectSummary: grade.prospectSummary,
    evidence: grade.evidence,
    qualityGate: extendedGrade.qualityGate,
    storage: extendedGrade.storage,
  };
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

export function shouldRetryGrading(response: {
  error?: string;
  reasons?: string[];
}) {
  const errorText = (response.error || "").toLowerCase();
  const reasons = (response.reasons || []).map((r) => r.toLowerCase());
  return (
    errorText.includes("model extraction schema validation failed") ||
    errorText.includes("quality gate rejected extraction") ||
    reasons.some((r) => r.includes("evidence"))
  );
}

// ---------------------------------------------------------------------------
// Transcript template
// ---------------------------------------------------------------------------

export const transcriptTemplate = `Clinician: Thanks for taking the call. What made you reach out now?
Prospect: I have chronic back pain and want to get back to lifting.
Clinician: Got it. What have you already tried, and what is still not working?
Prospect: PT at a chain clinic helped a little but the pain keeps returning.
`;

// ---------------------------------------------------------------------------
// Source type label
// ---------------------------------------------------------------------------

export function sourceTypeLabel(
  sourceType?: "pdf" | "text" | "csv" | "rtf" | "xlsx" | "image"
): string {
  if (!sourceType) return "file";
  if (sourceType === "pdf") return "PDF";
  if (sourceType === "xlsx") return "spreadsheet";
  if (sourceType === "image") return "image OCR";
  if (sourceType === "rtf") return "RTF";
  if (sourceType === "csv") return "CSV";
  return "text";
}

// ---------------------------------------------------------------------------
// Score color + label helpers
// ---------------------------------------------------------------------------

/** Returns a CSS hex color for a given score (0–100). */
export function sc(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

/** Returns a human-readable label for a given score (0–100). */
export function sl(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Decent";
  if (score >= 60) return "Needs Work";
  return "Significant Issues";
}

// ---------------------------------------------------------------------------
// Transcript statistics
// ---------------------------------------------------------------------------

export interface TranscriptStats {
  wordCount: number;
  charCount: number;
  lineCount: number;
  questionCount: number;
  clinicianMentions: number;
  prospectMentions: number;
  estimatedMinutes: number;
}

export function getTranscriptStats(value: string): TranscriptStats {
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

  return {
    wordCount: words.length,
    charCount: value.length,
    lineCount: trimmed ? trimmed.split(/\n+/).length : 0,
    questionCount: (value.match(/\?/g) || []).length,
    clinicianMentions: (
      value.match(/\b(clinician|coach|therapist|pt|doctor)\b/gi) || []
    ).length,
    prospectMentions: (
      value.match(/\b(prospect|patient|client)\b/gi) || []
    ).length,
    estimatedMinutes:
      words.length > 0 ? Math.max(1, Math.round(words.length / 145)) : 0,
  };
}

// ---------------------------------------------------------------------------
// Time formatter
// ---------------------------------------------------------------------------

export function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
