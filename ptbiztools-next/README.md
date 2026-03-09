# PT Biz Tools - Next.js Application

**Production URL**: [https://www.ptbizcoach.com](https://www.ptbizcoach.com)  
**Vercel Dashboard**: [https://vercel.com/jack-licatas-projects/ptbiztools-next](https://vercel.com/jack-licatas-projects/ptbiztools-next)

## Overview

PT Biz Tools is a comprehensive business intelligence platform for physical therapy practice owners. Built with Next.js 16, React 19, and modern web technologies.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.x |
| AI/ML | AI SDK + Workflow AI |
| Database | ElectricSQL PGLite (local-first) |
| Auth | Cookie-based sessions |
| Validation | Zod |
| Icons | Lucide React |
| Animations | Framer Motion |
| PDF/DOCX | jsPDF + DOCX libraries |

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
# Required
NEXT_PUBLIC_ENABLE_STACK_LAB=true  # Enable dev tools (optional)

# Database (PGLite - local-first)
# No external DB required - runs in browser
```

## Development

### Setup
```bash
cd ptbiztools-main/ptbiztools-next
npm install
npm run dev
```

### Build & Deploy
```bash
npm run build
vercel --prod  # or push to main branch
```

## Architecture

See [docs/architecture.md](./docs/architecture.md) for detailed system design.

## Agent Development

See [docs/agent-development.md](./docs/agent-development.md) for AI agent guidelines.

## Migration Status

See [docs/migration-status.md](./docs/migration-status.md) for legacy-to-Next.js migration details.

## License

Private - PT Biz Coach
