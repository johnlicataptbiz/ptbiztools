import type { CanonicalPLField } from './types.js'

export const PARSER_VERSION = '1.0.0'
export const MAPPING_VERSION = '1.0.0'

export const REQUIRED_FIELDS: CanonicalPLField[] = [
  'totalGrossRevenue',
  'totalPatientVisits',
  'revenueFromContinuity',
  'totalFacilityCosts',
  'totalStaffPayroll',
  'totalOperatingExpenses',
  'ownerSalary',
  'ownerAddBacks',
]

export const ALL_FIELDS: CanonicalPLField[] = [
  ...REQUIRED_FIELDS,
  'frontEndRevenue',
  'tertiaryRevenue',
  'marketingSpend',
  'techAdminSpend',
  'merchantFees',
  'retailCOGS',
  'leadCount',
  'evaluationsBooked',
  'packagesClosed',
  'activeContinuityMembers',
  'npsScore',
  'patientLTV',
  'patientAcquisitionCost',
]

export const FIELD_ALIASES: Record<CanonicalPLField, string[]> = {
  totalGrossRevenue: ['total gross revenue', 'gross revenue', 'revenue total', 'total income', 'collections'],
  totalPatientVisits: ['total patient visits', 'patient visits', 'visits', 'sessions', 'appointments'],
  revenueFromContinuity: ['continuity revenue', 'recurring revenue', 'membership revenue', 'continuity income'],
  totalFacilityCosts: ['facility costs', 'rent', 'occupancy', 'facility expense', 'lease'],
  totalStaffPayroll: ['staff payroll', 'payroll', 'clinical payroll', 'team wages', 'wages'],
  totalOperatingExpenses: ['operating expenses', 'total expenses', 'opex', 'operating costs'],
  ownerSalary: ['owner salary', 'owner compensation', 'owner wage', 'owner pay'],
  ownerAddBacks: ['owner add backs', 'add backs', 'owner adjustments', 'discretionary add backs'],
  frontEndRevenue: ['front end revenue', 'evaluation revenue', 'package revenue', 'treatment package revenue'],
  tertiaryRevenue: ['tertiary revenue', 'digital revenue', 'recovery room revenue', 'retail revenue'],
  marketingSpend: ['marketing spend', 'marketing', 'advertising', 'ad spend', 'paid media'],
  techAdminSpend: ['tech and admin', 'software and admin', 'admin spend', 'technology expense'],
  merchantFees: ['merchant fees', 'payment processing fees', 'processing fees', 'cc fees'],
  retailCOGS: ['retail cogs', 'cost of goods sold', 'cogs', 'inventory cost'],
  leadCount: ['lead count', 'leads', 'inbound leads', 'new leads'],
  evaluationsBooked: ['evaluations booked', 'evals booked', 'consults booked', 'new evals'],
  packagesClosed: ['packages closed', 'plans sold', 'plan of care closes', 'package commitments'],
  activeContinuityMembers: ['active continuity members', 'memberships active', 'continuity members'],
  npsScore: ['nps', 'net promoter score'],
  patientLTV: ['patient ltv', 'ltv', 'lifetime value'],
  patientAcquisitionCost: ['patient acquisition cost', 'pac', 'cac', 'cost per acquisition'],
}

export const FILE_SIZE_LIMIT_BYTES = 20 * 1024 * 1024
export const CSV_MAX_ROWS = 5000
export const XLSX_MAX_ROWS = 10000
export const XLSX_MAX_SHEETS = 12
export const PDF_MAX_PAGES = 80
