#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { listCommand } from './commands/list.ts'
import { infoCommand } from './commands/info.ts'
import { addCommand } from './commands/add.ts'
import { removeCommand } from './commands/remove.ts'
import { validateCommand } from './commands/validate.ts'
import { devLinkCommand, devUnlinkCommand } from './commands/dev.ts'

const packageJsonPath = join(
  dirname(new URL(import.meta.url).pathname),
  '..',
  'package.json',
)
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
  version: string
}

const program = new Command()

program
  .name('txnlab-skills')
  .description("Agent skills for TxnLab's Algorand ecosystem")
  .version(pkg.version, '-v, --version')

program
  .command('list')
  .description('List all available skills')
  .action(() => {
    listCommand()
  })

program
  .command('info')
  .description('Show detailed info about a skill')
  .argument('<skill-name>', 'Name of the skill')
  .action((skillName: string) => {
    infoCommand(skillName)
  })

program
  .command('add')
  .description('Install skill(s) to detected/specified agent(s)')
  .argument('[skill-names...]', 'Skills to install')
  .option('-a, --agent <agent>', 'Target agent (repeatable)', collect, [])
  .option('-g, --global', 'Install to global skill directory (default)', true)
  .option('-l, --local', 'Install to project-level skill directory')
  .option('--all', 'Install all skills')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action((skillNames: string[], options) => {
    addCommand(skillNames, options)
  })

program
  .command('remove')
  .description('Remove skill(s) from agent(s)')
  .argument('[skill-names...]', 'Skills to remove')
  .option('-a, --agent <agent>', 'Target agent (repeatable)', collect, [])
  .option('-g, --global', 'Remove from global skill directory (default)', true)
  .option('-l, --local', 'Remove from project-level skill directory')
  .option('--all', 'Remove all skills')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action((skillNames: string[], options) => {
    removeCommand(skillNames, options)
  })

program
  .command('validate')
  .description('Validate SKILL.md file(s) against the spec')
  .argument('[skill-name]', 'Skill to validate (validates all if omitted)')
  .action((skillName?: string) => {
    validateCommand(skillName)
  })

const dev = program
  .command('dev')
  .description('Development commands for local skill authoring')

dev
  .command('link')
  .description('Symlink skill(s) from repo for local development')
  .argument('[skill-names...]', 'Skills to link')
  .option('-a, --agent <agent>', 'Target agent (repeatable)', collect, [])
  .option('--all', 'Link all skills')
  .option('--force', 'Overwrite existing non-symlink targets')
  .action((skillNames: string[], options) => {
    devLinkCommand(skillNames, options)
  })

dev
  .command('unlink')
  .description('Remove dev symlinks')
  .argument('[skill-names...]', 'Skills to unlink')
  .option('-a, --agent <agent>', 'Target agent (repeatable)', collect, [])
  .option('--all', 'Unlink all skills')
  .action((skillNames: string[], options) => {
    devUnlinkCommand(skillNames, options)
  })

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value])
}

program.parse()
