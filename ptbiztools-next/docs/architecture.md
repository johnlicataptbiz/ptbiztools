# PT Biz Tools - Architecture

## System Overview

PT Biz Tools is a hybrid web application: the frontend is a Next.js app deployed on Vercel, while auth, analytics, transcript, and Danny tool endpoints still route to the Railway-hosted PT Biz backend.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Next.js    │  │   React      │  │   PGLite (Wasm)  │   │
│  │   App Router │  │   Components │  │   Local Database │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  AI SDK      │  │  Workflow    │  │  Agent Protocol  │   │
│  │  (OpenAI)    │  │  Engine      │  │  (Streaming)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Frontend Layer                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  App Routes  │  │  Server      │  │  Workflow /      │   │
│  │  + Proxy     │  │  Components  │  │  Agent Endpoints │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Railway Backend Layer                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   /auth      │  │  /analytics  │  │ /danny-tools and │   │
│  │   sessions   │  │  + actions   │  │ transcript APIs  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Hybrid Frontend + Backend
- **Why**: Keep the active UI on Vercel while preserving existing backend APIs on Railway
- **How**: `next.config.ts` rewrites selected `/api/*` routes to `PTBIZ_BACKEND_URL`
- **Data**: Auth, analytics, transcripts, and Danny grading continue to rely on the backend service

### 2. AI Agent System
- **Framework**: Workflow AI + AI SDK
- **Pattern**: Streaming responses with real-time UI updates
- **Storage**: Agent state can use local-first storage where relevant

### 3. Authentication
- **Method**: Cookie-based sessions (`ptbiz_user`)
- **Flow**: Profile picker → Setup/Sign-in → Dashboard
- **Security**: Cookie-based auth backed by the Railway API, plus frontend route protection through `src/proxy.ts`

### 4. File Processing
- **Client-side**: Upload preparation and UI orchestration
- **Backend-assisted**: Transcript and Danny grading APIs remain server-backed
- **Formats**: PDF plus transcript/file uploads as required by each tool

## Data Flow

### Discovery Call Analysis
```
1. User uploads audio/video file
2. File is prepared client-side
3. Grading/transcript handling is sent through the active API surface
4. Results return to the Next.js UI
5. Results may be stored locally for the relevant feature
6. PDF output is generated client-side when needed
7. Download triggered
```

### Agent Workflow
```
1. User initiates agent task
2. Workflow engine creates run
3. Agent protocol streams updates
4. UI receives real-time progress
5. Final result persisted locally
```

## Component Architecture

### App Shell (`src/components/layout/app-shell.tsx`)
- Persistent navigation
- Theme provider
- Session context
- Tour overlay integration

### Grader System (`src/components/grader/`)
- `GradeModal`: Upload and configuration
- `GradePreview`: Results display
- `AnalysisHistory`: Past analyses

### Danny Tools (`src/components/danny/`)
- `DannyCloserCallGrader`: Sales call analysis
- `DannyCompensationCalculator`: Compensation modeling
- `DannyFinancialAudit`: P&L analysis

## State Management

| State Type | Solution | Location |
|------------|----------|----------|
| Server State | React Query | `src/lib/ptbiz-api.ts` |
| Local State | React useState | Component level |
| Global State | React Context | `src/lib/*/context.tsx` |
| Persistent | PGLite | `src/lib/local-first/db.ts` |

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/agent/surface` | Agent initialization |
| `/api/agent/surface/[id]/stream` | Streaming responses |
| `/api/sync/actions` | Data synchronization |
| `/api/auth/*` | Rewritten to Railway backend |
| `/api/analytics/*` | Rewritten to Railway backend |
| `/api/transcripts/*` | Rewritten to Railway backend |
| `/api/danny-tools/*` | Rewritten to Railway backend |

## Security Considerations

1. **No secrets in tracked env files** - `.env.example` only contains safe placeholders
2. **Cookie-based auth** - protected pages are redirected server-side before client hydration
3. **Backend API isolation** - external credentials remain server-side
4. **Generated changelog safety** - production falls back to GitHub commits when no `.git` history is available

## Performance Optimizations

1. **Turbopack** - Fast dev builds
2. **Next.js Image** - Optimized images
3. **Font optimization** - `next/font` with Geist
4. **Code splitting** - Route-based chunks
5. **Streaming** - AI responses stream progressively

## Future Considerations

- **Multi-device sync**: ElectricSQL cloud sync
- **Team collaboration**: Real-time collaboration layer
- **Mobile app**: React Native with shared logic
