import type { GradeLevel, MetricResult, PLInput, PLResult } from '../plTypes'
import { buildActionPlan } from './actionLibrary'
import { DEFAULT_BENCHMARK_PROFILE, type BenchmarkMetricProfile, type MetricId } from './benchmarkProfiles'
import {
  GRADE_SCORES,
  calculateWeightedScore,
  clampNumber,
  overallGradeFromScore,
  percent,
  resolveGrade,
  toFiniteNumber,
} from './scoring'
import { validateRainmakerInput } from './validation'

const DIAGNOSTIC_MESSAGES: Record<MetricId, Record<GradeLevel, string>> = {
  arpv: {
    green: 'Elite pricing power is in place; continue tightening package compliance and outcome positioning.',
    yellow: 'Pricing is acceptable but still leaking value. Incremental increases and stronger package framing are warranted.',
    red: 'ARPV indicates systemic underpricing or over-discounting. Pricing and offer structure need immediate correction.',
  },
  recurring: {
    green: 'Recurring engine is healthy and materially reducing revenue volatility.',
    yellow: 'Recurring base exists but is not yet strong enough for durable month-to-month stability.',
    red: 'The business remains front-end dependent. Continuity offers must be implemented or expanded now.',
  },
  rent: {
    green: 'Facility overhead is tightly controlled and supportive of margin resilience.',
    yellow: 'Rent burden is manageable but leaves limited room for downturns or slower months.',
    red: 'Facility burden is excessive relative to revenue and likely suppressing profitability.',
  },
  payroll: {
    green: 'Payroll structure is efficient relative to current revenue output.',
    yellow: 'Payroll is serviceable but should be tuned to KPI-based variable compensation.',
    red: 'Labor economics are misaligned and likely crowding out owner profit and reinvestment.',
  },
  margin: {
    green: 'Net margin reflects strong operating discipline and scalable economics.',
    yellow: 'Margin is adequate but not yet elite for this business model.',
    red: 'Net margin is in the danger zone and vulnerable to normal cash flow fluctuations.',
  },
  grossMargin: {
    green: 'Variable cost control is strong and supports a high-margin service model.',
    yellow: 'Gross margin is close but still leaking too much through COGS or processing.',
    red: 'Gross margin is below expected cash-based benchmarks; variable cost leakage is significant.',
  },
  marketingEfficiency: {
    green: 'Acquisition spend is efficient for current stage and revenue profile.',
    yellow: 'Marketing spend is elevated and should be rebalanced toward higher-ROI channels.',
    red: 'Marketing burden is too high and likely eroding net margin and LTV/PAC performance.',
  },
  techAdminBurden: {
    green: 'Tech/admin stack is lean and supports efficient operations.',
    yellow: 'Tech/admin overhead is creeping and needs stack consolidation.',
    red: 'Administrative/tooling cost is materially over benchmark and compressing profitability.',
  },
  revenueStratification: {
    green: 'Revenue mix is balanced across front-end, continuity, and tertiary streams.',
    yellow: 'Revenue mix is partially balanced but still over-reliant on one segment.',
    red: 'Revenue composition is structurally imbalanced and increases business volatility.',
  },
  leadConversion: {
    green: 'Lead handling and discovery positioning are converting efficiently.',
    yellow: 'Conversion is mid-range and likely constrained by intake consistency.',
    red: 'Lead conversion is low and indicates messaging, targeting, or call process issues.',
  },
  packageCommitment: {
    green: 'Evaluation-to-package close quality is strong and consistent with elite clinics.',
    yellow: 'Commitment quality is improving but below target for predictable cashflow.',
    red: 'Package commitment is weak and likely undermining both outcomes and economics.',
  },
  pacLtv: {
    green: 'Unit economics are healthy and support profitable growth.',
    yellow: 'Growth economics are workable but need optimization to scale safely.',
    red: 'Current acquisition economics are weak and risk value-destructive growth.',
  },
  nps: {
    green: 'NPS supports strong organic referral momentum.',
    yellow: 'Patient experience is acceptable but promoter activation is under-optimized.',
    red: 'NPS is low enough to threaten referral flow and retention quality.',
  },
}

function hashSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return Math.abs(hash >>> 0)
}

function seededUnit(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateDeterministicTrend(metricId: string, value: number, grade: GradeLevel): number[] {
  const volatility = grade === 'green' ? 0.04 : grade === 'yellow' ? 0.08 : 0.12
  const seedBase = hashSeed(`${metricId}:${value.toFixed(4)}:${grade}`)

  return Array.from({ length: 5 }, (_, index) => {
    const drift = (index - 2) * 0.015
    const jitter = (seededUnit(seedBase + index * 101) - 0.5) * volatility
    const factor = 1 + drift + jitter
    const nextValue = value * factor

    if (Math.abs(value) < 10) {
      return Number(nextValue.toFixed(2))
    }

    return Math.round(nextValue)
  })
}

function getDisplayType(metricId: MetricId): MetricResult['displayType'] {
  if (metricId === 'arpv') return 'currency'
  if (metricId === 'pacLtv') return 'ratio'
  if (metricId === 'revenueStratification') return 'score'
  return 'percent'
}

function buildMetric(metric: BenchmarkMetricProfile, value: number): MetricResult {
  const resolved = resolveGrade(value, metric.gradeBands)

  return {
    id: metric.id,
    name: metric.name,
    value,
    displayType: getDisplayType(metric.id),
    grade: resolved.grade,
    threshold: resolved.label,
    diagnostic: DIAGNOSTIC_MESSAGES[metric.id][resolved.grade],
    tip: metric.tip,
    trend: generateDeterministicTrend(metric.id, value, resolved.grade),
    group: metric.group,
    target: metric.target,
    gradeBands: metric.gradeBands,
    diagnosticIntent: metric.diagnosticIntent,
    knowledgeRefSlug: metric.knowledgeRefSlug,
    knowledgeRefSection: metric.knowledgeRefSection,
    weight: metric.weight,
    score: GRADE_SCORES[resolved.grade],
    source: metric.source,
  }
}

function scoreRevenueStratification(input: {
  totalGrossRevenue: number
  frontEndRevenue: number
  continuityRevenue: number
  tertiaryRevenue: number
}): number {
  if (input.totalGrossRevenue <= 0) return 0

  const front = percent(input.frontEndRevenue, input.totalGrossRevenue)
  const continuity = percent(input.continuityRevenue, input.totalGrossRevenue)
  const tertiary = percent(input.tertiaryRevenue, input.totalGrossRevenue)

  const scoreBand = (value: number, min: number, max: number) => {
    if (value >= min && value <= max) return 100
    if (value < min) return clampNumber(100 - (min - value) * 3.5, 0, 100)
    return clampNumber(100 - (value - max) * 3.5, 0, 100)
  }

  const weighted =
    scoreBand(front, 45, 60) * 0.4 + scoreBand(continuity, 30, 50) * 0.4 + scoreBand(tertiary, 5, 15) * 0.2

  return Number(weighted.toFixed(2))
}

function buildCashFlowSummary(netMargin: number, recurringRatio: number, score: number): string {
  if (netMargin > 20 && recurringRatio > 30) {
    return `Cash flow profile is resilient (score ${score}) with strong profitability and recurring stability.`
  }

  if (netMargin >= 10 || recurringRatio >= 15) {
    return `Cash flow profile is serviceable (score ${score}) but sensitive to monthly variability; strengthen margin and continuity.`
  }

  return `Cash flow profile is fragile (score ${score}); prioritize pricing, overhead control, and continuity revenue immediately.`
}

export function buildPLResult(input: PLInput): PLResult {
  // Product guardrail:
  // the benchmark profile is static in code. We do not load scoring logic from knowledge docs.
  const profile = DEFAULT_BENCHMARK_PROFILE
  const warnings: string[] = []
  const validation = validateRainmakerInput(input)
  warnings.push(...validation.warnings)
  if (validation.hasBlockingErrors) {
    warnings.push(...validation.errors.map((error) => `Input error: ${error}`))
  }

  const totalGrossRevenue = toFiniteNumber(input.totalGrossRevenue)
  const totalPatientVisits = toFiniteNumber(input.totalPatientVisits)
  const continuityRevenue = toFiniteNumber(input.revenueFromContinuity)
  const totalFacilityCosts = toFiniteNumber(input.totalFacilityCosts)
  const totalStaffPayroll = toFiniteNumber(input.totalStaffPayroll)
  const totalOperatingExpenses = toFiniteNumber(input.totalOperatingExpenses)
  const ownerSalary = toFiniteNumber(input.ownerSalary)
  const ownerAddBacks = toFiniteNumber(input.ownerAddBacks)

  const frontEndRevenue =
    input.frontEndRevenue !== undefined
      ? toFiniteNumber(input.frontEndRevenue)
      : Math.max(0, totalGrossRevenue - continuityRevenue - toFiniteNumber(input.tertiaryRevenue))
  const tertiaryRevenue = toFiniteNumber(input.tertiaryRevenue)
  const marketingSpend = input.marketingSpend !== undefined ? toFiniteNumber(input.marketingSpend) : undefined
  const techAdminSpend = input.techAdminSpend !== undefined ? toFiniteNumber(input.techAdminSpend) : undefined
  const merchantFees = input.merchantFees !== undefined ? toFiniteNumber(input.merchantFees) : undefined
  const retailCOGS = input.retailCOGS !== undefined ? toFiniteNumber(input.retailCOGS) : undefined

  const leadCount = input.leadCount !== undefined ? toFiniteNumber(input.leadCount) : undefined
  const evaluationsBooked = input.evaluationsBooked !== undefined ? toFiniteNumber(input.evaluationsBooked) : undefined
  const packagesClosed = input.packagesClosed !== undefined ? toFiniteNumber(input.packagesClosed) : undefined
  const activeContinuityMembers =
    input.activeContinuityMembers !== undefined ? toFiniteNumber(input.activeContinuityMembers) : undefined
  const npsScore = input.npsScore !== undefined ? toFiniteNumber(input.npsScore) : undefined
  const patientLTV = input.patientLTV !== undefined ? toFiniteNumber(input.patientLTV) : undefined
  const patientAcquisitionCost =
    input.patientAcquisitionCost !== undefined ? toFiniteNumber(input.patientAcquisitionCost) : undefined

  if (totalGrossRevenue <= 0) {
    warnings.push('Total gross revenue must be greater than zero for meaningful benchmarking.')
  }

  if (totalPatientVisits <= 0) {
    warnings.push('Patient visits are required to compute ARPV accurately.')
  }

  if (continuityRevenue > totalGrossRevenue && totalGrossRevenue > 0) {
    warnings.push('Continuity revenue exceeds total gross revenue; please verify inputs.')
  }

  const stratifiedSum = frontEndRevenue + continuityRevenue + tertiaryRevenue
  if (totalGrossRevenue > 0 && Math.abs(stratifiedSum - totalGrossRevenue) > totalGrossRevenue * 0.08) {
    warnings.push('Revenue stratification totals do not reconcile closely with total gross revenue.')
  }

  if (leadCount !== undefined && evaluationsBooked !== undefined && evaluationsBooked > leadCount) {
    warnings.push('Evaluations booked exceed lead count; conversion metrics may be overstated.')
  }

  if (evaluationsBooked !== undefined && packagesClosed !== undefined && packagesClosed > evaluationsBooked) {
    warnings.push('Packages closed exceed evaluations booked; package commitment rate may be invalid.')
  }

  if (patientLTV !== undefined && patientAcquisitionCost !== undefined && patientAcquisitionCost <= 0) {
    warnings.push('Patient acquisition cost must be greater than zero to compute LTV:PAC ratio.')
  }

  const metrics: MetricResult[] = []

  const arpv = totalPatientVisits > 0 ? totalGrossRevenue / totalPatientVisits : 0
  metrics.push(buildMetric(profile.metrics.arpv, arpv))

  const recurringRatio = percent(continuityRevenue, totalGrossRevenue)
  metrics.push(buildMetric(profile.metrics.recurring, recurringRatio))

  const rentBurden = percent(totalFacilityCosts, totalGrossRevenue)
  metrics.push(buildMetric(profile.metrics.rent, rentBurden))

  const payrollRatio = percent(totalStaffPayroll, totalGrossRevenue)
  metrics.push(buildMetric(profile.metrics.payroll, payrollRatio))

  const netProfit = totalGrossRevenue - totalOperatingExpenses
  const netMargin = percent(netProfit, totalGrossRevenue)
  metrics.push(buildMetric(profile.metrics.margin, netMargin))

  const hasGrossMarginData = merchantFees !== undefined || retailCOGS !== undefined
  if (hasGrossMarginData) {
    const variableCosts = (merchantFees || 0) + (retailCOGS || 0)
    const grossMargin = percent(totalGrossRevenue - variableCosts, totalGrossRevenue)
    metrics.push(buildMetric(profile.metrics.grossMargin, grossMargin))
  } else {
    warnings.push('Gross margin metric skipped: add merchant fees and/or retail COGS in advanced inputs.')
  }

  if (marketingSpend !== undefined) {
    const marketingPct = percent(marketingSpend, totalGrossRevenue)
    metrics.push(buildMetric(profile.metrics.marketingEfficiency, marketingPct))
  } else {
    warnings.push('Marketing efficiency metric skipped: add marketing spend in advanced inputs.')
  }

  if (techAdminSpend !== undefined) {
    const techAdminPct = percent(techAdminSpend, totalGrossRevenue)
    metrics.push(buildMetric(profile.metrics.techAdminBurden, techAdminPct))
  } else {
    warnings.push('Tech/admin burden metric skipped: add tech/admin spend in advanced inputs.')
  }

  const hasStratificationData =
    input.frontEndRevenue !== undefined || input.tertiaryRevenue !== undefined || activeContinuityMembers !== undefined
  if (hasStratificationData) {
    const stratificationFit = scoreRevenueStratification({
      totalGrossRevenue,
      frontEndRevenue,
      continuityRevenue,
      tertiaryRevenue,
    })
    metrics.push(buildMetric(profile.metrics.revenueStratification, stratificationFit))

    if (activeContinuityMembers !== undefined && activeContinuityMembers <= 0 && recurringRatio < 15) {
      warnings.push('Continuity members are zero while recurring revenue is low; retention model may be underdeveloped.')
    }
  } else {
    warnings.push('Revenue stratification metric skipped: add front-end and/or tertiary revenue in advanced inputs.')
  }

  if (leadCount !== undefined && evaluationsBooked !== undefined && leadCount > 0) {
    const leadConversion = percent(evaluationsBooked, leadCount)
    metrics.push(buildMetric(profile.metrics.leadConversion, leadConversion))
  } else {
    warnings.push('Lead conversion metric skipped: add lead count and evaluations booked.')
  }

  if (evaluationsBooked !== undefined && packagesClosed !== undefined && evaluationsBooked > 0) {
    const packageCommitment = percent(packagesClosed, evaluationsBooked)
    metrics.push(buildMetric(profile.metrics.packageCommitment, packageCommitment))
  } else {
    warnings.push('Package commitment metric skipped: add evaluations booked and packages closed.')
  }

  if (
    patientLTV !== undefined &&
    patientAcquisitionCost !== undefined &&
    patientLTV > 0 &&
    patientAcquisitionCost > 0
  ) {
    const ltvPac = patientLTV / patientAcquisitionCost
    metrics.push(buildMetric(profile.metrics.pacLtv, Number(ltvPac.toFixed(2))))
  } else {
    warnings.push('LTV:PAC metric skipped: add patient LTV and acquisition cost.')
  }

  if (npsScore !== undefined) {
    metrics.push(buildMetric(profile.metrics.nps, npsScore))
  } else {
    warnings.push('NPS metric skipped: add NPS score.')
  }

  const score = calculateWeightedScore(metrics)
  const overallGrade = overallGradeFromScore(score)

  const coreMetrics = metrics.filter((metric) => metric.group === 'core')
  const growthMetrics = metrics.filter((metric) => metric.group === 'growth')
  const operationalMetrics = metrics.filter((metric) => metric.group === 'operational')

  const advancedMetricsAvailable = metrics.filter((metric) => metric.source === 'advanced').length
  const advancedMetricsTotal = Object.values(profile.metrics).filter((metric) => metric.source === 'advanced').length
  const completeness = advancedMetricsTotal > 0 ? advancedMetricsAvailable / advancedMetricsTotal : 0
  const warningPenalty = clampNumber(warnings.length * 3, 0, 28)
  const confidence = clampNumber(Math.round(62 + completeness * 35 - warningPenalty), 35, 99)

  const odi = netProfit + ownerSalary + ownerAddBacks
  const enterpriseValueLow = odi * 3
  const enterpriseValueHigh = odi * 5

  return {
    metrics,
    coreMetrics,
    growthMetrics,
    operationalMetrics,
    odi,
    enterpriseValueLow,
    enterpriseValueHigh,
    cashFlowSummary: buildCashFlowSummary(netMargin, recurringRatio, score),
    actionPlan: buildActionPlan(metrics),
    overallGrade,
    benchmarkVersion: profile.version,
    confidence,
    warnings,
    score,
  }
}
