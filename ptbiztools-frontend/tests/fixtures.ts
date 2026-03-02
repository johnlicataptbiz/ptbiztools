import type { PLInput } from '../src/utils/plTypes'

export function buildValidInput(overrides: Partial<PLInput> = {}): PLInput {
  return {
    clinicSize: 'individual',
    clinicModel: 'cash',
    businessStage: 'growth',
    totalGrossRevenue: 500000,
    totalPatientVisits: 2500,
    revenueFromContinuity: 170000,
    totalFacilityCosts: 32000,
    totalStaffPayroll: 175000,
    totalOperatingExpenses: 390000,
    ownerSalary: 100000,
    ownerAddBacks: 18000,
    frontEndRevenue: 270000,
    tertiaryRevenue: 60000,
    marketingSpend: 42000,
    techAdminSpend: 17000,
    merchantFees: 12000,
    retailCOGS: 6500,
    leadCount: 240,
    evaluationsBooked: 150,
    packagesClosed: 110,
    activeContinuityMembers: 85,
    npsScore: 9.1,
    patientLTV: 2600,
    patientAcquisitionCost: 700,
    ...overrides,
  }
}
