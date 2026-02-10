import chalk from 'chalk'
import { discoverSkills, findSkill } from '../skills.ts'
import { detectAgents, findAgent } from '../agents.ts'
import { devLink, devUnlink } from '../installer.ts'
import type { Agent } from '../types.ts'

export function devLinkCommand(
  skillNames: string[],
  options: {
    agent?: string[]
    all?: boolean
    force?: boolean
  },
): void {
  let names = skillNames
  if (options.all) {
    const allSkills = discoverSkills()
    names = allSkills.map((s) => s.name)
  }

  if (names.length === 0) {
    console.error(chalk.red('No skills specified.'))
    console.error(
      chalk.dim(
        'Usage: txnlab-skills dev link <skill-name...> or txnlab-skills dev link --all',
      ),
    )
    process.exit(1)
  }

  const targetAgents = resolveAgents(options.agent)
  if (targetAgents.length === 0) {
    console.error(chalk.red('No agents detected.'))
    console.error(chalk.dim('Use --agent <name> to specify an agent manually.'))
    process.exit(1)
  }

  for (const name of names) {
    const skill = findSkill(name)
    if (!skill) {
      console.error(chalk.red(`  Skill "${name}" not found, skipping.`))
      continue
    }

    for (const agent of targetAgents) {
      const result = devLink(skill, agent, { force: options.force })
      if (result.success) {
        console.log(
          `  ${chalk.green('Linked:')} ${skill.dirPath} → ${result.targetPath}`,
        )
      } else {
        console.error(`  ${chalk.red('Error:')} ${result.error}`)
      }
    }
  }
}

export function devUnlinkCommand(
  skillNames: string[],
  options: {
    agent?: string[]
    all?: boolean
  },
): void {
  let names = skillNames
  if (options.all) {
    const allSkills = discoverSkills()
    names = allSkills.map((s) => s.name)
  }

  if (names.length === 0) {
    console.error(chalk.red('No skills specified.'))
    console.error(
      chalk.dim(
        'Usage: txnlab-skills dev unlink <skill-name...> or txnlab-skills dev unlink --all',
      ),
    )
    process.exit(1)
  }

  const targetAgents = resolveAgents(options.agent)
  if (targetAgents.length === 0) {
    console.error(chalk.red('No agents detected.'))
    console.error(chalk.dim('Use --agent <name> to specify an agent manually.'))
    process.exit(1)
  }

  for (const name of names) {
    for (const agent of targetAgents) {
      const result = devUnlink(name, agent)
      if (result.success) {
        console.log(`  ${chalk.green('Unlinked:')} ${result.targetPath}`)
      } else {
        console.error(`  ${chalk.red('Error:')} ${result.error}`)
      }
    }
  }
}

function resolveAgents(agentNames?: string[]): Agent[] {
  if (agentNames && agentNames.length > 0) {
    const resolved: Agent[] = []
    for (const name of agentNames) {
      const agent = findAgent(name)
      if (agent) {
        resolved.push(agent)
      } else {
        console.warn(chalk.yellow(`  Unknown agent: "${name}"`))
      }
    }
    return resolved
  }

  return detectAgents()
}
