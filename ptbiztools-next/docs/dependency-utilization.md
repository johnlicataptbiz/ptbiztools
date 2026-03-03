# Dependency Utilization Audit (ptbiztools-next)

## Scope

Audit run against `ptbiztools-next/src` to identify direct import/use of declared dependencies.

## Findings

### Clearly integrated (direct usage found)

- `@ai-sdk/openai`
- `@electric-sql/pglite`
- `@tanstack/react-query`
- `ai`
- `framer-motion`
- `jspdf`
- `lucide-react`
- `next`
- `react`
- `sonner`
- `workflow`
- `zod`

### No direct source import match in `src` (likely transitive/runtime or pending usage)

- `@ai-sdk/react`
- `@workflow/ai`
- `react-dom`

## Interpretation

- `react-dom` is expected in a Next app and does not need direct imports in app code.
- `@ai-sdk/react` and `@workflow/ai` appear underutilized in current routes; they are candidates for:
  - removal if not needed, or
  - explicit integration in agent UI surfaces if intended for near-term features.

## Legacy-only dependencies not carried into Next

These exist in `ptbiztools-frontend` but not in `ptbiztools-next` (expected in migration):

- `react-router-dom`
- `recharts`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `react-confetti`
- `react-number-format`
- `use-sound`
- `@corex-ui/static`

## Recommendation

- Keep current set through active migration window.
- After feature freeze, remove `@ai-sdk/react` and `@workflow/ai` if agent surfaces still do not import them directly.
