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

## Legacy / Cleanup Targets

### 1. `ptbiztools-frontend/`

Current contents:
- `src/services/api.ts`

Current assessment:
- not imported anywhere in `ptbiztools-next`
- not part of the production deployment path
- should be archived or deleted in a dedicated cleanup commit

### 2. Stale branch

`blackboxai/add-docx-support-and-enhanced-pdf`:
- based on older assumptions about the repo layout
- should not be merged blindly into `main`
- keep only if you still need it for reference or cherry-picking

### 3. Infrastructure truth

The migration is not infrastructure-complete:
- Vercel frontend is live and healthy
- Railway backend still exists and remains in the request path
- docs should not claim a backend-free architecture until those rewrites are removed

## Immediate Recovery Baseline

As of this snapshot:
- `npm run lint` passes
- `npm run build` passes
- `tsc --noEmit` passes
- production changelog works on Vercel without `.git` history
- protected app routes redirect server-side when unauthenticated

## Recommended Next Cleanup Pass

1. Remove or archive `ptbiztools-frontend/`
2. Audit Railway service health and ownership
3. Decide whether `blackboxai/add-docx-support-and-enhanced-pdf` should be deleted or mined for specific commits
4. Trim stale planning docs after the current UI/graders stabilize
