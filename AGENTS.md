# Contributing Agent Instructions

Instructions for AI agents (Claude Code, Codex, Cursor, OpenCode) contributing to this repo.

## Repository Structure

- `skills/` — Agent skill directories, each containing a `SKILL.md` with YAML frontmatter and Markdown instructions
- `src/` — CLI source (TypeScript, built with Bun)
  - `src/cli.ts` — Entry point, command routing via Commander
  - `src/commands/` — Individual command implementations (list, add, remove, info, dev, validate)
  - `src/agents.ts` — Agent definitions, detection logic, install paths
  - `src/installer.ts` — Install/uninstall/symlink logic
  - `src/skills.ts` — Skill discovery and SKILL.md parsing (uses gray-matter)
  - `src/validator.ts` — SKILL.md validation against the Agent Skills spec
  - `src/types.ts` — Shared TypeScript types
- `tests/` — Tests using `bun:test`

## Build, Test, Lint

```bash
bun install             # Install dependencies (always use bun, never npm/yarn/pnpm)
bun run build           # Build CLI to dist/
bun test                # Run tests
bun run lint            # Check formatting (Prettier) and linting (ESLint)
bun run lint:fix        # Auto-fix
bun run validate        # Validate all SKILL.md files
```

## Skill Authoring

1. Read `skills/skill-creator/SKILL.md` for the skill creation process
2. Create a new directory under `skills/<skill-name>/`
3. Write a `SKILL.md` with valid YAML frontmatter (`name`, `description` required)
4. Run `bun run validate` to check your skill
5. Submit a PR — validation runs in CI

## Testing Conventions

- Test files: `tests/<module>.test.ts`
- Use `bun:test` (describe, test, expect)
- Tests should be self-contained — create temp dirs, clean up in afterAll
- Cover both happy paths and edge cases
