import { getServerToServerToken } from './src/integrations/zoom/client.js'
import { prisma } from './src/services/prisma.js'

interface ZoomMeeting {
  uuid: string
  id: string | number
  host_id: string
  host_email?: string
  topic?: string
  start_time?: string
  duration?: number
  recording_files?: Array<{
    id?: string
    recording_type?: string
    file_type?: string
    file_extension?: string
    download_url?: string
    status?: string
  }>
}

interface ZoomMeetingsResponse {
  meetings?: ZoomMeeting[]
  next_page_token?: string
}

async function getAllRecordings(accessToken: string, from: string, to: string): Promise<ZoomMeeting[]> {
  const meetings: ZoomMeeting[] = []
  let nextPageToken: string | undefined
  
  console.log(`Fetching recordings from ${from} to ${to}...`)
  
  do {
    const params = new URLSearchParams({
      from,
      to,
      page_size: '300',
      ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
    })
    
    const response = await fetch(`https://api.zoom.us/v2/accounts/me/recordings?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Zoom API failed: ${text}`)
    }
    
    const data = await response.json() as ZoomMeetingsResponse
    if (data.meetings) {
      meetings.push(...data.meetings)
      console.log(`  Fetched ${data.meetings.length} meetings (total: ${meetings.length})`)
    }
    
    nextPageToken = data.next_page_token
  } while (nextPageToken)
  
  return meetings
}

async function main() {
  try {
    console.log('=== SERVER-TO-SERVER ZOOM BACKFILL ===\n')
    
    // Check for required env vars
    if (!process.env.ZOOM_ACCOUNT_ID) {
      console.error('ERROR: ZOOM_ACCOUNT_ID is required for server-to-server OAuth')
      console.error('Please add it to your Railway environment variables')
      process.exit(1)
    }
    
    console.log('Getting server-to-server access token...')
    const token = await getServerToServerToken()
    console.log(`✓ Token acquired (expires in ${token.expires_in}s)`)
    console.log(`  Scopes: ${token.scope}\n`)
    
    const from = '2025-12-11'
    const to = '2026-03-11'
    
    const meetings = await getAllRecordings(token.access_token, from, to)
    console.log(`\nTotal meetings found: ${meetings.length}`)
    
    if (meetings.length === 0) {
      console.log('No recordings found in date range.')
      process.exit(0)
    }
    
    // Process each meeting
    let upserted = 0
    let jobsQueued = 0
    
    for (const meeting of meetings) {
      // Check if recording already exists
      const existing = await prisma.zoomRecording.findUnique({
        where: { zoomMeetingUuid: meeting.uuid },
      })
      
      if (existing) {
        console.log(`  Skipping existing: ${meeting.topic || 'Untitled'} (${meeting.uuid})`)
        continue
      }
      
      // Create recording record
      const recording = await prisma.zoomRecording.create({
        data: {
          zoomMeetingUuid: meeting.uuid,
          zoomMeetingId: String(meeting.id),
          hostEmail: meeting.host_email || 'unknown',
          hostZoomUserId: meeting.host_id,
          topic: meeting.topic || 'Untitled Meeting',
          startTime: meeting.start_time ? new Date(meeting.start_time) : new Date(),
          durationMinutes: meeting.duration || 0,
          status: 'pending',
          transcriptStatus: 'pending',
          // No zoomConnectionId for server-to-server (admin token)
        },
      })
      
      upserted++
      console.log(`  Created: ${meeting.topic || 'Untitled'} (${meeting.uuid})`)
      
      // Create ingest job
      await prisma.zoomIngestJob.create({
        data: {
          zoomRecordingId: recording.id,
          eventType: 'recording.completed',
          status: 'queued',
          payload: JSON.stringify(meeting),
        },
      })
      jobsQueued++
    }
    
    console.log(`\n=== RESULTS ===`)
    console.log(`Meetings found: ${meetings.length}`)
    console.log(`Recordings created: ${upserted}`)
    console.log(`Ingest jobs queued: ${jobsQueued}`)
    
    process.exit(0)
  } catch (error) {
    console.error('\nBackfill failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
