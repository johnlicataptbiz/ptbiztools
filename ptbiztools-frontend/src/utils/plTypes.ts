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
}

export type GradeLevel = 'green' | 'yellow' | 'red'

export interface MetricResult {
  id: string
  name: string
  value: number
  grade: GradeLevel
  threshold: string
  diagnostic: string
  tip: string
  trend: number[]
}

export interface PLResult {
  metrics: MetricResult[]
  odi: number
  enterpriseValueLow: number
  enterpriseValueHigh: number
  cashFlowSummary: string
  actionPlan: ActionItem[]
  overallGrade: GradeLevel
}

export interface ActionItem {
  id: string
  metricId: string
  text: string
  phase: 1 | 2 | 3
  completed: boolean
}

export const GRADE_COLORS: Record<GradeLevel, string> = {
  green: '#2d8a4e',
  yellow: '#c47f17',
  red: '#c0392b'
}
