import { useMemo } from 'react'
import type { PLInput, PLResult, MetricResult, GradeLevel, ActionItem } from './plTypes'

const generateTrend = (baseValue: number, grade: GradeLevel): number[] => {
  const variance = grade === 'green' ? 0.08 : grade === 'yellow' ? 0.15 : 0.25
  return Array.from({ length: 5 }, (_, i) => {
    const trend = 1 + (Math.random() - 0.5) * variance + (i * 0.02)
    return Math.round(baseValue * trend)
  })
}

const generateActionItems = (metrics: MetricResult[]): ActionItem[] => {
  const redMetrics = metrics.filter(m => m.grade === 'red')
  const yellowMetrics = metrics.filter(m => m.grade === 'yellow')
  const items: ActionItem[] = []
  
  if (redMetrics.length > 0 || yellowMetrics.length > 0) {
    const priorityMetrics = [...redMetrics, ...yellowMetrics].slice(0, 3)
    
    priorityMetrics.forEach((metric, index) => {
      let text = ''
      let phase: 1 | 2 | 3 = 1
      
      switch (metric.id) {
        case 'arpv':
          text = 'Implement "silent price raise" - increase session rates by $25 for new inquiries'
          phase = 1
          break
        case 'recurring':
          text = 'Launch small group training (2 cohorts, 2x/week, 6 clients each) for ~$50K MRR'
          phase = 2
          break
        case 'rent':
          text = 'Renegotiate lease to flat monthly rate or cap at $1,000-$2,000/month'
          phase = 1
          break
        case 'payroll':
          text = 'Restructure to base + bonus comp tied to capacity utilization'
          phase = 2
          break
        case 'margin':
          text = 'Audit software redundancies & evaluate marketing spend efficiency'
          phase = 3
          break
      }
      
      if (text) {
        items.push({
          id: `${metric.id}-${index}`,
          metricId: metric.id,
          text,
          phase,
          completed: false
        })
      }
    })
  }

  if (items.length < 3) {
    items.push({
      id: 'maintain',
      metricId: 'general',
      text: 'Maintain performance while exploring expansion opportunities',
      phase: 3,
      completed: false
    })
  }

  return items.slice(0, 3)
}

export function usePLGrader(input: PLInput | null): PLResult | null {
  return useMemo(() => {
    if (!input) return null

    const {
      totalGrossRevenue,
      totalPatientVisits,
      revenueFromContinuity,
      totalFacilityCosts,
      totalStaffPayroll,
      totalOperatingExpenses,
      ownerSalary,
      ownerAddBacks
    } = input

    const metrics: MetricResult[] = []

    // Metric 1: Average Revenue Per Visit (ARPV)
    const arpv = totalPatientVisits > 0 ? totalGrossRevenue / totalPatientVisits : 0
    let arpvGrade: GradeLevel = 'red'
    let arpvDiagnostic = 'Systemic underpricing or over-discounting. Implement silent price raises immediately.'
    if (arpv > 184) {
      arpvGrade = 'green'
      arpvDiagnostic = 'Elite performance - commanding premium rates with strong patient acceptance.'
    } else if (arpv >= 150) {
      arpvGrade = 'yellow'
      arpvDiagnostic = 'Room for improvement. Consider gradual price increases.'
    }
    metrics.push({
      id: 'arpv',
      name: 'Avg Revenue Per Visit',
      value: arpv,
      grade: arpvGrade,
      threshold: arpvGrade === 'green' ? '> $185' : arpvGrade === 'yellow' ? '$150 - $184' : '< $150',
      diagnostic: arpvDiagnostic,
      tip: 'Benchmark: ≥ $185 Elite. Silent price raises test patient value perception.',
      trend: generateTrend(arpv, arpvGrade)
    })

    // Metric 2: Recurring Revenue Ratio
    const recurringRatio = totalGrossRevenue > 0 ? (revenueFromContinuity / totalGrossRevenue) * 100 : 0
    let recurringGrade: GradeLevel = 'red'
    let recurringDiagnostic = 'Over-reliance on front-end acquisition. Implement remote programming or small group training.'
    if (recurringRatio > 30) {
      recurringGrade = 'green'
      recurringDiagnostic = 'Excellent recurring revenue - stable cash flow from continuity programs.'
    } else if (recurringRatio >= 15) {
      recurringGrade = 'yellow'
      recurringDiagnostic = 'Moderate recurring revenue. Focus on growing continuity programs.'
    }
    metrics.push({
      id: 'recurring',
      name: 'Recurring Revenue Ratio',
      value: recurringRatio,
      grade: recurringGrade,
      threshold: recurringGrade === 'green' ? '> 30%' : recurringGrade === 'yellow' ? '15% - 29%' : '< 15%',
      diagnostic: recurringDiagnostic,
      tip: 'Target: 30-50% from continuity. Memberships dilute acquisition costs.',
      trend: generateTrend(recurringRatio, recurringGrade)
    })

    // Metric 3: Facility Cost / Rent Burden
    const rentBurden = totalGrossRevenue > 0 ? (totalFacilityCosts / totalGrossRevenue) * 100 : 0
    let rentGrade: GradeLevel = 'red'
    let rentDiagnostic = 'Over-leveraged on real estate. Renegotiate to flat monthly cap.'
    if (rentBurden < 7) {
      rentGrade = 'green'
      rentDiagnostic = 'Excellent facility cost management - below 7% of gross.'
    } else if (rentBurden <= 10) {
      rentGrade = 'yellow'
      rentDiagnostic = 'Facility costs acceptable but monitor closely.'
    }
    metrics.push({
      id: 'rent',
      name: 'Facility Cost %',
      value: rentBurden,
      grade: rentGrade,
      threshold: rentGrade === 'green' ? '< 7%' : rentGrade === 'yellow' ? '7% - 10%' : '> 10%',
      diagnostic: rentDiagnostic,
      tip: 'Flat rate vs revenue-share: cap at $1-2K/month to preserve margins.',
      trend: generateTrend(rentBurden, rentGrade)
    })

    // Metric 4: Clinical Payroll Ratio
    const payrollRatio = totalGrossRevenue > 0 ? (totalStaffPayroll / totalGrossRevenue) * 100 : 0
    let payrollGrade: GradeLevel = 'red'
    let payrollDiagnostic = 'Bloated staffing costs. Abandon 50/50 splits for base + bonus model.'
    if (payrollRatio < 35) {
      payrollGrade = 'green'
      payrollDiagnostic = 'Excellent payroll efficiency - under 35% of gross.'
    } else if (payrollRatio <= 45) {
      payrollGrade = 'yellow'
      payrollDiagnostic = 'Payroll manageable. Optimize when scaling.'
    }
    metrics.push({
      id: 'payroll',
      name: 'Clinical Payroll %',
      value: payrollRatio,
      grade: payrollGrade,
      threshold: payrollGrade === 'green' ? '< 35%' : payrollGrade === 'yellow' ? '35% - 45%' : '> 45%',
      diagnostic: payrollDiagnostic,
      tip: 'Base + bonus tied to capacity utilization > 600% targets.',
      trend: generateTrend(payrollRatio, payrollGrade)
    })

    // Metric 5: Net Profit Margin
    const netProfit = totalGrossRevenue - totalOperatingExpenses
    const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0
    let marginGrade: GradeLevel = 'red'
    let marginDiagnostic = 'Critical margin compression. Immediate audit required.'
    if (netMargin > 20) {
      marginGrade = 'green'
      marginDiagnostic = 'Elite profit margins - strong financial health and resilience.'
    } else if (netMargin >= 10) {
      marginGrade = 'yellow'
      marginDiagnostic = 'Healthy margins with room for optimization.'
    }
    metrics.push({
      id: 'margin',
      name: 'Net Profit Margin',
      value: netMargin,
      grade: marginGrade,
      threshold: marginGrade === 'green' ? '> 20%' : marginGrade === 'yellow' ? '10% - 19%' : '< 10%',
      diagnostic: marginDiagnostic,
      tip: '20%+ = elite. Cash-based clinics target 20-40% with lean operations.',
      trend: generateTrend(netMargin, marginGrade)
    })

    // Calculate ODI (Owner's Discretionary Income)
    const odi = netProfit + ownerSalary + ownerAddBacks

    // Enterprise Valuation (3x to 5x ODI)
    const enterpriseValueLow = odi * 3
    const enterpriseValueHigh = odi * 5

    // Cash Flow Summary
    let cashFlowSummary = ''
    if (netMargin > 20 && recurringRatio > 30) {
      cashFlowSummary = 'Excellent cash flow health with strong profit margins and stable recurring revenue providing exceptional financial resilience.'
    } else if (netMargin > 10 || recurringRatio > 15) {
      cashFlowSummary = 'Moderate cash flow. Consider improving profit margins or recurring revenue for enhanced stability.'
    } else {
      cashFlowSummary = 'Cash flow at risk. Prioritize reducing expenses or building recurring revenue streams immediately.'
    }

    // Generate 90-Day Action Plan
    const actionPlan = generateActionItems(metrics)

    // Overall grade
    const greenCount = metrics.filter(m => m.grade === 'green').length
    const overallGrade: GradeLevel = greenCount >= 4 ? 'green' : greenCount >= 2 ? 'yellow' : 'red'

    return {
      metrics,
      odi,
      enterpriseValueLow,
      enterpriseValueHigh,
      cashFlowSummary,
      actionPlan,
      overallGrade
    }
  }, [input])
}
