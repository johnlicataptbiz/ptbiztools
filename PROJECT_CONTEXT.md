# Project Context — Rescue Summary

Generated: 2026-03-16T03:00:00Z
Branch: `main` | HEAD: `26eb684`
Origin: `c216c29` (1 commit ahead)

---

## Executive Summary

PT Biz Tools is a monorepo with two sub-projects: a Next.js 16 frontend (Vercel) and an Express/Prisma backend (Railway). The codebase is functionally healthy — both projects build, type-check, and pass all tests. Root-level clutter has been cleaned (down to 9 files from 20+). The primary outstanding work is an aggressive UI/UX standardization across 4 tool pages, fixing the broken deploy-frontend.yml GitHub Action, and cleaning up stale documentation.

---

## Projects Discovered

| Project | Stack | Deployment | Status |
|---------|-------|------------|--------|
| `ptbiztools-next/` | Next.js 16.1.6, React 19, Tailwind v4, TypeScript | Vercel → ptbizcoach.com | ✅ Build clean, 7/7 tests pass |
| `ptbiztools-backend/` | Express, TypeScript, Prisma 5.22.0, PostgreSQL | Railway (Docker) | ✅ tsc clean, 25/25 tests pass |

### Frontend Routes (9 pages)

| Route | Component | Type | Lines |
|-------|-----------|------|-------|
| `/pl-calculator` | `DannyFinancialAudit.jsx` | (tools) group | 68KB — **Reference "good" UI** |
| `/compensation-calculator` | `DannyCompensationCalculator.jsx` | (tools) group | 31KB |
| `/discovery-call-grader` | `DiscoveryCallGrader.tsx` | (app) group | 42KB, 1081 lines — **Needs full rewrite** |
| `/sales-discovery-grader` | `DannyCloserCallGrader.tsx` | (app) group | 72KB, 1462 lines — Role-gated |
| `/dashboard` | Dashboard components | (app) group | Composite |
| `/analyses` | AnalysisHistory | (app) group | History view |
| `/login` | Login page | standalone | Recently redesigned |
| `/stack-lab` | Stack Lab | standalone | Experimental |
| `/` | Root redirect | standalone | → /login or /dashboard |

### CSS Design System

| File | Lines | Purpose |
|------|-------|---------|
| `src/styles/danny-tools.css` | 460 | Global `.danny-*` class system |
| `src/components/danny/danny-theme.css` | 680 | Danny component theme overrides |

---

## Git State

| Metric | Value |
|--------|-------|
| Branch | `main` (tracking `origin/main`) |
| HEAD | `26eb684` — `chore: remove intro video binaries (6MB cleanup)` |
| Ahead/Behind | 1 ahead, 0 behind |
| Uncommitted | `PROJECT_CONTEXT.md` (this file, modified) |
| Stale branches | None (previously cleaned) |
| Worktrees | 1 (main only) |
| Total files | 490 (excl node_modules/.git/.next/.venv/.blackbox) |
| Root files | 9 (clean) |

### Recent Commits

```
26eb684 chore: remove intro video binaries (6MB cleanup)
c216c29 docs: update PROJECT_CONTEXT.md with rescue phase 2 summary
9ec1372 chore: organize root clutter — move docs, scripts, screenshots [rescue phase 2]
61c6aca chore: update gitignore with AI tool dirs, add docs folder [pre-rescue cleanup]
1ebbcaf fix: complete login page redesign with branded CSS + update docs
```

### Untracked Directories (not gitignored, need attention)

| Directory | Contents | Recommendation |
|-----------|----------|----------------|
| `.blackbox/tmp/` | 1 shell log file | Add `.blackbox/` to .gitignore (already partially ignored) |
| `.venv/` | Python virtual env | Add `.venv/` to .gitignore ✅ (already in .gitignore) |
| `ptbiztools-next/.swc/` | SWC build cache (has own .gitignore) | Already self-ignoring ✅ |
| `ptbiztools-next/src/app/.well-known/` | Gemini workflow integration (has own .gitignore) | Tracked intentionally ✅ |

---

## Folder Organization

**Status: CLEAN** — Root clutter reduced from 20+ files to 9 in previous rescue phases.

| Root File | Purpose | Status |
|-----------|---------|--------|
| `.gitignore` | Git ignore rules | ✅ Comprehensive |
| `.nvmrc` | Node version (22) | ✅ |
| `package.json` | Root workspace | ✅ |
| `package-lock.json` | Lock file | ✅ |
| `AGENTS.md` | AI agent instructions | ✅ Current |
| `README.md` | Project readme | ✅ Current (610 lines) |
| `PROJECT_CONTEXT.md` | This file | ⚠️ Being updated now |
| `TODO.md` | Task tracking | ⚠️ Stale (49 lines, needs rewrite) |
| `PROJECT_DISCOVERY_REPORT.md` | Discovery report | ⚠️ Stale (203 lines, superseded) |

### Stale Documentation Inventory

| File | Lines | Status | Action |
|------|-------|--------|--------|
| `PROJECT_DISCOVERY_REPORT.md` | 203 | Fully stale, superseded by this file | **Delete** |
| `TODO.md` | 49 | Stale priorities | **Rewrite** with current priorities |
| `ptbiztools-next/implementation_plan.md` | ? | Old implementation plan | **Review → archive or delete** |
| `ptbiztools-next/TODO_LOGIN_REDESIGN.md` | ? | Login redesign done | **Delete** (work completed) |
| `ptbiztools-next/PLAN_DANNY_INTEGRATION.md` | ? | Danny modal integration plan | **Keep** (active work) |
| `ptbiztools-next/docs/migration-status.md` | ? | Migration tracking | **Review** |
| `ptbiztools-next/docs/repo-state.md` | ? | Repo state snapshot | **Review → update or delete** |

---

## Code Architecture

### Component Structure

```
src/components/
├── danny/                    # Danny tool components (P&L, Comp, Sales Grader)
│   ├── DannyFinancialAudit.jsx      (68KB — P&L calc, reference UI)
│   ├── DannyCompensationCalculator.jsx (31KB — comp calc)
│   ├── DannyCloserCallGrader.tsx    (72KB — sales discovery grader)
│   ├── FileUploadZone.tsx           (shared upload component)
│   ├── GradingProgress.tsx          (shared progress indicator)
│   ├── HistoryView.tsx              (shared history view)
│   ├── Modal.tsx                    (shared modal wrapper)
│   ├── PassFail.tsx                 (shared pass/fail display)
│   ├── ScoreBar.tsx                 (shared score bar)
│   ├── danny-theme.css              (680 lines, theme CSS)
│   ├── graderV2Helpers.ts           (grader utilities)
│   ├── theme.ts                     (theme constants)
│   └── types.ts                     (shared types)
├── discovery/                # Discovery call grader (NEEDS REWRITE)
│   └── DiscoveryCallGrader.tsx      (42KB, 1081 lines — monolithic)
├── grader/                   # Grader shared components
│   ├── GradeModal.tsx               (9KB)
│   ├── GradePreview.tsx             (1.4KB)
│   ├── GraderInputModal.tsx         (14KB)
│   ├── useGrader.ts                 (12KB — shared hook)
│   ├── types.ts                     (2.3KB)
│   └── index.ts                     (barrel export)
├── dashboard/                # Dashboard components
├── layout/                   # AppShell, sidebar nav
├── login/                    # Login page components
├── clinic/                   # Clinic icons/backgrounds
├── agent/                    # Agent surface panel
├── analyses/                 # Analysis history
├── changelog/                # Changelog modal
├── corex/                    # CoreX components
├── local-first/              # Local-first panel
├── tour/                     # Tour overlay
└── providers.tsx             # React providers
```

### Key Architectural Findings

1. **Mixed JSX/TSX**: P&L calc and Comp calc are `.jsx`, graders are `.tsx` — inconsistent
2. **Monolithic components**: DiscoveryCallGrader (1081 lines) and DannyCloserCallGrader (1462 lines) are too large
3. **Dual CSS systems**: `danny-tools.css` (460 lines) + `danny-theme.css` (680 lines) — potential overlap
4. **Tool badges**: `src/constants/tool-badges.ts` maps tools to `CLINIC_SVGS` — needs integration into all tool pages
5. **No shared tool layout**: Each tool page renders its component directly without a common wrapper

### Technical Debt: LOW

- No significant code duplication detected across tools
- Auth logic is clean
- Backend tests comprehensive (25/25)
- Frontend tests present (7/7)
- TypeScript compilation clean in both projects

---

## Deployment Review

### Production Deployments

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| Frontend | Vercel | https://www.ptbizcoach.com | ✅ Live (307 redirect = OK) |
| Backend | Railway (Docker) | Railway internal URL | ✅ Live (404 on root = expected) |

### CI/CD Pipelines (7 workflows)

| Workflow | File | Status |
|----------|------|--------|
| CI | `ci.yml` | ✅ Working — runs tsc, lint, tests for both projects |
| Deploy Frontend | `deploy-frontend.yml` | ❌ **BROKEN** — uses `vercel/action-deploy@v1` (doesn't exist) |
| Gemini Dispatch | `gemini-dispatch.yml` | ✅ Active |
| Gemini Invoke | `gemini-invoke.yml` | ✅ Active |
| Gemini Review | `gemini-review.yml` | ✅ Active |
| Gemini Scheduled Triage | `gemini-scheduled-triage.yml` | ✅ Active |
| Gemini Triage | `gemini-triage.yml` | ✅ Active |

### Deploy Frontend Fix Required

**Problem:** `vercel/action-deploy@v1` repository does not exist.
**Fix:** Replace with `amondnet/vercel-action@v25` or use Vercel CLI directly.

### Deployment Configs

| File | Status |
|------|--------|
| `ptbiztools-next/vercel.json` | `{}` — empty, relies on Vercel auto-detection ✅ |
| `ptbiztools-backend/railway.json` | Dockerfile builder, 1 replica, restart on failure ✅ |
| `ptbiztools-backend/Dockerfile` | Present ✅ |
| `.vercel/project.json` | Vercel project link ✅ |

---

## Completed Actions (This Rescue)

- [x] Pre-flight safety check — git status verified
- [x] Project discovery — 2 projects identified, stacks cataloged
- [x] Git deep analysis — branch clean, 1 ahead, no stale branches
- [x] Folder organization — root at 9 files (clean), stale docs identified
- [x] Code architecture review — component inventory, debt assessment
- [x] Deployment review — configs verified, broken workflow identified
- [x] Build verification — frontend ✅, backend tsc ✅
- [x] Binary cleanup — removed 6MB of intro videos (commit `26eb684`)

---

## Pending Actions (Requires Approval)

### HIGH Priority — UI/UX Standardization

- [ ] **Standardize all 4 tools to consistent "built-in modal" look** (P&L calc = reference)
- [ ] **Rewrite DiscoveryCallGrader.tsx** — remove random UI boxes from failed agent attempts
- [ ] **Integrate tool badges/logos** into all tool page headers
- [ ] **Clean up inner sub-pages** — aggressively cut and rewrite horrible UI additions
- [ ] **Danny's Modal Integration** per `PLAN_DANNY_INTEGRATION.md`

### HIGH Priority — CI/CD

- [ ] **Fix deploy-frontend.yml** — replace `vercel/action-deploy@v1` with working action

### MEDIUM Priority — Cleanup

- [ ] **Rewrite TODO.md** with current priorities
- [ ] **Delete PROJECT_DISCOVERY_REPORT.md** (superseded)
- [ ] **Delete ptbiztools-next/TODO_LOGIN_REDESIGN.md** (work completed)
- [ ] **Review/archive ptbiztools-next/implementation_plan.md**
- [ ] **Lint cleanup** — ESLint max-warnings threshold
- [ ] **Asset audit** — 40+ images in `public/assets/`, verify usage
- [ ] **Convert .jsx → .tsx** for DannyFinancialAudit and DannyCompensationCalculator

### LOW Priority

- [ ] Gemini workflow review (5 workflows)
- [ ] Architecture diagram generation
- [ ] Prisma upgrade evaluation (5.22.0 → latest)
- [ ] Consolidate dual CSS systems (danny-tools.css + danny-theme.css)

---

## Health Score

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Git cleanliness | 25% | 95/100 | Clean branch, 1 commit ahead, no stale branches |
| Folder organization | 20% | 90/100 | Root clean (9 files), some stale docs remain |
| Code quality | 25% | 70/100 | All tests pass, but monolithic components + mixed jsx/tsx |
| Deployment readiness | 20% | 65/100 | deploy-frontend.yml broken, configs otherwise clean |
| Documentation | 10% | 60/100 | README good, but TODO/DISCOVERY stale, frontend docs need audit |

**Overall: 78/100**

---

## Rollback Instructions

```bash
# If any rescue changes need to be reverted:
git log --oneline -10  # find the commit to revert to
git revert <commit-hash>  # revert specific commits

# Or hard reset (destructive):
git reset --hard c216c29  # reset to origin/main
```

---

## Next Steps (Recommended Order)

1. **Fix deploy-frontend.yml** — quick win, unblocks CI/CD
2. **Push HEAD to origin** — `git push origin main` (1 commit ahead)
3. **Delete stale docs** — PROJECT_DISCOVERY_REPORT.md, TODO_LOGIN_REDESIGN.md
4. **Rewrite TODO.md** — reflect current priorities from this document
5. **Begin UI standardization** — start with DiscoveryCallGrader rewrite (biggest impact)
6. **Danny Modal Integration** — per PLAN_DANNY_INTEGRATION.md
7. **Asset audit** — verify 40+ images are actually used
8. **Convert jsx → tsx** — DannyFinancialAudit, DannyCompensationCalculator
