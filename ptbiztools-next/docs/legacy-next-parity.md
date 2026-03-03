# Legacy vs Next Parity (Current)

## Status Summary

- Intro video flow: intentionally removed (`deprecated by design`)
- Legacy P&L advanced route: intentionally removed and replaced by Danny P&L (`deprecated by design`)
- Core business tools: migrated and active in Next

## Route Parity

- Legacy `/` (`Home`) -> Next `/dashboard`: feature parity on analytics and activity intent, updated UI shell.
- Legacy `/discovery-call-grader` -> Next `/discovery-call-grader`: migrated.
- Legacy `/pl-calculator` -> Next `/pl-calculator`: migrated to Danny financial audit tool.
- Legacy `/compensation-calculator` -> Next `/compensation-calculator`: migrated.
- Legacy `/sales-discovery-grader` -> Next `/sales-discovery-grader`: migrated with role gating.
- Legacy `/analyses` -> Next `/analyses`: migrated.
- Legacy login -> Next `/login`: legacy-style profile picker and setup flow restored.

## UX/Branding Parity Work Completed

- Restored legacy-style login layout, profile picker, selected-user card, and setup/sign-in forms.
- Applied PTBizCoach logo on login.
- Applied official PT Biz logo treatment in shared dialog/modal headers.
- Replaced custom/handmade PT logos in Danny P&L + Compensation tools with official PT Biz logo asset.
- Removed migration lab block from sidebar navigation.
- Updated shell label to PTBizCoach.

## Production Gating

- `/stack-lab` now returns 404 unless `NEXT_PUBLIC_ENABLE_STACK_LAB=true`.

## Remaining Optional Polish

- Fine-tune typography/spacing against specific legacy screenshots if exact visual match is required.
- Audit custom print/PDF templates for visual branding consistency.
