import { prisma } from '../../services/prisma.js'
import { deleteZoomRecordingAfterIngest, runZoomIngestJob } from './ingest.js'

export interface ZoomRunQueuedOptions {
  limit?: number
  includeFailed?: boolean
  deleteAfterIngest?: boolean
}

export interface ZoomRunQueuedResult {
  requested: number
  processed: number
  succeeded: number
  failed: number
  jobs: Array<{
    jobId: string
    status: 'completed' | 'failed'
    analysisId?: string
    error?: string
  }>
}

export interface ZoomIngestSummary {
  connections: number
  jobsByStatus: Record<string, number>
  recordingsByStatus: Record<string, number>
  recentFailures: Array<{
    id: string
    eventType: string
    lastError: string | null
    updatedAt: string
    meetingUuid: string
    topic: string | null
    hostEmail: string | null
  }>
  recentCompleted: Array<{
    id: string
    eventType: string
    updatedAt: string
    meetingUuid: string
    topic: string | null
    hostEmail: string | null
  }>
}

function asCountsMap(rows: Array<{ status: string; _count: { _all: number } }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all
    return acc
  }, {})
}

export async function getZoomIngestSummary(): Promise<ZoomIngestSummary> {
  const [connections, jobCounts, recordingCounts, recentFailures, recentCompleted] = await Promise.all([
    prisma.zoomConnection.count(),
    prisma.zoomIngestJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.zoomRecording.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.zoomIngestJob.findMany({
      where: { status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        zoomRecording: {
          select: {
            zoomMeetingUuid: true,
            topic: true,
            hostEmail: true,
          },
        },
      },
    }),
    prisma.zoomIngestJob.findMany({
      where: { status: 'completed' },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        zoomRecording: {
          select: {
            zoomMeetingUuid: true,
            topic: true,
            hostEmail: true,
          },
        },
      },
    }),
  ])

  return {
    connections,
    jobsByStatus: asCountsMap(jobCounts),
    recordingsByStatus: asCountsMap(recordingCounts),
    recentFailures: recentFailures.map((job) => ({
      id: job.id,
      eventType: job.eventType,
      lastError: job.lastError,
      updatedAt: job.updatedAt.toISOString(),
      meetingUuid: job.zoomRecording.zoomMeetingUuid,
      topic: job.zoomRecording.topic || null,
      hostEmail: job.zoomRecording.hostEmail || null,
    })),
    recentCompleted: recentCompleted.map((job) => ({
      id: job.id,
      eventType: job.eventType,
      updatedAt: job.updatedAt.toISOString(),
      meetingUuid: job.zoomRecording.zoomMeetingUuid,
      topic: job.zoomRecording.topic || null,
      hostEmail: job.zoomRecording.hostEmail || null,
    })),
  }
}

export async function runQueuedZoomIngestJobs(options: ZoomRunQueuedOptions = {}): Promise<ZoomRunQueuedResult> {
  const requested = Math.min(Math.max(options.limit ?? 10, 1), 100)
  const includeFailed = options.includeFailed ?? false
  const deleteAfterIngest = options.deleteAfterIngest ?? false
  const jobs: Array<{ id: string; zoomRecordingId: string }> = []

  const queuedJobs = await prisma.zoomIngestJob.findMany({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
    take: requested,
    select: { id: true, zoomRecordingId: true },
  })
  jobs.push(...queuedJobs)

  if (includeFailed && jobs.length < requested) {
    const failedJobs = await prisma.zoomIngestJob.findMany({
      where: {
        status: 'failed',
        id: { notIn: jobs.map((job) => job.id) },
      },
      orderBy: { updatedAt: 'asc' },
      take: requested - jobs.length,
      select: { id: true, zoomRecordingId: true },
    })
    jobs.push(...failedJobs)
  }

  const result: ZoomRunQueuedResult = {
    requested,
    processed: jobs.length,
    succeeded: 0,
    failed: 0,
    jobs: [],
  }

  for (const job of jobs) {
    try {
      const ingestResult = await runZoomIngestJob(job.id)
      if (deleteAfterIngest && ingestResult.analysisId) {
        await deleteZoomRecordingAfterIngest(job.zoomRecordingId).catch((error) => {
          console.error('[zoom/jobs] delete after ingest failed:', error)
        })
      }

      result.succeeded += 1
      result.jobs.push({
        jobId: job.id,
        status: 'completed',
        analysisId: ingestResult.analysisId,
      })
    } catch (error) {
      result.failed += 1
      result.jobs.push({
        jobId: job.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown ingest error',
      })
    }
  }

  return result
}
