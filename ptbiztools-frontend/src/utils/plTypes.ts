export type ClinicSize = 'individual' | 'multi'
export type ClinicModel = 'cash' | 'hybrid'
export type BusinessStage = 'startup' | 'growth' | 'maintenance'

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
  name: string
  value: number
  grade: GradeLevel
  threshold: string
  diagnostic: string
}

export interface PLResult {
  metrics: MetricResult[]
  odi: number
  enterpriseValueLow: number
  enterpriseValueHigh: number
  cashFlowSummary: string
  actionPlan: string[]
  overallGrade: 'green' | 'yellow' | 'red'
}
