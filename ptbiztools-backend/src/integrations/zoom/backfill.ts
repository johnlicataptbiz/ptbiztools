import { prisma } from '../../services/prisma.js'
import { zoomGet } from './client.js'
import { getValidAccessToken } from './ingest.js'

interface ZoomRecordingFileLike {
  id?: string
  recording_type?: string
  file_type?: string
  file_extension?: string
  download_url?: string
}

interface ZoomMeetingLike {
  uuid?: string
  id?: string | number
  host_id?: string
  host_email?: string
  topic?: string
  start_time?: string
  duration?: number
  recording_files?: ZoomRecordingFileLike[]
}

interface ZoomListRecordingsResponse {
  meetings?: ZoomMeetingLike[]
  next_page_token?: string
}

export interface ZoomBackfillOptions {
  from: string
  to: string
  zoomUserId?: string
  zoomAccountId?: string
  dryRun?: boolean
  maxMeetingsPerConnection?: number
}

export interface ZoomBackfillResult {
  connectionsScanned: number
  meetingsScanned: number
  recordingsUpserted: number
  jobsQueued: number
  skippedExistingJobs: number
  errors: Array<{ connectionId: string; message: string }>
}

function chooseRecordingFile(recordingFiles: ZoomRecordingFileLike[]): ZoomRecordingFileLike | null {
  if (recordingFiles.length === 0) return null

  const transcriptFile = recordingFiles.find((file) => String(file.file_type || '').toUpperCase() === 'TRANSCRIPT')
  if (transcriptFile) return transcriptFile

  return recordingFiles[0] || null
}

function getMeetingFileId(file: ZoomRecordingFileLike | null): string {
  if (!file?.id) return 'unknown'
  return String(file.id)
}

async function listMeetingsForConnection(
  accessToken: string,
  zoomUserId: string,
  from: string,
  to: string,
  maxMeetingsPerConnection: number,
): Promise<ZoomMeetingLike[]> {
  const meetings: ZoomMeetingLike[] = []
  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T00:00:00.000Z`)

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('Invalid from/to date for backfill')
  }

  const seenMeetingUuids = new Set<string>()
  let cursor = new Date(fromDate)

  while (cursor <= toDate && meetings.length < maxMeetingsPerConnection) {
    const windowStart = new Date(cursor)
    const windowEnd = new Date(cursor)
    windowEnd.setDate(windowEnd.getDate() + 29)
    if (windowEnd > toDate) windowEnd.setTime(toDate.getTime())

    let nextPageToken = ''

    while (meetings.length < maxMeetingsPerConnection) {
      const params = new URLSearchParams({
        from: windowStart.toISOString().slice(0, 10),
        to: windowEnd.toISOString().slice(0, 10),
        page_size: '300',
      })
      if (nextPageToken) params.set('next_page_token', nextPageToken)

      const response = await zoomGet<ZoomListRecordingsResponse>(
        accessToken,
        `/users/${encodeURIComponent(zoomUserId)}/recordings?${params.toString()}`,
      )

      for (const meeting of response.meetings || []) {
        if (meetings.length >= maxMeetingsPerConnection) break
        const uuid = meeting.uuid ? String(meeting.uuid) : ''
        if (uuid && seenMeetingUuids.has(uuid)) continue
        if (uuid) seenMeetingUuids.add(uuid)
        meetings.push(meeting)
      }

      nextPageToken = response.next_page_token || ''
      if (!nextPageToken) break
    }

    cursor = new Date(windowEnd)
    cursor.setDate(cursor.getDate() + 1)
  }

  return meetings
}

export async function backfillZoomRecordings(options: ZoomBackfillOptions): Promise<ZoomBackfillResult> {
  const dryRun = options.dryRun ?? false
  const maxMeetingsPerConnection = Math.min(Math.max(options.maxMeetingsPerConnection ?? 300, 1), 1200)

  const connectionWhere = {
    ...(options.zoomUserId ? { zoomUserId: options.zoomUserId } : {}),
    ...(options.zoomAccountId ? { zoomAccountId: options.zoomAccountId } : {}),
  }

  const connections = await prisma.zoomConnection.findMany({
    where: connectionWhere,
    orderBy: { createdAt: 'desc' },
  })

  const result: ZoomBackfillResult = {
    connectionsScanned: connections.length,
    meetingsScanned: 0,
    recordingsUpserted: 0,
    jobsQueued: 0,
    skippedExistingJobs: 0,
    errors: [],
  }

  for (const connection of connections) {
    try {
      const accessToken = await getValidAccessToken(connection.id)
      const meetings = await listMeetingsForConnection(
        accessToken,
        connection.zoomUserId,
        options.from,
        options.to,
        maxMeetingsPerConnection,
      )

      result.meetingsScanned += meetings.length

      for (const meeting of meetings) {
        const meetingUuid = meeting.uuid ? String(meeting.uuid) : ''
        if (!meetingUuid) continue

        const recordingFiles = Array.isArray(meeting.recording_files) ? meeting.recording_files : []
        const chosenFile = chooseRecordingFile(recordingFiles)
        const zoomFileId = getMeetingFileId(chosenFile)

        const existing = await prisma.zoomRecording.findUnique({
          where: {
            zoomMeetingUuid_zoomFileId: {
              zoomMeetingUuid: meetingUuid,
              zoomFileId,
            },
          },
          select: { id: true },
        })

        if (dryRun) {
          if (!existing) result.recordingsUpserted += 1
          continue
        }

        const recording = await prisma.zoomRecording.upsert({
          where: {
            zoomMeetingUuid_zoomFileId: {
              zoomMeetingUuid: meetingUuid,
              zoomFileId,
            },
          },
          update: {
            zoomConnectionId: connection.id,
            zoomMeetingId: meeting.id ? String(meeting.id) : null,
            zoomRecordingId: chosenFile?.id || null,
            zoomFileId,
            zoomUserId: meeting.host_id || null,
            hostEmail: meeting.host_email || null,
            topic: meeting.topic || null,
            recordingType: chosenFile?.recording_type || null,
            fileType: chosenFile?.file_type || null,
            fileExtension: chosenFile?.file_extension || null,
            downloadUrl: chosenFile?.download_url || null,
            recordingStartAt: meeting.start_time ? new Date(meeting.start_time) : null,
            durationMinutes: meeting.duration || null,
            status: 'queued',
          },
          create: {
            zoomConnectionId: connection.id,
            zoomMeetingUuid: meetingUuid,
            zoomMeetingId: meeting.id ? String(meeting.id) : null,
            zoomRecordingId: chosenFile?.id || null,
            zoomFileId,
            zoomUserId: meeting.host_id || null,
            hostEmail: meeting.host_email || null,
            topic: meeting.topic || null,
            recordingType: chosenFile?.recording_type || null,
            fileType: chosenFile?.file_type || null,
            fileExtension: chosenFile?.file_extension || null,
            downloadUrl: chosenFile?.download_url || null,
            recordingStartAt: meeting.start_time ? new Date(meeting.start_time) : null,
            durationMinutes: meeting.duration || null,
            status: 'queued',
          },
        })

        if (!existing) result.recordingsUpserted += 1

        const existingJob = await prisma.zoomIngestJob.findFirst({
          where: {
            zoomRecordingId: recording.id,
            status: { in: ['queued', 'processing', 'completed'] },
          },
          select: { id: true },
        })

        if (existingJob) {
          result.skippedExistingJobs += 1
          continue
        }

        await prisma.zoomIngestJob.create({
          data: {
            zoomRecordingId: recording.id,
            eventType: 'backfill.recording.completed',
            payload: {
              source: 'backfill',
              from: options.from,
              to: options.to,
              meetingUuid,
              zoomFileId,
            },
            status: 'queued',
          },
        })

        result.jobsQueued += 1
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown backfill error'
      console.error('[zoom/backfill] Error processing connection:', connection.id, message)
      result.errors.push({
        connectionId: connection.id,
        message,
      })
    }
  }

  return result
}
