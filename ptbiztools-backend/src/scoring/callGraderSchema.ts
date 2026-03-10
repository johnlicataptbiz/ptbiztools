import { z } from 'zod'
import { CRITICAL_BEHAVIOR_IDS, PHASE_IDS } from './callGraderProfiles.js'

const phaseEvidenceSchema = z
  .array(z.string().trim().min(1).max(300))
  .max(6)

const phaseAssessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().trim().min(8).max(800),
  evidence: phaseEvidenceSchema,
})

const behaviorStatusSchema = z.enum(['pass', 'fail', 'unknown'])

const behaviorAssessmentSchema = z.object({
  status: behaviorStatusSchema,
  note: z.string().trim().min(3).max(600),
  evidence: z.array(z.string().trim().min(1).max(300)).max(4),
})

export const salesGradeV2RequestSchema = z.object({
  transcript: z.string().trim().min(1),
  program: z.enum(['Rainmaker', 'Mastermind']),
  closer: z.string().trim().min(1).max(120),
  outcome: z.enum(['Won', 'Lost']).optional(),
  prospectName: z.string().trim().max(120).optional(),
  callMeta: z
    .object({
      durationMinutes: z.number().int().positive().max(600).optional(),
    })
    .optional(),
})

export const extractionResultSchema = z.object({
  phases: z.object({
    connection: phaseAssessmentSchema,
    discovery: phaseAssessmentSchema,
    gap_creation: phaseAssessmentSchema,
    temp_check: phaseAssessmentSchema,
    solution: phaseAssessmentSchema,
    close: phaseAssessmentSchema,
    followup: phaseAssessmentSchema,
  }),
  critical_behaviors: z.object({
    free_consulting: behaviorAssessmentSchema,
    discount_discipline: behaviorAssessmentSchema,
    emotional_depth: behaviorAssessmentSchema,
    time_management: behaviorAssessmentSchema,
    personal_story: behaviorAssessmentSchema,
  }),
  top_strength: z.string().trim().min(5).max(600),
  top_improvement: z.string().trim().min(5).max(600),
  prospect_summary: z.string().trim().min(5).max(1000),
})

export type SalesGradeV2Request = z.infer<typeof salesGradeV2RequestSchema>
export type ExtractionResult = z.infer<typeof extractionResultSchema>
export type BehaviorStatus = z.infer<typeof behaviorStatusSchema>

export function zodIssuesToReasons(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'payload'
    return `${path}: ${issue.message}`
  })
}

export const phaseIdSet = new Set<string>(PHASE_IDS)
export const behaviorIdSet = new Set<string>(CRITICAL_BEHAVIOR_IDS)
