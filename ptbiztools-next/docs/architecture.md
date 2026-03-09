# PT Biz Tools - Architecture

## System Overview

PT Biz Tools is a modern Next.js application with a local-first architecture, enabling offline-capable business intelligence tools for PT practice owners.

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
│                      Vercel Edge Network                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  API Routes  │  │  Server      │  │  Edge Functions  │   │
│  │  (App Dir)   │  │  Components  │  │  (Workflow)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Local-First with PGLite
- **Why**: Offline capability, instant queries, no backend latency
- **How**: ElectricSQL PGLite runs PostgreSQL in browser via WebAssembly
- **Data**: User sessions, analysis history, cached results

### 2. AI Agent System
- **Framework**: Workflow AI + AI SDK
- **Pattern**: Streaming responses with real-time UI updates
- **Storage**: Agent state in local database

### 3. Authentication
- **Method**: Cookie-based sessions (`ptbiz_user`)
- **Flow**: Profile picker → Setup/Sign-in → Dashboard
- **Security**: HTTP-only cookies, CSRF protection

### 4. File Processing
- **Client-side**: Audio/video analysis via AI SDK
- **Formats**: MP3, MP4, WAV, WebM
- **Processing**: Chunked streaming for large files

## Data Flow

### Discovery Call Analysis
```
1. User uploads audio/video file
2. File stored temporarily in browser memory
3. AI SDK streams to OpenAI for transcription
4. Grading engine analyzes transcript
5. Results saved to PGLite
6. PDF/DOCX generated client-side
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

## Security Considerations

1. **No sensitive data in localStorage** - Only session cookie
2. **Client-side PDF generation** - No server data exposure
3. **AI API key protection** - Server-side only via env vars
4. **File upload limits** - Client-side validation

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
