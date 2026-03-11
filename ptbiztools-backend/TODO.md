# Zoom Webhook & Railway Deployment Fix - TODO

## Tasks

### 1. Cache Busting & Force Fresh Build
- [ ] Update `.force_rebuild` with new timestamp
- [ ] Update `BUILD_TIMESTAMP` with current time
- [ ] Verify `.dockerignore` doesn't exclude cache files

### 2. Integrate Missing zoomConnect Router
- [ ] Import `zoomConnect` router in `index.ts`
- [ ] Register router at `/api/zoom` path (mounts connect at `/api/zoom/connect`)

### 3. Add Build Verification & Logging
- [ ] Add startup version logging in `index.ts`
- [ ] Add route registration logging

### 4. Ensure Webhook Route Accessibility
- [ ] Add GET handler for `/webhook` endpoint
- [ ] Add explicit route registration logging in `zoom.ts`

### 5. Update Dockerfile for Better Layer Caching
- [ ] Reorder COPY commands for better Docker layer caching
- [ ] Ensure prisma generate runs after source copy

### 6. Commit and Deploy
- [ ] Commit all changes
- [ ] Push to trigger Railway deployment
- [ ] Verify health endpoint returns correct JSON
- [ ] Test webhook endpoint with curl

## Current Issues Being Fixed
1. Stale deployment - health endpoint returns "OK" instead of JSON with version
2. Webhook endpoint 404 - possibly due to stale deployment
3. zoomConnect router not integrated into Express app
4. Need better cache busting strategy
