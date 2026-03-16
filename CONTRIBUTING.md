# Contributing to PT Biz Tools

Thank you for your interest in contributing to PT Biz Tools! We welcome contributions that improve the codebase, documentation, or user experience.

## Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/johnlicataptbiz/ptbiztools.git
cd ptbiztools
git remote add upstream https://github.com/johnlicataptbiz/ptbiztools.git
```

### 2. Setup Environment

Follow [docs/SETUP.md](docs/SETUP.md) completely before starting.

### 3. Branching Convention

```bash
# Feature branches
git checkout -b feature/your-feature-name

# Bug fixes
git checkout -b fix/issue-description

# Docs only
git checkout -b docs/update-guide
```

**Prefix `blackboxai/`** for AI-generated branches.

### 4. Development

```bash
# Backend
cd ptbiztools-backend
npm run dev

# Frontend (new terminal)
cd ../ptbiztools-next
npm run dev
```

Verify at http://localhost:3000

### 5. Testing

```bash
# Backend (25 tests)
cd ptbiztools-backend && npm test

# Frontend (7 tests)
cd ../ptbiztools-next && npm test -- --run

# Both lint + type check
npm run lint  # Frontend only
```

CI enforces 0 ESLint errors, max 10 warnings.

### 6. Commits

Conventional commits preferred:

```
feat: add new grading profile
fix: resolve upload progress bug
docs: update setup guide
chore: update dependencies
```

### 7. PR Checklist

- [ ] Local testing passes (`npm test`)
- [ ] TypeScript clean (`tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] Backend health endpoints work
- [ ] No secrets in commit
- [ ] Follows existing patterns
- [ ] Updated docs if needed

### 8. Push & PR

```bash
git push origin feature/your-feature
```

Create PR against `main` on GitHub. GitHub Actions will run full CI.

## Code Standards

### TypeScript

- No `any` types
- Explicit return types
- Zod for all validation

### Components

- Functional components only
- `"use client"` directive when needed
- PropTypes via TypeScript interfaces

### Styling

- Tailwind utilities first
- Custom CSS in `src/styles/` only
- Consistent spacing/motion patterns

### Backend Routes

- Express middleware pattern
- Zod validation for all inputs
- Structured error responses

## MCP Tool Usage

AI assistants have access to project-specific MCP servers:

- **21st.dev Magic**: UI refinement
- **Playwright**: E2E testing
- **Filesystem**: File ops
- **Prisma**: DB migrations
- **GitHub**: PR creation

## Releasing

Releases handled automatically:

- **Frontend**: Push to `main` → Vercel auto-deploy
- **Backend**: Push to `main` → Railway auto-deploy

## Support

Questions? Open an issue with:

- Repro steps
- Browser/Node versions
- Screenshots/logs

Happy contributing! 🎉
