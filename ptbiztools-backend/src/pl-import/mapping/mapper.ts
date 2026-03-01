import { ALL_FIELDS, FIELD_ALIASES, MAPPING_VERSION, REQUIRED_FIELDS } from '../constants.js'
import type {
  CanonicalPLField,
  FieldMappingCandidate,
  MappingOutput,
  MappingPatch,
  ParseOutput,
  ParsedCandidate,
} from '../types.js'
import { normalizeLabel } from '../utils.js'

interface RangeRule {
  min?: number
  max?: number
}

const VALUE_RULES: Partial<Record<CanonicalPLField, RangeRule>> = {
  totalGrossRevenue: { min: 1000 },
  totalPatientVisits: { min: 1, max: 100000 },
  revenueFromContinuity: { min: 0 },
  totalFacilityCosts: { min: 0 },
  totalStaffPayroll: { min: 0 },
  totalOperatingExpenses: { min: 0 },
  ownerSalary: { min: 0 },
  ownerAddBacks: { min: 0 },
  npsScore: { min: 0, max: 10 },
  patientAcquisitionCost: { min: 0, max: 50000 },
  patientLTV: { min: 0, max: 500000 },
}

function tokenize(value: string): string[] {
  return normalizeLabel(value)
    .split(' ')
    .filter(Boolean)
}

function jaccardSimilarity(left: string, right: string): number {
  const a = new Set(tokenize(left))
  const b = new Set(tokenize(right))
  if (a.size === 0 || b.size === 0) return 0

  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection += 1
  }

  const union = new Set([...a, ...b]).size
  return intersection / union
}

function labelScore(field: CanonicalPLField, candidateLabel: string): number {
  const aliases = FIELD_ALIASES[field]
  let best = 0

  for (const alias of aliases) {
    const score = jaccardSimilarity(alias, candidateLabel)
    if (score > best) best = score
  }

  return best * 70
}

function unitScore(field: CanonicalPLField, candidate: ParsedCandidate): number {
  if (field === 'totalPatientVisits' || field === 'leadCount' || field === 'evaluationsBooked' || field === 'packagesClosed' || field === 'activeContinuityMembers') {
    return candidate.unitHint === 'count' ? 10 : 6
  }

  if (field === 'npsScore') {
    return candidate.unitHint === 'percent' ? 7 : 10
  }

  return candidate.unitHint === 'currency' ? 10 : 6
}

function rangeScore(field: CanonicalPLField, value: number): number {
  const rule = VALUE_RULES[field]
  if (!rule) return 20

  if (rule.min !== undefined && value < rule.min) return 0
  if (rule.max !== undefined && value > rule.max) return 4

  return 20
}

function fieldRequiresInteger(field: CanonicalPLField): boolean {
  return field === 'totalPatientVisits' || field === 'leadCount' || field === 'evaluationsBooked' || field === 'packagesClosed' || field === 'activeContinuityMembers'
}

function coerceFieldValue(field: CanonicalPLField, value: number): number {
  if (fieldRequiresInteger(field)) return Math.round(value)
  return Number(value.toFixed(2))
}

function buildFieldCandidate(
  field: CanonicalPLField,
  candidate: ParsedCandidate | null,
  confidence = 0,
  reasoning = 'No candidate found',
): FieldMappingCandidate {
  if (!candidate) {
    return {
      field,
      candidateId: null,
      label: null,
      value: null,
      confidence,
      reasoning,
    }
  }

  return {
    field,
    candidateId: candidate.id,
    label: candidate.label,
    value: coerceFieldValue(field, candidate.value),
    confidence,
    reasoning,
  }
}

function findCandidateById(candidates: ParsedCandidate[], candidateId: string | null | undefined): ParsedCandidate | null {
  if (!candidateId) return null
  return candidates.find((candidate) => candidate.id === candidateId) || null
}

function chooseBestCandidate(field: CanonicalPLField, candidates: ParsedCandidate[]): FieldMappingCandidate {
  let bestCandidate: ParsedCandidate | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const score = Math.round(labelScore(field, candidate.normalizedLabel) + unitScore(field, candidate) + rangeScore(field, candidate.value))
    if (score > bestScore) {
      bestScore = score
      bestCandidate = candidate
    }
  }

  if (!bestCandidate || bestScore < 20) {
    return buildFieldCandidate(field, null, 0, 'No sufficiently strong candidate')
  }

  return buildFieldCandidate(
    field,
    bestCandidate,
    Math.min(100, bestScore),
    `Matched by label similarity and value profile (${bestScore} confidence).`,
  )
}

function deriveOverallConfidence(fieldConfidence: Record<CanonicalPLField, number>): number {
  const requiredWeighted = REQUIRED_FIELDS.reduce((sum, field) => sum + fieldConfidence[field] * 1.5, 0)
  const optional = ALL_FIELDS.filter((field) => !REQUIRED_FIELDS.includes(field)).reduce((sum, field) => sum + fieldConfidence[field], 0)
  const denominator = REQUIRED_FIELDS.length * 1.5 + (ALL_FIELDS.length - REQUIRED_FIELDS.length)

  if (denominator === 0) return 0
  return Math.max(0, Math.min(100, Math.round((requiredWeighted + optional) / denominator)))
}

function isRequiredComplete(mappedInput: Partial<Record<CanonicalPLField, number>>): boolean {
  return REQUIRED_FIELDS.every((field) => {
    const value = mappedInput[field]
    return typeof value === 'number' && Number.isFinite(value)
  })
}

function deriveWarnings(output: {
  mappedInput: Partial<Record<CanonicalPLField, number>>
  fieldConfidence: Record<CanonicalPLField, number>
  parseWarnings: string[]
}): string[] {
  const warnings = [...output.parseWarnings]

  const lowRequired = REQUIRED_FIELDS.filter((field) => output.fieldConfidence[field] < 60)
  if (lowRequired.length > 0) {
    warnings.push(`Low confidence for required fields: ${lowRequired.join(', ')}`)
  }

  const gross = output.mappedInput.totalGrossRevenue
  const continuity = output.mappedInput.revenueFromContinuity
  if (typeof gross === 'number' && typeof continuity === 'number' && continuity > gross) {
    warnings.push('Continuity revenue exceeds total gross revenue.')
  }

  return warnings
}

export function buildAutoMapping(parseOutput: ParseOutput): MappingOutput {
  const autoMap = {} as Record<CanonicalPLField, FieldMappingCandidate>
  const fieldConfidence = {} as Record<CanonicalPLField, number>
  const mappedInput: Partial<Record<CanonicalPLField, number>> = {}

  for (const field of ALL_FIELDS) {
    const best = chooseBestCandidate(field, parseOutput.candidates)
    autoMap[field] = best
    fieldConfidence[field] = best.confidence
    if (best.value !== null) mappedInput[field] = best.value
  }

  const overallConfidence = deriveOverallConfidence(fieldConfidence)
  const warnings = deriveWarnings({ mappedInput, fieldConfidence, parseWarnings: parseOutput.qualitySignals.warnings })

  return {
    mappingVersion: MAPPING_VERSION,
    autoMap,
    finalMap: structuredClone(autoMap),
    mappedInput,
    fieldConfidence,
    manualOverrides: [],
    overallConfidence,
    warnings,
    requiredFieldsComplete: isRequiredComplete(mappedInput),
  }
}

export function applyMappingPatch(
  parseOutput: ParseOutput,
  previous: MappingOutput,
  patch: MappingPatch,
): MappingOutput {
  const nextFinalMap = structuredClone(previous.finalMap)
  const nextFieldConfidence = { ...previous.fieldConfidence }
  const nextMappedInput: Partial<Record<CanonicalPLField, number>> = { ...previous.mappedInput }
  const manualOverrideSet = new Set<CanonicalPLField>(previous.manualOverrides)

  for (const field of ALL_FIELDS) {
    const candidateId = patch.useCandidate?.[field]
    if (candidateId !== undefined) {
      const candidate = findCandidateById(parseOutput.candidates, candidateId)
      if (candidate) {
        const confidence = Math.min(99, Math.max(35, chooseBestCandidate(field, [candidate]).confidence))
        const mapped = buildFieldCandidate(field, candidate, confidence, 'User selected parser candidate.')
        nextFinalMap[field] = mapped
        nextFieldConfidence[field] = confidence
        if (mapped.value !== null) nextMappedInput[field] = mapped.value
      }
      manualOverrideSet.add(field)
    }

    const overrideValue = patch.values?.[field]
    if (overrideValue !== undefined) {
      if (overrideValue === null) {
        delete nextMappedInput[field]
        nextFinalMap[field] = buildFieldCandidate(field, null, 0, 'User cleared field mapping.')
        nextFieldConfidence[field] = 0
      } else {
        const coerced = coerceFieldValue(field, overrideValue)
        nextMappedInput[field] = coerced
        nextFinalMap[field] = {
          field,
          candidateId: null,
          label: 'Manual value',
          value: coerced,
          confidence: 95,
          reasoning: 'User manually entered value.',
        }
        nextFieldConfidence[field] = Math.max(nextFieldConfidence[field], 95)
      }
      manualOverrideSet.add(field)
    }
  }

  const overallConfidence = deriveOverallConfidence(nextFieldConfidence)
  const warnings = deriveWarnings({
    mappedInput: nextMappedInput,
    fieldConfidence: nextFieldConfidence,
    parseWarnings: parseOutput.qualitySignals.warnings,
  })

  return {
    mappingVersion: previous.mappingVersion,
    autoMap: previous.autoMap,
    finalMap: nextFinalMap,
    mappedInput: nextMappedInput,
    fieldConfidence: nextFieldConfidence,
    manualOverrides: Array.from(manualOverrideSet),
    overallConfidence,
    warnings,
    requiredFieldsComplete: isRequiredComplete(nextMappedInput),
  }
}
