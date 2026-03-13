# PT Biz Tools Monorepo

[![Production](https://img.shields.io/badge/Production-https://ptbizcoach.com-brightgreen)](https://www.ptbizcoach.com)
[![Vercel](https://vercel-badge.vercel.app/api/ptbiztools-next)](https://vercel.com/jack-licatas-projects/ptbiztools-next)
[![Railway](https://img.shields.io/endpoint?url=https://ptbiz-backend-production.up.railway.app/health)](https://ptbiz-backend-production.up.railway.app/health)

PT Biz Tools (PTBizCoach.com) is a SaaS platform for physical therapy business owners featuring **AI-powered sales call grading**, **financial analysis tools**, **Zoom recording integration**, and **AI agent workflows**.

**Monorepo containing**:
- `ptbiztools-next/`: Next.js 16 frontend (Vercel)
- `ptbiztools-backend/`: Node/Express/Prisma backend API (Railway)

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 22.x (use `.nvmrc`)
- Docker (for backend DB optional)
- Railway CLI (`npm i -g @railway/cli`) and Vercel CLI (`npm i -g vercel`)
- PostgreSQL (local or Railway)
- Zoom Server-to-Server OAuth App (see Setup)

### Backend Setup
```bash
cd ptbiztools-backend
npm ci
cp .env.example .env  # Add DB_URL, Zoom creds
npx prisma generate
npx prisma db push  # or migrate
npm run dev  # http://localhost:3001
```

**Backend Env Vars** (`.env` or Railway):
```
DATABASE_URL=\"postgresql://...\"  # Prisma Postgres
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id  
ZOOM_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
AWS_S3_BUCKET=...  # Optional for large files
```

**Zoom CLI Tools**:
```bash
npm run zoom:jobs:list
npm run zoom:ingest:run
npm run zoom:backfill  # Import all recordings
```

### Frontend Setup
```bash
cd ptbiztools-next
npm ci
cp .env.example .env.local
npm run dev  # http://localhost:3000
```

**Frontend Env Vars** (`.env.local`):
```
PTBIZ_BACKEND_URL=http://localhost:3001/api  # Local backend
NEXT_PUBLIC_ENABLE_STACK_LAB=true  # Dev tools
```

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

## ✨ Features & Usage

### 1. **Sales Call Graders** (Discovery/Closer Calls)
- Upload audio/video via Zoom or direct
- AI analysis/scoring with phases, red flags, rubric
- PDF/DOCX export
- History tracking
- *Usage*: `/discovery` or Danny Closer tab → Upload → Grade

### 2. **Danny Financial Tools**
- **P&L Audit**: Analyze financials, benchmarks
- **Compensation Calculator**: Employee pay modeling
- *Usage*: Dashboard → Danny Tools → Upload P&L/Excel

### 3. **Zoom Integration**
- Server-to-Server OAuth: Auto-import all org recordings
- Webhook for real-time ingest
- Transcript extraction + quality scoring
- *CLI*: `npm run zoom:backfill` in backend

### 4. **AI Agents** (Stack Lab)
- Workflow AI + OpenAI integration
- Streaming responses, local-first PGLite storage
- *Dev*: `NEXT_PUBLIC_ENABLE_STACK_LAB=true`

### 5. **Other**
- Local-first sync (ElectricSQL/PGLite)
- Changelog viewer
- Tour/onboarding overlays
- Analytics/action logging

**Live Demo**: https://www.ptbizcoach.com (login via profile picker)

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

## 📚 Additional Docs
- [Danny Integration Plan](ptbiztools-next/PLAN_DANNY_INTEGRATION.md)
- [Zoom Setup](SERVER_TO_SERVER_SETUP.md)
- [Deployment TODO](TODO.md)
- [Repo State](ptbiztools-next/docs/repo-state.md)

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

