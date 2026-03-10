# Repository State

## Snapshot

Last verified: March 10, 2026

- Active branch: `main`
- Active worktree: `/Users/jl/Projects/ptbiztools-main`
- Live frontend: `ptbiztools-next/`
- Production URL: `https://www.ptbizcoach.com`
- Vercel project: `jack-licatas-projects/ptbiztools-next`
- Railway project: `ptbiztools-backend` (`production` environment selected locally)

## Git State

- `main` is the recovery branch and is synced with `origin/main`
- `blackboxai/add-docx-support-and-enhanced-pdf` still exists locally/remotely but is stale relative to the active app structure
- No extra worktrees are active

## Active Application Surface

`ptbiztools-next/` is the only app directory that should be treated as production-critical.

It currently owns:
- frontend routing and UI
- route protection via `src/proxy.ts`
- changelog generation via `scripts/generate-changelog.mjs`
- agent routes under `src/app/api/agent/*`
- sync route under `src/app/api/sync/actions`

It still depends on the backend service for rewritten routes configured in `next.config.ts`:
- `/api/auth/*`
- `/api/actions/*`
- `/api/analytics/*`
- `/api/pl-imports/*`
- `/api/transcripts/*`
- `/api/danny-tools/*`
- `/health`

## `ptbiztools-backend`

The backend/service code now lives under `ptbiztools-backend/` (restored from `blackboxai/add-docx-support-and-enhanced-pdf`). It contains:
- Express routes for auth, analytics, transcript upload, Danny tools, and pl-imports
- Prisma schema/migrations and utilities
- A `Dockerfile` that builds with `tsc` and copies `dist/` into the runtime stage

**Local build verification**
- `npm ci` inside `ptbiztools-backend/`
- `npm run build` produces `dist/`
- Docker deployment **must** copy `dist/` from the builder stage before `node dist/index.js`

Run those commands locally before redeploying to Railway so the `/dist` artifact exists in the final image.

## Legacy / Cleanup Targets

### 1. `ptbiztools-frontend/`

Current assessment:
- the final legacy stub was `src/services/api.ts`
- it was not imported anywhere in `ptbiztools-next`
- it has now been removed from the repo

### 2. Stale branch

`blackboxai/add-docx-support-and-enhanced-pdf`:
- based on older assumptions about the repo layout
- should not be merged blindly into `main`
- attempts to restore deleted `ptbiztools-backend/` and `ptbiztools-frontend/` trees
- deletes current `ptbiztools-next` files such as the changelog route, proxy, and recent docs
- no clean cherry-pick candidate was found that is not already present in evolved form on `main`

### 3. Infrastructure truth

The migration is not infrastructure-complete:
- Vercel frontend is live and healthy
- Railway backend still exists and remains in the request path
- docs should not claim a backend-free architecture until those rewrites are removed

### 4. Railway backend failure root cause

Latest known failed production deployment:
- deployment id: `fb0c4943-dc97-4966-adf8-8da51943643d`
- status: `FAILED`
- created: `2026-02-28T01:51:23.485Z`

Observed failure:
- Docker build tries `COPY dist ./dist/`
- the build context does not contain `/dist`
- Railway never reaches a runnable deployment for the backend service

This is a backend deployment packaging issue, not a Vercel frontend issue.

## Immediate Recovery Baseline

As of this snapshot:
- `npm run lint` passes
- `npm run build` passes
- `tsc --noEmit` passes
- production changelog works on Vercel without `.git` history
- protected app routes redirect server-side when unauthenticated

## Recommended Next Cleanup Pass

1. Restore the missing backend source or deployment pipeline for Railway, then redeploy the backend service
2. Delete the stale `blackboxai/add-docx-support-and-enhanced-pdf` branch once you no longer need it for reference
3. Trim stale planning docs after the current UI/graders stabilize
