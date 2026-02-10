# @txnlab/skills

Agent skills for TxnLab's Algorand ecosystem. This repo contains curated skills and a CLI for installing them.

## Structure

- `skills/` — Agent skill directories (each with SKILL.md)
- `src/` — CLI source code
- `tests/` — Tests (bun:test)

## Commands

```bash
bun run build           # Build CLI to dist/
bun run dev             # Run CLI from source (e.g., bun run dev list)
bun test                # Run tests
bun run lint            # Check formatting and linting
bun run lint:fix        # Auto-fix formatting and linting
bun run validate        # Validate all SKILL.md files
```

## Conventions

- Always read `skills/skill-creator/SKILL.md` before writing new skills
- All skills must pass `txnlab-skills validate` before merging
- Use Prettier for formatting, ESLint for linting
- Tests use `bun:test`, test files go in `tests/`
- Commit messages follow conventional commits
- Bun is the only runtime — do not use npm/yarn/pnpm
