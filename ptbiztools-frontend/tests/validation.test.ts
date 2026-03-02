import assert from 'node:assert/strict'
import test from 'node:test'
import { validateMastermindTimeline, validateRainmakerInput } from '../src/utils/pl/validation'
import { buildValidInput } from './fixtures'

test('validateRainmakerInput has no blocking errors for valid input', () => {
  const result = validateRainmakerInput(buildValidInput())
  assert.equal(result.hasBlockingErrors, false)
  assert.equal(result.errors.length, 0)
  assert.equal(result.requiredCompletion, 100)
})

test('validateRainmakerInput catches core cross-field constraints', () => {
  const invalid = buildValidInput({
    revenueFromContinuity: 600000,
    leadCount: 100,
    evaluationsBooked: 120,
    packagesClosed: 140,
  })
  const result = validateRainmakerInput(invalid)

  assert.equal(result.hasBlockingErrors, true)
  assert.ok(result.errors.some((msg) => msg.includes('Continuity revenue cannot exceed')))
  assert.ok(result.errors.some((msg) => msg.includes('Evaluations booked cannot exceed lead count')))
  assert.ok(result.errors.some((msg) => msg.includes('Packages closed cannot exceed evaluations booked')))
})

test('validateRainmakerInput enforces nps bounds', () => {
  const invalid = buildValidInput({ npsScore: 11.2 })
  const result = validateRainmakerInput(invalid)
  assert.equal(result.hasBlockingErrors, true)
  assert.ok(result.errors.some((msg) => msg.includes('NPS must be between 0 and 10')))
})

test('validateMastermindTimeline catches blocking timeline errors', () => {
  const base = buildValidInput()
  const timeline = validateMastermindTimeline([
    { id: 'a', label: 'FY2024', order: 1, input: base },
    { id: 'b', label: 'FY2024', order: 1, input: base },
  ])

  assert.equal(timeline.hasBlockingErrors, true)
  assert.ok(timeline.errors.some((msg) => msg.includes('Duplicate period label')))
  assert.ok(timeline.errors.some((msg) => msg.includes('Duplicate period order')))
})

test('validateMastermindTimeline is ready with two valid periods', () => {
  const p1 = buildValidInput({ totalGrossRevenue: 420000, totalPatientVisits: 2200, revenueFromContinuity: 120000 })
  const p2 = buildValidInput({ totalGrossRevenue: 520000, totalPatientVisits: 2500, revenueFromContinuity: 180000 })
  const timeline = validateMastermindTimeline([
    { id: 'p1', label: 'FY2024', order: 1, input: p1 },
    { id: 'p2', label: 'FY2025', order: 2, input: p2 },
  ])

  assert.equal(timeline.isReady, true)
  assert.equal(timeline.hasBlockingErrors, false)
})
