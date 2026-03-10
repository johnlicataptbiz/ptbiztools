export const PHASE_IDS = [
  'connection',
  'discovery',
  'gap_creation',
  'temp_check',
  'solution',
  'close',
  'followup',
] as const

export const CRITICAL_BEHAVIOR_IDS = [
  'free_consulting',
  'discount_discipline',
  'emotional_depth',
  'time_management',
  'personal_story',
] as const

export type PhaseId = (typeof PHASE_IDS)[number]
export type CriticalBehaviorId = (typeof CRITICAL_BEHAVIOR_IDS)[number]

export type ProgramProfile = 'Rainmaker' | 'Mastermind'

export interface ScoreProfile {
  weights: Record<PhaseId, number>
  failPenalties: Record<CriticalBehaviorId, number>
  lowPhasePenalties: Array<{
    phase: PhaseId
    threshold: number
    penalty: number
  }>
}

export const SCORE_PROFILES: Record<ProgramProfile, ScoreProfile> = {
  Rainmaker: {
    weights: {
      connection: 10,
      discovery: 25,
      gap_creation: 20,
      temp_check: 10,
      solution: 15,
      close: 15,
      followup: 5,
    },
    failPenalties: {
      free_consulting: 12,
      discount_discipline: 10,
      emotional_depth: 8,
      time_management: 6,
      personal_story: 4,
    },
    lowPhasePenalties: [
      { phase: 'discovery', threshold: 50, penalty: 8 },
      { phase: 'close', threshold: 50, penalty: 6 },
    ],
  },
  Mastermind: {
    weights: {
      connection: 10,
      discovery: 30,
      gap_creation: 15,
      temp_check: 10,
      solution: 20,
      close: 10,
      followup: 5,
    },
    failPenalties: {
      free_consulting: 12,
      discount_discipline: 8,
      emotional_depth: 10,
      time_management: 4,
      personal_story: 6,
    },
    lowPhasePenalties: [
      { phase: 'discovery', threshold: 55, penalty: 8 },
      { phase: 'solution', threshold: 55, penalty: 6 },
    ],
  },
}

export function normalizeProgramProfile(input: string | undefined): ProgramProfile | null {
  if (!input) return null
  const value = input.trim().toLowerCase()
  if (value === 'rainmaker') return 'Rainmaker'
  if (value === 'mastermind') return 'Mastermind'
  return null
}
