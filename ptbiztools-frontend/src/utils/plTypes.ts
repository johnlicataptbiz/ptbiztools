export type ClinicSize = 'individual' | 'multi'
export type ClinicModel = 'cash' | 'hybrid'
export type BusinessStage = 'startup' | 'growth' | 'maintenance'
export type Grade = 'elite' | 'average' | 'critical'

export interface PLInput {
  clinicSize: ClinicSize
  clinicModel: ClinicModel
  businessStage: BusinessStage
  totalGrossRevenue: number
  totalPatientVisits: number
  revenueFromContinuity: number
  totalFacilityCosts: number
  totalStaffPayroll: number
  totalOperatingExpenses: number
  ownerSalary: number
  ownerAddBacks: number

  // Optional advanced financial inputs
  frontEndRevenue?: number
  tertiaryRevenue?: number
  marketingSpend?: number
  techAdminSpend?: number
  merchantFees?: number
  retailCOGS?: number

  // Optional growth/KPI inputs
  leadCount?: number
  evaluationsBooked?: number
  packagesClosed?: number
  activeContinuityMembers?: number
  npsScore?: number
  patientLTV?: number
  patientAcquisitionCost?: number
}

export type GradeLevel = 'green' | 'yellow' | 'red'
export type MetricGroup = 'core' | 'growth' | 'operational'

export interface GradeBand {
  grade: GradeLevel
  label: string
  min?: number
  max?: number
}

export interface MetricResult {
  id: string
  name: string
  value: number
  displayType: 'currency' | 'percent' | 'ratio' | 'score' | 'count'
  grade: GradeLevel
  threshold: string
  diagnostic: string
  tip: string
  trend: number[]
  group: MetricGroup
  target: string
  gradeBands: GradeBand[]
  diagnosticIntent: string
  knowledgeRefSlug?: string
  knowledgeRefSection?: string
  weight: number
  score: number
  source: 'core' | 'advanced'
}

export interface PLResult {
  metrics: MetricResult[]
  coreMetrics: MetricResult[]
  growthMetrics: MetricResult[]
  operationalMetrics: MetricResult[]
  odi: number
  enterpriseValueLow: number
  enterpriseValueHigh: number
  cashFlowSummary: string
  actionPlan: ActionItem[]
  overallGrade: GradeLevel
  benchmarkVersion: string
  confidence: number
  warnings: string[]
  score: number
}

export interface ActionItem {
  id: string
  metricId: string
  text: string
  phase: 1 | 2 | 3
  completed: boolean
  target?: string
  expectedImpact?: string
  rationale?: string
  knowledgeRefSlug?: string
  knowledgeRefSection?: string
}

export const GRADE_COLORS: Record<GradeLevel, string> = {
  green: '#2d8a4e',
  yellow: '#c47f17',
  red: '#c0392b'
}
