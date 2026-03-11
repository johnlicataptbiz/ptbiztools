import { prisma } from './src/services/prisma.js'

async function checkZoomData() {
  try {
    const connections = await prisma.zoomConnection.count()
    const recordings = await prisma.zoomRecording.count()
    const jobs = await prisma.zoomIngestJob.count()
    const analyses = await prisma.coachingAnalysis.count()

    console.log('\n=== ZOOM INTEGRATION STATUS ===\n')
    console.log(`Zoom Connections:     ${connections}`)
    console.log(`Zoom Recordings:      ${recordings}`)
    console.log(`Zoom Ingest Jobs:     ${jobs}`)
    console.log(`Coaching Analyses:    ${analyses}`)
    console.log('\n================================\n')

    if (connections > 0) {
      const recentConnections = await prisma.zoomConnection.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          zoomUserId: true,
          zoomEmail: true,
          createdAt: true,
          updatedAt: true,
        }
      })
      console.log('Recent Zoom Connections:')
      recentConnections.forEach(c => {
        console.log(`  - ${c.zoomEmail} (ID: ${c.zoomUserId}) - Created: ${c.createdAt.toISOString()}`)
      })
      console.log('')
    }

    if (recordings > 0) {
      const recentRecordings = await prisma.zoomRecording.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          topic: true,
          hostEmail: true,
          status: true,
          createdAt: true,
        }
      })
      console.log('Recent Zoom Recordings:')
      recentRecordings.forEach(r => {
        console.log(`  - "${r.topic}" by ${r.hostEmail} - Status: ${r.status} - Created: ${r.createdAt.toISOString()}`)
      })
      console.log('')
    }

    if (jobs > 0) {
      const jobStatusCounts = await prisma.zoomIngestJob.groupBy({
        by: ['status'],
        _count: { _all: true }
      })
      console.log('Ingest Job Status Breakdown:')
      jobStatusCounts.forEach(j => {
        console.log(`  - ${j.status}: ${j._count._all}`)
      })
      console.log('')
    }

    process.exit(0)
  } catch (error) {
    console.error('Error checking Zoom data:', error)
    process.exit(1)
  }
}

checkZoomData()
