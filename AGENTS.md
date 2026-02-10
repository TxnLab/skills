# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Project Overview

This is a documentation repository containing [Agent Skills](https://agentskills.io/specification) for TxnLab's Algorand ecosystem. Skills extend AI coding agents with specialized knowledge about NFDomains, use-wallet, and Haystack Router. There is no build step or compiled output — the deliverables are markdown files.

## Commands

```bash
# Validate all skills
node scripts/validate.js

# Validate a specific skill
node scripts/validate.js <skill-name>
```

There are no build, test, or lint commands. Validation is the only check.

## Architecture

Each skill lives in `skills/<skill-name>/` and follows the Agent Skills specification:

- **`SKILL.md`** — Entry point with YAML frontmatter (`name` and `description` required). The `name` field must match the directory name.
- **`references/`** — Detailed markdown guides for specific tasks (API usage, framework integration, etc.)
- **`assets/`** — Optional static assets (none currently used)

The validation script (`scripts/validate.js`) checks frontmatter structure using only Node.js built-ins (no dependencies). It parses YAML frontmatter manually and verifies required fields.

## Current Skills

| Skill | Package |
| --- | --- |
| `nfd` | `@txnlab/nfd-sdk` — Algorand Name Service (.algo domains) |
| `use-wallet` | `@txnlab/use-wallet` v4.x — Multi-framework wallet connections |
| `haystack-router` | `@txnlab/haystack-router` — DEX aggregator and swap routing |

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter containing `name` (matching directory) and `description`
2. Add `references/*.md` files for detailed task-specific documentation
3. Run `node scripts/validate.js` to verify
4. Use [conventional commits](https://www.conventionalcommits.org/)

## Local Testing

Symlink a skill directory to test with Claude Code directly:

```bash
ln -s $(pwd)/skills/nfd ~/.claude/skills/nfd
```
