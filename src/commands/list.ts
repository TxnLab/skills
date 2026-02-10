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
  const indent = 2
  const gap = 2
  const termWidth = process.stdout.columns || 80
  const maxDescLen = termWidth - indent - maxNameLen - gap

  for (const skill of skills) {
    const name = chalk.cyan(skill.name.padEnd(maxNameLen + gap))
    const desc = truncate(skill.description, maxDescLen)
    console.log(`  ${name}${desc}`)
  }

  console.log()
  console.log(chalk.dim(`  Details: npx @txnlab/skills info <skill-name>`))
  console.log(chalk.dim(`  Install: npx @txnlab/skills add <skill-name>`))
  console.log()
}

function truncate(text: string, maxLen: number): string {
  if (maxLen < 4) return text
  // Truncate at first sentence boundary (period followed by space) within maxLen
  const period = text.indexOf('. ')
  if (period >= 0 && period + 1 <= maxLen) {
    return text.slice(0, period + 1)
  }
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3).trimEnd() + '...'
}
