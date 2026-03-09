# Danny's Modal Integration Plan

## Analysis

### Danny's Version (Good UI, Bad Architecture)
✅ **Tabbed interface** (Grading | Feedback | Summary)
✅ **Phase cards** with expandable rubric (great/mistakes)
✅ **Red flags** section with checkboxes
✅ **Manual scoring sliders**
❌ **Direct Anthropic API call** (security risk, CORS issues)
❌ **Synchronous PDF encoding** (browser freeze)
❌ **Data URI for reports** (2MB limit)
❌ **Inline styles** (hard to maintain)

### Production Version (Good Architecture, Different UI)
✅ **Backend API integration** (gradeDannySalesCallV2)
✅ **Live progress UI** (staging, diagnostics)
✅ **Proper file handling** (extractTranscriptFromFile)
✅ **CSS-based styling** (maintainable)
✅ **PDF generation utility** (generatePDF)
✅ **Session tracking** (logAction)
❌ **Different layout** (not tabbed)
❌ **No phase rubric display**
❌ **No manual scoring**

## Integration Strategy

### 1. Keep Production Backend
- Use `gradeDannySalesCallV2` API (already fixed)
- Keep file upload via `extractTranscriptFromFile`
- Keep session logging
- Keep PDF generation via `generatePDF`

### 2. Adopt Danny's UI Components
- **Tabbed interface**: Grading | Feedback | Summary
- **Phase cards**: Expandable rubric with great/mistakes
- **Red flags**: Checkbox list with deductions
- **Summary view**: Visual score breakdown

### 3. Fix Critical Errors
- ✅ Backend API (already done)
- ✅ PDF encoding: Use FileReader.readAsDataURL (not loop)
- ✅ Report download: Use Blob + URL.createObjectURL
- ✅ Error handling: Add try/catch with user feedback

### 4. Merge Styling
- Convert Danny's inline styles to CSS classes
- Match existing design system (grader-page, tool-page)
- Keep responsive layout

## Implementation Steps

1. **Update DiscoveryCallGrader.tsx**
   - Add tab state (grading | feedback | summary)
   - Add Danny's PHASES and RED_FLAGS constants
   - Create PhaseCard component with rubric
   - Create RedFlags component
   - Update render to show tabs

2. **Create new components**
   - `PhaseCard.tsx` - Expandable phase scoring
   - `RedFlagsPanel.tsx` - Red flag checkboxes
   - `SummaryView.tsx` - Score breakdown

3. **Update CSS**
   - Add tab styles
   - Add phase card styles
   - Add red flag styles

4. **Fix file handling**
   - Update handleFileUpload to use FileReader for PDFs

5. **Test integration**
   - Verify backend API still works
   - Verify file upload works
   - Verify PDF generation works
