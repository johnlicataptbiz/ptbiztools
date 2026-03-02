import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMastermindPLResult } from '../src/utils/pl/mastermindEngine'
import { buildValidInput } from './fixtures'

test('buildMastermindPLResult produces trajectory metrics with valid periods', () => {
  const period1 = buildValidInput({
    totalGrossRevenue: 380000,
    totalPatientVisits: 2100,
    revenueFromContinuity: 100000,
    totalStaffPayroll: 150000,
    totalOperatingExpenses: 320000,
  })
  const period2 = buildValidInput({
    totalGrossRevenue: 520000,
    totalPatientVisits: 2600,
    revenueFromContinuity: 185000,
    totalStaffPayroll: 180000,
    totalOperatingExpenses: 390000,
  })

  const result = buildMastermindPLResult([
    { id: 'p1', label: 'FY2024', input: period1, order: 1, source: 'manual' },
    { id: 'p2', label: 'FY2025', input: period2, order: 2, source: 'manual' },
  ])

  assert.equal(result.metrics.length, 8)
  assert.ok(result.score >= 0 && result.score <= 100)
  assert.ok(result.confidence >= 40 && result.confidence <= 99)
})

test('buildMastermindPLResult blocks invalid timelines', () => {
  const period = buildValidInput()
  const result = buildMastermindPLResult([
    { id: 'p1', label: 'FY2024', input: period, order: 1, source: 'manual' },
  ])

  assert.equal(result.score, 0)
  assert.equal(result.overallGrade, 'red')
  assert.ok(result.warnings.some((warning) => warning.includes('at least 2')))
})
