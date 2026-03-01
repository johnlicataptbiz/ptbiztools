import type { ActionItem, GradeBand, GradeLevel, MetricResult, PLInput, PLResult } from '../plTypes'

const LEGACY_BANDS: Record<GradeLevel, GradeBand[]> = {
  green: [{ grade: 'green', label: 'Legacy green band' }],
  yellow: [{ grade: 'yellow', label: 'Legacy yellow band' }],
  red: [{ grade: 'red', label: 'Legacy red band' }],
}

const generateTrend = (baseValue: number, grade: GradeLevel): number[] => {
  const variance = grade === 'green' ? 0.08 : grade === 'yellow' ? 0.15 : 0.25
  return Array.from({ length: 5 }, (_, i) => {
    const trend = 1 + (Math.random() - 0.5) * variance + i * 0.02
    return Math.round(baseValue * trend)
  })
}

function gradeToScore(grade: GradeLevel): number {
  if (grade === 'green') return 100
  if (grade === 'yellow') return 72
  return 40
}

function makeLegacyMetric(input: {
  id: string
  name: string
  value: number
  displayType: 'currency' | 'percent' | 'ratio' | 'score' | 'count'
  grade: GradeLevel
  threshold: string
  diagnostic: string
  tip: string
}): MetricResult {
  return {
    ...input,
    trend: generateTrend(input.value, input.grade),
    group: 'core',
    target: input.threshold,
    gradeBands: LEGACY_BANDS[input.grade],
    diagnosticIntent: 'Legacy heuristic metric',
    knowledgeRefSlug: 'pnl-grader-technical-spec',
    weight: 1,
    score: gradeToScore(input.grade),
    source: 'core',
  }
}

const generateActionItems = (metrics: MetricResult[]): ActionItem[] => {
  const redMetrics = metrics.filter((m) => m.grade === 'red')
  const yellowMetrics = metrics.filter((m) => m.grade === 'yellow')
  const items: ActionItem[] = []

  if (redMetrics.length > 0 || yellowMetrics.length > 0) {
    const priorityMetrics = [...redMetrics, ...yellowMetrics].slice(0, 3)

    priorityMetrics.forEach((metric, index) => {
      let text = ''
      let phase: 1 | 2 | 3 = 1

      switch (metric.id) {
        case 'arpv':
          text = 'Implement silent price raises and adjust package pricing.'
          phase = 1
          break
        case 'recurring':
          text = 'Launch or strengthen continuity offers with memberships and small groups.'
          phase = 2
          break
        case 'rent':
          text = 'Renegotiate lease structure to cap facility burden.'
          phase = 1
          break
        case 'payroll':
          text = 'Restructure compensation to base + KPI-linked bonuses.'
          phase = 2
          break
        case 'margin':
          text = 'Audit software redundancy and optimize marketing efficiency.'
          phase = 3
          break
      }

      if (text) {
        items.push({
          id: `${metric.id}-${index}`,
          metricId: metric.id,
          text,
          phase,
          completed: false,
          rationale: metric.diagnostic,
          knowledgeRefSlug: metric.knowledgeRefSlug,
        })
      }
    })
  }

  if (items.length < 3) {
    items.push({
      id: 'maintain',
      metricId: 'general',
      text: 'Maintain strong performance while exploring expansion opportunities.',
      phase: 3,
      completed: false,
    })
  }

  return items.slice(0, 3)
}

export function buildLegacyPLResult(input: PLInput): PLResult {
  const {
    totalGrossRevenue,
    totalPatientVisits,
    revenueFromContinuity,
    totalFacilityCosts,
    totalStaffPayroll,
    totalOperatingExpenses,
    ownerSalary,
    ownerAddBacks,
  } = input

  const metrics: MetricResult[] = []

  const arpv = totalPatientVisits > 0 ? totalGrossRevenue / totalPatientVisits : 0
  let arpvGrade: GradeLevel = 'red'
  let arpvDiagnostic = 'Systemic underpricing or over-discounting.'
  if (arpv > 184) {
    arpvGrade = 'green'
    arpvDiagnostic = 'Elite pricing performance.'
  } else if (arpv >= 150) {
    arpvGrade = 'yellow'
    arpvDiagnostic = 'Improvement opportunity with incremental raises.'
  }
  metrics.push(
    makeLegacyMetric({
      id: 'arpv',
      name: 'Avg Revenue Per Visit',
      value: arpv,
      displayType: 'currency',
      grade: arpvGrade,
      threshold: '>= $185',
      diagnostic: arpvDiagnostic,
      tip: 'Benchmark: >= $185 elite.',
    }),
  )

  const recurringRatio = totalGrossRevenue > 0 ? (revenueFromContinuity / totalGrossRevenue) * 100 : 0
  let recurringGrade: GradeLevel = 'red'
  let recurringDiagnostic = 'Over-reliance on front-end acquisition.'
  if (recurringRatio > 30) {
    recurringGrade = 'green'
    recurringDiagnostic = 'Strong recurring revenue base.'
  } else if (recurringRatio >= 15) {
    recurringGrade = 'yellow'
    recurringDiagnostic = 'Moderate recurring base with upside.'
  }
  metrics.push(
    makeLegacyMetric({
      id: 'recurring',
      name: 'Recurring Revenue Ratio',
      value: recurringRatio,
      displayType: 'percent',
      grade: recurringGrade,
      threshold: '>= 30%',
      diagnostic: recurringDiagnostic,
      tip: 'Target 30-50% recurring revenue.',
    }),
  )

  const rentBurden = totalGrossRevenue > 0 ? (totalFacilityCosts / totalGrossRevenue) * 100 : 0
  let rentGrade: GradeLevel = 'red'
  let rentDiagnostic = 'Facility cost burden is high.'
  if (rentBurden < 7) {
    rentGrade = 'green'
    rentDiagnostic = 'Excellent facility cost management.'
  } else if (rentBurden <= 10) {
    rentGrade = 'yellow'
    rentDiagnostic = 'Facility costs are manageable but should be monitored.'
  }
  metrics.push(
    makeLegacyMetric({
      id: 'rent',
      name: 'Facility Cost %',
      value: rentBurden,
      displayType: 'percent',
      grade: rentGrade,
      threshold: '< 7% elite',
      diagnostic: rentDiagnostic,
      tip: 'Keep facility burden under 10%.',
    }),
  )

  const payrollRatio = totalGrossRevenue > 0 ? (totalStaffPayroll / totalGrossRevenue) * 100 : 0
  let payrollGrade: GradeLevel = 'red'
  let payrollDiagnostic = 'Payroll burden is too high.'
  if (payrollRatio < 35) {
    payrollGrade = 'green'
    payrollDiagnostic = 'Excellent payroll efficiency.'
  } else if (payrollRatio <= 45) {
    payrollGrade = 'yellow'
    payrollDiagnostic = 'Payroll is manageable with optimization headroom.'
  }
  metrics.push(
    makeLegacyMetric({
      id: 'payroll',
      name: 'Clinical Payroll %',
      value: payrollRatio,
      displayType: 'percent',
      grade: payrollGrade,
      threshold: '< 35% elite',
      diagnostic: payrollDiagnostic,
      tip: 'Target <= 40% for sustained scale.',
    }),
  )

  const netProfit = totalGrossRevenue - totalOperatingExpenses
  const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0
  let marginGrade: GradeLevel = 'red'
  let marginDiagnostic = 'Critical margin compression.'
  if (netMargin > 20) {
    marginGrade = 'green'
    marginDiagnostic = 'Elite profitability and cash resilience.'
  } else if (netMargin >= 10) {
    marginGrade = 'yellow'
    marginDiagnostic = 'Healthy margin with room for optimization.'
  }
  metrics.push(
    makeLegacyMetric({
      id: 'margin',
      name: 'Net Profit Margin',
      value: netMargin,
      displayType: 'percent',
      grade: marginGrade,
      threshold: '>= 20%',
      diagnostic: marginDiagnostic,
      tip: 'Target 20-40%+ in cash-based model.',
    }),
  )

  const odi = netProfit + ownerSalary + ownerAddBacks
  const enterpriseValueLow = odi * 3
  const enterpriseValueHigh = odi * 5

  let cashFlowSummary = ''
  if (netMargin > 20 && recurringRatio > 30) {
    cashFlowSummary = 'Excellent cash flow health with strong profitability and recurring revenue.'
  } else if (netMargin > 10 || recurringRatio > 15) {
    cashFlowSummary = 'Moderate cash flow with improvement opportunities in margin or recurring revenue.'
  } else {
    cashFlowSummary = 'Cash flow risk is elevated. Prioritize pricing and recurring revenue improvements.'
  }

  const actionPlan = generateActionItems(metrics)
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0)
  const score =
    totalWeight > 0
      ? Math.round(metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / totalWeight)
      : 0
  const overallGrade: GradeLevel = score >= 85 ? 'green' : score >= 65 ? 'yellow' : 'red'

  return {
    metrics,
    coreMetrics: metrics,
    growthMetrics: [],
    operationalMetrics: [],
    odi,
    enterpriseValueLow,
    enterpriseValueHigh,
    cashFlowSummary,
    actionPlan,
    overallGrade,
    benchmarkVersion: 'legacy',
    confidence: 75,
    warnings: ['Legacy grading path enabled. Set VITE_PL_CALCULATOR_V2=true to use benchmark-driven model.'],
    score,
  }
}
