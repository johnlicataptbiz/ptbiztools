import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { prisma } from '../services/prisma.js'
import { exchangeZoomCode, zoomGetCurrentUser } from '../integrations/zoom/client.js'
import { buildZoomAuthorizeUrl, getZoomRedirectUri, makeZoomState, verifyZoomState } from '../integrations/zoom/oauth.js'
import { buildZoomEndpointValidationResponse, verifyZoomWebhookSignature } from '../integrations/zoom/webhook.js'
import { backfillZoomRecordings } from '../integrations/zoom/backfill.js'
import { getZoomIngestSummary, runQueuedZoomIngestJobs } from '../integrations/zoom/jobs.js'
import { runZoomIngestJob } from '../integrations/zoom/ingest.js'

interface RawBodyRequest extends Request {
  rawBody?: Buffer
}

interface ZoomAccessTokenClaims {
  uid?: string
  aid?: string
  account_id?: string
}

type PersistedRole = 'admin' | 'advisor' | 'coach'

interface SessionRequest extends Request {
  currentUserId?: string
  currentUserRole?: PersistedRole
}

export const zoomRouter = Router()

function readZoomAccessTokenClaims(accessToken: string): ZoomAccessTokenClaims | null {
  const parts = accessToken.split('.')
  if (parts.length < 2) return null

  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(payload) as ZoomAccessTokenClaims
  } catch {
    return null
  }
}

function resolveRole(
  role: string | null | undefined,
  teamSection: string | null | undefined,
  title: string | null | undefined,
): PersistedRole {
  if (role === 'admin' || role === 'advisor' || role === 'coach') return role

  const section = (teamSection || '').trim()
  const loweredTitle = (title || '').toLowerCase()

  if (
    section === 'Partners' ||
    section === 'Acquisitions' ||
    section === 'Client Success' ||
    loweredTitle.includes('ceo') ||
    loweredTitle.includes('cfo')
  ) {
    return 'admin'
  }

  if (section === 'Advisors' || section === 'Board' || loweredTitle.includes('advisor')) {
    return 'advisor'
  }

  return 'coach'
}

async function attachSessionUser(req: SessionRequest, _res: Response, next: NextFunction) {
  try {
    const userId = req.cookies?.ptbiz_user
    if (!userId) return next()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, teamSection: true, title: true },
    })

    if (user) {
      req.currentUserId = user.id
      req.currentUserRole = resolveRole(user.role, user.teamSection, user.title)
    }

    next()
  } catch (error) {
    next(error)
  }
}

function requireAdmin(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.currentUserId) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  if (req.currentUserRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  next()
}

function parseBoundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function normalizeIsoDay(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const value = input.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return value
}

zoomRouter.use(attachSessionUser)

zoomRouter.get('/oauth/start', async (req: SessionRequest, res: Response) => {
  try {
    const explicitUserId = typeof req.query.userId === 'string' ? req.query.userId : undefined
    const userId = explicitUserId || req.currentUserId
    const state = makeZoomState(userId)
    const url = buildZoomAuthorizeUrl(state)
    res.redirect(url)
  } catch (error) {
    console.error('[zoom/oauth/start] Failed:', error)
    res.status(500).json({ error: 'Failed to create Zoom authorization URL' })
  }
})

zoomRouter.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '')
    const state = String(req.query.state || '')

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' })
    }

    const verified = verifyZoomState(state)
    const token = await exchangeZoomCode(code, getZoomRedirectUri())
    const claims = readZoomAccessTokenClaims(token.access_token)
    const profile = await zoomGetCurrentUser(token.access_token).catch(() => null)

    const zoomUserId = token.uid || claims?.uid || profile?.id
    const zoomAccountId = token.account_id || claims?.account_id || claims?.aid || profile?.account_id

    if (!zoomUserId || !zoomAccountId) {
      throw new Error('Zoom token did not include user/account identity')
    }

    await prisma.zoomConnection.upsert({
      where: {
        zoomUserId_zoomAccountId: {
          zoomUserId,
          zoomAccountId,
        },
      },
      update: {
        userId: verified.userId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        scope: token.scope || null,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
      create: {
        userId: verified.userId,
        zoomUserId,
        zoomAccountId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        scope: token.scope || null,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    })

    return res.redirect('/dashboard?zoom=connected')
  } catch (error) {
    const rawReason = error instanceof Error ? error.message : 'Unknown error'
    const safeReason = /accessToken|refreshToken|prisma|upsert/i.test(rawReason)
      ? 'Failed to persist Zoom connection'
      : rawReason

    console.error('[zoom/oauth/callback] Failed:', safeReason)
    return res.status(500).json({
      error: 'Zoom OAuth callback failed',
      reason: safeReason,
    })
  }
})

async function handleWebhook(req: RawBodyRequest, res: Response) {
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {})
  const event = req.body?.event
  
  console.log('[zoom/webhook] Received event:', event)
  console.log('[zoom/webhook] Headers:', {
    'x-zm-signature': req.headers['x-zm-signature'],
    'x-zm-request-timestamp': req.headers['x-zm-request-timestamp'],
  })
  console.log('[zoom/webhook] Body preview:', rawBody.substring(0, 200))

  // Handle endpoint validation first (no signature check needed)
  if (event === 'endpoint.url_validation') {
    const plainToken = req.body?.payload?.plainToken
    console.log('[zoom/webhook] Validation request, plainToken:', plainToken)
    
    if (!plainToken) {
      console.log('[zoom/webhook] Missing plainToken')
      return res.status(400).json({ error: 'Missing plainToken' })
    }
    
    try {
      const response = buildZoomEndpointValidationResponse(plainToken)
      console.log('[zoom/webhook] Validation response:', response)
      return res.status(200).json(response)
    } catch (error) {
      console.error('[zoom/webhook] Validation error:', error)
      return res.status(500).json({ error: 'Validation failed', details: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  // For all other events, verify signature
  const signature = String(req.headers['x-zm-signature'] || '')
  const timestamp = String(req.headers['x-zm-request-timestamp'] || '')

  console.log('[zoom/webhook] Verifying signature...')
  
  try {
    if (!verifyZoomWebhookSignature(rawBody, timestamp, signature)) {
      console.log('[zoom/webhook] Invalid signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }
    console.log('[zoom/webhook] Signature verified')
  } catch (error) {
    console.error('[zoom/webhook] Signature verification error:', error)
    return res.status(401).json({ error: 'Signature verification failed', details: error instanceof Error ? error.message : 'Unknown error' })
  }

  if (event === 'recording.completed' || event === 'recording.transcript_completed') {
    const payload = req.body?.payload || {}
    const object = payload?.object || {}
    if (!object?.uuid) {
      return res.status(200).json({ ok: true })
    }
    const meetingUuid = String(object.uuid)
    const recordingFiles = Array.isArray(object?.recording_files) ? object.recording_files : []
    const file = recordingFiles[0]

    const connection = await prisma.zoomConnection.findFirst({
      where: { zoomAccountId: payload?.account_id },
    })

    const recording = await prisma.zoomRecording.upsert({
      where: {
        zoomMeetingUuid_zoomFileId: {
          zoomMeetingUuid: meetingUuid,
          zoomFileId: file?.id || 'unknown',
        },
      },
      update: {
        zoomConnectionId: connection?.id,
        zoomMeetingId: object?.id ? String(object.id) : null,
        zoomRecordingId: file?.id || null,
        zoomFileId: file?.id || null,
        zoomUserId: object?.host_id || null,
        hostEmail: object?.host_email || null,
        topic: object?.topic || null,
        recordingType: file?.recording_type || null,
        fileType: file?.file_type || null,
        fileExtension: file?.file_extension || null,
        downloadUrl: file?.download_url || null,
        recordingStartAt: object?.start_time ? new Date(object.start_time) : null,
        durationMinutes: object?.duration || null,
        sourcePayload: req.body,
        status: 'queued',
      },
      create: {
        zoomConnectionId: connection?.id,
        zoomMeetingUuid: meetingUuid,
        zoomMeetingId: object?.id ? String(object.id) : null,
        zoomRecordingId: file?.id || null,
        zoomFileId: file?.id || null,
        zoomUserId: object?.host_id || null,
        hostEmail: object?.host_email || null,
        topic: object?.topic || null,
        recordingType: file?.recording_type || null,
        fileType: file?.file_type || null,
        fileExtension: file?.file_extension || null,
        downloadUrl: file?.download_url || null,
        recordingStartAt: object?.start_time ? new Date(object.start_time) : null,
        durationMinutes: object?.duration || null,
        sourcePayload: req.body,
        status: 'queued',
      },
    })

    const existingJob = await prisma.zoomIngestJob.findFirst({
      where: {
        zoomRecordingId: recording.id,
        status: { in: ['queued', 'processing'] },
      },
    })

    if (!existingJob) {
      await prisma.zoomIngestJob.create({
        data: {
          zoomRecordingId: recording.id,
          eventType: event,
          payload: req.body,
          status: 'queued',
        },
      })
    }
  }

  if (event === 'recording.deleted' || event === 'recording.trashed') {
    const payload = req.body?.payload || {}
    const object = payload?.object || {}
    if (!object?.uuid) {
      return res.status(200).json({ ok: true })
    }
    const meetingUuid = String(object.uuid)

    await prisma.zoomRecording.updateMany({
      where: { zoomMeetingUuid: meetingUuid },
      data: {
        deleteConfirmedAt: new Date(),
        deleteStatus: event === 'recording.trashed' ? 'trashed' : 'deleted',
      },
    })
  }

  if (event === 'recording.recovered') {
    const payload = req.body?.payload || {}
    const object = payload?.object || {}
    if (!object?.uuid) {
      return res.status(200).json({ ok: true })
    }
    const meetingUuid = String(object.uuid)

    await prisma.zoomRecording.updateMany({
      where: { zoomMeetingUuid: meetingUuid },
      data: {
        deleteStatus: 'active',
        deleteConfirmedAt: null,
      },
    })
  }

  if (event === 'recording.cloud_storage_usage_updated') {
    // Log storage usage updates - could be used for analytics
    const payload = req.body?.payload || {}
    console.log('[zoom/webhook] Cloud storage usage updated:', {
      accountId: payload?.account_id,
      usage: payload?.object?.usage,
      timestamp: new Date().toISOString(),
    })
  }

  if (event === 'account.vanity_url_approved') {
    // Log vanity URL approval - could trigger notifications
    const payload = req.body?.payload || {}
    console.log('[zoom/webhook] Account vanity URL approved:', {
      accountId: payload?.account_id,
      vanityUrl: payload?.object?.vanity_url,
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(200).json({ ok: true })
}

// Register webhook routes after function is defined
zoomRouter.post('/webhook', handleWebhook)
zoomRouter.post('/webhook/', handleWebhook)

// Add GET handler for webhook (Zoom sometimes uses GET for validation)
zoomRouter.get('/webhook', (req, res) => {
  console.log('[zoom/webhook] GET request received - returning 200 for validation')
  res.status(200).json({ status: 'ok', message: 'Webhook endpoint ready' })
})

zoomRouter.get('/webhook/', (req, res) => {
  console.log('[zoom/webhook] GET request received (trailing slash) - returning 200 for validation')
  res.status(200).json({ status: 'ok', message: 'Webhook endpoint ready' })
})

console.log('[zoom] Routes registered:')
console.log('  POST /api/zoom/webhook')
console.log('  POST /api/zoom/webhook/')
console.log('  GET /api/zoom/webhook')
console.log('  GET /api/zoom/webhook/')

zoomRouter.get('/jobs/summary', requireAdmin, async (_req: SessionRequest, res: Response) => {
  try {
    const summary = await getZoomIngestSummary()
    res.json({ summary })
  } catch (error) {
    console.error('[zoom/jobs/summary] Failed:', error)
    res.status(500).json({ error: 'Failed to fetch Zoom ingest summary' })
  }
})

zoomRouter.post('/jobs/run-queued', requireAdmin, async (req: SessionRequest, res: Response) => {
  try {
    const limit = parseBoundedInteger(req.body?.limit, 10, 1, 100)
    const includeFailed = Boolean(req.body?.includeFailed)
    const deleteAfterIngest = Boolean(req.body?.deleteAfterIngest)

    const result = await runQueuedZoomIngestJobs({
      limit,
      includeFailed,
      deleteAfterIngest,
    })

    res.json({ result })
  } catch (error) {
    console.error('[zoom/jobs/run-queued] Failed:', error)
    res.status(500).json({ error: 'Failed to run queued Zoom ingest jobs' })
  }
})

zoomRouter.post('/jobs/:jobId/run', requireAdmin, async (req: SessionRequest, res: Response) => {
  try {
    const jobId = String(req.params.jobId || '')
    if (!jobId) {
      res.status(400).json({ error: 'Missing job id' })
      return
    }

    const job = await prisma.zoomIngestJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    })

    if (!job) {
      res.status(404).json({ error: 'Job not found' })
      return
    }

    if (job.status === 'processing') {
      res.status(409).json({ error: 'Job is already processing' })
      return
    }

    try {
      const ingestResult = await runZoomIngestJob(jobId)
      res.json({
        result: {
          jobId,
          status: 'completed',
          analysisId: ingestResult.analysisId,
        },
      })
    } catch (error) {
      res.status(500).json({
        result: {
          jobId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown ingest error',
        },
      })
    }
  } catch (error) {
    console.error('[zoom/jobs/:jobId/run] Failed:', error)
    res.status(500).json({ error: 'Failed to run Zoom ingest job' })
  }
})

zoomRouter.post('/backfill', requireAdmin, async (req: SessionRequest, res: Response) => {
  try {
    const today = new Date()
    const defaultTo = today.toISOString().slice(0, 10)
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(today.getDate() - 90)
    const defaultFrom = ninetyDaysAgo.toISOString().slice(0, 10)

    const from = normalizeIsoDay(req.body?.from) || defaultFrom
    const to = normalizeIsoDay(req.body?.to) || defaultTo
    const zoomUserId = typeof req.body?.zoomUserId === 'string' ? req.body.zoomUserId : undefined
    const zoomAccountId = typeof req.body?.zoomAccountId === 'string' ? req.body.zoomAccountId : undefined
    const dryRun = Boolean(req.body?.dryRun)
    const maxMeetingsPerConnection = parseBoundedInteger(req.body?.maxMeetingsPerConnection, 300, 1, 1200)

    const result = await backfillZoomRecordings({
      from,
      to,
      zoomUserId,
      zoomAccountId,
      dryRun,
      maxMeetingsPerConnection,
    })

    res.json({ result })
  } catch (error) {
    console.error('[zoom/backfill] Failed:', error)
    res.status(500).json({ error: 'Failed to backfill Zoom recordings' })
  }
})
