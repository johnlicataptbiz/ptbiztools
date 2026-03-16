# Project Context — Rescue Summary

Generated: 2026-03-15 (updated post-rescue phase 2)
Head commit: `9ec1372` (main, synced with origin/main)

---

## Executive Summary

Full rescue workflow completed on the PT Biz Tools monorepo (Express backend + Next.js frontend). Two rescue phases executed:

**Phase 1** (`61c6aca`): Pre-rescue cleanup — updated `.gitignore` with 30+ AI tool config dirs, added `docs/` folder, reverted accidental Prisma 5→7 upgrade.

**Phase 2** (`9ec1372`): Root clutter organization — moved 7 integration docs → `docs/integration/`, 5 Python test scripts → `scripts/mcp-tests/`, 1 screenshot → `docs/screenshots/`, deleted stale branches (2 local worktree branches + 2 remote branches), reviewed Gemini CI workflows (kept).

**Final state:** Backend 25/25 tests ✅ | Frontend 7/7 tests ✅ | Working tree clean | `main` synced with `origin/main`

---

## Projects Discovered

| Project | Type | Path | Stack | Deploy Target |
|---------|------|------|-------|---------------|
| ptbiztools-backend | Express API | `/ptbiztools-backend` | Node.js 22, TypeScript, Prisma 5.22.0, Express, PostgreSQL | Railway (Docker) |
| ptbiztools-next | Next.js Frontend | `/ptbiztools-next` | Next.js 16.1.6, React 19, TypeScript, Tailwind v4, Vitest 4.1.0 | Vercel |

### Production URLs
- **Frontend:** https://www.ptbizcoach.com (Vercel)
- **Backend:** https://ptbiztools-backend-production.up.railway.app (Railway)

---

## Git State

| Property | Value |
|----------|-------|
| Repository | github.com/johnlicataptbiz/ptbiztools.git |
| Current Branch | `main` |
| HEAD | `9ec1372` |
| Upstream | `origin/main` (synced) |
| Local Branches | `main` only |
| Remote Branches | `origin/main` only |
| Working Tree | Clean |

### Recent Commits
```
9ec1372 chore: organize root clutter — move docs, scripts, screenshots [rescue phase 2]
61c6aca chore: update gitignore with AI tool dirs, add docs folder [pre-rescue cleanup]
1ebbcaf fix: complete login page redesign with branded CSS + update docs
bfc50e2 Add GitHub Actions workflow for frontend deployment
a1f12a7 docs(context): update PROJECT_CONTEXT.md with final rescue state (all 7 phases)
```

---

## Folder Organization (Post-Rescue)

### Root Directory (Clean)
```
ptbiztools/
├── .github/workflows/     # CI/CD (ci.yml, deploy-frontend.yml, 5× gemini-*.yml)
├── docs/                  # All documentation
│   ├── SETUP.md
│   ├── TODO_ONBOARDING.md
│   ├── integration/       # 7 integration guides (MEM0, Playwright, Zoom, etc.)
│   └── screenshots/       # demo-screenshot.png
├── firecrawl/             # Firecrawl skill configs
├── ptbiztools-backend/    # Express API (Railway)
├── ptbiztools-next/       # Next.js frontend (Vercel)
├── scripts/
│   └── mcp-tests/         # 5 Python MCP test scripts
├── skills/                # AI skills (gitignored)
├── AGENTS.md              # Agent instructions
├── PROJECT_CONTEXT.md     # This file
├── PROJECT_DISCOVERY_REPORT.md
├── README.md
├── TODO.md
├── package.json           # Root workspace manifest
└── package-lock.json
```

### Gitignored Local Files (not committed)
- `prod-login-current.png` → `docs/screenshots/` (local only)
- `skills-lock.json`, `skills/` — AI skill artifacts
- `ptbiztools-backend/prisma.config.ts` — Prisma 7 config (not yet adopted)
- `ptbiztools.code-workspace` — VS Code workspace file
- `videos/` — Local video captures

---

## Rescue Actions Completed (This Session)

| # | Action | Status |
|---|--------|--------|
| 1 | Delete 2 orphaned local worktree branches (`worktree-1773626185602`, `worktree-1773632312733`) | ✅ Done |
| 2 | Prune 2 stale remote branches (`blackboxai/deploy-104`, `codex/restore-backend`) | ✅ Done |
| 3 | Move 7 integration MDs → `docs/integration/` | ✅ Done |
| 4 | Move 5 Python test scripts → `scripts/mcp-tests/` | ✅ Done |
| 5 | Move 2 screenshots → `docs/screenshots/` | ✅ Done |
| 6 | Delete `firebase-debug.log` | ✅ Done |
| 7 | Verify `*.code-workspace` in `.gitignore` | ✅ Already present |
| 8 | Review 5 Gemini workflow files — keep/delete | ✅ Kept (legitimate CI/CD) |
| 9 | Commit + push to `origin/main` | ✅ Done (`9ec1372`) |

---

## Code Architecture

### Backend (`ptbiztools-backend`)
- **Entry:** `src/index.ts` (Express server)
- **Routes:** auth, zoom, zoomConnect, transcript, analytics, actionLog, dannyTools, plImport, mem0
- **Scoring Engine:** callGraderEngine, callGraderSchema, callGraderProfiles, redaction, transcriptQuality
- **PL Import:** parsers, mapping, service, constants, types, utils
- **Database:** Prisma 5.22.0 ORM with PostgreSQL, 3 migrations
- **Tests:** Node built-in test runner via `tsx --test src/**/*.test.ts` (25/25 passing)

### Frontend (`ptbiztools-next`)
- **App Router:** Next.js 16 with route groups `(app)/` and `(tools)/`
- **Pages:** dashboard, login, discovery-call-grader, sales-discovery-grader, compensation-calculator, pl-calculator, stack-lab
- **Components:** agent/, analyses/, changelog/, danny/, discovery/, layout/, Mem0Example
- **Styles:** Tailwind v4 + custom CSS
- **Tests:** Vitest 4.1.0 (7/7 passing)

---

## Deployment Review

### Backend (Railway)
| Config | Status |
|--------|--------|
| Dockerfile | ✅ Valid (node:22-alpine, prisma generate, npm run build) |
| railway.json | ✅ Valid (DOCKERFILE builder, 1 replica, ON_FAILURE restart) |
| .dockerignore | ✅ Present |
| .railwayignore | ✅ Present |

### Frontend (Vercel)
| Config | Status |
|--------|--------|
| next.config.ts | ✅ Present |
| vercel.json | ✅ Present |
| Build command | ✅ `node scripts/generate-changelog.mjs && next build` |

### CI/CD Workflows (`.github/workflows/`)
| Workflow | Purpose | Status |
|----------|---------|--------|
| `ci.yml` | Backend tsc+tests, Frontend tsc+lint+tests | ✅ Active |
| `deploy-frontend.yml` | Frontend deployment to Vercel | ✅ Active |
| `gemini-dispatch.yml` | Gemini PR review dispatch | ✅ Active |
| `gemini-invoke.yml` | Gemini invocation (reusable) | ✅ Active |
| `gemini-review.yml` | Gemini code review (reusable) | ✅ Active |
| `gemini-scheduled-triage.yml` | Hourly issue triage | ✅ Active |
| `gemini-triage.yml` | Gemini triage (reusable) | ✅ Active |

---

## Test Status

| Project | Runner | Total | Passed | Failed | Status |
|---------|--------|-------|--------|--------|--------|
| ptbiztools-backend | Node test runner (`tsx --test`) | 25 | 25 | 0 | ✅ |
| ptbiztools-next | Vitest 4.1.0 | 7 | 7 | 0 | ✅ |

---

## MCP Servers

| Server | Purpose |
|--------|---------|
| 21st.dev Magic | UI component generation |
| Playwright | Browser automation/testing |
| Firecrawl | Web scraping |
| GitHub | Repository management |
| Prisma | Database management |
| Mem0 | AI memory/persistence |
| Sequential Thinking | Structured problem-solving |
| Context7 | Documentation queries |
| Slack | Team notifications |
| Apify | Web scraping actors |
| Browser Tools | Browser debugging/audits |
| Filesystem | File operations |
| Local Git | Git operations |

---

## Health Score

| Category | Weight | Score |
|----------|--------|-------|
| Git cleanliness | 25% | 24/25 (clean tree, single branch, synced) |
| Folder organization | 20% | 18/20 (root cleaned, docs organized) |
| Code quality | 25% | 23/25 (all tests pass, low debt) |
| Deployment readiness | 20% | 18/20 (CI/CD present, configs valid) |
| Documentation | 10% | 8/10 (README, context, integration docs) |

**Overall: 91/100**

---

## Remaining Recommendations

### Medium Priority
- [ ] Clean up remaining lint warnings (unused vars/imports)
- [ ] Rename ChatGPT/Generated Image asset files to semantic names
- [ ] Deduplicate assets between `public/assets/` and `public/clinic-icons/`
- [ ] Add architecture diagram to docs

### Low Priority
- [ ] Review `gemini-scheduled-triage.yml` hourly cron frequency (may be noisy)
- [ ] Add `ZOOM_ACCOUNT_ID` to backend `.env.example`
- [ ] Add `PTBIZ_BACKEND_URL` to frontend `.env.example`

---

## Rollback Instructions

```bash
# Revert rescue phase 2 (file moves):
git revert 9ec1372

# Revert rescue phase 1 (gitignore + docs):
git revert 61c6aca

# Or reset to pre-rescue state:
git reset --hard 1ebbcaf
git push origin main --force
