# PT Biz Tools Monorepo

[![Production](https://img.shields.io/badge/Production-https://ptbizcoach.com-brightgreen)](https://www.ptbizcoach.com)
[![Vercel](https://vercel-badge.vercel.app/api/ptbiztools-next)](https://vercel.com/jack-licatas-projects/ptbiztools-next)
[![Railway](https://img.shields.io/endpoint?url=https://ptbiz-backend-production.up.railway.app/health)](https://ptbiz-backend-production.up.railway.app/health)

PT Biz Tools (PTBizCoach.com) is a SaaS platform for physical therapy business owners featuring **AI-powered sales call grading**, **financial analysis tools**, **Zoom recording integration**, and **AI agent workflows**.

**Monorepo containing**:
- `ptbiztools-next/`: Next.js 16 frontend (Vercel)
- `ptbiztools-backend/`: Node/Express/Prisma backend API (Railway)

## 🚀 Onboarding Quick Start (Local Development)

### 1) Prerequisites
- Node.js 22.x (use `.nvmrc`)
- npm 10+
- PostgreSQL (local or Railway-hosted)
- Optional CLIs:
  - Railway CLI: `npm i -g @railway/cli`
  - Vercel CLI: `npm i -g vercel`
- Zoom Server-to-Server OAuth App credentials (for recording import flows)

### 2) First-time install (both apps)
From repo root:
```bash
cd ptbiztools-backend && npm ci
cd ../ptbiztools-next && npm ci
```

### 3) Configure environment variables

Backend (`ptbiztools-backend/.env`):
```bash
DATABASE_URL="postgresql://..."   # Prisma Postgres
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
AWS_S3_BUCKET=...                 # Optional for large files
```

Frontend (`ptbiztools-next/.env.local`):
```bash
PTBIZ_BACKEND_URL=http://localhost:3001/api
NEXT_PUBLIC_ENABLE_STACK_LAB=true # Optional dev surface
```

### 4) Initialize database (backend)
```bash
cd ptbiztools-backend
npx prisma generate
npx prisma db push   # or run migrations as needed
```

### 5) Start local development

Terminal 1 (backend):
```bash
cd ptbiztools-backend
npm run dev          # http://localhost:3001
```

Terminal 2 (frontend):
```bash
cd ptbiztools-next
npm run dev          # http://localhost:3000
```

### 6) Validate local run
- Open `http://localhost:3000`
- Confirm frontend can reach backend via `PTBIZ_BACKEND_URL`
- If using Zoom tooling, confirm credentials are set and app is activated

## 📋 Project Structure

```
ptbiztools/                 # Root monorepo
├── ptbiztools-backend/     # Express API, Prisma, Zoom ingest
│   ├── prisma/schema.prisma
│   ├── src/routes/         # API routes (auth, dannyTools, zoom)
│   ├── src/scoring/        # CallGraderEngine, redaction
│   └── src/integrations/zoom/
├── ptbiztools-next/        # Next.js App Router frontend
│   ├── src/app/            # Pages/API (login, danny-tools, stack-lab)
│   ├── src/components/danny/  # FinancialAudit, CloserCallGrader
│   ├── src/lib/ptbiz-api.ts  # Backend proxy
│   └── docs/               # Architecture, agent dev
├── docs/ (in next)         # Detailed docs
└── README.md               # This file
```

## ✨ Usage Guide (Core Workflows)

### Sales Call Graders (Discovery / Closer)
- Upload call recordings (direct or Zoom-ingested)
- Run AI scoring and rubric analysis
- Review red flags, transcript quality, and recommendations
- Export results (PDF/DOCX where supported)

Usage path:
- Frontend route: `/discovery` and Danny tool surfaces
- Typical flow: Upload → Grade → Review → Export

### Danny Financial Tools
- P&L analysis and benchmarking
- Compensation modeling and planning

Usage path:
- Dashboard → Danny Tools → Upload docs/spreadsheets → Analyze

### Zoom Integration Operations
Run from `ptbiztools-backend/`:
```bash
npm run zoom:jobs:list
npm run zoom:ingest:run
npm run zoom:backfill
```

### AI Agent / Stack Lab (Dev)
Enable with:
```bash
NEXT_PUBLIC_ENABLE_STACK_LAB=true
```
Then use stack-lab and workflow surfaces in the frontend.

**Live Demo**: https://www.ptbizcoach.com

## 🛠 Development Scripts

**Backend**:
```bash
npm run dev      # tsx watch
npm run build    # tsc
npm run test     # tsx tests
npm run db:push  # Prisma
```

**Frontend**:
```bash
npm run dev      # Next Turbopack
npm run build    # Prod build + changelog
npm run lint
npm run workflow:web  # AI workflow UI
```

## 🚀 Production Deployment

### Frontend (Vercel)
```bash
cd ptbiztools-next
vercel --prod
# Env: PTBIZ_BACKEND_URL=https://ptbiz-backend-production.up.railway.app/api
```

### Backend (Railway)
```bash
cd ptbiztools-backend
npm run build  # Create dist/
railway up     # Docker deploy
# Updates .force_rebuild for cache bust
```

**Health Checks**:
- Frontend: https://ptbizcoach.com
- Backend: https://ptbiz-backend-production.up.railway.app/health

## 🏗 Architecture
See [ptbiztools-next/docs/architecture.md](ptbiztools-next/docs/architecture.md):
- Next.js App Router + React 19 + Tailwind 4
- Express/Prisma backend via rewrites
- AI SDK + Workflow for agents
- TanStack Query, Zod validation

## 🔧 Troubleshooting

- **Backend 404**: Check `index.ts` route mounts, Railway rebuild (`echo date > .force_rebuild`)
- **Zoom 401**: Verify S2S app activated + scopes (recording:read:admin)
- **Prisma**: `npx prisma studio` for DB inspect
- **Frontend Proxy**: Ensure PTBIZ_BACKEND_URL points to running backend
- **Tests**: `npm run test` (backend only for now)

## 📚 Onboarding Docs Index
- [Frontend Onboarding (Next.js app)](ptbiztools-next/README.md)
- [Architecture](ptbiztools-next/docs/architecture.md)
- [Repository State](ptbiztools-next/docs/repo-state.md)
- [Agent Development](ptbiztools-next/docs/agent-development.md)
- [Migration Status](ptbiztools-next/docs/migration-status.md)
- [Zoom Server-to-Server Setup](SERVER_TO_SERVER_SETUP.md)
- [Deployment / execution notes](TODO.md)
- [Danny Integration Plan](ptbiztools-next/PLAN_DANNY_INTEGRATION.md)

## 🤝 Contributing
1. Fork/clone
2. `npm ci` in both dirs
3. Create feature branch
4. Follow TypeScript/Zod patterns
5. Update tests/docs
6. PR to `main`

**License**: Private - PT Biz Coach

---
*Built with ❤️ for PT business success*

