import { prisma } from '../services/prisma.js'
import { buildZoomAuthorizeUrl, makeZoomState } from '../integrations/zoom/oauth.js'
import { runZoomIngestJob, deleteZoomRecordingAfterIngest, getValidAccessToken } from '../integrations/zoom/ingest.js'
import { zoomGet } from '../integrations/zoom/client.js'
import { backfillZoomRecordings } from '../integrations/zoom/backfill.js'
import { runQueuedZoomIngestJobs, getZoomIngestSummary } from '../integrations/zoom/jobs.js'

function getArg(flag: string): string | undefined {
  const index = process.argv.findIndex((value) => value === flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

async function resolveConnection() {
  const zoomUserId = getArg('--user')
  const zoomAccountId = getArg('--account')

  if (zoomUserId) {
    return prisma.zoomConnection.findFirst({ where: { zoomUserId } })
  }

  if (zoomAccountId) {
    return prisma.zoomConnection.findFirst({ where: { zoomAccountId } })
  }

  return prisma.zoomConnection.findFirst({ orderBy: { createdAt: 'desc' } })
}

async function main() {
  const command = process.argv[2]

  if (command === 'auth:url') {
    const userId = process.argv[3]
    const state = makeZoomState(userId)
    console.log(buildZoomAuthorizeUrl(state))
    return
  }

  if (command === 'jobs:list') {
    const jobs = await prisma.zoomIngestJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { zoomRecording: true },
    })

    console.table(jobs.map((job) => ({
      id: job.id,
      status: job.status,
      eventType: job.eventType,
      recordingId: job.zoomRecordingId,
      meetingUuid: job.zoomRecording.zoomMeetingUuid,
      createdAt: job.createdAt.toISOString(),
    })))
    return
  }

  if (command === 'ingest:run') {
    const jobId = process.argv[3]
    if (!jobId) throw new Error('Missing job id')
    const result = await runZoomIngestJob(jobId)
    console.log(result)
    return
  }

  if (command === 'recordings:list') {
    const connection = await resolveConnection()
    if (!connection) throw new Error('No Zoom connection found')

    const accessToken = await getValidAccessToken(connection.id)
    const data = await zoomGet<any>(accessToken, `/users/${connection.zoomUserId}/recordings?from=2025-01-01&page_size=10`)
    console.log(JSON.stringify(data, null, 2))
    return
  }

  if (command === 'recording:delete') {
    const recordingId = process.argv[3]
    if (!recordingId) throw new Error('Missing recording id')
    await deleteZoomRecordingAfterIngest(recordingId)
    console.log({ deleted: recordingId })
    return
  }

  if (command === 'jobs:summary') {
    const summary = await getZoomIngestSummary()
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  if (command === 'jobs:run-queued') {
    const limit = Number.parseInt(getArg('--limit') || '10', 10)
    const includeFailed = process.argv.includes('--include-failed')
    const deleteAfterIngest = process.argv.includes('--delete')
    const result = await runQueuedZoomIngestJobs({
      limit: Number.isFinite(limit) ? limit : 10,
      includeFailed,
      deleteAfterIngest,
    })
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (command === 'backfill') {
    const from = getArg('--from') || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const to = getArg('--to') || new Date().toISOString().slice(0, 10)
    const zoomUserId = getArg('--user')
    const zoomAccountId = getArg('--account')
    const dryRun = process.argv.includes('--dry-run')
    const maxMeetings = Number.parseInt(getArg('--max') || '300', 10)

    const result = await backfillZoomRecordings({
      from,
      to,
      zoomUserId,
      zoomAccountId,
      dryRun,
      maxMeetingsPerConnection: Number.isFinite(maxMeetings) ? maxMeetings : 300,
    })
    console.log(JSON.stringify(result, null, 2))
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
