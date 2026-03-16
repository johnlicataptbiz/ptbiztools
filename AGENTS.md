# AGENTS.md — AI Assistant Context for PTBizTools

> This file gives AI coding assistants instant context about the project.
> Last updated: 2026-03-15

## Project Overview

**PTBizTools** is a monorepo for PT Biz Coach — a SaaS platform for physical therapy business coaching. It contains an Express API backend and a Next.js frontend.

| Component | Path | Stack | Deploy |
|-----------|------|-------|--------|
| Backend | `ptbiztools-backend/` | Express, TypeScript, Prisma, PostgreSQL | Railway (Docker) |
| Frontend | `ptbiztools-next/` | Next.js 16.1.6, React 19, Tailwind v4, Framer Motion 12 | Vercel |

### Production URLs
- **Frontend:** https://www.ptbizcoach.com (Vercel)
- **Backend:** https://ptbiztools-backend-production.up.railway.app (Railway)
- **Health:** `/health` → `{"status":"ok"}` | `/ready` → `{"status":"ready"}`

---

## Tech Stack

### Frontend (`ptbiztools-next/`)
- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **React:** 19.2.3
- **Styling:** Tailwind CSS v4 + custom CSS in `src/styles/`
- **Animation:** Framer Motion 12
- **Icons:** Lucide React
- **State:** @tanstack/react-query, React hooks
- **AI:** @ai-sdk/openai, @workflow/ai
- **Validation:** Zod v4
- **Testing:** Vitest

### Backend (`ptbiztools-backend/`)
- **Runtime:** Node.js 22 (Alpine Docker)
- **Framework:** Express
- **ORM:** Prisma (PostgreSQL)
- **Auth:** Custom password-based team auth
- **Integrations:** Zoom (OAuth + webhooks), Mem0
- **Testing:** Vitest (25 tests)

---

## MCP Servers Available

These Model Context Protocol servers are configured and available for AI assistants:

| Server | Purpose | Key Tools |
|--------|---------|-----------|
| **@21st-dev/magic** | UI component generation | `21st_magic_component_builder`, `21st_magic_component_refiner`, `logo_search` |
| **Playwright** | Browser automation & testing | `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot` |
| **Firecrawl** | Web scraping & search | `firecrawl_scrape`, `firecrawl_search`, `firecrawl_map` |
| **GitHub** | Repo management | `create_pull_request`, `push_files`, `create_branch` |
| **Prisma** | Database management | `migrate-dev`, `migrate-status`, `Prisma-Studio` |
| **Mem0** | Persistent memory | `add-memory`, `search-memories` |
| **Sequential Thinking** | Complex problem solving | `sequentialthinking` |
| **Context7** | Library documentation | `resolve-library-id`, `query-docs` |
| **Slack** | Team communication | `slack_post_message`, `slack_list_channels` |
| **Apify** | Web automation actors | `search-actors`, `call-actor` |
| **Browser Tools** | Chrome DevTools | `getConsoleLogs`, `getConsoleErrors`, `takeScreenshot`, `runAccessibilityAudit` |
| **Filesystem** | File operations | `read_text_file`, `write_file`, `directory_tree`, `search_files` |
| **Local Git** | Git operations | `git_status`, `git_diff_unstaged`, `git_log`, `git_commit` |

---

## Custom Skills

Located in `.agents/skills/` and `skills/`:

| Skill | File | Purpose |
|-------|------|---------|
| **Frontend Design Pro** | `skills/frontend-design-pro/SKILL.md` | Design aesthetic guide — 11 styles, image system, font rules, anti-AI-aesthetic |
| **Frontend UI Engineering** | `skills/frontend-ui-engineering/SKILL.md` | Component architecture — accessibility, Tailwind patterns, motion design |
| **Find Skills** | `.agents/skills/find-skills/SKILL.md` | Skill discovery helper |

---

## Key File Locations

### Frontend Pages (App Router)
```
ptbiztools-next/src/app/
├── page.tsx                              # Landing/redirect
├── login/page.tsx                        # Login (team member picker + password)
├── (app)/
│   ├── dashboard/page.tsx                # Main dashboard
│   ├── discovery-call-grader/page.tsx    # Call grading tool
│   ├── sales-discovery-grader/page.tsx   # Sales call grader
│   └── analyses/page.tsx                 # Analysis history
├── (tools)/
│   ├── compensation-calculator/page.tsx  # Comp calculator
│   └── pl-calculator/page.tsx            # P&L calculator
└── stack-lab/page.tsx                    # Stack Lab
```

### Frontend Components
```
ptbiztools-next/src/components/
├── agent/          # AI agent UI
├── analyses/       # Analysis display
├── changelog/      # Changelog
├── danny/          # Danny tools (closer call grader)
├── discovery/      # Discovery call components
├── layout/         # App shell, sidebar, header
└── Mem0Example.tsx # Mem0 integration demo
```

### Backend Routes
```
ptbiztools-backend/src/routes/
├── auth.ts         # Authentication
├── zoom.ts         # Zoom integration
├── zoomConnect.ts  # Zoom OAuth
├── transcript.ts   # Transcript processing
├── analytics.ts    # Analytics
├── actionLog.ts    # Action logging
├── dannyTools.ts   # Danny's tools
├── plImport.ts     # P&L import
└── mem0.ts         # Mem0 integration
```

---

## Coding Conventions

### Frontend
- **Components:** Functional components with TypeScript, `"use client"` directive for client components
- **Styling:** Tailwind v4 utilities first, custom CSS only when necessary (in `src/styles/`)
- **Animation:** Framer Motion for page transitions and micro-interactions
- **Icons:** Lucide React exclusively (no other icon libraries)
- **State:** React Query for server state, useState/useReducer for local state
- **Forms:** Controlled inputs with Zod validation
- **Accessibility:** ARIA labels, keyboard navigation, focus management

### Backend
- **API:** Express routes with TypeScript
- **Database:** Prisma ORM — always use migrations (`prisma migrate dev`)
- **Auth:** Custom team-based auth (no OAuth for users — team member picker + password)
- **Error handling:** Structured error responses with status codes

### General
- **No `any` types** — use `unknown` and type assertions
- **ESLint:** 0 errors policy, warnings acceptable for architectural decisions
- **Testing:** Vitest for both frontend and backend
- **Git:** Main branch, `blackboxai/` prefix for AI-generated branches

---

## Current Health Score: 84/100

| Category | Score |
|----------|-------|
| Git cleanliness | 18/25 |
| Folder organization | 14/20 |
| Code quality | 23/25 |
| Deployment readiness | 16/20 |
| Documentation | 7/10 |

**Tests:** Backend 25/25 ✅ | Frontend 7/7 ✅ | 0 lint errors

---

## Common Tasks

### Run Frontend Dev Server
```bash
cd ptbiztools-next && npm run dev
```

### Run Backend Dev Server
```bash
cd ptbiztools-backend && npm run dev
```

### Run Tests
```bash
cd ptbiztools-next && npm test -- --run
cd ptbiztools-backend && npm test -- --run
```

### Build Frontend
```bash
cd ptbiztools-next && npm run build
```

### Database Migrations
```bash
cd ptbiztools-backend && npx prisma migrate dev --name <description>
```

### Open Prisma Studio
```bash
cd ptbiztools-backend && npx prisma studio
