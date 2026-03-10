import { REQUIRED_FIELDS } from './constants.js'

function toNumericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, raw]) => {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      acc[key] = raw
    }
    return acc
  }, {})
}

export function validateMappedInputForApproval(mappedInput: unknown): string[] {
  const values = toNumericRecord(mappedInput)
  const issues: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = values[field]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push(`${field} missing`)
      continue
    }

    if ((field === 'totalGrossRevenue' || field === 'totalPatientVisits') && value <= 0) {
      issues.push(`${field} must be > 0`)
      continue
    }

    if (value < 0) {
      issues.push(`${field} cannot be negative`)
    }
  }

  if (
    typeof values.totalGrossRevenue === 'number'
    && typeof values.revenueFromContinuity === 'number'
    && values.revenueFromContinuity > values.totalGrossRevenue
  ) {
    issues.push('revenueFromContinuity exceeds totalGrossRevenue')
  }

  if (
    typeof values.leadCount === 'number'
    && typeof values.evaluationsBooked === 'number'
    && values.evaluationsBooked > values.leadCount
  ) {
    issues.push('evaluationsBooked exceeds leadCount')
  }

  if (
    typeof values.evaluationsBooked === 'number'
    && typeof values.packagesClosed === 'number'
    && values.packagesClosed > values.evaluationsBooked
  ) {
    issues.push('packagesClosed exceeds evaluationsBooked')
  }

  return issues
}
