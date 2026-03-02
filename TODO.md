# PT Biz Tools - TODO

## Active Sprint

### 1. Logo Size
- [x] Increase `.sidebar-logo .logo-img` in `Layout.css` (160px→210px wide, 36px→52px tall)
- [x] Update mobile responsive logo height

### 2. Activity Log - Show WHO it is (user avatar/photo)
- [x] Backend: `actionLog.ts` GET `/` — include user relation (name, imageUrl)
- [x] Backend: `analytics.ts` admin-summary — add imageUrl to actions user select
- [x] Frontend: `api.ts` — add imageUrl to UsageUserLite, update AdminRecentAction type
- [x] Frontend: `Home.tsx` — add userName/userImageUrl to ActivityFeedItem, update feed builders, render user avatar
- [x] Frontend: `Home.css` — add activity user avatar styles

### 3. Vercel INP Issue
- [x] `vercel.json` — add Cache-Control headers for static assets
- [ ] NOTE: The `body.hubspot-disable-focus-styles` INP warning is caused by the HubSpot browser extension, not app code. Disabling the extension eliminates the warning.
