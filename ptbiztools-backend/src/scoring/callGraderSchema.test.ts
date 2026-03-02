import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractionResultSchema,
  salesGradeV2RequestSchema,
  zodIssuesToReasons,
} from './callGraderSchema.js'

const validExtraction = {
  phases: {
    connection: { score: 70, summary: 'Strong opening and agenda set.', evidence: ['Thanks for jumping on today.'] },
    discovery: { score: 70, summary: 'Good discovery with emotional probing.', evidence: ['What does that stress look like at home'] },
    gap_creation: { score: 70, summary: 'Gap discussed with consequences.', evidence: ['you could lose 180k in growth'] },
    temp_check: { score: 70, summary: 'Readiness checked directly.', evidence: ['On a scale of one to ten'] },
    solution: { score: 70, summary: 'Solution tied to pain points.', evidence: ['weekly sales coaching, call review, and role play'] },
    close: { score: 70, summary: 'Close attempt was direct.', evidence: ['Are you ready to enroll today'] },
    followup: { score: 70, summary: 'Follow-up path was explicit.', evidence: ['schedule a specific follow-up'] },
  },
  critical_behaviors: {
    free_consulting: { status: 'pass', note: 'No giveaway before commitment.', evidence: ['Are you ready to enroll today'] },
    discount_discipline: { status: 'pass', note: 'No discounts offered.', evidence: ['Are you ready to enroll today'] },
    emotional_depth: { status: 'pass', note: 'Deep emotional follow-up.', evidence: ['What does that stress look like at home'] },
    time_management: { status: 'unknown', note: 'Duration not available.', evidence: ['On a scale of one to ten'] },
    personal_story: { status: 'pass', note: 'No miss detected.', evidence: ['weekly sales coaching, call review, and role play'] },
  },
  top_strength: 'Strong direct close and readiness check.',
  top_improvement: 'Add deeper proof during solution presentation.',
  prospect_summary: 'Owner is growth-stalled and motivated to change.',
}

test('validates sales-grade-v2 request contract', () => {
  const request = {
    transcript: 'Coach: Hi. Prospect: Hello.',
    program: 'Rainmaker',
    closer: 'John',
    outcome: 'Won',
    prospectName: 'Test Prospect',
    callMeta: { durationMinutes: 42 },
  }

  const parsed = salesGradeV2RequestSchema.safeParse(request)
  assert.equal(parsed.success, true)
})

test('rejects extraction when a phase key is missing', () => {
  const broken = {
    ...validExtraction,
    phases: {
      ...validExtraction.phases,
    },
  } as Record<string, unknown>
  delete (broken.phases as Record<string, unknown>).discovery

  const parsed = extractionResultSchema.safeParse(broken)
  assert.equal(parsed.success, false)
  if (parsed.success) {
    assert.fail('Expected schema validation to fail')
  }
  const reasons = zodIssuesToReasons(parsed.error)
  assert.ok(reasons.some((reason) => reason.includes('phases.discovery')))
})

test('rejects extraction when phase score is out of range', () => {
  const broken = {
    ...validExtraction,
    phases: {
      ...validExtraction.phases,
      close: {
        ...validExtraction.phases.close,
        score: 200,
      },
    },
  }

  const parsed = extractionResultSchema.safeParse(broken)
  assert.equal(parsed.success, false)
})
