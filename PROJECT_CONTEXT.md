# Project Context

Generated: 2026-03-17

## Executive Summary

PTBizTools is a two-app monorepo: a Next.js frontend in `ptbiztools-next/` and an Express/Prisma backend in `ptbiztools-backend/`. The repo is in an active recovery state with meaningful hidden workflow files, production configs, and a pending Danny integration task chain. I have not done cleanup or destructive moves.

## Projects

| Name | Type | Deploy | Notes |
|------|------|--------|-------|
| ptbiztools-next | Next.js / React | Vercel | Main customer-facing app |
| ptbiztools-backend | Express / Prisma | Railway | API and integrations |

## Current Git State

- Branch: `main`
- Upstream: `origin/main`
- Ahead: `3` commits
- Working tree: dirty
- Notable local changes:
  - modified `ptbiztools-next/src/app/api/auth/zoom/callback/route.ts`
  - moved `locustfile.py` to `scripts/locustfile.py`
  - moved `simple-request.http` to `scripts/http/simple-request.http`
  - untracked recovery docs and scripts

## Hidden State

These are meaningful and should stay visible during onboarding:

- [`.taskmaster/`](/Users/jl/Developer/ptbiztools/.taskmaster)
- [`.blackbox/`](/Users/jl/Developer/ptbiztools/.blackbox)
- [`.cursor/`](/Users/jl/Developer/ptbiztools/.cursor)
- [`.github/workflows/`](/Users/jl/Developer/ptbiztools/.github/workflows)
- [`ptbiztools-next/.vercel/project.json`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.vercel/project.json)

Generated noise that should remain hidden:

- `.next`
- `.swc`
- `node_modules`
- `dist`
- `.vercel/output`
- `.DS_Store`

## Deployment Review

| Service | Status | Notes |
|---------|--------|-------|
| Vercel | Active | Frontend deploy target |
| Railway | Active | Backend deploy target |
| GitHub Actions | Active | CI and Gemini automation workflows present |

## Current Work Surface

The current pending Taskmaster chain is focused on Danny and the shared tool UI:

1. Integrate Danny UI with production backend.
2. Fix Danny API and PDF issues.
3. Standardize UI/UX across tools.
4. Convert Danny `.jsx` components to `.tsx`.
5. Consolidate Danny CSS and reduce ESLint noise.

Primary file areas:

- [`ptbiztools-next/src/components/danny/DannyCloserCallGrader.tsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyCloserCallGrader.tsx)
- [`ptbiztools-next/src/components/danny/DannyFinancialAudit.jsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyFinancialAudit.jsx)
- [`ptbiztools-next/src/components/danny/DannyCompensationCalculator.jsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyCompensationCalculator.jsx)
- [`ptbiztools-next/src/lib/ptbiz-api.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/lib/ptbiz-api.ts)
- [`ptbiztools-backend/src/routes/dannyTools.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/src/routes/dannyTools.ts)

## Hidden File Risk Notes

- [`ptbiztools-backend/.env`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/.env) contains sensitive production-style credentials and should be treated carefully.
- [`.env.local`](/Users/jl/Developer/ptbiztools/.env.local) and [`ptbiztools-next/.env.local`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.env.local) contain deployment auth material.
- `ptbiztools-next/.vercel/output` is generated build output and should stay hidden, but `ptbiztools-next/.vercel/project.json` should remain visible.

## What Has Been Done So Far

- Scoped the repo into frontend and backend projects.
- Mapped hidden workflow files and task state.
- Identified the active Danny task chain.
- Corrected editor visibility so meaningful hidden folders are visible while generated output stays hidden.
- Started aligning the Zoom callback path with the backend flow.

## Next Steps

1. Continue the full rescue workflow in live mode.
2. Keep broad discovery first, then move into targeted fixes.
3. Avoid cleanup or deletions until the project state is fully understood.
