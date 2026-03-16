import { Prisma } from '@prisma/client'
import { buildTranscriptPrivacyArtifacts } from '../../scoring/redaction.js'
import { prisma } from '../../services/prisma.js'
import { refreshZoomToken, zoomDelete, zoomGet } from './client.js'
import type { ZoomOAuthTokenResponse } from './types.js'

interface SalesGradeResponse {
  version?: string
  phaseScores?: Record<string, unknown>
  phases?: Record<string, unknown>
  criticalBehaviors?: Record<string, { status?: string }>
  deterministic?: { overallScore?: number }
  metadata?: { outcome?: string }
  highlights?: { topStrength?: string; topImprovement?: string }
  confidence?: { score?: number }
  qualityGate?: Record<string, unknown>
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {}
  return value as Prisma.InputJsonValue
}

function getInternalAppUrl(): string {
  const url = process.env.INTERNAL_APP_URL
  if (!url) throw new Error('Missing INTERNAL_APP_URL')
  return url.replace(/\/$/, '')
}

export async function getValidAccessToken(zoomConnectionId: string): Promise<string> {
  const connection = await prisma.zoomConnection.findUnique({
    where: { id: zoomConnectionId },
  })

  if (!connection) throw new Error('Zoom connection not found')

  const now = Date.now()
  if (connection.expiresAt.getTime() > now + 60_000) {
    return connection.accessToken
  }

  const refreshed = await refreshZoomToken(connection.refreshToken)

  const updated = await prisma.zoomConnection.update({
    where: { id: connection.id },
    data: toZoomConnectionUpdate(refreshed),
  })

  return updated.accessToken
}

function toZoomConnectionUpdate(token: ZoomOAuthTokenResponse) {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type,
    scope: token.scope,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
  }
}

function inferProgram(topic?: string): 'Rainmaker' | 'Mastermind' {
  const normalized = (topic || '').toLowerCase()
  return normalized.includes('mastermind') ? 'Mastermind' : 'Rainmaker'
}

function inferProspectName(topic?: string): string {
  if (!topic) return 'Unknown'
  return topic.trim()
}

function mapOutcome(outcome?: string): string {
  if (outcome === 'Won') return 'BOOKED'
  if (outcome === 'Lost') return 'NOT BOOKED'
  return 'UNKNOWN'
}

function encodeZoomMeetingUuid(uuid: string): string {
  return encodeURIComponent(encodeURIComponent(uuid))
}

export async function runZoomIngestJob(jobId: string): Promise<{ analysisId?: string }> {
  const job = await prisma.zoomIngestJob.findUnique({
    where: { id: jobId },
    include: {
      zoomRecording: {
        include: {
          zoomConnection: true,
        },
      },
    },
  })

  if (!job) throw new Error('Zoom ingest job not found')
  if (!job.zoomRecording.zoomConnectionId || !job.zoomRecording.zoomConnection) {
    throw new Error('Missing Zoom connection on recording')
  }

  await prisma.zoomIngestJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date(),
      attemptCount: { increment: 1 },
    },
  })

  try {
    const accessToken = await getValidAccessToken(job.zoomRecording.zoomConnectionId)
    const meetingUuid = encodeZoomMeetingUuid(job.zoomRecording.zoomMeetingUuid)

    const recordingData = await zoomGet<any>(accessToken, `/meetings/${meetingUuid}/recordings`)

    const transcriptFile = (recordingData.recording_files || []).find((file: any) => {
      return String(file.file_type || '').toUpperCase() === 'TRANSCRIPT'
    })

    if (!transcriptFile?.download_url) {
      throw new Error('Transcript file not found')
    }

    const transcriptResponse = await fetch(transcriptFile.download_url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!transcriptResponse.ok) {
      throw new Error('Failed to download Zoom transcript')
    }

    const transcriptText = await transcriptResponse.text()

    if (!transcriptText || transcriptText.trim().length === 0) {
      throw new Error('Downloaded Zoom transcript is empty')
    }

    const gradeResponse = await fetch(`${getInternalAppUrl()}/api/danny-tools/sales-grade-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: transcriptText,
        closer: job.zoomRecording.hostEmail || 'Unknown',
        program: inferProgram(job.zoomRecording.topic || undefined),
        prospectName: inferProspectName(job.zoomRecording.topic || undefined),
        outcome: 'Unknown',
        callMeta: {
          durationMinutes: job.zoomRecording.durationMinutes || undefined,
        },
      }),
    })

    if (!gradeResponse.ok) {
      const text = await gradeResponse.text()
      throw new Error(`Grader call failed: ${text}`)
    }

    const grade = (await gradeResponse.json()) as SalesGradeResponse

    const privacy = buildTranscriptPrivacyArtifacts(transcriptText)

    const topStrength = grade?.highlights?.topStrength || ''
    const topImprovement = grade?.highlights?.topImprovement || ''
    const phaseScores = grade?.phaseScores || grade?.phases || {}

    const redFlags = Object.entries(grade?.criticalBehaviors || {})
      .filter(([, value]: any) => value?.status === 'fail')
      .map(([key]) => key)

    const analysis = await prisma.coachingAnalysis.create({
      data: {
        userId: job.zoomRecording.zoomConnection?.userId || null,
        sessionId: null,
        coachName: job.zoomRecording.hostEmail || 'Unknown',
        clientName: inferProspectName(job.zoomRecording.topic || undefined),
        callDate: job.zoomRecording.recordingStartAt
          ? job.zoomRecording.recordingStartAt.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        score: grade?.deterministic?.overallScore ?? 0,
        outcome: mapOutcome(grade?.metadata?.outcome),
        summary: `${topStrength} ${topImprovement}`.trim() || 'No summary available',
        phaseScores: safeJson(phaseScores),
        strengths: topStrength ? [topStrength] : [],
        improvements: topImprovement ? [topImprovement] : [],
        redFlags,
        gradingVersion: grade?.version || 'v2',
        deterministic: grade?.deterministic ? safeJson(grade.deterministic) : undefined,
        criticalBehaviors: grade?.criticalBehaviors ? safeJson(grade.criticalBehaviors) : undefined,
        confidence: typeof grade?.confidence?.score === 'number' ? grade.confidence.score : null,
        qualityGate: grade?.qualityGate ? safeJson(grade.qualityGate) : undefined,
        evidence: safeJson({
          phases: phaseScores,
          criticalBehaviors: grade?.criticalBehaviors || {},
        }),
        transcriptHash: privacy.transcriptHash,
        deidentifiedTranscript: privacy.redactedTranscript,
      },
    })

    await prisma.zoomRecording.update({
      where: { id: job.zoomRecordingId },
      data: {
        coachingAnalysisId: analysis.id,
        transcriptHash: privacy.transcriptHash,
        status: 'graded',
        transcriptStatus: 'redacted',
      },
    })

    await prisma.zoomIngestJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        lastError: null,
      },
    })

    return { analysisId: analysis.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingest error'

    await prisma.zoomIngestJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        lastError: message,
      },
    })

    throw error
  }
}

export async function deleteZoomRecordingAfterIngest(recordingId: string): Promise<void> {
  const recording = await prisma.zoomRecording.findUnique({
    where: { id: recordingId },
    include: { zoomConnection: true },
  })

  if (!recording?.zoomConnection || !recording.zoomMeetingUuid) {
    throw new Error('Recording missing connection or meeting UUID')
  }

  if (!recording.coachingAnalysisId) {
    throw new Error('Refusing delete before coaching analysis exists')
  }

  const accessToken = await getValidAccessToken(recording.zoomConnection.id)

  await prisma.zoomRecording.update({
    where: { id: recordingId },
    data: {
      deleteRequestedAt: new Date(),
      deleteStatus: 'requested',
    },
  })

  await zoomDelete(accessToken, `/meetings/${encodeZoomMeetingUuid(recording.zoomMeetingUuid)}/recordings?action=trash`)

  await prisma.zoomRecording.update({
    where: { id: recordingId },
    data: {
      deleteConfirmedAt: new Date(),
      deleteStatus: 'deleted',
    },
  })
}
