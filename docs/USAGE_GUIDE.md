# PT Biz Tools Usage Guide

**Start Here** - Your comprehensive guide to using PT Biz Tools.

## Table of Contents

- [Quick Navigation](#quick-navigation)
- [Core Tools](#core-tools)
- [Zoom Integration](#zoom-integration)
- [AI Agent Stack Lab](#ai-agent-stack-lab)
- [Analytics & Action Logging](#analytics--action-logging)
- [P&L Import](#pl-import)
- [PDF Export](#pdf-export)
- [Troubleshooting](#troubleshooting)

## Quick Navigation

| Feature                     | Route                      | Description         |
| --------------------------- | -------------------------- | ------------------- |
| **Dashboard**               | `/dashboard`               | Main hub            |
| **Discovery Call Grader**   | `/discovery-call-grader`   | Analyze sales calls |
| **Sales Discovery Grader**  | `/sales-discovery-grader`  | Sales performance   |
| **P&L Calculator**          | `/pl-calculator`           | Financial audit     |
| **Compensation Calculator** | `/compensation-calculator` | Comp modeling       |
| **Analyses**                | `/analyses`                | History             |
| **Stack Lab**               | `/stack-lab`               | AI dev tools        |

## Core Tools

### 1. Discovery Call Grader (`/discovery-call-grader`)

**What it does**: AI analyzes uploaded sales call recordings, scores performance, identifies red flags, and provides actionable feedback.

**How to use**:

1. Click \"Upload Transcript or Audio\"
2. Drag/drop file or browse (supports MP4, MP3, WAV, TXT transcripts)
3. Select grading profile (e.g., Discovery Call)
4. Click \"Grade Call\"
5. View results in tabs: Grading, Feedback, Summary
6. Export PDF report

**Key UI**:

- **Progress Bar**: Real-time grading status
- **Phase Cards**: Expandable score breakdown
- **Red Flags**: Checkbox list of issues
- **Score Bar**: Visual performance summary

### 2. P&L Financial Audit (`/pl-calculator`)

**What it does**: Upload practice P&L statements for AI-powered financial health analysis.

**Steps**:

1. Upload PDF/image of P&L statement
2. AI extracts and categorizes line items
3. View benchmarking vs industry averages
4. Export audit report

### 3. Compensation Calculator (`/compensation-calculator`)

**What it does**: Model employee compensation packages against market rates.

**Usage**:

1. Select role (e.g., PT, Front Desk)
2. Enter experience level
3. Adjust sliders for base, bonus, benefits
4. View total cost breakdown
5. Compare vs benchmarks

## Zoom Integration

### Automatic Recording Ingest

1. **Connect Zoom Account** (Admin only):
   - Visit `/api/zoom/connect`
   - Authorize Server-to-Server OAuth
   - Zoom cloud recordings auto-import

2. **Recording Queue**:
   - New recordings appear in `/dashboard`
   - Auto-transcribe + grade pipeline
   - Track via CLI: `npm run zoom:jobs:list`

### CLI Commands (from `ptbiztools-backend/`)

```bash
npm run zoom:recordings:list    # Available recordings
npm run zoom:ingest:run         # Process queue
npm run zoom:backfill           # Import last 90 days
```

## AI Agent Stack Lab (`/stack-lab`)

**Dev Surface** - Enable via `NEXT_PUBLIC_ENABLE_STACK_LAB=true`

**Features**:

- Streaming AI workflows
- Real-time agent execution
- MCP tool integration
- Local-first persistence

## Analytics & Action Logging

All user actions auto-logged to `/api/analytics` + `/api/actions`.

**Dashboard Metrics**:

- Total analyses run
- Average scores by tool
- User session tracking
- Export to CSV

## P&L Import Pipeline

**Backend-only** (`/api/pl-imports`):

1. Upload P&L document
2. AI parses line items
3. Apply field mapping
4. Store session for analysis

## PDF Export

**Client-side generation** (jsPDF):

- All tools support PDF export
- Includes charts, scores, recommendations
- Custom branding applied

## Troubleshooting

| Issue              | Solution                           |
| ------------------ | ---------------------------------- |
| File upload fails  | Check file size (<50MB), format    |
| Grading stuck      | Check backend health (`/health`)   |
| PDF blank          | Regenerate - client-side rendering |
| Zoom not ingesting | Run `npm run zoom:ingest:run`      |

**Backend Health**: `http://localhost:3001/health`

**Next.js API Proxy**: All `/api/*` routes proxy to backend automatically.

---

_Happy grading! 🚀_
