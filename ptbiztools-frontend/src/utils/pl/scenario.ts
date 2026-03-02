import type { PLInput, PLResult } from '../plTypes'
import { buildPLResult } from './engine'

export interface ScenarioRow {
  name: 'Downside' | 'Base' | 'Upside'
  score: number
  odi: number
  grade: PLResult['overallGrade']
}

export interface SensitivityRow {
  label: string
  scoreDelta: number
}

function sanitize(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

function buildScenarioInput(base: PLInput, factors: {
  revenue: number
  visits: number
  continuity: number
  payroll: number
  opex: number
}): PLInput {
  return {
    ...base,
    totalGrossRevenue: sanitize(base.totalGrossRevenue * factors.revenue),
    totalPatientVisits: sanitize(base.totalPatientVisits * factors.visits),
    revenueFromContinuity: sanitize(base.revenueFromContinuity * factors.continuity),
    totalStaffPayroll: sanitize(base.totalStaffPayroll * factors.payroll),
    totalOperatingExpenses: sanitize(base.totalOperatingExpenses * factors.opex),
  }
}

export function buildScenarioForecast(baseInput: PLInput): ScenarioRow[] {
  const base = buildPLResult(baseInput)
  const downside = buildPLResult(buildScenarioInput(baseInput, {
    revenue: 0.9,
    visits: 0.92,
    continuity: 0.88,
    payroll: 1.04,
    opex: 1.06,
  }))
  const upside = buildPLResult(buildScenarioInput(baseInput, {
    revenue: 1.12,
    visits: 1.1,
    continuity: 1.18,
    payroll: 1.01,
    opex: 1.03,
  }))

  return [
    { name: 'Downside', score: downside.score, odi: downside.odi, grade: downside.overallGrade },
    { name: 'Base', score: base.score, odi: base.odi, grade: base.overallGrade },
    { name: 'Upside', score: upside.score, odi: upside.odi, grade: upside.overallGrade },
  ]
}

export function buildSensitivityLevers(baseInput: PLInput): SensitivityRow[] {
  const base = buildPLResult(baseInput)
  const experiments: Array<{ label: string; next: PLInput }> = [
    {
      label: 'Revenue +10%',
      next: { ...baseInput, totalGrossRevenue: baseInput.totalGrossRevenue * 1.1 },
    },
    {
      label: 'Continuity Revenue +15%',
      next: { ...baseInput, revenueFromContinuity: baseInput.revenueFromContinuity * 1.15 },
    },
    {
      label: 'Staff Payroll -10%',
      next: { ...baseInput, totalStaffPayroll: Math.max(0, baseInput.totalStaffPayroll * 0.9) },
    },
    {
      label: 'Operating Expenses -8%',
      next: { ...baseInput, totalOperatingExpenses: Math.max(0, baseInput.totalOperatingExpenses * 0.92) },
    },
  ]

  return experiments
    .map((experiment) => {
      const nextResult = buildPLResult(experiment.next)
      return {
        label: experiment.label,
        scoreDelta: nextResult.score - base.score,
      }
    })
    .sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta))
}
