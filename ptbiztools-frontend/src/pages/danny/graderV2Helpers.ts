import type { SalesGradeV2Response } from '../../services/api'

export interface NormalizedGraderResult {
  version?: string
  overall_score: number
  phases: Record<string, { score: number; summary: string; evidence?: string[] }>
  critical_behaviors: Record<string, { status: string; pass?: boolean; note: string; evidence?: string[] }>
  top_strength: string
  top_improvement: string
  prospect_summary: string
  deterministic?: {
    weightedPhaseScore: number
    penaltyPoints: number
    unknownPenalty: number
    overallScore: number
  }
  confidence?: {
    score: number
    evidenceCoverage: number
    quoteVerificationRate: number
    transcriptQuality: number
  }
  qualityGate?: {
    accepted: boolean
    reasons: string[]
  }
  metadata?: {
    closer: string
    outcome?: string
    model: string
  }
  diagnostics?: {
    verifiedQuotes: number
    totalQuotes: number
    unverifiedQuotes: string[]
  }
  storage?: {
    redactedTranscript: string
    transcriptHash: string
  }
}

export function normalizeBehaviorStatus(behavior: unknown): 'pass' | 'fail' | 'unknown' {
  if (!behavior || typeof behavior !== 'object') return 'unknown'
  const typed = behavior as { status?: string; pass?: boolean }

  if (typed.status === 'pass' || typed.status === 'fail' || typed.status === 'unknown') {
    return typed.status
  }

  if (typed.pass === true) return 'pass'
  if (typed.pass === false) return 'fail'
  return 'unknown'
}

export function normalizeV2Result(data: unknown): NormalizedGraderResult | null {
  if (!data || typeof data !== 'object') return null
  const typed = data as Record<string, unknown>

  if (typed.version === 'v2' && typed.phaseScores && typed.criticalBehaviors) {
    const v2 = typed as unknown as SalesGradeV2Response
    const criticalBehaviors = Object.fromEntries(
      Object.entries(v2.criticalBehaviors || {}).map(([key, value]) => {
        const status = normalizeBehaviorStatus(value)
        return [key, { ...value, status, pass: status === 'pass' }]
      }),
    )

    return {
      version: 'v2',
      overall_score: v2.deterministic?.overallScore ?? 0,
      phases: (v2.phaseScores || {}) as NormalizedGraderResult['phases'],
      critical_behaviors: criticalBehaviors as NormalizedGraderResult['critical_behaviors'],
      top_strength: v2.highlights?.topStrength || '',
      top_improvement: v2.highlights?.topImprovement || '',
      prospect_summary: v2.highlights?.prospectSummary || '',
      deterministic: v2.deterministic,
      confidence: v2.confidence,
      qualityGate: v2.qualityGate,
      metadata: v2.metadata,
      diagnostics: v2.diagnostics,
      storage: v2.storage,
    }
  }

  const legacy = typed as {
    critical_behaviors?: Record<string, unknown>
    overall_score?: number
  }
  const legacyBehaviors = Object.fromEntries(
    Object.entries(legacy.critical_behaviors || {}).map(([key, value]) => {
      const status = normalizeBehaviorStatus(value)
      return [key, { ...(value as object), status, pass: status === 'pass' }]
    }),
  )

  return {
    ...(typed as unknown as NormalizedGraderResult),
    critical_behaviors: legacyBehaviors as NormalizedGraderResult['critical_behaviors'],
    overall_score: legacy.overall_score ?? 0,
    phases: (typed.phases as NormalizedGraderResult['phases']) || {},
    top_strength: String(typed.top_strength || ''),
    top_improvement: String(typed.top_improvement || ''),
    prospect_summary: String(typed.prospect_summary || ''),
  }
}

export function canSubmitByWordCount(wordCount: number, minWords: number): boolean {
  return wordCount >= minWords
}

export function getWordGateMessage(wordCount: number, minWords: number): string {
  if (wordCount >= minWords) return `Quality gate ready (${wordCount} words)`
  return `Need ${Math.max(0, minWords - wordCount)} more words (min ${minWords})`
}
