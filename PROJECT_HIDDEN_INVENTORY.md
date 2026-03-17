# Project Hidden Inventory

Generated: 2026-03-17

## Purpose

This file maps hidden files and directories in the workspace into meaningful categories so they can be sorted without deleting anything prematurely.

## Categories

### 1. Active Work State

These files contain live tasking, PRDs, or session state that should remain visible in the editor.

- [`.taskmaster/config.json`](/Users/jl/Developer/ptbiztools/.taskmaster/config.json)
- [`.taskmaster/state.json`](/Users/jl/Developer/ptbiztools/.taskmaster/state.json)
- [`.taskmaster/tasks/tasks.json`](/Users/jl/Developer/ptbiztools/.taskmaster/tasks/tasks.json)
- [`.taskmaster/docs/prd.txt`](/Users/jl/Developer/ptbiztools/.taskmaster/docs/prd.txt)
- [`.taskmaster/templates/example_prd.txt`](/Users/jl/Developer/ptbiztools/.taskmaster/templates/example_prd.txt)
- [`.taskmaster/templates/example_prd_rpg.txt`](/Users/jl/Developer/ptbiztools/.taskmaster/templates/example_prd_rpg.txt)

### 2. Workflow Tooling

These are helper files for the editor, task commands, and rescue workflows.

- [`.cursor/mcp.json`](/Users/jl/Developer/ptbiztools/.cursor/mcp.json)
- [`.cursor/commands/tm/tm-main.md`](/Users/jl/Developer/ptbiztools/.cursor/commands/tm/tm-main.md)
- All Taskmaster command docs under [`.cursor/commands/tm/`](/Users/jl/Developer/ptbiztools/.cursor/commands/tm)
- [`.cursor/rules/taskmaster/dev_workflow.mdc`](/Users/jl/Developer/ptbiztools/.cursor/rules/taskmaster/dev_workflow.mdc)
- [`.cursor/rules/taskmaster/taskmaster.mdc`](/Users/jl/Developer/ptbiztools/.cursor/rules/taskmaster/taskmaster.mdc)
- [`.blackbox/README.md`](/Users/jl/Developer/ptbiztools/.blackbox/README.md)
- [`.blackbox/skills/git-deep-analysis/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/git-deep-analysis/SKILL.md)
- [`.blackbox/skills/multi-deployment-review/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/multi-deployment-review/SKILL.md)
- [`.blackbox/skills/project-discovery-onboarding/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/project-discovery-onboarding/SKILL.md)
- [`.blackbox/skills/project-folder-organizer/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/project-folder-organizer/SKILL.md)
- [`.blackbox/skills/project-rescue-orchestrator/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/project-rescue-orchestrator/SKILL.md)
- [`.blackbox/skills/post-rescue-validation/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/post-rescue-validation/SKILL.md)
- [`.blackbox/skills/project-dependency-enhancer/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/project-dependency-enhancer/SKILL.md)
- [`.blackbox/skills/project-ui-enhancer/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/project-ui-enhancer/SKILL.md)
- [`.blackbox/skills/scattered-code-refactor/SKILL.md`](/Users/jl/Developer/ptbiztools/.blackbox/skills/scattered-code-refactor/SKILL.md)

### 3. Deployment and Environment Config

These files affect production behavior and should not be hidden from the team.

- [`.env`](/Users/jl/Developer/ptbiztools/.env)
- [`.env.example`](/Users/jl/Developer/ptbiztools/.env.example)
- [`.vercel/project.json`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.vercel/project.json)
- [`.github/workflows/ci.yml`](/Users/jl/Developer/ptbiztools/.github/workflows/ci.yml)
- [`.github/workflows/deploy-frontend.yml`](/Users/jl/Developer/ptbiztools/.github/workflows/deploy-frontend.yml)
- [`.github/workflows/gemini-dispatch.yml`](/Users/jl/Developer/ptbiztools/.github/workflows/gemini-dispatch.yml)
- [`.github/workflows/gemini-invoke.yml`](/Users/jl/Developer/ptbiztools/.github/workflows/gemini-invoke.yml)
- [`.github/workflows/gemini-review.yml`](/Users/jl/Developer/ptbiztools/.github/workflows/gemini-review.yml)
- [`.github/workflows/gemini-scheduled-triage.yml`](/Users/jl/Developer/ptbiztools/.github/workflows/gemini-scheduled-triage.yml)
- [`ptbiztools-next/.env.local`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.env.local)
- [`ptbiztools-next/.env.example`](/Users/jl/Developer/ptbiztools/ptbiztools-next/.env.example)
- [`ptbiztools-next/vercel.json`](/Users/jl/Developer/ptbiztools/ptbiztools-next/vercel.json)
- [`ptbiztools-backend/.env`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/.env)
- [`ptbiztools-backend/.env.example`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/.env.example)
- [`ptbiztools-backend/Dockerfile`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/Dockerfile)
- [`ptbiztools-backend/railway.json`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/railway.json)
- [`ptbiztools-backend/.dockerignore`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/.dockerignore)
- [`ptbiztools-backend/.railwayignore`](/Users/jl/Developer/ptbiztools/ptbiztools-backend/.railwayignore)

### 4. Generated or Local-Only Noise

These should stay hidden in the editor and ignored by git when possible.

- `**/.DS_Store`
- `ptbiztools-next/.next`
- `ptbiztools-next/.swc`
- `ptbiztools-next/.vercel/output`
- `ptbiztools-next/node_modules`
- `ptbiztools-backend/dist`
- `ptbiztools-backend/node_modules`
- `ptbiztools-backend/node_modules/.prisma`
- `ptbiztools-backend/.force_rebuild`
- `.blackbox/tmp/*`
- `logs/*`
- `videos/*`

## Findings

1. The current workspace has real hidden state, not just clutter.
2. The tasking system lives in `.taskmaster` and is part of active work.
3. The rescue workflow lives in `.blackbox`, including the advanced recovery orchestration skill.
4. The editor config had been hiding important workflow folders; that was the main visibility problem.
5. The backend `.env` contains live secrets and should be treated as sensitive.
6. The Vercel output directory under `ptbiztools-next/.vercel/output` is generated build output and should not be confused with the Vercel project binding file `ptbiztools-next/.vercel/project.json`.

## Recommendations

1. Keep `.taskmaster`, `.blackbox`, `.cursor`, `.github`, and `.vercel/project.json` visible to the team.
2. Keep generated output hidden: `.next`, `.swc`, `node_modules`, `dist`, `.vercel/output`.
3. Treat `.env` files as sensitive local configuration, not clutter.
4. Rotate any secrets found in committed or shared `.env` files before broader cleanup work.
5. After analysis is complete, decide whether `.blackbox/tmp` should be ignored or archived separately.

## Next Analysis Targets

1. Root-level hidden files and whether they are safe to keep in the repo.
2. Whether `.taskmaster` should be documented in README/CONTRIBUTING as active workflow state.
3. Whether `.blackbox` should remain fully tracked or be split into active vs generated subfolders.
