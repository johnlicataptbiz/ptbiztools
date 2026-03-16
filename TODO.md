# PT Biz Tools — TODO

> Last updated: 2026-03-16 | See `PROJECT_CONTEXT.md` for full rescue summary

---

## 🔴 HIGH Priority

### UI/UX Standardization (All 4 Tools)
- [ ] Standardize all tools to consistent "built-in modal" look (P&L calc = reference)
- [ ] **Rewrite `DiscoveryCallGrader.tsx`** — remove random UI boxes from failed agent attempts, 1081-line monolith needs decomposition
- [ ] Integrate tool badges/logos (`TOOL_BADGES` from `tool-badges.ts`) into all tool page headers
- [ ] Aggressively clean up inner sub-pages — cut and rewrite horrible UI additions
- [ ] Danny's Modal Integration per `ptbiztools-next/PLAN_DANNY_INTEGRATION.md`

### CI/CD
- [x] ~~Fix `deploy-frontend.yml`~~ — replaced `vercel/action-deploy@v1` → `amondnet/vercel-action@v25`
- [ ] Verify deploy-frontend.yml works on next push to main (needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets)

---

## 🟡 MEDIUM Priority

### Code Quality
- [ ] Convert `DannyFinancialAudit.jsx` → `.tsx`
- [ ] Convert `DannyCompensationCalculator.jsx` → `.tsx`
- [ ] ESLint cleanup — CI enforces `--max-warnings 10`
- [ ] Consolidate dual CSS: `danny-tools.css` (460 lines) + `danny-theme.css` (680 lines)

### Asset Management
- [ ] Audit 40+ images in `ptbiztools-next/public/assets/` — verify usage, remove unused
- [ ] Review `_backup_ui_enhancer_20260315/` backup dir — delete if no longer needed

### Documentation
- [x] ~~Delete `PROJECT_DISCOVERY_REPORT.md`~~ (superseded by PROJECT_CONTEXT.md)
- [x] ~~Delete `ptbiztools-next/TODO_LOGIN_REDESIGN.md`~~ (work completed)
- [ ] Review `ptbiztools-next/implementation_plan.md` — archive or delete
- [ ] Review `ptbiztools-next/docs/` — update or prune stale docs (migration-status.md, repo-state.md)

---

## 🟢 LOW Priority

- [ ] Gemini workflow review (5 workflows in `.github/workflows/gemini-*.yml`)
- [ ] Architecture diagram generation
- [ ] Prisma upgrade evaluation (5.22.0 → latest)
- [ ] Push HEAD to origin — `git push origin main` (1 commit ahead + pending changes)

---

## ✅ Completed (Recent)

- [x] Root clutter cleanup — 20+ files → 9 root files
- [x] `.gitignore` updated with 30+ AI tool config dirs
- [x] Binary cleanup — removed 6MB intro videos
- [x] Login page redesign with branded CSS
- [x] Full rescue analysis — PROJECT_CONTEXT.md updated
- [x] deploy-frontend.yml fixed
- [x] Stale docs deleted (PROJECT_DISCOVERY_REPORT.md, TODO_LOGIN_REDESIGN.md)
