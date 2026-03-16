# Rescue Implementation TODO

## Phase 1: Fix 2 Failing Tests (DannyCloserCallGrader.test.tsx)
- [ ] Fix "renders clinic icons" test (line 83) — set localStorage before render
- [ ] Fix "word count gate" test (line 118) — target textarea by placeholder
- [ ] Remove unused `rerender` destructuring

## Phase 2: Fix Webhook Route TODO (route.js)
- [ ] Differentiate invalid token vs server errors

## Phase 3: Fix Lint Warnings (25 → ~5)
- [ ] dashboard/page.tsx: remove unused ClinicSvgName, CLINIC_SVGS
- [ ] Mem0Example.tsx: prefix err with _err (×2)
- [ ] DannyCloserCallGrader.tsx: remove unused eslint-disable, CLINIC_SVGS, title, subtitle
- [ ] HistoryView.tsx: remove unused PassFail import
- [ ] PassFail.tsx: remove unused isPass, isUnknown
- [ ] ToolGrid.tsx: remove unused BarChart3, ScrollText, ClinicIcon, ClinicSvgName
- [ ] DiscoveryCallGrader.tsx: remove unused Download import
- [ ] plPdfGenerator.ts: remove unused loadImageDataUrl, safeText; prefix _bizPhase

## Phase 4: Add CI/CD Pipeline
- [ ] Create .github/workflows/ci.yml

## Phase 5: Sync Env Files
- [ ] Add ZOOM_ACCOUNT_ID to backend .env.example

## Phase 6: Prune Stale Branch
- [ ] Delete local blackboxai/deploy-104-untracked

## Phase 7: Update PROJECT_CONTEXT.md
- [ ] Update with rescue results and health score
