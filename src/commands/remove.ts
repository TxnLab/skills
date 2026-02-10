import chalk from 'chalk'
import { discoverSkills } from '../skills.ts'
import { resolveAgents } from '../agents.ts'
import { uninstallSkill } from '../installer.ts'
import { confirm } from '../prompt.ts'

export async function removeCommand(
  skillNames: string[],
  options: {
    agent?: string[]
    global?: boolean
    local?: boolean
    all?: boolean
    yes?: boolean
  },
): Promise<void> {
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

  if (!options.yes) {
    const skillList = names.join(', ')
    const agentList = targetAgents.map((a) => a.displayName).join(', ')
    const confirmed = await confirm(
      `Remove ${options.all ? 'all skills' : skillList} from ${agentList}?`,
    )
    if (!confirmed) {
      console.log(chalk.dim('Cancelled.'))
      return
    }
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
