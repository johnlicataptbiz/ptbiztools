# Implementation Plan: Unified Modal-Based Grader Framework

## Overview
Convert both the Sales Call Grader and Discovery Call Grader to use a unified modal-based architecture where users trigger grading from the dashboard, input transcripts in a focused modal, and view results in a separate high-quality results modal with badges prominently displayed.

## Current State Analysis

### Discovery Call Grader
- **Location**: `src/components/discovery/DiscoveryCallGrader.tsx`
- **Current Pattern**: Full page with tabs (Grading/Feedback/Summary)
- **Results**: Already uses `GradeModal` component for results display
- **Badge**: Currently in page header (needs to move to modal)

### Sales Call Grader (Danny's)
- **Location**: `src/components/danny/DannyCloserCallGrader.tsx`
- **Current Pattern**: Full page with view switching (grade/results/history/report)
- **Results**: Inline page display (needs to use modal like Discovery)
- **Badge**: Currently removed from header (needs to be in modal)

### GradeModal (Reference Implementation)
- **Location**: `src/components/grader/GradeModal.tsx`
- **Features**: Dark overlay, centered white container, badge in header, score display, phase breakdown, PDF export form
- **Animation**: Framer Motion with spring transitions

## Proposed Architecture

```
Dashboard Tool Card Click
    ↓
┌─────────────────────────────────────┐
│  InputModal (transcript input)      │
│  - Badge in header                  │
│  - Clean form with metadata         │
│  - Grade button                     │
└─────────────────────────────────────┘
    ↓ (after grading)
┌─────────────────────────────────────┐
│  ResultsModal (grade display)       │
│  - Badge + Score in header          │
│  - Phase breakdown                  │
│  - Strengths/Improvements           │
│  - PDF export form                  │
│  - Link to History view             │
└─────────────────────────────────────┘
    ↓ (optional)
┌─────────────────────────────────────┐
│  History Page (separate view)       │
│  - All past grades list             │
│  - Filter by time period            │
│  - Click to reopen in ResultsModal  │
└─────────────────────────────────────┘
```

## Types

New shared types for the unified grader system:

```typescript
// src/components/grader/types.ts

export interface GraderInputData {
  transcript: string;
  coachName: string;
  clientName: string;
  callDate: string;
  outcome?: string;
  program?: string;
  metadata?: Record<string, any>;
}

export interface GraderResultData {
  score: number;
  outcome: string;
  summary: string;
  phaseScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    summary?: string;
    evidence?: string[];
  }>;
  strengths: string[];
  improvements: string[];
  redFlags: string[];
  criticalBehaviors?: Array<{
    id: string;
    name: string;
    status: string;
    note: string;
    evidence?: string[];
  }>;
  deterministic?: {
    weightedPhaseScore: number;
    penaltyPoints: number;
    unknownPenalty: number;
    overallScore: number;
  };
  confidence?: {
    score: number;
    evidenceCoverage: number;
    quoteVerificationRate: number;
    transcriptQuality: number;
  };
  prospectSummary?: string;
  evidence?: any;
}

export interface GraderModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeSrc: string;
  badgeAlt: string;
  title: string;
  subtitle: string;
}

export interface GraderInputModalProps extends GraderModalProps {
  onSubmit: (data: GraderInputData) => void;
  isGrading: boolean;
  minWords?: number;
  defaultValues?: Partial<GraderInputData>;
}

export interface GraderResultsModalProps extends GraderModalProps {
  result: GraderResultData;
  inputData: GraderInputData;
  onGeneratePDF: () => void;
  onViewHistory: () => void;
}
```

## Files

### New Files to Create

1. **`src/components/grader/types.ts`**
   - Shared TypeScript interfaces for grader data structures

2. **`src/components/grader/GraderInputModal.tsx`**
   - Reusable input modal component
   - Badge display in header
   - Transcript textarea with file upload
   - Metadata fields (coach, client, date, outcome)
   - Word count validation
   - Grade button with loading state

3. **`src/components/grader/GraderResultsModal.tsx`**
   - Enhanced results modal (extends current GradeModal)
   - Badge + Score display
   - Phase breakdown with progress bars
   - Strengths/Improvements sections
   - Red flags display
   - PDF export form
   - History link

4. **`src/components/grader/useGrader.ts`**
   - Shared hook for grading logic
   - Handles API calls
   - Manages loading states
   - Error handling

### Existing Files to Modify

1. **`src/components/discovery/DiscoveryCallGrader.tsx`**
   - Remove full-page layout
   - Convert to modal trigger wrapper
   - Use GraderInputModal for input
   - Use GraderResultsModal for results
   - Keep history view as separate page

2. **`src/components/danny/DannyCloserCallGrader.tsx`**
   - Remove full-page layout with view switching
   - Convert to modal trigger wrapper
   - Use GraderInputModal for input
   - Use GraderResultsModal for results
   - Keep history/report views as separate pages

3. **`src/app/(app)/sales-discovery-grader/page.tsx`**
   - Simplify to modal trigger component
   - Handle modal open/close state

4. **`src/app/(app)/discovery-call-grader/page.tsx`** (if exists, or create)
   - Simplify to modal trigger component

5. **`src/styles/tool-page.css`**
   - Add styles for GraderInputModal
   - Ensure consistent styling with GradeModal

## Functions

### New Functions

1. **`useGrader()` hook**
   - `gradeTranscript(data: GraderInputData): Promise<GraderResultData>`
   - `isGrading: boolean`
   - `error: string | null`
   - `reset(): void`

2. **`GraderInputModal` component**
   - `onSubmit(data: GraderInputData): void`
   - `validateTranscript(text: string): boolean`
   - `handleFileUpload(file: File): void`

3. **`GraderResultsModal` component**
   - `onGeneratePDF(): void`
   - `onViewHistory(): void`
   - `getScoreColor(score: number): string`
   - `getScoreLabel(score: number): string`

### Modified Functions

1. **`DiscoveryCallGrader`**
   - Remove: `renderGradeView()`, `renderResults()`, `renderHistory()`, tab switching
   - Add: Modal state management, `handleGrade()`, `handleClose()`

2. **`DannyCloserCallGrader`**
   - Remove: `renderGradeView()`, `renderResults()`, `renderHistory()`, `renderReport()`, view switching
   - Add: Modal state management, `handleGrade()`, `handleClose()`

## Classes/Components

### New Components

1. **`GraderInputModal`**
   - Props: `isOpen`, `onClose`, `onSubmit`, `badgeSrc`, `badgeAlt`, `title`, `subtitle`, `isGrading`, `minWords`
   - Features: File upload, drag-and-drop, word count, metadata form
   - Animation: Fade in + scale up

2. **`GraderResultsModal`**
   - Props: `isOpen`, `onClose`, `result`, `inputData`, `badgeSrc`, `badgeAlt`, `onGeneratePDF`, `onViewHistory`
   - Features: Score display, phase breakdown, PDF form
   - Animation: Spring transition

3. **`GraderHistoryView`**
   - Props: `grades`, `onSelect`, `onDelete`, `filterOptions`
   - Features: List view, filtering, selection

### Modified Components

1. **`GradeModal` → GraderResultsModal**
   - Extend with badge support
   - Add history link
   - Make more generic (not Discovery-specific)

2. **`DiscoveryCallGrader`**
   - Convert from page to modal wrapper
   - Remove tab interface

3. **`DannyCloserCallGrader`**
   - Convert from page to modal wrapper
   - Remove view switching

## Dependencies

No new dependencies required. Existing stack:
- `framer-motion` (already used for animations)
- `lucide-react` (already used for icons)
- `sonner` (already used for toasts)

## Testing

### Critical Path Testing
1. Click dashboard tool card → Input modal opens
2. Paste transcript → Word count updates
3. Fill metadata → Submit enabled
4. Click Grade → Loading state → Results modal opens
5. View score, phases, strengths → Click PDF → Download works
6. Close modal → Return to dashboard

### Edge Cases
1. Transcript under min words → Submit disabled, validation message
2. File upload failure → Error toast
3. API error → Error displayed in modal
4. Very long transcript → Warning but allow grading
5. Missing metadata → Allow but warn

## Implementation Order

1. **Create shared types** (`src/components/grader/types.ts`)
2. **Create useGrader hook** (`src/components/grader/useGrader.ts`)
3. **Create GraderInputModal** (`src/components/grader/GraderInputModal.tsx`)
4. **Extend GradeModal to GraderResultsModal** (enhance existing)
5. **Refactor DiscoveryCallGrader** to use modals
6. **Refactor DannyCloserCallGrader** to use modals
7. **Update page components** to be modal triggers
8. **Update CSS** for consistent styling
9. **Test both graders** end-to-end
10. **Verify badges** display correctly in both modals

## Badge Integration

Both modals must display the tool badge prominently:

- **Input Modal**: Badge in header, 100x100px, with tool title below
- **Results Modal**: Badge in header next to score, 100x100px

Badge sources from `TOOL_BADGES` constant:
- Discovery: `TOOL_BADGES.discovery`
- Sales: `TOOL_BADGES.sales`

## Migration Strategy

### Phase 1: Foundation
- Create types and hook
- Build GraderInputModal
- Enhance GraderResultsModal

### Phase 2: Discovery Grader
- Refactor to use modals
- Test thoroughly
- Deploy

### Phase 3: Sales Grader
- Refactor to use modals
- Align with Discovery pattern
- Test thoroughly
- Deploy

### Phase 4: Cleanup
- Remove old page-based styles
- Consolidate shared styles
- Final testing
