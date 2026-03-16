# Project Context — Rescue Summary

Generated: 2026-03-16T06:20:00-05:00
Rescue branch: main
Baseline commit: `832f777` (pre-rescue checkpoint)

---

## Executive Summary

PT Biz Tools is a SaaS monorepo for physical therapy business owners (ptbizcoach.com). It consists of an Express/TypeScript backend deployed on Railway and a Next.js/React frontend deployed on Vercel. The codebase is in **excellent health**: both projects compile cleanly, all 32 tests pass, CI/CD pipelines are configured, and the working tree is clean. Minor housekeeping items remain (2 JSX→TSX conversions, 2 stale remote branches, asset audit).

**Health Score: 90/100**

---

## Projects Discovered

### 1. ptbiztools-backend (Express API)
- **Path:** `ptbiztools-backend/`
- **Stack:** Node.js 22, Express 4.21, TypeScript 5.9.3, Prisma 5.22.0, PostgreSQL
- **Deployment:** Railway (Docker, node:22-alpine)
- **Build:** `tsc` → `dist/`
- **Tests:** 25/25 passing (Node test runner, 602ms)
- **Key modules:**
  - `src/routes/` — auth, analytics, actionLog, dannyTools, mem0, plImport, transcript, zoom, zoomConnect
  - `src/scoring/` — callGraderEngine, callGraderProfiles, callGraderSchema, redaction, transcriptQuality
  - `src/pl-import/` — P&L import pipeline (parsers, mapping, service)
  - `src/integrations/zoom/` — Zoom OAuth integration
  - `prisma/` — 3 migrations applied

### 2. ptbiztools-next (Next.js Frontend)
- **Path:** `ptbiztools-next/`
- **Stack:** Next.js 16.1.6, React 19.2.3, TypeScript, Tailwind CSS v4, AI SDK 6.0.107
- **Deployment:** Vercel (via GitHub Actions + amondnet/vercel-action@v25)
- **Build:** `next build` ✅ successful
- **Tests:** 7/7 passing (Vitest 4.1.0, 1.64s)
- **Route groups:**
  - `(app)/` — analyses, dashboard, discovery-call-grader, sales-discovery-grader
  - `(tools)/` — compensation-calculator, pl-calculator
  - `login/`, `stack-lab/`
  - `api/` — agent/surface, auth/zoom/callback, changelog, danny-tools/sales-grade-v2, sync/actions
  - `.well-known/workflow/` — 3 webhook routes
- **Component directories:** danny, discovery, grader, login, agent, clinic, dashboard, layout, analyses, corex, local-first, tour, changelog, providers

### 3. Root Workspace
- **Path:** `/` (monorepo root)
- **Files:** package.json (workspace scripts), .nvmrc (node 22), AGENTS.md, README.md, TODO.md
- **Directories:** docs/, firecrawl/, scripts/, skills/, videos/ (gitignored)
- **CI/CD:** `.github/workflows/` (7 workflow files)

---

## Git State

| Property | Value |
|----------|-------|
| **Branch** | `main` |
| **Upstream** | `origin/main` (up to date + 1 commit ahead) |
| **Working tree** | Clean |
| **Latest commit** | `832f777` — "wip: pre-rescue checkpoint" |
| **Worktrees** | 1 (main only) |
| **Local branches** | 1 (`main`) |
| **Remote branches** | 4 (origin/main, origin/HEAD, 2 stale agent/* branches) |

### Stale Remote Branches (candidates for pruning)
- `origin/agent/npx-skills-add-httpsgithubcomroin-orcaskills-skill-15-5z-codex`
- `origin/agent/npx-skills-add-httpsgithubcomroin-orcaskills-skill-15-5z-qwen-code`

### Recent Commit History (last 10)
| Hash | Date | Message |
|------|------|---------|
| `832f777` | Mar 16 | wip: pre-rescue checkpoint |
| `eda7b60` | Mar 16 | chore: quick wins — fix deploy workflow, delete stale docs |
| `26eb684` | Mar 16 | chore: remove intro video binaries (6MB cleanup) |
| `c216c29` | Mar 16 | docs: update PROJECT_CONTEXT.md with rescue phase 2 |
| `9ec1372` | Mar 16 | chore: organize root clutter — move docs, scripts |
| `61c6aca` | Mar 16 | chore: update gitignore with AI tool dirs |
| `1ebbcaf` | Mar 16 | fix: complete login page redesign |
| `bfc50e2` | Mar 16 | Add GitHub Actions workflow for frontend deployment |
| `a1f12a7` | Mar 15 | docs: update PROJECT_CONTEXT.md with final rescue state |
| `97fb127` | Mar 15 | ci: add GitHub Actions CI pipeline |

---

## Build & Test Verification

| Check | Backend | Frontend |
|-------|---------|----------|
| **TypeScript** | ✅ `tsc --noEmit` clean | ✅ `tsc --noEmit` clean |
| **Build** | ✅ `tsc` compiles | ✅ `next build` successful |
| **Tests** | ✅ 25/25 (602ms) | ✅ 7/7 (1.64s) |
| **Lint** | N/A | ✅ ESLint (max-warnings 10) |

---

## CI/CD Pipelines

### ci.yml (Continuous Integration)
- **Triggers:** push to main, PRs to main
- **Backend job:** checkout → setup node (from .nvmrc) → npm ci → prisma generate → npm run build → npm test
- **Frontend job:** checkout → setup node → npm ci → tsc --noEmit → eslint (max-warnings 10) → vitest --run

### deploy-frontend.yml (Vercel Deployment)
- **Triggers:** push to main (paths: ptbiztools-next/**), manual dispatch
- **Steps:** checkout → setup node → npm ci → npm run build → amondnet/vercel-action@v25 --prod
- **Secrets required:** VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

### Gemini Workflows (5 files)
- gemini-review.yml, gemini-dispatch.yml, gemini-invoke.yml, gemini-triage.yml, gemini-scheduled-triage.yml
- AI-powered code review and triage automation

### Backend Deployment
- Railway auto-deploys from main branch (Dockerfile-based)
- `railway.json` configures build/deploy settings

---

## Folder Organization

### Root Structure (12 files, well-organized)
```
.gitignore          .nvmrc              AGENTS.md
package-lock.json   package.json        PROJECT_CONTEXT.md
README.md           TODO.md
```

### Root Directories
```
.github/workflows/    — CI/CD (7 files)
docs/                 — Integration guides, setup docs, screenshots
firecrawl/            — Firecrawl skill definitions
ptbiztools-backend/   — Express API
ptbiztools-next/      — Next.js frontend
scripts/mcp-tests/    — MCP integration test scripts
skills/               — (gitignored)
videos/               — (gitignored)
```

### Clutter Assessment: **LOW** (~5%)
- Root is clean with only essential files
- Previous rescue phases already organized docs, scripts, screenshots
- `.gitignore` is comprehensive (30+ AI tool dirs, editor configs, stale worktrees)

---

## Code Architecture

### Technical Debt: **VERY LOW**
- **0 TODO/FIXME/HACK comments** in source code
- No duplicate authentication logic detected
- Clean separation between backend routes and scoring engine
- Frontend components well-organized by feature

### Pending Conversions
| File | Current | Target | Priority |
|------|---------|--------|----------|
| `DannyCompensationCalculator.jsx` | JSX | TSX | Medium |
| `DannyFinancialAudit.jsx` | JSX | TSX | Medium |

### CSS Architecture (13 files)
| File | Purpose |
|------|---------|
| `tool-page.css` | Shared tool page styles (reference) |
| `login.css` | Login page branded styles |
| `danny-tools.css` | Danny tools page styles |
| `dashboard.css` | Dashboard styles |
| `analysis-history.css` | Analysis history page |
| `tour.css` | Onboarding tour |
| `app-shell.css` | App shell/layout |
| `clinic-theme.css` | Clinic theming system |
| `changelog.css` | Changelog page |
| `discovery-call-grader.css` | Discovery grader page |
| `login-credential-badges.css` | Login credential badges |
| `corex-compat.css` | CoreX compatibility layer |
| `danny-theme.css` | Danny component theme (in components/danny/) |

### Asset Inventory
- **88 files** in `ptbiztools-next/public/assets/`
- Organized into subdirectories: backgrounds/, graders/, hero/, illustrations/, logos/
- Backup directory: `_backup_ui_enhancer_20260315/`
- Some files have non-semantic names (e.g., "Generated Image March 13...")

---

## Environment Files

| File | Location | Purpose |
|------|----------|---------|
| `.env.example` | Root | Monorepo env template |
| `.env` | ptbiztools-backend/ | Backend secrets (gitignored) |
| `.env.example` | ptbiztools-backend/ | Backend env template |
| `.env.local` | ptbiztools-next/ | Frontend local secrets (gitignored) |
| `.env.production` | ptbiztools-next/ | Frontend production config |
| `.env.example` | ptbiztools-next/ | Frontend env template |

---

## Deployment Review

| Service | Platform | Config | Status |
|---------|----------|--------|--------|
| Backend API | Railway | Dockerfile + railway.json | ✅ Configured |
| Frontend | Vercel | vercel.json + GitHub Actions | ✅ Configured |
| CI Pipeline | GitHub Actions | ci.yml | ✅ Active |
| Deploy Pipeline | GitHub Actions | deploy-frontend.yml | ✅ Active |

### Deployment Notes
- Backend deploys automatically via Railway's GitHub integration
- Frontend deploys via GitHub Actions → Vercel (on ptbiztools-next/** changes)
- No staging environment configured (prod-only)
- No backend deploy workflow in GitHub Actions (Railway handles it)

---

## Unusual Findings

1. **vercel.json is empty** (`{}`) — Vercel config relies entirely on defaults + GitHub Actions
2. **2 stale agent/* remote branches** — auto-generated by AI coding agents, safe to prune
3. **88 asset files** — some with non-semantic names ("Generated Image March 13..."), backup dir present
4. **danny-theme.css lives in components/** — inconsistent with other CSS in styles/
5. **Only 1 test file for frontend** (DannyCloserCallGrader.test.tsx) — test coverage is thin

---

## Completed Actions (This Rescue)

- [x] Pre-flight safety check (git status verified)
- [x] Committed all uncommitted changes (`832f777`)
- [x] Project discovery & onboarding (2 projects + root workspace)
- [x] Git deep analysis (branches, worktrees, history)
- [x] Build verification (both tsc clean, next build passes)
- [x] Test verification (32/32 tests passing)
- [x] CI/CD pipeline review (ci.yml + deploy-frontend.yml)
- [x] Folder organization assessment (low clutter)
- [x] Code architecture review (very low debt)
- [x] Deployment review (Railway + Vercel)
- [x] Environment file inventory
- [x] Asset inventory

---

## Pending Actions (Requires Approval)

- [ ] Prune 2 stale remote agent/* branches
- [ ] Convert DannyCompensationCalculator.jsx → .tsx
- [ ] Convert DannyFinancialAudit.jsx → .tsx
- [ ] Move danny-theme.css to src/styles/ for consistency
- [ ] Rename non-semantic asset files ("Generated Image...")
- [ ] Clean up _backup_ui_enhancer_20260315/ directory
- [ ] Add more frontend test coverage (currently 1 test file)
- [ ] Consider adding staging environment

---

## Next Steps (Priority Order)

1. **Push to origin** — `git push origin main` (1 commit ahead)
2. **Prune stale branches** — `git push origin --delete agent/npx-skills-...` (2 branches)
3. **JSX → TSX conversion** — DannyCompensationCalculator + DannyFinancialAudit
4. **UI standardization** — Apply pl-calculator reference patterns to remaining tool pages
5. **Danny Modal Integration** — Connect grader modals to Danny tools
6. **Tool badge integration** — Consistent badge system across tools
7. **CSS consolidation** — Move danny-theme.css, evaluate corex-compat.css necessity
8. **Asset cleanup** — Rename non-semantic files, remove backup dir
9. **Test coverage** — Add tests for discovery, grader, login components
10. **Staging environment** — Consider Vercel preview deployments

---

## Rollback Instructions

```bash
# This rescue was non-destructive (analysis only + commit)
# To undo the pre-rescue checkpoint commit:
git reset --soft HEAD~1
# This will unstage all files from the checkpoint commit
```

---

## Health Score Breakdown

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Git cleanliness | 25% | 95/100 | Clean tree, 2 stale remote branches |
| Folder organization | 20% | 92/100 | Well-organized, minor CSS placement issue |
| Code quality | 25% | 95/100 | 0 TODOs, clean architecture, 2 JSX files |
| Deployment readiness | 20% | 85/100 | CI/CD solid, no staging env |
| Documentation | 10% | 80/100 | Good README/AGENTS.md, could use more inline docs |

**Overall Health Score: 90/100** ⬆️ (from ~88 estimated pre-rescue)
