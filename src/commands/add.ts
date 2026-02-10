import chalk from 'chalk'
import { findSkill, discoverSkills } from '../skills.ts'
import { detectAgents, findAgent } from '../agents.ts'
import { installSkill } from '../installer.ts'
import type { Agent } from '../types.ts'

export function addCommand(
  skillNames: string[],
  options: {
    agent?: string[]
    global?: boolean
    local?: boolean
    all?: boolean
    yes?: boolean
  },
): void {
  // Resolve which skills to install
  let names = skillNames
  if (options.all) {
    const allSkills = discoverSkills()
    names = allSkills.map((s) => s.name)
  }

  if (names.length === 0) {
    console.error(chalk.red('No skills specified.'))
    console.error(
      chalk.dim(
        'Usage: txnlab-skills add <skill-name...> or txnlab-skills add --all',
      ),
    )
    process.exit(1)
  }

  // Resolve target agents
  const targetAgents = resolveAgents(options.agent)
  if (targetAgents.length === 0) {
    console.error(chalk.red('No agents detected.'))
    console.error(chalk.dim('Use --agent <name> to specify an agent manually.'))
    process.exit(1)
  }

  const isLocal = options.local === true

  for (const name of names) {
    const skill = findSkill(name)
    if (!skill) {
      console.error(chalk.red(`  Skill "${name}" not found, skipping.`))
      continue
    }

    console.log()
    console.log(`  ${chalk.bold('Installing:')} ${skill.name}`)
    console.log(`  ${chalk.dim('→')} ${skill.description}`)
    console.log()

    for (const agent of targetAgents) {
      const result = installSkill(skill, agent, { local: isLocal })
      if (result.success) {
        const method =
          result.method === 'copy' ? chalk.dim(' (copied)') : ''
        console.log(
          `  ${chalk.green('✔')} ${agent.displayName} — ${result.skillName} → ${result.targetPath}${method}`,
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

  const detected = detectAgents()
  if (detected.length > 0) {
    console.log(chalk.dim('  Detected agents:'))
    for (const a of detected) {
      console.log(`  ${chalk.green('✔')} ${a.displayName}`)
    }
    return detected
  }

  return []
}
