import chalk from 'chalk'
import { discoverSkills } from '../skills.ts'

export function listCommand(): void {
  const skills = discoverSkills()

  if (skills.length === 0) {
    console.log(chalk.yellow('No skills found.'))
    return
  }

  console.log()
  console.log(chalk.bold('Available skills:'))
  console.log()

  const maxNameLen = Math.max(...skills.map((s) => s.name.length))

  for (const skill of skills) {
    const name = chalk.cyan(skill.name.padEnd(maxNameLen + 2))
    console.log(`  ${name}${skill.description}`)
  }

  console.log()
  console.log(chalk.dim(`  Install: npx @txnlab/skills add <skill-name>`))
  console.log()
}
