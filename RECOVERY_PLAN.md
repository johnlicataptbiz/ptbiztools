# PT Biz Tools - Recovery Plan
**Date:** March 18, 2026  
**Status:** Nuclear reset to d0baf7d (March 10) - STABLE

## Current State ✅
- **Build:** Clean, no errors
- **Deployment:** Live at https://www.ptbizcoach.com
- **Base Commit:** d0baf7d - "Stabilize app and harden prod auth"

## Recovery Strategy

### Phase 1: Asset Recovery (SAFE)
Recover branding assets and logos without touching code:

**Commits to cherry-pick:**
- `6e62d68` - Add clinic SVG icons to public folder
- `a28aa21` - Add PTBiz brand assets, update login background
- `bb27d58` - Organize semantic clinic assets

**What this restores:**
- Latest PT Biz logos
- Clinic icon SVG pack
- Branded background patterns
- Hero images

### Phase 2: Tool Improvements (SELECTIVE)
Review and selectively apply tool functionality improvements:

**Target commits:**
- `238680d` - Update Danny tools (FinancialAudit, CloserCallGrader, CompensationCalculator)
- `2f9ecd1` - Integrate clinic_svg_pack with ClinicIcon components

**Strategy:**
1. Manual code review of each tool improvement
2. Extract ONLY functional improvements (no CSS changes)
3. Ensure modal consistency with P&L Calculator pattern
4. Test each tool individually before committing

### Phase 3: Dashboard Enhancements (CAREFUL)
**Target:** Dashboard visual refresh WITHOUT custom CSS

**Commits to review:**
- `7dcd383` - dashboard/app-shell visual refresh
- Dashboard component changes from 238680d

**Criteria:**
- Must use existing Mantine components
- No custom background overlays
- No tiled patterns
- Keep it simple and functional

## What NOT to Recover ❌

### Problematic Changes (DO NOT CHERRY-PICK):
- **Hydration fixes** - These were band-aids on broken architecture
- **SSR/CSR splitting** - Next.js 15 changes that broke things
- **Login modal redesigns** - Multiple broken attempts
- **Force-dynamic rendering** - Vercel config tweaks
- **Custom CSS elements** - The root cause of the cascade failure
- **Magic UI attempts** - Never worked properly

### Incomplete/Abandoned Work:
- Task Master integration
- Magic UI image generation
- Various experimental UI enhancements

## Tool Unification Goal

All 4 Danny tools should follow the P&L Calculator pattern:

### Design Principles:
1. **Consistent Layout:**
   - Tool badge hero section
   - Clean white canvas with subtle shadows
   - Barlow Condensed for headers
   - JetBrains Mono for numbers

2. **Modal Structure:**
   - Input step with clear sections
   - Report/results step with downloadable output
   - Consistent color palette across all tools

3. **No Custom CSS:**
   - Use utility classes only
   - Inline styles for component-specific needs
   - No external style sheets that affect multiple components

4. **Branding:**
   - PT Biz logo from constants
   - Tool-specific badges
   - Clinic icons where appropriate

## Tools to Unify:
1. ✅ **P&L Calculator** - Already has the ideal pattern
2. ⚠️ **Closer Call Grader** - Needs modal structure update
3. ⚠️ **Compensation Calculator** - Needs modal structure update  
4. ❓ **Discovery Call Grader** - Verify existence and update

## Execution Checklist

### Pre-Recovery:
- [x] Create recovery branch: `feature/tool-improvements-recovery`
- [ ] Document current tool state
- [ ] Create backup of current working state

### Asset Recovery:
- [ ] Cherry-pick 6e62d68 (SVG icons)
- [ ] Cherry-pick a28aa21 (brand assets)
- [ ] Cherry-pick bb27d58 (semantic assets)
- [ ] Test build
- [ ] Commit if successful

### Tool Review:
- [ ] Extract DannyCloserCallGrader improvements from 238680d
- [ ] Extract DannyCompensationCalculator improvements from 238680d
- [ ] Review FinancialAudit changes (likely already good)
- [ ] Test each tool in development
- [ ] Apply improvements incrementally

### Dashboard:
- [ ] Review dashboard changes from 7dcd383
- [ ] Extract safe visual improvements
- [ ] Test in development
- [ ] Apply if stable

### Final Testing:
- [ ] Build test: `npm run build`
- [ ] Development test: All tools functional
- [ ] Visual consistency check
- [ ] Deploy to Vercel preview
- [ ] Merge to main if all tests pass

## Success Criteria

- ✅ Build completes without errors
- ✅ All 4 tools display correctly
- ✅ Consistent modal UI across tools
- ✅ Latest branding assets in use
- ✅ No hydration errors
- ✅ No custom CSS causing issues
- ✅ Production deployment successful

## Rollback Plan

If ANY step breaks the build:
1. `git reset --hard HEAD~1`
2. Document what failed
3. Re-evaluate approach
4. DO NOT push broken code to main

## Notes

- The March 10 state is KNOWN GOOD - protect it at all costs
- Incremental changes only - test after each commit
- When in doubt, skip the change
- Better to miss a feature than break production again
