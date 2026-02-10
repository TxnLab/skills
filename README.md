# @txnlab/skills

[![npm version](https://img.shields.io/npm/v/@txnlab/skills)](https://www.npmjs.com/package/@txnlab/skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-spec-blueviolet)](https://agentskills.io/specification)

Agent skills for TxnLab's Algorand ecosystem.

## Overview

This repo serves two purposes:

1. **Skills collection** — curated, high-quality [Agent Skills](https://agentskills.io/specification) for TxnLab's Algorand projects (NFDomains, use-wallet, Haystack Router)
2. **CLI tool** — `@txnlab/skills`, an npm package for discovering, installing, and managing the skills in this repo

Skills are reusable instruction packages that extend AI coding agents (Claude Code, Codex, Cursor, etc.) with specialized knowledge about TxnLab's projects.

## Quick Start

```bash
npx @txnlab/skills add nfd
```

That's it. The `nfd` skill is now available to your AI agent. If no agent is auto-detected, specify one with `--agent`:

```bash
npx @txnlab/skills add nfd --agent claude-code
```

## Available Skills

| Skill             | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `nfd`             | Work with NFDomains, the Algorand Name Service for .algo domains |
| `use-wallet`      | Integrate Algorand wallet connections with @txnlab/use-wallet    |
| `haystack-router` | Route and execute optimal swaps on Algorand DEXes via Haystack   |
| `skill-creator`   | Guide for creating effective Agent Skills following the spec     |

## CLI Reference

### List skills

```bash
npx @txnlab/skills list
```

### Show skill details

```bash
npx @txnlab/skills info <skill-name>
```

### Install skills

```bash
npx @txnlab/skills add <skill-name>         # Install one skill
npx @txnlab/skills add nfd use-wallet       # Install multiple
npx @txnlab/skills add --all                # Install all skills
npx @txnlab/skills add nfd -a claude-code   # Target specific agent
npx @txnlab/skills add nfd --local          # Install to project-level directory
```

### Remove skills

```bash
npx @txnlab/skills remove <skill-name>
npx @txnlab/skills remove --all
npx @txnlab/skills remove nfd -a claude-code   # Target specific agent
npx @txnlab/skills remove nfd --local          # Remove from project-level directory
```

### Validate skills

```bash
npx @txnlab/skills validate                 # Validate all
npx @txnlab/skills validate <skill-name>    # Validate one
```

### Dev commands

```bash
npx @txnlab/skills dev link <skill-name>    # Symlink skill for local dev
npx @txnlab/skills dev link --all           # Symlink all skills
npx @txnlab/skills dev link nfd --force     # Overwrite existing non-symlink target
npx @txnlab/skills dev unlink --all         # Remove dev symlinks
```

### Flags

| Flag                  | Commands         | Description                            |
| --------------------- | ---------------- | -------------------------------------- |
| `-a, --agent <agent>` | add, remove, dev | Target specific agent (repeatable)     |
| `-g, --global`        | add, remove      | Use global skill directory (default)   |
| `-l, --local`         | add, remove      | Use project-level skill directory      |
| `--all`               | add, remove, dev | Apply to all skills                    |
| `--force`             | dev link         | Overwrite existing non-symlink targets |
| `-y, --yes`           | remove           | Skip confirmation prompts              |
| `-v, --version`       | (global)         | Show version                           |
| `-h, --help`          | (all)            | Show help                              |

## Installation

Requires Node.js >= 18.

### Via npx (recommended)

```bash
npx @txnlab/skills add <skill-name>
```

### Global install

```bash
npm install -g @txnlab/skills
txnlab-skills add <skill-name>
```

### Supported agents

The CLI auto-detects installed agents and installs skills to the appropriate directory:

| Agent       | Global path           | Local path          |
| ----------- | --------------------- | ------------------- |
| Claude Code | `~/.claude/skills/`   | `.claude/skills/`   |
| Codex       | `~/.codex/skills/`    | `.codex/skills/`    |
| Cursor      | `~/.cursor/skills/`   | `.cursor/skills/`   |
| OpenCode    | `~/.opencode/skills/` | `.opencode/skills/` |

If no agent is detected, use `--agent` to specify one manually.

## Local Development

```bash
# Clone the repo
git clone https://github.com/TxnLab/skills.git
cd skills

# Install dependencies
bun install

# Symlink all skills for testing ("bun run dev" runs the CLI from source)
bun run dev dev link --all

# Edit skills — changes are picked up immediately via symlinks

# Validate your work
bun run dev validate

# Run tests
bun test

# Clean up
bun run dev dev unlink --all
```

## Contributing

### Adding a new skill

1. Read `skills/skill-creator/SKILL.md` for the skill creation guide
2. Create a directory: `skills/<skill-name>/`
3. Write a `SKILL.md` with valid YAML frontmatter (`name` and `description` required)
4. Add optional `scripts/`, `references/`, and `assets/` directories as needed
5. Run `bun run validate` to check your skill passes validation
6. Submit a PR — CI will run validation automatically

### Requirements

- All skills must pass `txnlab-skills validate`
- The `name` field must match the directory name
- Descriptions should clearly state what the skill does and when to use it
- Follow [conventional commits](https://www.conventionalcommits.org/)

## Agent Skills Spec

This project follows the open [Agent Skills specification](https://agentskills.io/specification). Skills are portable across any agent that supports the spec.

## License

[MIT](LICENSE)
