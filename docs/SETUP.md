# PT Biz Tools — Local Development Setup Guide

This guide walks you through setting up the full PT Biz Tools stack locally: the Express backend and the Next.js frontend.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone the Repository](#clone-the-repository)
- [Install Dependencies](#install-dependencies)
- [Configure Environment Variables](#configure-environment-variables)
- [Database Setup](#database-setup)
- [Start the Development Servers](#start-the-development-servers)
- [Verify the Stack](#verify-the-stack)
- [Zoom Integration Setup](#zoom-integration-setup)
- [Optional: Stack Lab (AI Dev Surface)](#optional-stack-lab-ai-dev-surface)
- [Resetting Your Local Environment](#resetting-your-local-environment)

---

## Prerequisites

Ensure the following are installed before proceeding:

### Required

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22.x | [nodejs.org](https://nodejs.org) or via `nvm` |
| **npm** | 10+ | Bundled with Node 22 |
| **PostgreSQL** | 14+ | [postgresql.org](https://www.postgresql.org/download/) or Docker |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

### Recommended

| Tool | Purpose | Install |
|------|---------|---------|
| **nvm** | Node version management | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh \| bash` |
| **Railway CLI** | Deploy / run Railway commands | `npm i -g @railway/cli` |
| **Vercel CLI** | Deploy frontend | `npm i -g vercel` |

### Node Version

The repo includes an `.nvmrc` file pinned to Node 22. If you use `nvm`:

```bash
nvm install   # reads .nvmrc
nvm use       # switches to Node 22
```

---

## Clone the Repository

```bash
git clone https://github.com/johnlicataptbiz/ptbiztools.git
cd ptbiztools
```

---

## Install Dependencies

Install dependencies for both projects separately. Do **not** run `npm install` from the root — each project has its own `package-lock.json`.

```bash
# Backend
cd ptbiztools-backend
npm ci

# Frontend
cd ../ptbiztools-next
npm ci
```

> Use `npm ci` (not `npm install`) to ensure exact versions from `package-lock.json` are installed.

---

## Configure Environment Variables

### Backend — `ptbiztools-backend/.env`

Create the file from the example:

```bash
cp ptbiztools-backend/.env.example ptbiztools-backend/.env
```

Then edit `ptbiztools-backend/.env` with your values:

```bash
# ── Database ──────────────────────────────────────────────────────────────────
# Local PostgreSQL example:
DATABASE_URL="postgresql://postgres:password@localhost:5432/ptbiztools"
# Railway-hosted example:
# DATABASE_URL="postgresql://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway"

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET="replace-with-a-random-string-at-least-32-characters-long"

# ── Zoom Server-to-Server OAuth ───────────────────────────────────────────────
# Required only if using Zoom recording ingest features
ZOOM_ACCOUNT_ID="your_zoom_account_id"
ZOOM_CLIENT_ID="your_zoom_client_id"
ZOOM_CLIENT_SECRET="your_zoom_client_secret"

# ── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_URL="http://localhost:3000"
FRONTEND_URLS=""

# ── Server ────────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ── AWS S3 (optional — for large file storage) ────────────────────────────────
# AWS_S3_BUCKET=""
# AWS_ACCESS_KEY_ID=""
# AWS_SECRET_ACCESS_KEY=""
# AWS_REGION="us-east-1"
```

> **Tip**: Generate a strong `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### Frontend — `ptbiztools-next/.env.local`

Create the file manually (no example to copy from):

```bash
# ptbiztools-next/.env.local

# Points to your local backend
PTBIZ_BACKEND_URL=http://localhost:3001/api

# Optional: enable the Stack Lab AI dev surface
# NEXT_PUBLIC_ENABLE_STACK_LAB=true
```

> ⚠️ **Security**: `.env` and `.env.local` are in `.gitignore` and must never be committed.

---

## Database Setup

The backend uses **Prisma ORM** with **PostgreSQL**.

### 1. Create a local database

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE ptbiztools;"

# Or using createdb
createdb ptbiztools
```

### 2. Generate the Prisma client

```bash
cd ptbiztools-backend
npx prisma generate
```

This generates the typed Prisma client from `prisma/schema.prisma`. Run this whenever the schema changes.

### 3. Push the schema to your database

For local development (no migration history needed):

```bash
npx prisma db push
```

For a team environment or when you want migration history:

```bash
npx prisma migrate dev --name init
```

### 4. Verify the database

```bash
npx prisma studio
# Opens a browser UI at http://localhost:5555 to inspect your database
```

You should see all tables from the schema: `User`, `CoachingAnalysis`, `ZoomRecording`, `PLImportSession`, etc.

---

## Start the Development Servers

Open **two terminal windows** and run each server:

### Terminal 1 — Backend

```bash
cd ptbiztools-backend
npm run dev
```

Expected output:
```
DEPLOY MARKER 2026-03-14-1810
[server] RUNTIME DATABASE HOST: localhost
[server] Starting PT Biz Tools API v1.0.2 (built: ...)
[server] Environment: development
[server] Port: 3001
[server] Database connected
[server] PT Biz Tools API running on port 3001
[server] Health check: http://localhost:3001/health
[server] Registered routes:
  /api/actions
  /api/auth
  /api/analytics
  ...
```

### Terminal 2 — Frontend

```bash
cd ptbiztools-next
npm run dev
```

Expected output:
```
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
- Ready in 1.2s
```

---

## Verify the Stack

Once both servers are running, confirm everything is connected:

```bash
# 1. Backend liveness
curl http://localhost:3001/health
# Expected: {"status":"ok","version":"1.0.2",...}

# 2. Backend DB readiness
curl http://localhost:3001/ready
# Expected: {"status":"ready","dbHost":"localhost",...}

# 3. Frontend
open http://localhost:3000
# Should load the PT Biz Tools login page
```

**Login flow**: The login page shows a profile picker. Select a user profile to authenticate. If no users exist in the database, you may need to seed one:

```bash
cd ptbiztools-backend
npx tsx scripts/check-users.ts
```

---

## Zoom Integration Setup

Zoom features (recording ingest, transcript processing) require a **Server-to-Server OAuth app** in Zoom Marketplace.

> Full guide: [`SERVER_TO_SERVER_SETUP.md`](../SERVER_TO_SERVER_SETUP.md)

### Quick Setup

1. Go to [marketplace.zoom.us](https://marketplace.zoom.us/) → **Develop** → **Build App** → **Server-to-Server OAuth**
2. Add required scopes:
   - `cloud_recording:read:list_user_recordings:admin`
   - `cloud_recording:read:recording`
   - `user:read:user:admin`
   - `account:read:account:admin`
3. **Activate** the app (toggle in top-right corner)
4. Copy **Account ID**, **Client ID**, **Client Secret** into `ptbiztools-backend/.env`

### Test the Zoom token

```bash
curl -X POST https://zoom.us/oauth/token \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -d "grant_type=account_credentials" \
  -d "account_id=YOUR_ACCOUNT_ID"
# Expected: {"access_token":"...","token_type":"bearer","expires_in":3599}
```

### Run Zoom CLI commands

```bash
cd ptbiztools-backend

npm run zoom:recordings:list   # List available cloud recordings
npm run zoom:jobs:list         # List ingest job queue
npm run zoom:ingest:run        # Process pending ingest jobs
npm run zoom:backfill          # Backfill last 90 days of recordings
```

---

## Optional: Stack Lab (AI Dev Surface)

The Stack Lab is a feature-gated AI development surface for testing agent workflows.

Enable it by adding to `ptbiztools-next/.env.local`:

```bash
NEXT_PUBLIC_ENABLE_STACK_LAB=true
```

Then restart the frontend dev server. The **Stack Lab** link will appear in the sidebar navigation.

For agent development details, see [`ptbiztools-next/docs/agent-development.md`](../ptbiztools-next/docs/agent-development.md).

---

## Resetting Your Local Environment

### Reset the database

```bash
cd ptbiztools-backend

# Drop and recreate all tables (destructive!)
npx prisma migrate reset

# Or just re-push the schema
npx prisma db push --force-reset
```

### Clear node_modules and reinstall

```bash
# Backend
cd ptbiztools-backend
rm -rf node_modules
npm ci

# Frontend
cd ../ptbiztools-next
rm -rf node_modules .next
npm ci
```

### Clear Next.js build cache

```bash
cd ptbiztools-next
rm -rf .next
npm run dev
```

---

## Common Setup Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Cannot connect to database` | PostgreSQL not running or wrong `DATABASE_URL` | Start PostgreSQL; verify connection string |
| `prisma generate` fails | Prisma client not installed | Run `npm ci` first |
| Port 3001 already in use | Another process on port 3001 | `lsof -ti:3001 \| xargs kill` or change `PORT` in `.env` |
| Port 3000 already in use | Another Next.js app running | `lsof -ti:3000 \| xargs kill` |
| `Module not found` errors | Dependencies not installed | Run `npm ci` in the affected project |
| Frontend shows 502 on API calls | Backend not running | Start backend first; check `PTBIZ_BACKEND_URL` |
| `nvm: command not found` | nvm not installed | Install nvm, then `nvm install && nvm use` |
| Zoom 401 errors | App not activated or wrong credentials | Activate app in Zoom Marketplace; re-check env vars |

---

*Next: See [`docs/USAGE_GUIDE.md`](USAGE_GUIDE.md) to learn how to use each feature.*
