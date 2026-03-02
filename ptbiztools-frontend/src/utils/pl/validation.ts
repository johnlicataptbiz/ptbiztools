import type { PLInput } from '../plTypes'

export interface PLValidationResult {
  errors: string[]
  warnings: string[]
  errorsByField: Partial<Record<keyof PLInput, string[]>>
  warningsByField: Partial<Record<keyof PLInput, string[]>>
  missingRequiredFields: (keyof PLInput)[]
  requiredCompletion: number
  hasBlockingErrors: boolean
}

export interface MastermindValidationPeriod {
  id: string
  label: string
  order: number
  input: PLInput
}

export interface MastermindTimelineValidationResult {
  errors: string[]
  warnings: string[]
  fieldErrorsByPeriod: Record<string, Partial<Record<keyof PLInput, string[]>>>
  isReady: boolean
  hasBlockingErrors: boolean
}

export const REQUIRED_CORE_FIELDS: (keyof PLInput)[] = [
  'totalGrossRevenue',
  'totalPatientVisits',
  'revenueFromContinuity',
  'totalFacilityCosts',
  'totalStaffPayroll',
  'totalOperatingExpenses',
  'ownerSalary',
  'ownerAddBacks',
]

const NON_NEGATIVE_FIELDS: (keyof PLInput)[] = [
  'totalGrossRevenue',
  'totalPatientVisits',
  'revenueFromContinuity',
  'totalFacilityCosts',
  'totalStaffPayroll',
  'totalOperatingExpenses',
  'ownerSalary',
  'ownerAddBacks',
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
  'patientLTV',
  'patientAcquisitionCost',
]

const INTEGER_FIELDS: (keyof PLInput)[] = [
  'totalPatientVisits',
  'leadCount',
  'evaluationsBooked',
  'packagesClosed',
  'activeContinuityMembers',
]

function addFieldMessage(
  container: Partial<Record<keyof PLInput, string[]>>,
  field: keyof PLInput,
  message: string,
) {
  const existing = container[field] || []
  container[field] = [...existing, message]
}

function pushUnique(target: string[], message: string) {
  if (!target.includes(message)) target.push(message)
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateRainmakerInput(input: PLInput): PLValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const errorsByField: Partial<Record<keyof PLInput, string[]>> = {}
  const warningsByField: Partial<Record<keyof PLInput, string[]>> = {}

  const missingRequiredFields = REQUIRED_CORE_FIELDS.filter((field) => {
    const value = input[field] as number | undefined
    return !isFiniteNumber(value) || (field === 'totalGrossRevenue' || field === 'totalPatientVisits' ? value <= 0 : value < 0)
  })

  const requiredCompletion = Math.round(
    ((REQUIRED_CORE_FIELDS.length - missingRequiredFields.length) / REQUIRED_CORE_FIELDS.length) * 100,
  )

  for (const field of REQUIRED_CORE_FIELDS) {
    const value = input[field] as number | undefined
    if (!isFiniteNumber(value)) {
      addFieldMessage(errorsByField, field, 'Required numeric value is missing.')
      pushUnique(errors, `${field} is required.`)
      continue
    }

    if ((field === 'totalGrossRevenue' || field === 'totalPatientVisits') && value <= 0) {
      addFieldMessage(errorsByField, field, 'Must be greater than zero.')
      pushUnique(errors, `${field} must be greater than zero.`)
      continue
    }

    if (value < 0) {
      addFieldMessage(errorsByField, field, 'Cannot be negative.')
      pushUnique(errors, `${field} cannot be negative.`)
    }
  }

  for (const field of NON_NEGATIVE_FIELDS) {
    const value = input[field] as number | undefined
    if (!isFiniteNumber(value)) continue
    if (value < 0) {
      addFieldMessage(errorsByField, field, 'Cannot be negative.')
      pushUnique(errors, `${field} cannot be negative.`)
    }
  }

  for (const field of INTEGER_FIELDS) {
    const value = input[field] as number | undefined
    if (!isFiniteNumber(value)) continue
    if (!Number.isInteger(value)) {
      addFieldMessage(warningsByField, field, 'Should normally be a whole number.')
      pushUnique(warnings, `${field} should normally be a whole number.`)
    }
  }

  if (isFiniteNumber(input.npsScore)) {
    if (input.npsScore < 0 || input.npsScore > 10) {
      addFieldMessage(errorsByField, 'npsScore', 'NPS must be between 0 and 10.')
      pushUnique(errors, 'NPS must be between 0 and 10.')
    }
  }

  if (isFiniteNumber(input.totalGrossRevenue) && isFiniteNumber(input.revenueFromContinuity)) {
    if (input.revenueFromContinuity > input.totalGrossRevenue) {
      addFieldMessage(errorsByField, 'revenueFromContinuity', 'Cannot exceed total gross revenue.')
      pushUnique(errors, 'Continuity revenue cannot exceed total gross revenue.')
    }
  }

  if (isFiniteNumber(input.leadCount) && isFiniteNumber(input.evaluationsBooked)) {
    if (input.leadCount <= 0 && input.evaluationsBooked > 0) {
      addFieldMessage(errorsByField, 'leadCount', 'Lead count must be > 0 when evaluations are provided.')
      pushUnique(errors, 'Lead count must be > 0 when evaluations are provided.')
    } else if (input.evaluationsBooked > input.leadCount) {
      addFieldMessage(errorsByField, 'evaluationsBooked', 'Cannot exceed lead count.')
      pushUnique(errors, 'Evaluations booked cannot exceed lead count.')
    }
  }

  if (isFiniteNumber(input.evaluationsBooked) && isFiniteNumber(input.packagesClosed)) {
    if (input.evaluationsBooked <= 0 && input.packagesClosed > 0) {
      addFieldMessage(errorsByField, 'evaluationsBooked', 'Evaluations must be > 0 when packages are provided.')
      pushUnique(errors, 'Evaluations must be > 0 when packages are provided.')
    } else if (input.packagesClosed > input.evaluationsBooked) {
      addFieldMessage(errorsByField, 'packagesClosed', 'Cannot exceed evaluations booked.')
      pushUnique(errors, 'Packages closed cannot exceed evaluations booked.')
    }
  }

  if (isFiniteNumber(input.totalGrossRevenue)) {
    const front = isFiniteNumber(input.frontEndRevenue) ? input.frontEndRevenue : 0
    const continuity = isFiniteNumber(input.revenueFromContinuity) ? input.revenueFromContinuity : 0
    const tertiary = isFiniteNumber(input.tertiaryRevenue) ? input.tertiaryRevenue : 0
    const hasStratificationData = isFiniteNumber(input.frontEndRevenue) || isFiniteNumber(input.tertiaryRevenue)

    if (hasStratificationData && input.totalGrossRevenue > 0) {
      const sum = front + continuity + tertiary
      const drift = Math.abs(sum - input.totalGrossRevenue) / input.totalGrossRevenue
      if (drift > 0.08) {
        addFieldMessage(
          warningsByField,
          'frontEndRevenue',
          'Front-end + continuity + tertiary do not closely reconcile to total gross revenue.',
        )
        pushUnique(
          warnings,
          'Revenue stratification does not reconcile to total gross revenue (outside ±8%).',
        )
      }
    }
  }

  if (
    isFiniteNumber(input.totalOperatingExpenses)
    && isFiniteNumber(input.totalStaffPayroll)
    && input.totalOperatingExpenses > 0
    && input.totalStaffPayroll > input.totalOperatingExpenses
  ) {
    addFieldMessage(
      warningsByField,
      'totalStaffPayroll',
      'Payroll exceeds total operating expenses. Check whether owner comp or categories are mixed.',
    )
    pushUnique(warnings, 'Payroll exceeds total operating expenses. Verify category mapping.')
  }

  if (
    isFiniteNumber(input.patientLTV)
    && isFiniteNumber(input.patientAcquisitionCost)
    && input.patientLTV > 0
    && input.patientAcquisitionCost > 0
    && input.patientLTV < input.patientAcquisitionCost
  ) {
    addFieldMessage(warningsByField, 'patientLTV', 'LTV is below acquisition cost; unit economics are negative.')
    pushUnique(warnings, 'Patient LTV is below acquisition cost.')
  }

  return {
    errors,
    warnings,
    errorsByField,
    warningsByField,
    missingRequiredFields,
    requiredCompletion,
    hasBlockingErrors: errors.length > 0,
  }
}

export function validateMastermindTimeline(periods: MastermindValidationPeriod[]): MastermindTimelineValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fieldErrorsByPeriod: Record<string, Partial<Record<keyof PLInput, string[]>>> = {}

  if (periods.length < 2) {
    errors.push('Mastermind timeline needs at least 2 periods.')
  }

  const labelSeen = new Set<string>()
  const orderSeen = new Set<number>()
  const sorted = [...periods].sort((a, b) => a.order - b.order)

  for (const period of sorted) {
    const key = period.label.trim().toLowerCase()
    if (!key) {
      errors.push(`Period ${period.id} is missing a label.`)
    } else if (labelSeen.has(key)) {
      errors.push(`Duplicate period label detected: "${period.label}".`)
    } else {
      labelSeen.add(key)
    }

    if (orderSeen.has(period.order)) {
      errors.push(`Duplicate period order detected: ${period.order}.`)
    } else {
      orderSeen.add(period.order)
    }

    const validation = validateRainmakerInput(period.input)
    if (validation.hasBlockingErrors) {
      fieldErrorsByPeriod[period.id] = validation.errorsByField
      errors.push(`Period "${period.label}" has invalid required financial inputs.`)
    }

    for (const warning of validation.warnings) {
      warnings.push(`${period.label}: ${warning}`)
    }
  }

  for (let idx = 1; idx < sorted.length; idx += 1) {
    const previous = sorted[idx - 1]
    const current = sorted[idx]

    if (current.order <= previous.order) {
      errors.push('Timeline order must be strictly increasing.')
      break
    }

    const previousRevenue = previous.input.totalGrossRevenue
    const currentRevenue = current.input.totalGrossRevenue

    if (previousRevenue > 0 && currentRevenue > 0) {
      const delta = Math.abs(currentRevenue - previousRevenue) / previousRevenue
      if (delta > 4) {
        warnings.push(
          `Large revenue jump between "${previous.label}" and "${current.label}" (>400%). Confirm period mapping.`,
        )
      }
    }
  }

  return {
    errors,
    warnings,
    fieldErrorsByPeriod,
    isReady: errors.length === 0 && periods.length >= 2,
    hasBlockingErrors: errors.length > 0,
  }
}
