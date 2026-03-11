SELECT 'Zoom Connections' as table_name, COUNT(*) as count FROM "ZoomConnection"
UNION ALL
SELECT 'Zoom Recordings', COUNT(*) FROM "ZoomRecording"
UNION ALL
SELECT 'Zoom Ingest Jobs', COUNT(*) FROM "ZoomIngestJob"
UNION ALL
SELECT 'Coaching Analyses', COUNT(*) FROM "CoachingAnalysis";
