# @txnlab/skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-spec-blueviolet)](https://agentskills.io/specification)

Curated [Agent Skills](https://agentskills.io/specification) for TxnLab's Algorand ecosystem. These skills extend AI coding agents with specialized knowledge about NFDomains, use-wallet, Haystack Router, and other TxnLab projects. Install them with the [Vercel Skills CLI](https://github.com/vercel-labs/skills) to make your agent an Algorand expert.

## Quick Start

```bash
# Install all TxnLab skills
npx skills add txnlab/skills

# Or install a specific skill
npx skills add txnlab/skills --skill nfd
```

## Available Skills

| Skill | Description | Install |
| --- | --- | --- |
| `nfd` | Work with NFDomains, the Algorand Name Service for .algo domains | `npx skills add txnlab/skills --skill nfd` |
| `use-wallet` | Integrate Algorand wallet connections with @txnlab/use-wallet | `npx skills add txnlab/skills --skill use-wallet` |
| `haystack-router` | Route and execute optimal swaps on Algorand DEXes via Haystack | `npx skills add txnlab/skills --skill haystack-router` |

## Usage

Skills are automatically available once installed. Your agent will use them when relevant tasks are detected. Try prompts like:

- "Resolve the .algo domain `txnlab.algo` to an Algorand address"
- "Add Pera and Defly wallet support to my React app using use-wallet"
- "Get the best swap quote for 100 ALGO to USDC using Haystack Router"

## Managing Skills

```bash
# List installed skills
npx skills list

# Preview available skills in this repo
npx skills add txnlab/skills --list

# Remove a skill
npx skills remove nfd
```

## Contributing

### Adding a new skill

1. Create a directory: `skills/<skill-name>/`
2. Write a `SKILL.md` with valid YAML frontmatter (`name` and `description` required)
3. Add optional `references/` and `assets/` directories as needed
4. Run `node scripts/validate.js` to check your skill
5. Submit a PR — CI will run validation automatically

### Requirements

- All skills must pass validation (`node scripts/validate.js`)
- The `name` field must match the directory name
- Descriptions should clearly state what the skill does and when to use it
- Follow [conventional commits](https://www.conventionalcommits.org/)

## Local Development

For contributors editing skills:

```bash
# Clone the repo
git clone https://github.com/TxnLab/skills.git
cd skills

# Symlink a skill to your agent's skill directory for testing
ln -s $(pwd)/skills/nfd ~/.claude/skills/nfd

# Edit skills — changes are picked up immediately via symlinks

# Validate your work
node scripts/validate.js

# Clean up when done
rm ~/.claude/skills/nfd
```

## License

[MIT](LICENSE)
