export type ImportSourceType = 'csv' | 'xlsx' | 'pdf' | 'image'

export type CanonicalPLField =
  | 'totalGrossRevenue'
  | 'totalPatientVisits'
  | 'revenueFromContinuity'
  | 'totalFacilityCosts'
  | 'totalStaffPayroll'
  | 'totalOperatingExpenses'
  | 'ownerSalary'
  | 'ownerAddBacks'
  | 'frontEndRevenue'
  | 'tertiaryRevenue'
  | 'marketingSpend'
  | 'techAdminSpend'
  | 'merchantFees'
  | 'retailCOGS'
  | 'leadCount'
  | 'evaluationsBooked'
  | 'packagesClosed'
  | 'activeContinuityMembers'
  | 'npsScore'
  | 'patientLTV'
  | 'patientAcquisitionCost'

export interface ParsedCandidate {
  id: string
  label: string
  normalizedLabel: string
  value: number
  sourceType: ImportSourceType
  sheetName?: string
  rowIndex?: number
  columnIndex?: number
  pageNumber?: number
  unitHint?: 'currency' | 'count' | 'percent' | 'unknown'
}

export interface ParseQualitySignals {
  parser: string
  parserVersion: string
  rowCount?: number
  columnCount?: number
  pageCount?: number
  extractedChars?: number
  numericTokenCount?: number
  labelCoverageScore: number
  usedOCR: boolean
  warnings: string[]
}

export interface ParseOutput {
  sourceType: ImportSourceType
  parserVersion: string
  candidates: ParsedCandidate[]
  tablePreview: string[][]
  textPreview: string
  qualitySignals: ParseQualitySignals
}

export interface FieldMappingCandidate {
  field: CanonicalPLField
  candidateId: string | null
  label: string | null
  value: number | null
  confidence: number
  reasoning: string
}

export interface MappingOutput {
  mappingVersion: string
  autoMap: Record<CanonicalPLField, FieldMappingCandidate>
  finalMap: Record<CanonicalPLField, FieldMappingCandidate>
  mappedInput: Partial<Record<CanonicalPLField, number>>
  fieldConfidence: Record<CanonicalPLField, number>
  manualOverrides: CanonicalPLField[]
  overallConfidence: number
  warnings: string[]
  requiredFieldsComplete: boolean
}

export interface MappingPatch {
  values?: Partial<Record<CanonicalPLField, number | null>>
  useCandidate?: Partial<Record<CanonicalPLField, string | null>>
}
