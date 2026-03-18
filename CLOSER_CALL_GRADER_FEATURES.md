# Closer Call Grader - Feature Inventory

## Current Implementation Analysis
**File:** `DannyCloserCallGrader.tsx` (66KB)
**Last stable version:** March 10, 2026 (commit d0baf7d)

---

## Core Features to Preserve

### 1. Multi-View Architecture ✅
**Current:** 4 views (grade, results, history, report)
**Action:** Convert to 2-step flow like P&L (input → report)
- Input step: Combines "grade" view
- Report step: Combines "results" + export functionality
- History: Move to separate dashboard component OR integrate into results

### 2. Transcript Input Methods ✅

#### A. File Upload
- **Formats supported:** PDF, TXT, MD, CSV, JSON, RTF, XLSX, XLS, PNG, JPG, JPEG, WEBP
- **Features:**
  - Drag & drop zone
  - Click to upload
  - File preview with word count
  - "Remove" button to clear
  - Loading state during processing
  - Error handling
- **Backend:** `extractTranscriptFromFile()` API
- **MUST PRESERVE:** All file formats, drag/drop, OCR for images

#### B. Manual Text Entry
- **Features:**
  - Large textarea for pasting transcript
  - Multi-part chunking (can paste in sections)
  - "Add Part" button to save chunks
  - Shows accumulated word count
  - "Clear All" button
  - Validates minimum 120 words
- **MUST PRESERVE:** Chunking functionality for long transcripts

#### C. Word Count Validation
- Minimum: 120 words required
- Shows: "✅ READY" or "⚠️ Need X more words"
- Visual feedback with color coding
- **MUST PRESERVE:** All validation logic

### 3. Call Metadata ✅
**Current UI:** Toggle buttons for each field
- **Closer:** John / Toni / Other
- **Outcome:** Won / Lost
- **Program:** Rainmaker / Mastermind
- **Prospect Name:** Text input (optional)

**Action:** Keep all fields, use P&L style inputs:
- Radio buttons or segment controls
- Clean label/input pairs
- Same inline style as P&L

### 4. Grading System ✅

#### A. 7-Phase Scoring
1. Connection & Agenda (10% weight)
2. Discovery (25% weight) - MOST IMPORTANT
3. Gap Creation (20% weight)
4. Temperature Check (10% weight)
5. Solution Presentation (15% weight)
6. Investment & Close (15% weight)
7. Follow-Up / Wrap (5% weight)

**Each phase returns:**
- Score (0-100)
- Summary text
- Evidence array (2-3 verbatim quotes)

**MUST PRESERVE:** All phases, weights, evidence system

#### B. Critical Behaviors (Pass/Fail)
1. No Free Consulting
2. Discount Discipline
3. Emotional Depth
4. Time Management
5. Story Deployment

**Each behavior returns:**
- Status: pass / fail / unknown
- Note: explanation
- Evidence array

**MUST PRESERVE:** All behaviors, pass/fail/unknown logic

#### C. Grading Progress UI
Shows live progress during AI analysis:
- Elapsed time counter (MM:SS)
- 4 stages with descriptions:
  1. "Parsing transcript context"
  2. "Applying deterministic scoring"
  3. "Validating evidence quality"
  4. "Saving analysis + report metadata"
- Progress bar (0-96%)
- Stage indicators (○ pending, ● current, ✓ complete)

**MUST PRESERVE:** All progress stages, visual feedback

#### D. Scoring Metrics
- **Overall Score:** 0-100 (composite)
- **Deterministic Breakdown:**
  - Weighted phase score
  - Penalty points
  - Unknown penalty
  - Overall score
- **Confidence Score:** 0-100
  - Evidence coverage %
  - Quote verification rate %
  - Transcript quality %
- **Quality Gate:**
  - Accepted: boolean
  - Reasons: string array

**MUST PRESERVE:** All scoring logic, display of metrics

### 5. Results Display ✅

#### A. Overall Score Card
- Large circular progress indicator
- Score number (0-100)
- Color coding:
  - 80+: Green (#22c55e)
  - 65-79: Light green (#84cc16)
  - 50-64: Yellow (#eab308)
  - 35-49: Orange (#f97316)
  - 0-34: Red (#ef4444)
- Top strength (green box)
- Top improvement area (red box)
- Prospect summary

**Action:** Rebuild using P&L's Ring component pattern

#### B. Phase Breakdown Display
For each phase:
- Phase name + weight percentage
- Score with color-coded bar
- Summary text
- Evidence quotes (expandable)

**Action:** Use P&L's Gauge component pattern

#### C. Critical Behaviors Display
For each behavior:
- Pass/Fail/Unknown badge
- Behavior name
- Explanation note
- Evidence quotes

**Action:** Create PassFail component like P&L pattern

### 6. History & Analytics ✅

#### A. Local Storage Persistence
- Storage key: "ptbiz-call-grades"
- Stores all graded calls
- Each entry includes:
  - id, date, closer, outcome, program
  - prospectName
  - Full result object

**MUST PRESERVE:** localStorage integration

#### B. Time Period Filter
- 7 Days / 30 Days / 90 Days / All Time
- Filters history display

**Action:** Keep but style with P&L pattern

#### C. Closer Performance Stats
For each closer:
- Total calls
- Average score
- Win count / Loss count
- Close rate %
- Phase averages (all 7 phases)
- Behavior pass rates (all 5 behaviors)
- Weakest area highlight

**MUST PRESERVE:** All stats calculations

#### D. Call Log
- List of all calls
- Shows: score, closer, prospect, program, outcome, date
- Click to expand details
- Delete button per entry
- Export button per entry
- "Clear All" button

**Action:** Rebuild with P&L table style

### 7. Report Generation & Export ✅

#### A. Downloadable HTML Report
Current generates professional HTML with:
- Header with score/grade
- Call metadata table
- Key takeaways (strength/improvement)
- Deterministic + confidence metrics
- Phase-by-phase table with evidence
- Critical behaviors table with evidence
- Print-friendly CSS
- "Download PDF" button (triggers browser print)

**MUST PRESERVE:** All report sections, print functionality

#### B. PDF Export Integration
- Calls `savePdfExport()` API
- Stores metadata:
  - sessionId, coachingAnalysisId
  - coachName, clientName, callDate
  - score, tool, outcome, program, confidence

**MUST PRESERVE:** API integration

### 8. Backend Integration ✅

#### A. API Calls
1. **extractTranscriptFromFile()** - File upload processing
2. **gradeDannySalesCallV2()** - AI grading
3. **saveCoachingAnalysis()** - Store analysis in DB
4. **savePdfExport()** - Log PDF generation
5. **logAction()** - Track user actions

**MUST PRESERVE:** All API integrations

#### B. Session Tracking
- Generates crypto.randomUUID() for session
- Logs all actions with sessionId
- Action types:
  - TRANSCRIPT_UPLOADED
  - TRANSCRIPT_PASTED
  - GRADE_GENERATED
  - PDF_GENERATED

**MUST PRESERVE:** All logging

### 9. Error Handling ✅
- File upload errors with retry
- API errors with user-friendly messages
- Validation errors (word count)
- Loading states
- Toast notifications

**MUST PRESERVE:** All error handling

---

## Features to MODIFY (UI only)

### 1. Color System
**Current:** CSS variables (`var(--color-bg)`)
**New:** Inline color object like P&L:
```javascript
const B = { 
  blue:"#2E86F5", 
  surf:"#FFFFFF",
  // ... etc
};
```

### 2. Typography
**Current:** Mixed fonts via CSS variables
**New:** Explicit Google Fonts like P&L:
- Barlow Condensed for headers
- Barlow for body text
- JetBrains Mono for numbers

### 3. Layout Structure
**Current:** Multi-view tabs
**New:** Two-step flow like P&L:
- Step 1: Input (grade view)
- Step 2: Report (results + export)
- History: Separate or integrated

### 4. Component Styling
**Current:** External CSS classes, CSS variables
**New:** Inline styles only, self-contained

---

## P&L Components to Reuse

### From DannyFinancialAudit.jsx:

1. **Logo Component**
   - Uses PTBIZ_LOGO_DARK_BG_URL
   - Sized appropriately

2. **Gauge Component**
   - Visual score bar with color coding
   - Target range display
   - Benchmark comparison

3. **Ring Component**
   - Circular score display
   - Letter grade (A+, A, B, C, D, F)
   - Color coding

4. **Inp Component**
   - Clean input fields
   - Dollar sign prefix
   - Validation hints

5. **Sec Component** (Section)
   - Card-style containers
   - Consistent padding/borders

6. **Color Palette (B object)**
   - Complete color system
   - Semantic naming

7. **Style Objects**
   - pageShellStyle
   - canvasStyle
   - cardStyle
   - btnBase

---

## New Components Needed

### 1. FileUploadZone
Based on current drag/drop zone but P&L styled:
- Clean border with hover effect
- Upload icon
- "Drop file or click to upload" text
- File type list
- Loading state

### 2. ScoreBar
Horizontal progress bar for phase scores:
- Color coding based on score
- Percentage display
- Label (Healthy/Caution/Critical)
- Already exists in current - adapt to P&L style

### 3. PassFail Badge
Status indicator for behaviors:
- ✓ PASS (green)
- ✗ FAIL (red)
- ? UNKNOWN (gray)
- Already exists in current - adapt to P&L style

### 4. GradingProgress
Live grading visualization:
- Timer display
- Stage progress
- Progress bar
- Stage checkboxes
- Adapt current to P&L style

### 5. HistoryCard
Display past calls:
- Compact score display
- Metadata
- Expand/collapse details
- Export/delete buttons

---

## Implementation Strategy

### Step 1: Create DannyCloserCallGrader-v2.tsx
Start with P&L as template, add features incrementally

### Step 2: Port Core Logic
Copy these as-is (no UI changes):
- All constants (PHASES, CRITICAL_BEHAVIORS, etc.)
- Helper functions (getCloserStats, etc.)
- State management
- API integration
- localStorage logic

### Step 3: Rebuild UI Components
One by one, matching P&L pattern:
1. Input view (file upload + manual entry)
2. Metadata fields (closer, outcome, etc.)
3. Grading progress
4. Results display (score card)
5. Phase breakdown
6. Critical behaviors
7. History/analytics
8. Report export

### Step 4: Test Each Feature
As we build:
- File upload works
- Manual entry works
- Grading completes
- Results display correctly
- History persists
- Export works

### Step 5: Replace Old File
When complete and tested:
```bash
mv src/components/danny/DannyCloserCallGrader.tsx src/components/danny/DannyCloserCallGrader-old-backup.tsx
mv src/components/danny/DannyCloserCallGrader-v2.tsx src/components/danny/DannyCloserCallGrader.tsx
```

---

## Success Criteria

- [ ] All file upload formats work
- [ ] Manual text entry works
- [ ] Multi-part chunking works
- [ ] Word count validation works
- [ ] All metadata fields work
- [ ] Grading progress displays
- [ ] AI grading completes
- [ ] All 7 phases display correctly
- [ ] All 5 behaviors display correctly
- [ ] Deterministic scores shown
- [ ] Confidence metrics shown
- [ ] History persists to localStorage
- [ ] Time period filter works
- [ ] Closer stats calculate correctly
- [ ] Call log displays and functions
- [ ] Report export works
- [ ] PDF integration works
- [ ] Matches P&L visual style
- [ ] Build completes without errors
- [ ] No console errors

---

## Timeline Estimate

- Core logic port: 2 hours
- Input view rebuild: 3 hours
- Results view rebuild: 3 hours
- History/analytics rebuild: 2 hours
- Report export rebuild: 1 hour
- Testing & debugging: 2 hours

**Total: ~13 hours**

---

## Notes

- The Closer Call Grader is MORE complex than P&L Calculator
- Has more features (history, stats, multiple views)
- But all features are valuable - preserve them all
- The UI just needs to match P&L's clean pattern
- This is the most complex tool - others will be easier
