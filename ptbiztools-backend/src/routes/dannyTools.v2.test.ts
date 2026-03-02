import assert from 'node:assert/strict'
import test from 'node:test'
import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import { prisma } from '../services/prisma.js'
import { dannyToolsRouter } from './dannyTools.js'

const longTranscript = `
Closer: Thanks for jumping on today, I want to understand your current business and where you want to go.
Prospect: We are stuck at twenty-two thousand per month and I feel stressed every week.
Closer: What does that stress look like at home and why does it matter now?
Prospect: I work late every night and it is affecting my family and confidence.
Closer: If nothing changes this year, you could lose one hundred eighty thousand in growth.
Closer: On a scale of one to ten, how ready are you to solve this now?
Prospect: I am an eight and I am serious about finding a structured plan.
Closer: Our program gives weekly sales coaching, role-play drills, and implementation reviews.
Closer: Are you ready to enroll today and start this week?
Prospect: Yes, I am ready, I just want clear next steps for onboarding.
Closer: Great, if now was not right we would schedule specific follow-up steps, but this is a yes.
Prospect: Yes, let's do it.
Closer: Perfect, I will set onboarding and your first execution call right now.
`.trim()

const mockExtraction = {
  phases: {
    connection: { score: 82, summary: 'Strong rapport and clear agenda setup.', evidence: ['Thanks for jumping on today'] },
    discovery: { score: 78, summary: 'Strong emotional and factual discovery.', evidence: ['What does that stress look like at home'] },
    gap_creation: { score: 74, summary: 'Gap and cost of inaction were quantified.', evidence: ['lose one hundred eighty thousand in growth'] },
    temp_check: { score: 71, summary: 'Readiness was explicitly checked.', evidence: ['On a scale of one to ten'] },
    solution: { score: 72, summary: 'Solution tied to prospect bottlenecks.', evidence: ['weekly sales coaching, role-play drills'] },
    close: { score: 77, summary: 'Clear enrollment ask with urgency.', evidence: ['Are you ready to enroll today'] },
    followup: { score: 65, summary: 'Follow-up path acknowledged clearly.', evidence: ['schedule specific follow-up steps'] },
  },
  critical_behaviors: {
    free_consulting: { status: 'pass', note: 'No free consulting advice provided.', evidence: ['Are you ready to enroll today'] },
    discount_discipline: { status: 'pass', note: 'No discount concession language.', evidence: ['Are you ready to enroll today'] },
    emotional_depth: { status: 'pass', note: 'Emotional impact was explored.', evidence: ['What does that stress look like at home'] },
    time_management: { status: 'unknown', note: 'Duration not explicit in transcript.', evidence: ['On a scale of one to ten'] },
    personal_story: { status: 'unknown', note: 'No clear story marker present.', evidence: ['weekly sales coaching, role-play drills'] },
  },
  top_strength: 'Direct readiness check and clear close.',
  top_improvement: 'Add a stronger transformation story during solution framing.',
  prospect_summary: 'Owner is growth-stalled and motivated to move quickly.',
}

function createApp() {
  const app = express()
  app.use(cookieParser())
  app.use(express.json({ limit: '5mb' }))
  app.use('/api/danny-tools', dannyToolsRouter)
  return app
}

const prismaUser = prisma.user as unknown as {
  findUnique: (args: unknown) => Promise<{ id: string } | null>
}

const originalFindUnique = prismaUser.findUnique
const originalFetch = global.fetch
const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY

test.afterEach(() => {
  prismaUser.findUnique = originalFindUnique
  global.fetch = originalFetch
  process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey
})

test('sales-grade-v2 requires authentication', async () => {
  const app = createApp()
  const response = await request(app).post('/api/danny-tools/sales-grade-v2').send({})

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Not authenticated')
})

test('sales-grade-v2 returns 422 for invalid payload', async () => {
  prismaUser.findUnique = async () => ({ id: 'user-1' })
  const app = createApp()

  const response = await request(app)
    .post('/api/danny-tools/sales-grade-v2')
    .set('Cookie', ['ptbiz_user=user-1'])
    .send({ transcript: '', closer: 'John', program: 'Rainmaker' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error, 'Invalid request payload')
  assert.ok(Array.isArray(response.body.reasons))
})

test('sales-grade-v2 returns 422 for short transcript quality failure', async () => {
  prismaUser.findUnique = async () => ({ id: 'user-1' })
  const app = createApp()

  const response = await request(app)
    .post('/api/danny-tools/sales-grade-v2')
    .set('Cookie', ['ptbiz_user=user-1'])
    .send({ transcript: 'Too short transcript.', closer: 'John', program: 'Rainmaker' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error, 'Transcript quality gate failed')
  assert.ok(response.body.reasons.some((reason: string) => reason.includes('minimum 120')))
})

test('sales-grade-v2 success returns deterministic contract', async () => {
  prismaUser.findUnique = async () => ({ id: 'user-1' })
  process.env.ANTHROPIC_API_KEY = 'test-key'
  global.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(mockExtraction) }],
      }),
    } as Response
  }

  const app = createApp()
  const response = await request(app)
    .post('/api/danny-tools/sales-grade-v2')
    .set('Cookie', ['ptbiz_user=user-1'])
    .send({ transcript: longTranscript, closer: 'John', program: 'Rainmaker', outcome: 'Won' })

  assert.equal(response.status, 200)
  assert.equal(response.body.version, 'v2')
  assert.equal(response.body.programProfile, 'Rainmaker')
  assert.equal(typeof response.body.deterministic.overallScore, 'number')
  assert.equal(typeof response.body.confidence.score, 'number')
  assert.equal(response.body.qualityGate.accepted, true)
  assert.equal(response.body.metadata.closer, 'John')
  assert.equal(response.body.metadata.outcome, 'Won')
  assert.equal(typeof response.body.storage.transcriptHash, 'string')
})

test('sales-grade-v2 scoring is outcome-blind and prompt excludes outcome labels', async () => {
  prismaUser.findUnique = async () => ({ id: 'user-1' })
  process.env.ANTHROPIC_API_KEY = 'test-key'
  const capturedPromptBodies: string[] = []

  global.fetch = async (_url: string | URL | Request, init?: RequestInit) => {
    const body = typeof init?.body === 'string' ? init.body : ''
    capturedPromptBodies.push(body)
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(mockExtraction) }],
      }),
    } as Response
  }

  const app = createApp()

  const won = await request(app)
    .post('/api/danny-tools/sales-grade-v2')
    .set('Cookie', ['ptbiz_user=user-1'])
    .send({ transcript: longTranscript, closer: 'John', program: 'Rainmaker', outcome: 'Won' })

  const lost = await request(app)
    .post('/api/danny-tools/sales-grade-v2')
    .set('Cookie', ['ptbiz_user=user-1'])
    .send({ transcript: longTranscript, closer: 'John', program: 'Rainmaker', outcome: 'Lost' })

  assert.equal(won.status, 200)
  assert.equal(lost.status, 200)
  assert.equal(won.body.deterministic.overallScore, lost.body.deterministic.overallScore)

  const mergedPromptBody = capturedPromptBodies.join('\n')
  assert.equal(mergedPromptBody.includes('The outcome was'), false)
  assert.equal(mergedPromptBody.includes('Won'), false)
  assert.equal(mergedPromptBody.includes('Lost'), false)
})
