import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canSubmitByWordCount,
  getWordGateMessage,
  normalizeBehaviorStatus,
  normalizeV2Result,
} from '../src/pages/danny/graderV2Helpers'

test('normalizeBehaviorStatus handles pass/fail/unknown and legacy pass boolean', () => {
  assert.equal(normalizeBehaviorStatus({ status: 'pass' }), 'pass')
  assert.equal(normalizeBehaviorStatus({ status: 'fail' }), 'fail')
  assert.equal(normalizeBehaviorStatus({ status: 'unknown' }), 'unknown')
  assert.equal(normalizeBehaviorStatus({ pass: true }), 'pass')
  assert.equal(normalizeBehaviorStatus({ pass: false }), 'fail')
  assert.equal(normalizeBehaviorStatus({}), 'unknown')
})

test('normalizeV2Result maps v2 payload into render format', () => {
  const normalized = normalizeV2Result({
    version: 'v2',
    phaseScores: {
      connection: { score: 70, summary: 'ok', evidence: ['quote'] },
      discovery: { score: 70, summary: 'ok', evidence: ['quote'] },
      gap_creation: { score: 70, summary: 'ok', evidence: ['quote'] },
      temp_check: { score: 70, summary: 'ok', evidence: ['quote'] },
      solution: { score: 70, summary: 'ok', evidence: ['quote'] },
      close: { score: 70, summary: 'ok', evidence: ['quote'] },
      followup: { score: 70, summary: 'ok', evidence: ['quote'] },
    },
    criticalBehaviors: {
      free_consulting: { status: 'pass', note: 'ok', evidence: ['quote'] },
      discount_discipline: { status: 'fail', note: 'no', evidence: ['quote'] },
      emotional_depth: { status: 'unknown', note: 'n/a', evidence: [] },
      time_management: { status: 'pass', note: 'ok', evidence: ['quote'] },
      personal_story: { status: 'pass', note: 'ok', evidence: ['quote'] },
    },
    deterministic: { weightedPhaseScore: 70, penaltyPoints: 8, unknownPenalty: 3, overallScore: 59 },
    confidence: { score: 72, evidenceCoverage: 1, quoteVerificationRate: 0.9, transcriptQuality: 0.8 },
    qualityGate: { accepted: true, reasons: [] },
    highlights: { topStrength: 'Strong opening', topImprovement: 'Improve close', prospectSummary: 'Summary' },
    metadata: { closer: 'John', outcome: 'Won', model: 'test-model' },
  })

  assert.ok(normalized)
  assert.equal(normalized?.overall_score, 59)
  assert.equal(normalized?.critical_behaviors.discount_discipline.status, 'fail')
  assert.equal(normalized?.critical_behaviors.discount_discipline.pass, false)
})

test('word-count gate helpers enforce minimum threshold messaging', () => {
  assert.equal(canSubmitByWordCount(120, 120), true)
  assert.equal(canSubmitByWordCount(119, 120), false)
  assert.equal(getWordGateMessage(140, 120), 'Quality gate ready (140 words)')
  assert.equal(getWordGateMessage(100, 120), 'Need 20 more words (min 120)')
})
