import chalk from 'chalk'
import { discoverSkills } from '../skills.ts'
import { detectAgents, findAgent } from '../agents.ts'
import { uninstallSkill } from '../installer.ts'
import type { Agent } from '../types.ts'

export function removeCommand(
  skillNames: string[],
  options: {
    agent?: string[]
    global?: boolean
    local?: boolean
    all?: boolean
    yes?: boolean
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
        'Usage: txnlab-skills remove <skill-name...> or txnlab-skills remove --all',
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

  const isLocal = options.local === true

  for (const name of names) {
    for (const agent of targetAgents) {
      const result = uninstallSkill(name, agent, { local: isLocal })
      if (result.success) {
        console.log(
          `  ${chalk.green('✔')} Removed ${name} from ${agent.displayName} — ${result.targetPath}`,
        )
      } else {
        console.error(
          `  ${chalk.red('✘')} ${agent.displayName} — ${result.error}`,
        )
      }
    }
  }

  console.log()
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
