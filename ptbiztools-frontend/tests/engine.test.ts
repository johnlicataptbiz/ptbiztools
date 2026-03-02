import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPLResult } from '../src/utils/pl/engine'
import { buildValidInput } from './fixtures'

test('buildPLResult returns benchmarked metrics for full input', () => {
  const result = buildPLResult(buildValidInput())

  assert.ok(result.metrics.length >= 10)
  assert.ok(result.coreMetrics.length > 0)
  assert.ok(result.growthMetrics.length > 0)
  assert.ok(result.operationalMetrics.length > 0)
  assert.ok(result.score >= 0 && result.score <= 100)
  assert.ok(result.confidence >= 35 && result.confidence <= 99)
  assert.equal(result.warnings.some((warning) => warning.startsWith('Input error:')), false)
})

test('buildPLResult score decreases when continuity engine weakens', () => {
  const strong = buildPLResult(buildValidInput({ revenueFromContinuity: 210000 }))
  const weak = buildPLResult(buildValidInput({ revenueFromContinuity: 20000 }))

  assert.ok(strong.score > weak.score)
})

test('buildPLResult surfaces input errors in warnings when invalid', () => {
  const invalid = buildValidInput({
    totalGrossRevenue: 0,
    totalPatientVisits: 0,
  })
  const result = buildPLResult(invalid)

  assert.ok(result.warnings.some((warning) => warning.includes('Input error:')))
})
