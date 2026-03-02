import {
  CRITICAL_BEHAVIOR_IDS,
  PHASE_IDS,
  SCORE_PROFILES,
  type CriticalBehaviorId,
  type PhaseId,
  type ProgramProfile,
} from './callGraderProfiles.js'
import type { BehaviorStatus, ExtractionResult } from './callGraderSchema.js'
import { evaluateTranscriptQuality } from './transcriptQuality.js'

const UNKNOWN_BEHAVIOR_PENALTY = 3

export interface PhaseScoreV2 {
  score: number
  summary: string
  evidence: string[]
}

export interface CriticalBehaviorV2 {
  status: BehaviorStatus
  note: string
  evidence: string[]
}

export interface DeterministicBreakdown {
  weightedPhaseScore: number
  penaltyPoints: number
  unknownPenalty: number
  overallScore: number
}

export interface ConfidenceBreakdown {
  score: number
  evidenceCoverage: number
  quoteVerificationRate: number
  transcriptQuality: number
}

export interface QualityGateResult {
  accepted: boolean
  reasons: string[]
}

export interface DeterministicGradeV2 {
  version: 'v2'
  programProfile: ProgramProfile
  phaseScores: Record<PhaseId, PhaseScoreV2>
  criticalBehaviors: Record<CriticalBehaviorId, CriticalBehaviorV2>
  deterministic: DeterministicBreakdown
  confidence: ConfidenceBreakdown
  qualityGate: QualityGateResult
  highlights: {
    topStrength: string
    topImprovement: string
    prospectSummary: string
  }
  diagnostics: {
    verifiedQuotes: number
    totalQuotes: number
    unverifiedQuotes: string[]
  }
}

interface ComputeArgs {
  transcript: string
  extraction: ExtractionResult
  program: ProgramProfile
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return Math.round(value)
}

function normalizeQuote(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim()
}

function verifyQuote(quote: string, normalizedTranscript: string): boolean {
  const normalizedQuote = normalizeQuote(quote)
  if (!normalizedQuote) return false
  return normalizedTranscript.includes(normalizedQuote)
}

function buildQualityGate(
  transcript: string,
  phaseScores: Record<PhaseId, PhaseScoreV2>,
  criticalBehaviors: Record<CriticalBehaviorId, CriticalBehaviorV2>,
): QualityGateResult {
  const transcriptQuality = evaluateTranscriptQuality(transcript)
  const reasons = [...transcriptQuality.reasons]

  for (const phaseId of PHASE_IDS) {
    const phase = phaseScores[phaseId]
    if (!phase) {
      reasons.push(`Missing phase: ${phaseId}`)
      continue
    }
    if (!Number.isInteger(phase.score) || phase.score < 0 || phase.score > 100) {
      reasons.push(`Invalid phase score for ${phaseId}: must be integer 0-100`)
    }
    if (!Array.isArray(phase.evidence) || phase.evidence.length === 0) {
      reasons.push(`Phase ${phaseId} must include at least one evidence quote`)
    }
  }

  for (const behaviorId of CRITICAL_BEHAVIOR_IDS) {
    const behavior = criticalBehaviors[behaviorId]
    if (!behavior) {
      reasons.push(`Missing critical behavior: ${behaviorId}`)
      continue
    }
    if (!behavior.status) {
      reasons.push(`Critical behavior ${behaviorId} missing status`)
    }
    if (!behavior.note || behavior.note.trim().length === 0) {
      reasons.push(`Critical behavior ${behaviorId} missing note`)
    }
    if (!Array.isArray(behavior.evidence) || behavior.evidence.length === 0) {
      reasons.push(`Critical behavior ${behaviorId} must include at least one evidence quote`)
    }
  }

  return {
    accepted: reasons.length === 0,
    reasons,
  }
}

function computeWeightedPhaseScore(
  phaseScores: Record<PhaseId, PhaseScoreV2>,
  program: ProgramProfile,
): number {
  const weights = SCORE_PROFILES[program].weights
  const total = PHASE_IDS.reduce((sum, phaseId) => {
    return sum + phaseScores[phaseId].score * weights[phaseId]
  }, 0)
  return clampScore(total / 100)
}

function computePenaltyPoints(
  phaseScores: Record<PhaseId, PhaseScoreV2>,
  criticalBehaviors: Record<CriticalBehaviorId, CriticalBehaviorV2>,
  program: ProgramProfile,
): { failPenalty: number; additionalPenalty: number; unknownPenalty: number } {
  const profile = SCORE_PROFILES[program]

  const failPenalty = CRITICAL_BEHAVIOR_IDS.reduce((sum, behaviorId) => {
    return criticalBehaviors[behaviorId].status === 'fail'
      ? sum + profile.failPenalties[behaviorId]
      : sum
  }, 0)

  const additionalPenalty = profile.lowPhasePenalties.reduce((sum, item) => {
    return phaseScores[item.phase].score < item.threshold ? sum + item.penalty : sum
  }, 0)

  const unknownCount = CRITICAL_BEHAVIOR_IDS.filter(
    (behaviorId) => criticalBehaviors[behaviorId].status === 'unknown',
  ).length

  return {
    failPenalty,
    additionalPenalty,
    unknownPenalty: unknownCount * UNKNOWN_BEHAVIOR_PENALTY,
  }
}

function computeConfidence(
  phaseScores: Record<PhaseId, PhaseScoreV2>,
  criticalBehaviors: Record<CriticalBehaviorId, CriticalBehaviorV2>,
  transcript: string,
): {
  confidence: ConfidenceBreakdown
  verifiedQuotes: number
  totalQuotes: number
  unverifiedQuotes: string[]
} {
  const phaseCoverageCount = PHASE_IDS.filter((phaseId) => phaseScores[phaseId].evidence.length > 0).length
  const evidenceCoverage = phaseCoverageCount / PHASE_IDS.length

  const allQuotes = [
    ...PHASE_IDS.flatMap((phaseId) => phaseScores[phaseId].evidence),
    ...CRITICAL_BEHAVIOR_IDS.flatMap((behaviorId) => criticalBehaviors[behaviorId].evidence),
  ]

  const normalizedTranscript = normalizeQuote(transcript)
  const unverifiedQuotes: string[] = []
  let verifiedQuotes = 0

  for (const quote of allQuotes) {
    if (verifyQuote(quote, normalizedTranscript)) {
      verifiedQuotes += 1
      continue
    }
    unverifiedQuotes.push(quote)
  }

  const totalQuotes = allQuotes.length
  const quoteVerificationRate = totalQuotes > 0 ? verifiedQuotes / totalQuotes : 0
  const transcriptQuality = evaluateTranscriptQuality(transcript).transcriptQuality

  const score = clampScore(
    100 * (0.45 * evidenceCoverage + 0.35 * quoteVerificationRate + 0.2 * transcriptQuality),
  )

  return {
    confidence: {
      score,
      evidenceCoverage,
      quoteVerificationRate,
      transcriptQuality,
    },
    verifiedQuotes,
    totalQuotes,
    unverifiedQuotes,
  }
}

export function computeDeterministicGrade(args: ComputeArgs): DeterministicGradeV2 {
  const phaseScores: Record<PhaseId, PhaseScoreV2> = {
    connection: args.extraction.phases.connection,
    discovery: args.extraction.phases.discovery,
    gap_creation: args.extraction.phases.gap_creation,
    temp_check: args.extraction.phases.temp_check,
    solution: args.extraction.phases.solution,
    close: args.extraction.phases.close,
    followup: args.extraction.phases.followup,
  }

  const criticalBehaviors: Record<CriticalBehaviorId, CriticalBehaviorV2> = {
    free_consulting: args.extraction.critical_behaviors.free_consulting,
    discount_discipline: args.extraction.critical_behaviors.discount_discipline,
    emotional_depth: args.extraction.critical_behaviors.emotional_depth,
    time_management: args.extraction.critical_behaviors.time_management,
    personal_story: args.extraction.critical_behaviors.personal_story,
  }

  const weightedPhaseScore = computeWeightedPhaseScore(phaseScores, args.program)
  const penalties = computePenaltyPoints(phaseScores, criticalBehaviors, args.program)
  const penaltyPoints = penalties.failPenalty + penalties.additionalPenalty
  const overallScore = clampScore(weightedPhaseScore - penaltyPoints - penalties.unknownPenalty)

  const qualityGate = buildQualityGate(args.transcript, phaseScores, criticalBehaviors)
  const confidenceResult = computeConfidence(phaseScores, criticalBehaviors, args.transcript)

  return {
    version: 'v2',
    programProfile: args.program,
    phaseScores,
    criticalBehaviors,
    deterministic: {
      weightedPhaseScore,
      penaltyPoints,
      unknownPenalty: penalties.unknownPenalty,
      overallScore,
    },
    confidence: confidenceResult.confidence,
    qualityGate,
    highlights: {
      topStrength: args.extraction.top_strength,
      topImprovement: args.extraction.top_improvement,
      prospectSummary: args.extraction.prospect_summary,
    },
    diagnostics: {
      verifiedQuotes: confidenceResult.verifiedQuotes,
      totalQuotes: confidenceResult.totalQuotes,
      unverifiedQuotes: confidenceResult.unverifiedQuotes,
    },
  }
}
