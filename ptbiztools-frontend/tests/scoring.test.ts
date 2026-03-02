import assert from 'node:assert/strict'
import test from 'node:test'
import type { GradeBand } from '../src/utils/plTypes'
import { calculateWeightedScore, overallGradeFromScore, resolveGrade } from '../src/utils/pl/scoring'

test('resolveGrade returns correct matching band', () => {
  const bands: GradeBand[] = [
    { grade: 'green', label: '>= 10', min: 10 },
    { grade: 'yellow', label: '5-9.9', min: 5, max: 9.99 },
    { grade: 'red', label: '< 5', max: 4.99 },
  ]

  assert.deepEqual(resolveGrade(12, bands), { grade: 'green', label: '>= 10' })
  assert.deepEqual(resolveGrade(7, bands), { grade: 'yellow', label: '5-9.9' })
  assert.deepEqual(resolveGrade(3, bands), { grade: 'red', label: '< 5' })
})

test('calculateWeightedScore computes weighted average and rounds', () => {
  const score = calculateWeightedScore([
    { score: 100, weight: 2 },
    { score: 72, weight: 1 },
    { score: 40, weight: 1 },
  ])

  assert.equal(score, 78)
})

test('overallGradeFromScore maps score bands', () => {
  assert.equal(overallGradeFromScore(90), 'green')
  assert.equal(overallGradeFromScore(70), 'yellow')
  assert.equal(overallGradeFromScore(50), 'red')
})
