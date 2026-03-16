# PT Biz Tools — Monorepo

[![CI](https://github.com/johnlicataptbiz/ptbiztools/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlicataptbiz/ptbiztools/actions/workflows/ci.yml)
[![Production](https://img.shields.io/badge/Production-ptbizcoach.com-brightgreen)](https://www.ptbizcoach.com)
[![Backend](https://img.shields.io/badge/Backend-Railway-blueviolet)](https://ptbiztools-backend-production.up.railway.app/health)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://vercel.com/jack-licatas-projects/ptbiztools-next)
[![Node](https://img.shields.io/badge/Node-22.x-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-Private-red)](#)

**PT Biz Tools** (PTBizCoach.com) is a SaaS platform for physical therapy business owners featuring **AI-powered sales call grading**, **financial analysis tools**, **Zoom recording integration**, and **AI agent workflows**.

---

## Table of Contents

- [Monorepo Overview](#monorepo-overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Core Features](#core-features)
- [API Reference](#api-reference)
- [Development Scripts](#development-scripts)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation Index](#documentation-index)
- [Contributing](#contributing)

---

## Monorepo Overview

| Project | Type | Path | Stack | Deploy Target |
|---------|------|------|-------|---------------|
| `ptbiztools-backend` | Express REST API | `/ptbiztools-backend` | Node 22, TypeScript, Prisma, PostgreSQL | Railway (Docker) |
| `ptbiztools-next` | Next.js Frontend | `/ptbiztools-next` | Next.js 16, React 19, Tailwind v4, AI SDK | Vercel |

**Live URLs**
| Surface | URL |
|---------|-----|
| Production App | https://www.ptbizcoach.com |
| Backend Health | https://ptbiztools-backend-production.up.railway.app/health |
| Backend Ready | https://ptbiztools-backend-production.up.railway.app/ready |

---

## Quick Start

> Full setup details: [`docs/SETUP.md`](docs/SETUP.md)

```bash
# 1. Clone
git clone https://github.com/johnlicataptbiz/ptbiztools.git
cd ptbiztools

# 2. Install (both apps)
cd ptbiztools-backend && npm ci && cd ..
cd ptbiztools-next && npm ci && cd ..

# 3. Configure env files (see Environment Variables below)
cp ptbiztools-backend/.env.example ptbiztools-backend/.env
# edit ptbiztools-backend/.env with real values

# create ptbiztools-next/.env.local
echo "PTBIZ_BACKEND_URL=http://localhost:3001/api" > ptbiztools-next/.env.local

# 4. Init database
cd ptbiztools-backend
npx prisma generate && npx prisma db push

# 5. Start both servers (two terminals)
npm run dev          # Terminal 1 → http://localhost:3001
cd ../ptbiztools-next
npm run dev          # Terminal 2 → http://localhost:3000
```

Open http://localhost:3000 — the frontend proxies all `/api/*` calls to the backend automatically.

---

## Project Structure

```
ptbiztools/                          # Monorepo root
├── .github/
│   └── workflows/ci.yml             # GitHub Actions CI pipeline
├── ptbiztools-backend/              # Express API (Railway)
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema (PostgreSQL)
│   │   └── migrations/              # Prisma migration history
│   ├── src/
│   │   ├── index.ts                 # Express server entry point
│   │   ├── routes/                  # API route handlers
│   │   │   ├── auth.ts              # Authentication
│   │   │   ├── analytics.ts         # Analytics events
│   │   │   ├── actionLog.ts         # Action logging
│   │   │   ├── dannyTools.ts        # Danny AI tools
│   │   │   ├── transcript.ts        # Transcript upload/processing
│   │   │   ├── plImport.ts          # P&L import pipeline
│   │   │   ├── zoom.ts              # Zoom webhook + recording ingest
│   │   │   └── zoomConnect.ts       # Zoom OAuth connection
│   │   ├── scoring/                 # Call grading engine
│   │   │   ├── callGraderEngine.ts  # Core scoring logic
│   │   │   ├── callGraderSchema.ts  # Zod schemas for grading
│   │   │   ├── callGraderProfiles.ts# Grading rubric profiles
│   │   │   ├── redaction.ts         # PII redaction
│   │   │   └── transcriptQuality.ts # Transcript quality checks
│   │   ├── pl-import/               # P&L document parsing pipeline
│   │   ├── integrations/zoom/       # Zoom API client
│   │   ├── services/prisma.ts       # Prisma client singleton
│   │   └── cli/zoom.ts              # Zoom CLI commands
│   ├── scripts/                     # Utility scripts
│   ├── Dockerfile                   # Railway Docker build
│   └── railway.json                 # Railway deployment config
│
├── ptbiztools-next/                 # Next.js Frontend (Vercel)
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── (app)/               # Authenticated app layout group
│   │   │   │   ├── dashboard/       # Main dashboard
│   │   │   │   ├── discovery-call-grader/
│   │   │   │   ├── sales-discovery-grader/
│   │   │   │   ├── compensation-calculator/
│   │   │   │   ├── pl-calculator/
│   │   │   │   └── analyses/        # Analysis history
│   │   │   ├── api/                 # Next.js API routes
│   │   │   │   ├── agent/           # AI agent endpoints
│   │   │   │   └── sync/            # Data sync
│   │   │   ├── login/               # Auth pages
│   │   │   └── stack-lab/           # Dev tools (feature-gated)
│   │   ├── components/              # React components
│   │   │   ├── agent/               # AI agent UI
│   │   │   ├── analyses/            # Analysis history views
│   │   │   ├── danny/               # Danny financial tools
│   │   │   ├── discovery/           # Discovery call grader
│   │   │   ├── grader/              # Shared grader components
│   │   │   └── layout/              # App shell, navigation
│   │   ├── lib/                     # Core libraries
│   │   │   ├── agent/               # Agent protocol types
│   │   │   ├── auth/                # Session management
│   │   │   ├── local-first/         # PGLite local database
│   │   │   └── theme/               # Theme context
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── constants/               # App-wide constants
│   │   ├── styles/                  # Global CSS + Tailwind
│   │   ├── utils/                   # PDF generation, grading utils
│   │   └── workflows/               # AI workflow definitions
│   ├── docs/                        # Frontend-specific docs
│   ├── public/                      # Static assets
│   ├── next.config.ts               # Next.js config + API rewrites
│   └── scripts/generate-changelog.mjs
│
├── docs/                            # Monorepo-level documentation
│   ├── SETUP.md                     # Detailed setup guide
│   ├── USAGE_GUIDE.md               # Feature usage guide
│   └── TODO_ONBOARDING.md
├── CONTRIBUTING.md                  # Contribution guidelines
├── README.md                        # This file
└── .nvmrc                           # Node version pin (22.x)
```

---

## Environment Variables

### Backend — `ptbiztools-backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | ✅ | Secret for JWT signing (min 32 chars) |
| `ZOOM_ACCOUNT_ID` | ✅ (Zoom) | Zoom Server-to-Server OAuth Account ID |
| `ZOOM_CLIENT_ID` | ✅ (Zoom) | Zoom Server-to-Server OAuth Client ID |
| `ZOOM_CLIENT_SECRET` | ✅ (Zoom) | Zoom Server-to-Server OAuth Client Secret |
| `FRONTEND_URL` | ⚠️ | Primary allowed CORS origin (e.g. `https://ptbizcoach.com`) |
| `FRONTEND_URLS` | ⚠️ | Comma-separated additional CORS origins |
| `AWS_S3_BUCKET` | Optional | S3 bucket name for large file storage |
| `PORT` | Optional | Server port (default: `3000`) |
| `NODE_ENV` | Optional | `development` or `production` |

```bash
# ptbiztools-backend/.env (example)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ptbiztools"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
ZOOM_ACCOUNT_ID="your_zoom_account_id"
ZOOM_CLIENT_ID="your_zoom_client_id"
ZOOM_CLIENT_SECRET="your_zoom_client_secret"
FRONTEND_URL="http://localhost:3000"
PORT=3001
```

### Frontend — `ptbiztools-next/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `PTBIZ_BACKEND_URL` | ✅ | Backend API base URL (e.g. `http://localhost:3001/api`) |
| `NEXT_PUBLIC_ENABLE_STACK_LAB` | Optional | Set to `true` to expose the Stack Lab dev surface |

```bash
# ptbiztools-next/.env.local (local dev)
PTBIZ_BACKEND_URL=http://localhost:3001/api

# ptbiztools-next/.env.local (production)
PTBIZ_BACKEND_URL=https://ptbiztools-backend-production.up.railway.app/api
```

> ⚠️ **Never commit `.env` or `.env.local`** — both are in `.gitignore`. Only `.env.example` files are tracked.

---

## Database Setup

The backend uses **Prisma ORM** with **PostgreSQL**.

```bash
cd ptbiztools-backend

# 1. Generate Prisma client (required after schema changes)
npx prisma generate

# 2a. Push schema to DB (dev — no migration history)
npx prisma db push

# 2b. OR run migrations (recommended for team/production)
npx prisma migrate dev

# 3. Inspect data in browser UI
npx prisma studio
```

**Schema models**: `User`, `LoginEvent`, `CoachingAnalysis`, `ZoomConnection`, `ZoomRecording`, `ZoomIngestJob`, `PdfExport`, `PLImportSession`, `PLImportBatch`, `KnowledgeDoc`, `ActionLog`, `Video`

---

## Running Locally

Run both servers simultaneously in separate terminals:

**Terminal 1 — Backend** (http://localhost:3001):
```bash
cd ptbiztools-backend
npm run dev
# Outputs: [server] PT Biz Tools API running on port 3001
# Health: http://localhost:3001/health
```

**Terminal 2 — Frontend** (http://localhost:3000):
```bash
cd ptbiztools-next
npm run dev
# Turbopack dev server starts at http://localhost:3000
```

**Verify the stack is healthy:**
```bash
# Backend health
curl http://localhost:3001/health
# → {"status":"ok","version":"1.0.2",...}

# Backend DB readiness
curl http://localhost:3001/ready
# → {"status":"ready",...}
```

---

## Core Features

> Full usage details: [`docs/USAGE_GUIDE.md`](docs/USAGE_GUIDE.md)

### 🎙️ Discovery Call Grader
AI-powered analysis of sales call recordings. Upload audio/video → receive scored rubric analysis with red flags, strengths, and improvement recommendations. Export as PDF.

**Route**: `/discovery-call-grader`

### 📊 Danny Financial Tools
- **P&L Financial Audit** — Upload practice P&L documents for AI-powered benchmarking and revenue optimization insights
- **Compensation Calculator** — Model employee compensation against market rates

**Route**: `/pl-calculator`, `/compensation-calculator`

### 🎯 Sales Discovery Grader
Role-gated sales performance grader with team analytics.

**Route**: `/sales-discovery-grader`

### 📹 Zoom Recording Integration
Automatically ingest Zoom cloud recordings, transcribe them, and queue them for call grading. Uses Server-to-Server OAuth for organization-wide access.

**CLI**: `npm run zoom:ingest:run` (from `ptbiztools-backend/`)

### 🤖 AI Agent Workflows
Streaming AI agents built on Workflow AI + AI SDK. Real-time progress updates with local-first PGLite storage.

**Route**: `/stack-lab` (requires `NEXT_PUBLIC_ENABLE_STACK_LAB=true`)

---

## API Reference

All backend routes are prefixed with `/api`. The frontend proxies these via `next.config.ts` rewrites.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Authenticate user, set session cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current session user |
| `GET` | `/api/auth/users` | List all users (profile picker) |

### Danny Tools
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/danny-tools/grade` | Grade a sales call transcript |
| `POST` | `/api/danny-tools/pl-audit` | Run P&L financial audit |
| `POST` | `/api/danny-tools/compensation` | Run compensation analysis |

### Transcripts
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/transcripts/upload` | Upload transcript file |
| `GET` | `/api/transcripts/:id` | Get transcript by ID |

### P&L Import
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pl-imports/upload` | Upload P&L document |
| `GET` | `/api/pl-imports/:id` | Get import session |
| `POST` | `/api/pl-imports/:id/map` | Apply field mapping |

### Zoom
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/zoom/webhook` | Zoom webhook receiver |
| `GET` | `/api/zoom/recordings` | List ingested recordings |
| `POST` | `/api/zoom/connect` | Initiate Zoom OAuth connection |

### Analytics & Actions
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/actions` | Log an action event |
| `GET` | `/api/analytics/summary` | Get analytics summary |

### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/ready` | Readiness check (DB ping) |

### Next.js Agent Routes (frontend-native)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agent/surface` | Initialize agent run |
| `GET` | `/api/agent/surface/[id]/stream` | Stream agent updates (SSE) |
| `POST` | `/api/sync/actions` | Sync local actions |

---

## Development Scripts

### Backend (`ptbiztools-backend/`)

```bash
npm run dev              # tsx watch — hot reload dev server
npm run build            # tsc — compile to dist/
npm run start            # node dist/index.js — run compiled build
npm run test             # Run all *.test.ts files
npm run verify           # test + build (pre-deploy check)

# Database
npm run db:generate      # prisma generate
npm run db:push          # prisma db push (dev)
npm run db:migrate       # prisma migrate dev

# Zoom CLI
npm run zoom:jobs:list        # List ingest jobs
npm run zoom:ingest:run       # Run pending ingest jobs
npm run zoom:recordings:list  # List Zoom recordings
npm run zoom:jobs:summary     # Job status summary
npm run zoom:jobs:run-queued  # Process queued jobs
npm run zoom:backfill         # Backfill historical recordings
```

### Frontend (`ptbiztools-next/`)

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build            # Generate changelog + next build
npm run start            # Start production server
npm run lint             # ESLint (max 10 warnings)
npm run test             # Vitest (run once)
npm run test:watch       # Vitest watch mode
npm run test:ui          # Vitest UI
npm run workflow:web     # Workflow AI web UI
npm run workflow:inspect # Inspect workflow runs
```

---

## Testing

### Backend Tests (25 tests, all passing)
```bash
cd ptbiztools-backend
npm test
# Runs: callGraderEngine, callGraderSchema, redaction, transcriptQuality, dannyTools.v2
```

### Frontend Tests (7 tests)
```bash
cd ptbiztools-next
npm test -- --run
# Runs: Vitest suite via happy-dom
```

### Test Coverage Areas
| Suite | File | Tests |
|-------|------|-------|
| Call Grader Engine | `src/scoring/callGraderEngine.test.ts` | Backend |
| Call Grader Schema | `src/scoring/callGraderSchema.test.ts` | Backend |
| Redaction | `src/scoring/redaction.test.ts` | Backend |
| Transcript Quality | `src/scoring/transcriptQuality.test.ts` | Backend |
| Danny Tools v2 | `src/routes/dannyTools.v2.test.ts` | Backend |
| Frontend components | `src/**/*.test.tsx` | Frontend |

---

## CI/CD Pipeline

GitHub Actions runs on every push/PR to `main`:

```
.github/workflows/ci.yml
├── backend job
│   ├── npm ci
│   ├── npx prisma generate
│   ├── npm run build  (tsc)
│   └── npm test
└── frontend job
    ├── npm ci
    ├── npx tsc --noEmit
    ├── npx eslint src/ --max-warnings 10
    └── npm test -- --run
```

Both jobs use Node version from `.nvmrc` (22.x) and cache `node_modules` via `package-lock.json`.

---

## Production Deployment

### Frontend → Vercel

```bash
cd ptbiztools-next
vercel --prod
```

Or push to `main` — Vercel auto-deploys on merge.

**Required Vercel env vars:**
```
PTBIZ_BACKEND_URL=https://ptbiztools-backend-production.up.railway.app/api
```

**Build command** (auto-configured): `node scripts/generate-changelog.mjs && next build`

### Backend → Railway

```bash
cd ptbiztools-backend
npm run build          # Produce dist/ locally first
railway up             # Docker deploy
```

**Force cache bust** (if Railway uses stale image):
```bash
echo $(date) > ptbiztools-backend/.force_rebuild
git add ptbiztools-backend/.force_rebuild && git commit -m "chore: force rebuild"
```

**Required Railway env vars:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
FRONTEND_URL=https://www.ptbizcoach.com
FRONTEND_URLS=https://ptbizcoach.com,https://ptbiztools-frontend.vercel.app
```

**Health checks:**
```bash
curl https://ptbiztools-backend-production.up.railway.app/health
curl https://ptbiztools-backend-production.up.railway.app/ready
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Frontend shows blank / 404 | Backend not running | Start backend on port 3001; check `PTBIZ_BACKEND_URL` |
| `401 Unauthorized` on Zoom routes | Zoom S2S app not activated or wrong credentials | Verify `ZOOM_ACCOUNT_ID/CLIENT_ID/SECRET`; activate app in Zoom Marketplace |
| `prisma: Can't reach database` | `DATABASE_URL` wrong or DB not running | Check connection string; run `npx prisma studio` to test |
| Railway deploy fails (`COPY dist`) | `dist/` not built before `railway up` | Run `npm run build` inside `ptbiztools-backend/` first |
| Frontend proxy 502 | `PTBIZ_BACKEND_URL` points to wrong host | Update env var to match running backend URL |
| `tsc` errors after pull | New types added | Run `npm ci` in affected project, then `npx prisma generate` |
| Zoom webhook 400 | Invalid signature or wrong event type | Check `ZOOM_WEBHOOK_SECRET_TOKEN` env var |
| Tests fail locally but pass in CI | Node version mismatch | Use `nvm use` (reads `.nvmrc` → Node 22) |

**Useful debug commands:**
```bash
# Check backend routes at startup
npm run dev  # watch for "[server] Registered routes:" output

# Inspect DB
npx prisma studio

# Check Railway logs
railway logs

# Check Vercel logs
vercel logs
```

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [`docs/SETUP.md`](docs/SETUP.md) | Full local dev setup walkthrough |
| [`docs/USAGE_GUIDE.md`](docs/USAGE_GUIDE.md) | Feature-by-feature usage guide |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution guidelines and PR process |
| [`ptbiztools-next/docs/architecture.md`](ptbiztools-next/docs/architecture.md) | System architecture diagram and decisions |
| [`ptbiztools-next/docs/agent-development.md`](ptbiztools-next/docs/agent-development.md) | AI agent development guide |
| [`ptbiztools-next/docs/repo-state.md`](ptbiztools-next/docs/repo-state.md) | Current repo layout and deployment surfaces |
| [`ptbiztools-next/docs/migration-status.md`](ptbiztools-next/docs/migration-status.md) | Legacy → Next.js migration status |
| [`SERVER_TO_SERVER_SETUP.md`](SERVER_TO_SERVER_SETUP.md) | Zoom Server-to-Server OAuth setup |
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | Project rescue summary and health score |

---

## MCP Tools & AI Integration

This project leverages **Model Context Protocol (MCP)** servers for enhanced AI-powered development workflows:

### Connected MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| **21st.dev Magic** | UI component generation and design inspiration | ✅ Active |
| **Playwright** | Browser automation, testing, and screenshots | ✅ Active |
| **Firecrawl** | Web scraping and site crawling | ✅ Active |
| **GitHub** | Repository management, PRs, and issues | ✅ Active |
| **Prisma** | Database schema management and migrations | ✅ Active |
| **Mem0** | AI memory/persistence across sessions | ✅ Active |
| **Sequential Thinking** | Structured problem-solving and planning | ✅ Active |
| **Context7** | Up-to-date library documentation queries | ✅ Active |
| **Slack** | Team notifications and updates | ✅ Active |
| **Apify** | Web scraping actors and automation | ✅ Active |
| **Browser Tools** | Browser debugging, audits, and analysis | ✅ Active |
| **Filesystem** | File operations and management | ✅ Active |
| **Local Git** | Git operations and branch management | ✅ Active |

### MCP-Powered Workflows

1. **UI/UX Enhancement**: 21st.dev Magic + frontend-design-pro skill for premium component design
2. **Automated Testing**: Playwright MCP for cross-browser testing and visual regression
3. **Documentation**: Context7 for querying latest library docs (Next.js, React, Prisma, etc.)
4. **Database Management**: Prisma MCP for schema changes, migrations, and data inspection
5. **AI Memory**: Mem0 MCP for persistent context across development sessions
6. **Git Operations**: Local Git MCP for commits, branches, and repository management

### Recent MCP Achievements

- **Login Page Fix**: Sequential Thinking + 21st.dev Magic diagnosed and fixed broken login page
- **Build Verification**: Playwright MCP confirmed production build health
- **Component Design**: 21st.dev Magic provided glass morphism card inspiration
- **Database Health**: Prisma MCP verified migration status and schema integrity

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for full guidelines.

**Quick reference:**
1. Fork/clone the repo
2. `npm ci` in both `ptbiztools-backend/` and `ptbiztools-next/`
3. Create a feature branch: `feature/your-feature` or `fix/your-fix`
4. Follow TypeScript + Zod patterns throughout
5. Ensure `npm test` passes in both projects
6. Open a PR to `main`

---

## License

Private — PT Biz Coach. All rights reserved.

---

*Built with ❤️ for PT business success — [ptbizcoach.com](https://www.ptbizcoach.com)*
