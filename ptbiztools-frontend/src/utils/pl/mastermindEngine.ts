import type { ActionItem, GradeBand, GradeLevel, MetricResult, MetricGroup, PLInput, PLResult } from '../plTypes'

export interface MastermindPeriod {
  id: string
  label: string
  input: PLInput
  order: number
  source: 'manual' | 'import'
  importSessionId?: string
}

type MastermindMetricId =
  | 'revenueCagr'
  | 'visitsCagr'
  | 'arpvExpansion'
  | 'marginExpansion'
  | 'continuityMixExpansion'
  | 'payrollLeverage'
  | 'facilityLeverage'
  | 'odiCagr'

interface MastermindMetricConfig {
  id: MastermindMetricId
  name: string
  group: MetricGroup
  displayType: MetricResult['displayType']
  target: string
  tip: string
  diagnosticIntent: string
  weight: number
  source: MetricResult['source']
  knowledgeRefSlug: string
  knowledgeRefSection: string
  gradeBands: GradeBand[]
}

const GRADE_SCORES: Record<GradeLevel, number> = {
  green: 100,
  yellow: 72,
  red: 40,
}

const CONFIG: Record<MastermindMetricId, MastermindMetricConfig> = {
  revenueCagr: {
    id: 'revenueCagr',
    name: 'Revenue CAGR',
    group: 'core',
    displayType: 'percent',
    target: '>= 15%',
    tip: 'Sustained compounding growth matters more than one strong month.',
    diagnosticIntent: 'Measures scaled topline growth velocity over time.',
    weight: 1.3,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Growth Benchmarks',
    gradeBands: [
      { grade: 'green', label: '>= 15%', min: 15 },
      { grade: 'yellow', label: '6% to 14.9%', min: 6, max: 14.9 },
      { grade: 'red', label: '< 6%', max: 5.99 },
    ],
  },
  visitsCagr: {
    id: 'visitsCagr',
    name: 'Visit Volume CAGR',
    group: 'growth',
    displayType: 'percent',
    target: '>= 10%',
    tip: 'Visit growth validates market demand and funnel throughput.',
    diagnosticIntent: 'Measures capacity utilization and demand trajectory.',
    weight: 1,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Demand and Throughput',
    gradeBands: [
      { grade: 'green', label: '>= 10%', min: 10 },
      { grade: 'yellow', label: '3% to 9.9%', min: 3, max: 9.9 },
      { grade: 'red', label: '< 3%', max: 2.99 },
    ],
  },
  arpvExpansion: {
    id: 'arpvExpansion',
    name: 'ARPV Expansion',
    group: 'core',
    displayType: 'percent',
    target: '>= 5%',
    tip: 'Healthy ARPV expansion suggests pricing and package discipline.',
    diagnosticIntent: 'Tracks whether pricing power compounds over time.',
    weight: 1,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Pricing Power',
    gradeBands: [
      { grade: 'green', label: '>= 5%', min: 5 },
      { grade: 'yellow', label: '0% to 4.9%', min: 0, max: 4.9 },
      { grade: 'red', label: '< 0%', max: -0.01 },
    ],
  },
  marginExpansion: {
    id: 'marginExpansion',
    name: 'Net Margin Expansion',
    group: 'core',
    displayType: 'percent',
    target: '>= +3 pts',
    tip: 'Scaling clinics should improve margin as operating leverage increases.',
    diagnosticIntent: 'Tracks whether growth translates into actual profitability.',
    weight: 1.2,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Margin Discipline',
    gradeBands: [
      { grade: 'green', label: '>= +3 pts', min: 3 },
      { grade: 'yellow', label: '0 to +2.9 pts', min: 0, max: 2.9 },
      { grade: 'red', label: '< 0 pts', max: -0.01 },
    ],
  },
  continuityMixExpansion: {
    id: 'continuityMixExpansion',
    name: 'Continuity Mix Expansion',
    group: 'growth',
    displayType: 'percent',
    target: '>= +4 pts',
    tip: 'Durable recurring revenue reduces volatility during scale.',
    diagnosticIntent: 'Measures progress toward recurring revenue resilience.',
    weight: 1,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Continuity Revenue',
    gradeBands: [
      { grade: 'green', label: '>= +4 pts', min: 4 },
      { grade: 'yellow', label: '0 to +3.9 pts', min: 0, max: 3.9 },
      { grade: 'red', label: '< 0 pts', max: -0.01 },
    ],
  },
  payrollLeverage: {
    id: 'payrollLeverage',
    name: 'Payroll Leverage',
    group: 'operational',
    displayType: 'percent',
    target: '>= +2 pts',
    tip: 'Payroll ratio should improve as systems and role design mature.',
    diagnosticIntent: 'Measures labor efficiency gains while scaling.',
    weight: 1.1,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Labor Economics',
    gradeBands: [
      { grade: 'green', label: '>= +2 pts', min: 2 },
      { grade: 'yellow', label: '0 to +1.9 pts', min: 0, max: 1.9 },
      { grade: 'red', label: '< 0 pts', max: -0.01 },
    ],
  },
  facilityLeverage: {
    id: 'facilityLeverage',
    name: 'Facility Cost Leverage',
    group: 'operational',
    displayType: 'percent',
    target: '>= +1 pt',
    tip: 'Rent burden should decline as revenue scales through fixed overhead.',
    diagnosticIntent: 'Measures fixed-cost leverage quality.',
    weight: 0.9,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Overhead Burden',
    gradeBands: [
      { grade: 'green', label: '>= +1 pt', min: 1 },
      { grade: 'yellow', label: '0 to +0.9 pts', min: 0, max: 0.9 },
      { grade: 'red', label: '< 0 pts', max: -0.01 },
    ],
  },
  odiCagr: {
    id: 'odiCagr',
    name: 'ODI CAGR',
    group: 'core',
    displayType: 'percent',
    target: '>= 12%',
    tip: 'Enterprise value growth should follow compounding ODI growth.',
    diagnosticIntent: 'Measures value-creation trajectory, not just revenue growth.',
    weight: 1.3,
    source: 'advanced',
    knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
    knowledgeRefSection: 'Valuation and ODI',
    gradeBands: [
      { grade: 'green', label: '>= 12%', min: 12 },
      { grade: 'yellow', label: '4% to 11.9%', min: 4, max: 11.9 },
      { grade: 'red', label: '< 4%', max: 3.99 },
    ],
  },
}

const DIAGNOSTICS: Record<MastermindMetricId, Record<GradeLevel, string>> = {
  revenueCagr: {
    green: 'Revenue compounding is strong and consistent with scale-stage growth.',
    yellow: 'Revenue growth is present but lacks elite compounding velocity.',
    red: 'Topline compounding is too weak for a scale-stage clinic.',
  },
  visitsCagr: {
    green: 'Visit demand is scaling with healthy throughput.',
    yellow: 'Visit growth is modest and could stall capacity plans.',
    red: 'Visit trajectory is flat or declining, limiting scale potential.',
  },
  arpvExpansion: {
    green: 'ARPV is expanding and indicates improving pricing/offer design.',
    yellow: 'ARPV has limited expansion; pricing discipline needs tightening.',
    red: 'ARPV is compressing, signaling pricing or offer erosion.',
  },
  marginExpansion: {
    green: 'Margin expansion confirms growth quality and operating leverage.',
    yellow: 'Margins are stable but not materially improving during growth.',
    red: 'Margins are shrinking while scaling, indicating structural leakage.',
  },
  continuityMixExpansion: {
    green: 'Recurring revenue mix is improving and reducing business volatility.',
    yellow: 'Continuity mix is flat to slightly better; further expansion needed.',
    red: 'Continuity mix is deteriorating, increasing dependence on front-end sales.',
  },
  payrollLeverage: {
    green: 'Payroll ratio is improving, indicating labor leverage.',
    yellow: 'Payroll leverage is neutral; role design and comp plans need tuning.',
    red: 'Payroll burden is worsening relative to revenue growth.',
  },
  facilityLeverage: {
    green: 'Facility burden is leveraging down as revenue scales.',
    yellow: 'Facility burden is stable but not yet improving.',
    red: 'Facility burden is moving the wrong direction versus growth.',
  },
  odiCagr: {
    green: 'ODI is compounding strongly and supports long-term enterprise value.',
    yellow: 'ODI growth exists but lacks strong value-creation momentum.',
    red: 'ODI is stagnating or shrinking, limiting valuation growth.',
  },
}

function toNumber(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return 0
  return value
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function cagr(start: number, end: number, periods: number): number {
  if (start <= 0 || end <= 0 || periods <= 1) return 0
  const years = periods - 1
  return (Math.pow(end / start, 1 / years) - 1) * 100
}

function resolveGrade(value: number, gradeBands: GradeBand[]): { grade: GradeLevel; label: string } {
  for (const band of gradeBands) {
    const minPass = band.min === undefined || value >= band.min
    const maxPass = band.max === undefined || value <= band.max
    if (minPass && maxPass) {
      return { grade: band.grade, label: band.label }
    }
  }

  const fallback = gradeBands[gradeBands.length - 1]
  return { grade: fallback.grade, label: fallback.label }
}

function calculateScore(metrics: MetricResult[]): number {
  if (metrics.length === 0) return 0

  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0)
  if (totalWeight <= 0) return 0

  const weighted = metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0)
  return Math.round(weighted / totalWeight)
}

function overallGrade(score: number): GradeLevel {
  if (score >= 85) return 'green'
  if (score >= 65) return 'yellow'
  return 'red'
}

function buildMetric(
  config: MastermindMetricConfig,
  value: number,
  trend: number[],
): MetricResult {
  const resolved = resolveGrade(value, config.gradeBands)

  return {
    id: config.id,
    name: config.name,
    value: Number(value.toFixed(2)),
    displayType: config.displayType,
    grade: resolved.grade,
    threshold: resolved.label,
    diagnostic: DIAGNOSTICS[config.id][resolved.grade],
    tip: config.tip,
    trend: trend.map((v) => Number(v.toFixed(2))),
    group: config.group,
    target: config.target,
    gradeBands: config.gradeBands,
    diagnosticIntent: config.diagnosticIntent,
    knowledgeRefSlug: config.knowledgeRefSlug,
    knowledgeRefSection: config.knowledgeRefSection,
    weight: config.weight,
    score: GRADE_SCORES[resolved.grade],
    source: config.source,
  }
}

function buildActionPlan(metrics: MetricResult[]): ActionItem[] {
  const ranked = [...metrics].sort((a, b) => a.score - b.score)
  const selected = ranked.slice(0, 3)

  return selected.map((metric, index) => {
    const phase = (index + 1) as 1 | 2 | 3
    return {
      id: `mastermind-${metric.id}-${phase}`,
      metricId: metric.id,
      text: `Improve ${metric.name} toward ${metric.target} by executing the focused scale playbook.`,
      phase,
      completed: false,
      target: metric.target,
      expectedImpact: metric.grade === 'red' ? 'High' : 'Medium',
      rationale: metric.diagnostic,
      knowledgeRefSlug: metric.knowledgeRefSlug,
      knowledgeRefSection: metric.knowledgeRefSection,
    }
  })
}

function buildCashFlowSummary(
  score: number,
  marginDelta: number,
  continuityDelta: number,
): string {
  if (score >= 85 && marginDelta > 0 && continuityDelta > 0) {
    return 'Scale trajectory is healthy: profitability and continuity mix are compounding in the right direction.'
  }

  if (score >= 65) {
    return 'Scale trajectory is mixed: growth is present but leverage gains are uneven across profitability and recurring mix.'
  }

  return 'Scale trajectory is fragile: key leverage indicators are deteriorating and need immediate structural intervention.'
}

function sortPeriods(periods: MastermindPeriod[]): MastermindPeriod[] {
  return [...periods].sort((a, b) => a.order - b.order)
}

export function buildMastermindPLResult(periods: MastermindPeriod[]): PLResult {
  const sorted = sortPeriods(periods)
  const warnings: string[] = []

  if (sorted.length < 2) {
    warnings.push('Mastermind mode requires at least two periods to calculate trajectory metrics.')
  }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  if (!first || !last) {
    return {
      metrics: [],
      coreMetrics: [],
      growthMetrics: [],
      operationalMetrics: [],
      odi: 0,
      enterpriseValueLow: 0,
      enterpriseValueHigh: 0,
      cashFlowSummary: 'Insufficient period data.',
      actionPlan: [],
      overallGrade: 'red',
      benchmarkVersion: 'mastermind-v1.0.0',
      confidence: 35,
      warnings,
      score: 0,
    }
  }

  const revenueSeries = sorted.map((period) => toNumber(period.input.totalGrossRevenue))
  const visitsSeries = sorted.map((period) => toNumber(period.input.totalPatientVisits))
  const arpvSeries = sorted.map((period) => {
    const revenue = toNumber(period.input.totalGrossRevenue)
    const visits = toNumber(period.input.totalPatientVisits)
    return visits > 0 ? revenue / visits : 0
  })
  const netMarginSeries = sorted.map((period) => {
    const revenue = toNumber(period.input.totalGrossRevenue)
    const netProfit = revenue - toNumber(period.input.totalOperatingExpenses)
    return percent(netProfit, revenue)
  })
  const continuityMixSeries = sorted.map((period) => {
    const revenue = toNumber(period.input.totalGrossRevenue)
    return percent(toNumber(period.input.revenueFromContinuity), revenue)
  })
  const payrollRatioSeries = sorted.map((period) => {
    const revenue = toNumber(period.input.totalGrossRevenue)
    return percent(toNumber(period.input.totalStaffPayroll), revenue)
  })
  const facilityRatioSeries = sorted.map((period) => {
    const revenue = toNumber(period.input.totalGrossRevenue)
    return percent(toNumber(period.input.totalFacilityCosts), revenue)
  })
  const odiSeries = sorted.map((period) => {
    const revenue = toNumber(period.input.totalGrossRevenue)
    const netProfit = revenue - toNumber(period.input.totalOperatingExpenses)
    return netProfit + toNumber(period.input.ownerSalary) + toNumber(period.input.ownerAddBacks)
  })

  if (revenueSeries.some((value) => value <= 0)) {
    warnings.push('One or more periods have non-positive revenue; CAGR metrics may be understated.')
  }
  if (visitsSeries.some((value) => value <= 0)) {
    warnings.push('One or more periods have non-positive visit counts; ARPV trend may be unstable.')
  }

  const revenueCagr = cagr(revenueSeries[0], revenueSeries[revenueSeries.length - 1], revenueSeries.length)
  const visitsCagr = cagr(visitsSeries[0], visitsSeries[visitsSeries.length - 1], visitsSeries.length)
  const arpvExpansion = percent(arpvSeries[arpvSeries.length - 1] - arpvSeries[0], arpvSeries[0] || 1)
  const marginExpansion = netMarginSeries[netMarginSeries.length - 1] - netMarginSeries[0]
  const continuityMixExpansion = continuityMixSeries[continuityMixSeries.length - 1] - continuityMixSeries[0]
  const payrollLeverage = payrollRatioSeries[0] - payrollRatioSeries[payrollRatioSeries.length - 1]
  const facilityLeverage = facilityRatioSeries[0] - facilityRatioSeries[facilityRatioSeries.length - 1]
  const odiCagr = cagr(Math.max(1, odiSeries[0]), Math.max(1, odiSeries[odiSeries.length - 1]), odiSeries.length)

  const metrics: MetricResult[] = [
    buildMetric(CONFIG.revenueCagr, revenueCagr, revenueSeries),
    buildMetric(CONFIG.visitsCagr, visitsCagr, visitsSeries),
    buildMetric(CONFIG.arpvExpansion, arpvExpansion, arpvSeries),
    buildMetric(CONFIG.marginExpansion, marginExpansion, netMarginSeries),
    buildMetric(CONFIG.continuityMixExpansion, continuityMixExpansion, continuityMixSeries),
    buildMetric(CONFIG.payrollLeverage, payrollLeverage, payrollRatioSeries),
    buildMetric(CONFIG.facilityLeverage, facilityLeverage, facilityRatioSeries),
    buildMetric(CONFIG.odiCagr, odiCagr, odiSeries),
  ]

  const score = calculateScore(metrics)
  const grade = overallGrade(score)
  const latestOdi = odiSeries[odiSeries.length - 1]
  const confidence = clamp(62 + sorted.length * 9 - warnings.length * 3, 40, 99)

  return {
    metrics,
    coreMetrics: metrics.filter((metric) => metric.group === 'core'),
    growthMetrics: metrics.filter((metric) => metric.group === 'growth'),
    operationalMetrics: metrics.filter((metric) => metric.group === 'operational'),
    odi: latestOdi,
    enterpriseValueLow: latestOdi * 3.2,
    enterpriseValueHigh: latestOdi * 5.6,
    cashFlowSummary: buildCashFlowSummary(score, marginExpansion, continuityMixExpansion),
    actionPlan: buildActionPlan(metrics),
    overallGrade: grade,
    benchmarkVersion: 'mastermind-v1.0.0',
    confidence,
    warnings,
    score,
  }
}
