import assert from 'node:assert/strict'
import test from 'node:test'
import { computeDeterministicGrade } from './callGraderEngine.js'
import type { ExtractionResult } from './callGraderSchema.js'

const transcript = `
Closer: Thanks for jumping on today. I want to make this call useful and focused on your goals.
Prospect: I appreciate it. We are stuck at 22k a month and I feel overwhelmed trying to fix sales.
Closer: What does that stress look like at home and what is it costing you?
Prospect: I am exhausted and it is affecting my family because I work late every night.
Closer: If nothing changes for the next year, you could lose 180k in growth. On a scale of one to ten, how ready are you to fix this now?
Prospect: I am an eight. I want help if the plan is specific and accountable.
Closer: This program gives you weekly sales coaching, call review, and role play tied directly to your conversion bottleneck.
Closer: Are you ready to enroll today so we can start this week?
Prospect: Yes, I am ready if we map the first two weeks clearly.
Closer: Great. If now is not right, we schedule a specific follow-up, but today sounds like a yes.
Prospect: Yes, let's do it.
Closer: We'll start onboarding now and set the first execution call.
`.trim()

function buildExtraction(overrides?: Partial<ExtractionResult>): ExtractionResult {
  return {
    phases: {
      connection: { score: 80, summary: 'Solid rapport and agenda.', evidence: ['Thanks for jumping on today.'] },
      discovery: { score: 70, summary: 'Good current-state and emotional depth.', evidence: ['What does that stress look like at home'] },
      gap_creation: { score: 60, summary: 'Gap quantified with cost of inaction.', evidence: ['you could lose 180k in growth'] },
      temp_check: { score: 50, summary: 'Readiness asked directly.', evidence: ['On a scale of one to ten'] },
      solution: { score: 40, summary: 'Solution tied to bottleneck but light proof.', evidence: ['weekly sales coaching, call review, and role play'] },
      close: { score: 30, summary: 'Close attempt happened but lacked depth.', evidence: ['Are you ready to enroll today'] },
      followup: { score: 20, summary: 'Follow-up mention is present.', evidence: ['schedule a specific follow-up'] },
    },
    critical_behaviors: {
      free_consulting: { status: 'pass', note: 'No tactical giveaway before commitment.', evidence: ['Are you ready to enroll today'] },
      discount_discipline: { status: 'pass', note: 'No unprompted discount seen.', evidence: ['Are you ready to enroll today'] },
      emotional_depth: { status: 'pass', note: 'Follow-up on emotional impact occurred.', evidence: ['What does that stress look like at home'] },
      time_management: { status: 'unknown', note: 'Transcript does not include clear duration.', evidence: ['On a scale of one to ten'] },
      personal_story: { status: 'pass', note: 'No story used, but no failure evidence.', evidence: ['weekly sales coaching, call review, and role play'] },
    },
    top_strength: 'Direct readiness check and clear ask.',
    top_improvement: 'Increase specificity in solution proof.',
    prospect_summary: 'Owner stuck at 22k/month, overwhelmed, ready to act.',
    ...overrides,
  }
}

test('computes weighted score exactly for Rainmaker and Mastermind profiles', () => {
  const extraction = buildExtraction({
    critical_behaviors: {
      ...buildExtraction().critical_behaviors,
      time_management: { status: 'pass', note: 'No overrun evidence.', evidence: ['On a scale of one to ten'] },
    },
  })

  const rainmaker = computeDeterministicGrade({ transcript, extraction, program: 'Rainmaker' })
  const mastermind = computeDeterministicGrade({ transcript, extraction, program: 'Mastermind' })

  assert.equal(rainmaker.deterministic.weightedPhaseScore, 54)
  assert.equal(mastermind.deterministic.weightedPhaseScore, 55)
  assert.equal(rainmaker.deterministic.overallScore, 48) // close < 50 triggers deterministic penalty
  assert.equal(mastermind.deterministic.overallScore, 49) // solution < 55 triggers deterministic penalty
})

test('applies fail penalties, additional low-phase penalties, and unknown penalties', () => {
  const extraction = buildExtraction({
    phases: {
      ...buildExtraction().phases,
      discovery: { score: 45, summary: 'Weak discovery depth.', evidence: ['We are stuck at 22k a month'] },
      close: { score: 40, summary: 'Close was hesitant.', evidence: ['Are you ready to enroll today'] },
    },
    critical_behaviors: {
      ...buildExtraction().critical_behaviors,
      free_consulting: { status: 'fail', note: 'Advice was given before commitment.', evidence: ['weekly sales coaching, call review, and role play'] },
      time_management: { status: 'unknown', note: 'Duration unavailable.', evidence: ['On a scale of one to ten'] },
    },
  })

  const grade = computeDeterministicGrade({ transcript, extraction, program: 'Rainmaker' })

  assert.equal(grade.deterministic.weightedPhaseScore, 49)
  assert.equal(grade.deterministic.penaltyPoints, 26) // 12 fail + 8 discovery + 6 close
  assert.equal(grade.deterministic.unknownPenalty, 3)
  assert.equal(grade.deterministic.overallScore, 20)
})

test('clamps overall score at 0 and 100', () => {
  const maxExtraction = buildExtraction({
    phases: {
      connection: { score: 100, summary: 'Strong', evidence: ['Thanks for jumping on today.'] },
      discovery: { score: 100, summary: 'Strong', evidence: ['What does that stress look like at home'] },
      gap_creation: { score: 100, summary: 'Strong', evidence: ['you could lose 180k in growth'] },
      temp_check: { score: 100, summary: 'Strong', evidence: ['On a scale of one to ten'] },
      solution: { score: 100, summary: 'Strong', evidence: ['weekly sales coaching, call review, and role play'] },
      close: { score: 100, summary: 'Strong', evidence: ['Are you ready to enroll today'] },
      followup: { score: 100, summary: 'Strong', evidence: ['schedule a specific follow-up'] },
    },
    critical_behaviors: {
      free_consulting: { status: 'pass', note: 'Good', evidence: ['Are you ready to enroll today'] },
      discount_discipline: { status: 'pass', note: 'Good', evidence: ['Are you ready to enroll today'] },
      emotional_depth: { status: 'pass', note: 'Good', evidence: ['What does that stress look like at home'] },
      time_management: { status: 'pass', note: 'Good', evidence: ['On a scale of one to ten'] },
      personal_story: { status: 'pass', note: 'Good', evidence: ['weekly sales coaching, call review, and role play'] },
    },
  })
  const minExtraction = buildExtraction({
    phases: {
      connection: { score: 0, summary: 'Weak', evidence: ['Thanks for jumping on today.'] },
      discovery: { score: 0, summary: 'Weak', evidence: ['What does that stress look like at home'] },
      gap_creation: { score: 0, summary: 'Weak', evidence: ['you could lose 180k in growth'] },
      temp_check: { score: 0, summary: 'Weak', evidence: ['On a scale of one to ten'] },
      solution: { score: 0, summary: 'Weak', evidence: ['weekly sales coaching, call review, and role play'] },
      close: { score: 0, summary: 'Weak', evidence: ['Are you ready to enroll today'] },
      followup: { score: 0, summary: 'Weak', evidence: ['schedule a specific follow-up'] },
    },
    critical_behaviors: {
      free_consulting: { status: 'fail', note: 'Fail', evidence: ['Are you ready to enroll today'] },
      discount_discipline: { status: 'fail', note: 'Fail', evidence: ['Are you ready to enroll today'] },
      emotional_depth: { status: 'fail', note: 'Fail', evidence: ['What does that stress look like at home'] },
      time_management: { status: 'fail', note: 'Fail', evidence: ['On a scale of one to ten'] },
      personal_story: { status: 'fail', note: 'Fail', evidence: ['weekly sales coaching, call review, and role play'] },
    },
  })

  const maxGrade = computeDeterministicGrade({ transcript, extraction: maxExtraction, program: 'Rainmaker' })
  const minGrade = computeDeterministicGrade({ transcript, extraction: minExtraction, program: 'Rainmaker' })

  assert.equal(maxGrade.deterministic.overallScore, 100)
  assert.equal(minGrade.deterministic.overallScore, 0)
})

test('quote verification reduces confidence when evidence quote is not found', () => {
  const extraction = buildExtraction({
    phases: {
      ...buildExtraction().phases,
      followup: { score: 20, summary: 'Has unsupported quote', evidence: ['This quote never appears in transcript'] },
    },
  })

  const grade = computeDeterministicGrade({ transcript, extraction, program: 'Rainmaker' })
  assert.ok(grade.confidence.quoteVerificationRate < 1)
  assert.ok(grade.diagnostics.unverifiedQuotes.includes('This quote never appears in transcript'))
})

test('quality gate rejects empty phase evidence', () => {
  const extraction = buildExtraction({
    phases: {
      ...buildExtraction().phases,
      solution: {
        score: 70,
        summary: 'Reasonable summary but no evidence.',
        evidence: [],
      },
    },
    critical_behaviors: {
      ...buildExtraction().critical_behaviors,
      personal_story: {
        status: 'unknown',
        note: 'No clear story marker.',
        evidence: [],
      },
    },
  })

  const grade = computeDeterministicGrade({ transcript, extraction, program: 'Rainmaker' })
  assert.equal(grade.qualityGate.accepted, false)
  assert.ok(grade.qualityGate.reasons.some((reason) => reason.includes('solution')))
  assert.ok(grade.qualityGate.reasons.some((reason) => reason.includes('personal_story')))
})

test('deterministic outputs are outcome-blind for identical transcript and extraction', () => {
  const extraction = buildExtraction()
  const won = computeDeterministicGrade({ transcript, extraction, program: 'Rainmaker' })
  const lost = computeDeterministicGrade({ transcript, extraction, program: 'Rainmaker' })

  assert.equal(won.deterministic.overallScore, lost.deterministic.overallScore)
  assert.deepEqual(won.phaseScores, lost.phaseScores)
})
