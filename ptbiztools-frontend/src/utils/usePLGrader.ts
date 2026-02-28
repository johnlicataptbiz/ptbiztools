import { useMemo } from 'react'
import type { PLInput, PLResult, MetricResult, GradeLevel } from './plTypes'

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
    let arpvDiagnostic = 'A red grade signifies systemic underpricing, failure to institute "silent price raises," or over-discounting of treatment packages.'
    if (arpv > 184) {
      arpvGrade = 'green'
      arpvDiagnostic = 'Elite performance - you\'re commanding premium rates.'
    } else if (arpv >= 150) {
      arpvGrade = 'yellow'
      arpvDiagnostic = 'Average performance - consider gradual price increases.'
    }
    metrics.push({
      name: 'Avg Revenue Per Visit',
      value: arpv,
      grade: arpvGrade,
      threshold: arpvGrade === 'green' ? '> $185' : arpvGrade === 'yellow' ? '$150 - $184' : '< $150',
      diagnostic: arpvDiagnostic
    })

    // Metric 2: Recurring Revenue Ratio
    const recurringRatio = totalGrossRevenue > 0 ? (revenueFromContinuity / totalGrossRevenue) * 100 : 0
    let recurringGrade: GradeLevel = 'red'
    let recurringDiagnostic = 'Over-reliance on front-end acquisition. Implement remote programming or small group training to stabilize cash flow.'
    if (recurringRatio > 30) {
      recurringGrade = 'green'
      recurringDiagnostic = 'Excellent recurring revenue - your cash flow is stable.'
    } else if (recurringRatio >= 15) {
      recurringGrade = 'yellow'
      recurringDiagnostic = 'Moderate recurring revenue - focus on growing continuity programs.'
    }
    metrics.push({
      name: 'Recurring Revenue Ratio',
      value: recurringRatio,
      grade: recurringGrade,
      threshold: recurringGrade === 'green' ? '> 30%' : recurringGrade === 'yellow' ? '15% - 29%' : '< 15%',
      diagnostic: recurringDiagnostic
    })

    // Metric 3: Facility Cost / Rent Burden
    const rentBurden = totalGrossRevenue > 0 ? (totalFacilityCosts / totalGrossRevenue) * 100 : 0
    let rentGrade: GradeLevel = 'red'
    let rentDiagnostic = 'You\'re over-leveraged on real estate. If in a gym sub-lease, renegotiate to a flat monthly cap immediately.'
    if (rentBurden < 7) {
      rentGrade = 'green'
      rentDiagnostic = 'Excellent facility cost management.'
    } else if (rentBurden <= 10) {
      rentGrade = 'yellow'
      rentDiagnostic = 'Facility costs are acceptable but monitor closely.'
    }
    metrics.push({
      name: 'Rent Burden',
      value: rentBurden,
      grade: rentGrade,
      threshold: rentGrade === 'green' ? '< 7%' : rentGrade === 'yellow' ? '7% - 10%' : '> 10%',
      diagnostic: rentDiagnostic
    })

    // Metric 4: Clinical Payroll Ratio
    const payrollRatio = totalGrossRevenue > 0 ? (totalStaffPayroll / totalGrossRevenue) * 100 : 0
    let payrollGrade: GradeLevel = 'red'
    let payrollDiagnostic = 'Bloated staffing costs. Abandon flat 50/50 revenue splits and transition to base-plus-bonus model.'
    if (payrollRatio < 35) {
      payrollGrade = 'green'
      payrollDiagnostic = 'Excellent payroll efficiency.'
    } else if (payrollRatio <= 45) {
      payrollGrade = 'yellow'
      payrollDiagnostic = 'Payroll is manageable but optimize when possible.'
    }
    metrics.push({
      name: 'Clinical Payroll Ratio',
      value: payrollRatio,
      grade: payrollGrade,
      threshold: payrollGrade === 'green' ? '< 35%' : payrollGrade === 'yellow' ? '35% - 45%' : '> 45%',
      diagnostic: payrollDiagnostic
    })

    // Metric 5: Net Profit Margin
    const netProfit = totalGrossRevenue - totalOperatingExpenses
    const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0
    let marginGrade: GradeLevel = 'red'
    let marginDiagnostic = 'Highly vulnerable to seasonal cash flow interruptions. Audit software, evaluate marketing spend, and raise rates.'
    if (netMargin > 20) {
      marginGrade = 'green'
      marginDiagnostic = 'Elite profit margins - you have strong financial health.'
    } else if (netMargin >= 10) {
      marginGrade = 'yellow'
      marginDiagnostic = 'Healthy margins but room for optimization.'
    }
    metrics.push({
      name: 'Net Profit Margin',
      value: netMargin,
      grade: marginGrade,
      threshold: marginGrade === 'green' ? '> 20%' : marginGrade === 'yellow' ? '10% - 19%' : '< 10%',
      diagnostic: marginDiagnostic
    })

    // Calculate ODI (Owner's Discretionary Income)
    const odi = netProfit + ownerSalary + ownerAddBacks

    // Enterprise Valuation (3x to 5x ODI)
    const enterpriseValueLow = odi * 3
    const enterpriseValueHigh = odi * 5

    // Cash Flow Summary
    let cashFlowSummary = ''
    if (netMargin > 20 && recurringRatio > 30) {
      cashFlowSummary = 'Excellent cash flow health. Strong profit margins combined with stable recurring revenue provide financial resilience.'
    } else if (netMargin > 10 || recurringRatio > 15) {
      cashFlowSummary = 'Moderate cash flow. Consider improving either profit margins or recurring revenue for better stability.'
    } else {
      cashFlowSummary = 'Cash flow concern detected. Focus on either reducing expenses or building recurring revenue streams.'
    }

    // Generate 90-Day Action Plan based on lowest-scoring metrics
    const actionPlan: string[] = []
    const redMetrics = metrics.filter(m => m.grade === 'red')
    const yellowMetrics = metrics.filter(m => m.grade === 'yellow')

    if (redMetrics.length > 0 || yellowMetrics.length > 0) {
      const priorityMetrics = [...redMetrics, ...yellowMetrics].slice(0, 3)
      
      priorityMetrics.forEach((metric, index) => {
        switch (metric.name) {
          case 'Avg Revenue Per Visit':
            actionPlan.push(`Week ${index + 1 * 3 - 2}: Implement a "silent price raise" - increase session rates by $25 for new inquiries and observe acceptance.`)
            break
          case 'Recurring Revenue Ratio':
            actionPlan.push(`Week ${index + 1 * 3 - 2}: Launch a small group training program (2 cohorts, 2x/week, 6 clients each) to generate ~$50K annual recurring revenue.`)
            break
          case 'Rent Burden':
            actionPlan.push(`Week ${index + 1 * 3 - 2}: Renegotiate lease to flat monthly rate or cap per-patient fees at $1,000-$2,000/month.`)
            break
          case 'Clinical Payroll Ratio':
            actionPlan.push(`Week ${index + 1 * 3 - 2}: Restructure associate compensation from 50/50 split to base salary + performance bonus tied to utilization.`)
            break
          case 'Net Profit Margin':
            actionPlan.push(`Week ${index + 1 * 3 - 2}: Conduct a software audit to eliminate redundancies and evaluate marketing spend efficiency.`)
            break
        }
      })
    }

    if (actionPlan.length === 0) {
      actionPlan.push('Week 1-4: Maintain current performance while exploring expansion opportunities.')
      actionPlan.push('Week 5-8: Consider opening a second location or launching a new service line.')
      actionPlan.push('Week 9-12: Explore strategic partnerships or digital product development.')
    }

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
