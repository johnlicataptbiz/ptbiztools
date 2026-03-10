# Migration Status: Legacy → Next.js

**Status**: ✅ **FUNCTIONALLY MIGRATED** - core production traffic is on Next.js, but repo and infrastructure cleanup is still in progress

## Migration Summary

| Legacy System | Status | Next.js Equivalent |
|--------------|--------|-------------------|
| Vite Frontend | ✅ Migrated | Next.js 16 App Router |
| Express Backend | ✅ Migrated | API Routes + PGLite |
| Directus CMS | ✅ Migrated | Local-first architecture |
| Intro Video Flow | ❌ Removed | Deprecated by design |
| Legacy P&L Advanced | ❌ Removed | Replaced by Danny P&L |

## Feature Migration Status

| Feature | Legacy Route | Next.js Route | Status |
|---------|-------------|---------------|--------|
| Dashboard | `/` | `/dashboard` | ✅ Complete |
| Discovery Call Grader | `/discovery-call-grader` | `/discovery-call-grader` | ✅ Complete |
| P&L Calculator | `/pl-calculator` | Danny Financial Audit | ✅ Complete |
| Compensation Calculator | `/compensation-calculator` | `/compensation-calculator` | ✅ Complete |
| Sales Discovery Grader | `/sales-discovery-grader` | `/sales-discovery-grader` | ✅ Complete (with role gating) |
| Analysis History | `/analyses` | `/analyses` | ✅ Complete |
| Authentication | Legacy login | `/login` | ✅ Complete (profile picker restored) |

## UX/Branding Parity Completed

- ✅ Legacy-style login layout with profile picker
- ✅ PTBizCoach logo on login
- ✅ Official PT Biz logo in all tool headers
- ✅ Consistent branding across Danny tools
- ✅ Migration lab removed from sidebar
- ✅ Shell labeled as PTBizCoach

## Production Configuration

- `/stack-lab` - Gated (requires `NEXT_PUBLIC_ENABLE_STACK_LAB=true`)
- All core tools - Public access with auth

## Post-Migration Cleanup (March 2026)

- ✅ Removed `ptbiztools-backend/` source tree from this repo
- ✅ Removed `my-directus-project/` (Directus CMS)
- ✅ Removed temp files (`api_backup.ts`, `intro_*.tsx`, `TODO.md`)
- ✅ Removed tracked build artifacts such as `public/changelog-data.json`
- ⚠ `ptbiztools-frontend/` still exists as a legacy stub (`src/services/api.ts`) and is not imported by `ptbiztools-next`
- ⚠ Production still depends on the Railway-hosted `ptbiztools-backend` service for rewritten `/api/*` routes

## Current Architecture

**`ptbiztools-next/` is the active application** with:
- Vercel-hosted Next.js 16 frontend
- Railway-backed auth and tool APIs
- Cookie-based authentication with server-side redirects
- Workflow/agent surfaces in the Next app
- Client-side PDF generation

**Legacy remainder still in repo**
- `ptbiztools-frontend/src/services/api.ts` only
- no imports from `ptbiztools-next`
- safe candidate for archival or deletion in a dedicated cleanup pass

## Optional Future Polish

- Typography fine-tuning for exact legacy visual match
- Print/PDF template branding audit
