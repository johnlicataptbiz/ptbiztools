# Project Recovery Plan

Generated: 2026-03-17

## Goal

Sort the project into a safe, readable, production-aware state without deleting or moving meaningful work until the analysis is complete and the plan is approved.

## Priority Order

### P0 - Security and Production Safety

1. Rotate and verify all sensitive environment values found in local env files.
   - [`ptbiztools-backend/.env`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/.env)
   - [`.env.local`](/Users/jl/Developer/ptbiztools/.env.local)
   - [`ptbiztools-next/.env.local`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.env.local)
2. Confirm the canonical production config contract.
   - Frontend Vercel config: [`ptbiztools-next/vercel.json`](/Users/jl/Developer/ptbiztools/ptbiztools-next/vercel.json)
   - Backend Railway config: [`ptbiztools-backend/railway.json`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/railway.json)
   - Deployment workflows: [`.github/workflows/`](/Users/jl/Developer/ptbiztools/.github/workflows)
3. Keep `.vercel/project.json` visible, while hiding generated `.vercel/output`.
   - Visible: [`ptbiztools-next/.vercel/project.json`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.vercel/project.json)
   - Hidden: `ptbiztools-next/.vercel/output`

### P1 - Hidden State and Workflow Clarity

1. Keep the workflow/state folders visible in the editor.
   - [`.taskmaster/`](/Users/jl/Developer/ptbiztools/.taskmaster)
   - [`.blackbox/`](/Users/jl/Developer/ptbiztools/.blackbox)
   - [`.cursor/`](/Users/jl/Developer/ptbiztools/.cursor)
2. Treat `.taskmaster` as the live source of truth for pending work.
   - Task graph: [`.taskmaster/tasks/tasks.json`](/Users/jl/Developer/ptbiztools/.taskmaster/tasks/tasks.json)
   - PRD: [`.taskmaster/docs/prd.txt`](/Users/jl/Developer/ptbiztools/.taskmaster/docs/prd.txt)
3. Keep the rescue/orchestration skills visible for analysis.
   - [`.blackbox/skills/project-rescue-orchestrator/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/project-rescue-orchestrator/SKILL.md)
   - [`.blackbox/skills/post-rescue-validation/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/post-rescue-validation/SKILL.md)

### P2 - Danny Integration Chain

1. Integrate Danny UI with the production backend.
   - [`ptbiztools-next/src/components/danny/DannyCloserCallGrader.tsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyCloserCallGrader.tsx)
   - [`ptbiztools-next/src/lib/ptbiz-api.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/lib/ptbiz-api.ts)
   - [`ptbiztools-backend/src/routes/dannyTools.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/src/routes/dannyTools.ts)
2. Fix Danny PDF and API issues.
   - [`ptbiztools-next/src/components/danny/DannyFinancialAudit.jsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyFinancialAudit.jsx)
   - [`ptbiztools-next/src/components/danny/DannyCompensationCalculator.jsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyCompensationCalculator.jsx)
   - [`ptbiztools-next/src/utils/pdfGenerator.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/utils/pdfGenerator.ts)
   - [`ptbiztools-next/src/utils/salesCallPdf.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/utils/salesCallPdf.ts)
3. Standardize UI across the 4 tools.
   - [`ptbiztools-next/src/constants/tool-badges.ts`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/constants/tool-badges.ts)
   - [`ptbiztools-next/src/styles/tool-page.css`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/styles/tool-page.css)
   - [`ptbiztools-next/src/styles/dashboard.css`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/styles/dashboard.css)
   - [`ptbiztools-next/src/styles/discovery-call-grader.css`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/styles/discovery-call-grader.css)
4. Convert Danny JSX to TSX.
   - [`ptbiztools-next/src/components/danny/DannyFinancialAudit.jsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyFinancialAudit.jsx)
   - [`ptbiztools-next/src/components/danny/DannyCompensationCalculator.jsx`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/DannyCompensationCalculator.jsx)
5. Consolidate Danny CSS and finish lint cleanup.
   - [`ptbiztools-next/src/styles/danny-tools.css`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/styles/danny-tools.css)
   - [`ptbiztools-next/src/components/danny/danny-theme.css`](/Users/jl/Developer/ptbiztools/ptbiztools-next/src/components/danny/danny-theme.css)

### P3 - Workspace Hygiene

1. Keep only truly generated files hidden.
   - `.next`
   - `.swc`
   - `node_modules`
   - `dist`
   - `.vercel/output`
2. Reassess clutter files after recovery is complete.
   - `.DS_Store`
   - `.blackbox/tmp`
   - `logs`
   - `videos`
3. Revisit whether any local-only tooling should be documented in the main README once the project is stable.

## Current Understanding

- The repo is not just “messy”; it contains real workflow state that should stay visible.
- The current work is centered on the Danny grading / audit chain and the UI standardization path.
- Production risk is dominated by environment secrets and deployment config, not by the hidden workflow folders.

## Recommended Next Execution Order

1. Verify and rotate secrets if needed.
2. Confirm editor visibility rules and deployment config visibility.
3. Work Task 6 and Task 7 together as one production area.
4. Do Task 8 UI standardization after the Danny backend/UI bridge is stable.
5. Finish Task 9 and Task 10 once the UI architecture settles.

