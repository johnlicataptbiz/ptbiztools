import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScenarioForecast, buildSensitivityLevers } from '../src/utils/pl/scenario'
import { buildValidInput } from './fixtures'

test('buildScenarioForecast returns downside/base/upside in order', () => {
  const rows = buildScenarioForecast(buildValidInput())
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map((row) => row.name), ['Downside', 'Base', 'Upside'])
})

test('buildSensitivityLevers returns sorted leverage deltas', () => {
  const rows = buildSensitivityLevers(buildValidInput())
  assert.equal(rows.length >= 4, true)
  assert.equal(
    Math.abs(rows[0].scoreDelta) >= Math.abs(rows[rows.length - 1].scoreDelta),
    true,
  )
})
