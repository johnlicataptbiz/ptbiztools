# PT Biz Tools - Next.js Application

**Production URL**: [https://www.ptbizcoach.com](https://www.ptbizcoach.com)  
**Vercel Dashboard**: [https://vercel.com/jack-licatas-projects/ptbiztools-next](https://vercel.com/jack-licatas-projects/ptbiztools-next)

## Overview

PT Biz Tools is the active PTBizCoach web application. The production frontend runs on Vercel, while several authenticated API surfaces still rewrite to the Railway-hosted `ptbiztools-backend` service.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.x |
| AI/ML | AI SDK + Workflow AI |
| Backend API | Railway-hosted PT Biz backend (via Next rewrites) |
| Local Storage | ElectricSQL PGLite (select local-first surfaces) |
| Auth | Cookie-based sessions |
| Validation | Zod |
| Icons | Lucide React |
| Animations | Framer Motion |
| Exports | jsPDF |

## Project Structure

```
ptbiztools-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/             # App layout group
│   │   ├── api/               # API routes
│   │   ├── login/             # Auth pages
│   │   └── stack-lab/         # Dev tools (gated)
│   ├── components/            # React components
│   │   ├── agent/             # AI agent components
│   │   ├── analyses/          # Analysis history
│   │   ├── auth/              # Auth components
│   │   ├── danny/             # Danny tools (P&L, Compensation)
│   │   ├── discovery/         # Discovery call grader
│   │   ├── grader/            # Grader components
│   │   ├── layout/            # App shell, navigation
│   │   └── tour/              # Onboarding tour
│   ├── lib/                   # Core libraries
│   │   ├── agent/             # Agent protocol
│   │   ├── auth/              # Session management
│   │   ├── local-first/       # PGLite database
│   │   ├── theme/             # Theme context
│   │   └── tour/              # Tour system
│   ├── constants/             # App constants
│   ├── styles/                # CSS files
│   ├── utils/                 # Utilities (PDF, grading)
│   └── workflows/             # Workflow definitions
├── docs/                      # Documentation
├── public/                    # Static assets
└── .vercel/                   # Vercel config
```

## Available Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run workflow:web # Start workflow web UI
```

## Core Features

### 1. Discovery Call Grader
- Upload sales call recordings (audio/video)
- AI-powered analysis and scoring
- Export results as PDF or DOCX
- Historical analysis tracking

### 2. Danny P&L Financial Audit
- Practice financial analysis
- Compensation benchmarking
- Revenue optimization insights
- Report generation

### 3. Danny Compensation Calculator
- Employee compensation modeling
- Market rate comparisons
- Total cost analysis

### 4. Sales Discovery Grader
- Role-gated access
- Sales performance tracking
- Team analytics

### 5. Agent Surface (AI)
- Workflow-based AI agents
- Real-time streaming responses
- Local-first data architecture

## Environment Variables

```bash
# Optional
NEXT_PUBLIC_ENABLE_STACK_LAB=true

# Backend
PTBIZ_BACKEND_URL=https://ptbiz-backend-production.up.railway.app/api
```

## Development

### Setup
```bash
cd ptbiztools-main/ptbiztools-next
npm ci --install-links=true
npm run dev
```

### Build & Deploy
```bash
npm run build
vercel --prod  # or push to main branch
```

The changelog build step falls back to the GitHub commits API when the builder does not have `.git` history available, which is required for Vercel production builds.

## Architecture

See [docs/architecture.md](./docs/architecture.md) for detailed system design.

## Backend Service

`ptbiztools-backend/` lives in this repo and contains the Express API, Prisma schema, and tooling that Railway deploys for `/api/*` rewrites.
- Run `npm ci` then `npm run build` inside `ptbiztools-backend/` to produce `dist/`.
- The Dockerfile copies `dist/` from the builder stage; build this folder before running `railway up` so the deployment has the artifact it needs.

## Repository State

See [docs/repo-state.md](./docs/repo-state.md) for the current repo layout, active deployment surfaces, and cleanup targets.

## Agent Development

See [docs/agent-development.md](./docs/agent-development.md) for AI agent guidelines.

## Migration Status

See [docs/migration-status.md](./docs/migration-status.md) for legacy-to-Next.js migration details.

## License

Private - PT Biz Coach
