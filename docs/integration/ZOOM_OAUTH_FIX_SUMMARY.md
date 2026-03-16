# Zoom OAuth Scope Fix - Action Required

## Problem Identified
The backfill failed because the existing Zoom OAuth tokens don't have the required scopes:
- `cloud_recording:read:list_user_recordings`
- `cloud_recording:read:list_user_recordings:admin`

## What Was Fixed
Updated the OAuth authorization URL in `src/integrations/zoom/oauth.ts` to explicitly request the required scopes when users authorize.

## Deployment Status
✅ Backend deployed successfully to Railway
✅ Health check passing: https://ptbiztools-backend-production.up.railway.app/health

## Next Steps Required

### 1. Users Must Re-Authorize Zoom (CRITICAL)
Each of the 3 connected users needs to:
1. Go to https://ptbizcoach.com
2. Navigate to their Zoom integration settings
3. Click "Disconnect" or "Re-authorize"
4. Complete the OAuth flow again

This will generate new tokens with the correct scopes.

### 2. Run Backfill Again
After re-authorization, run:
```bash
cd ptbiztools-backend && railway run -- npx tsx run_backfill.ts
```

### 3. Verify Vercel Deployment
Current status shows recent deployments are healthy (Ready status).
The 404 on `/api/health` is expected - the frontend doesn't have that route.
Backend health check is the important one.

## Current Data Status
- 3 Zoom connections exist
- 0 recordings (because tokens lack scopes)
- 0 ingest jobs
- 12 coaching analyses (from previous data)

## Files Created
- `run_backfill.ts` - Script to backfill recordings
- `check_zoom_data.ts` - Query Zoom integration status
- `check_zoom_counts.sql` - SQL queries for manual checks
