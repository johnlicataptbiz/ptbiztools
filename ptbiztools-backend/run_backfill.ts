import { backfillZoomRecordings } from './src/integrations/zoom/backfill.js'

async function main() {
  try {
    console.log('Starting Zoom backfill...')
    
    const result = await backfillZoomRecordings({
      from: '2025-12-11',
      to: '2026-03-11',
      dryRun: false,
      maxMeetingsPerConnection: 100
    })
    
    console.log('\n=== BACKFILL RESULTS ===\n')
    console.log(`Connections Scanned: ${result.connectionsScanned}`)
    console.log(`Meetings Scanned: ${result.meetingsScanned}`)
    console.log(`Recordings Upserted: ${result.recordingsUpserted}`)
    console.log(`Jobs Queued: ${result.jobsQueued}`)
    console.log(`Skipped Existing Jobs: ${result.skippedExistingJobs}`)
    
    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`)
      result.errors.forEach(e => {
        console.log(`  - Connection ${e.connectionId}: ${e.message}`)
      })
    }
    
    console.log('\nBackfill complete!')
    process.exit(0)
  } catch (error) {
    console.error('Backfill failed:', error)
    process.exit(1)
  }
}

main()
