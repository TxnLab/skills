import chalk from 'chalk'
import { findSkill } from '../skills.ts'
import { wrapText } from '../format.ts'

export function infoCommand(skillName: string): void {
  const skill = findSkill(skillName)

  if (!skill) {
    console.error(chalk.red(`Skill "${skillName}" not found.`))
    console.error(
      chalk.dim('Run "txnlab-skills list" to see available skills.'),
    )
    process.exit(1)
  }

  console.log()
  console.log(chalk.bold(skill.name))
  console.log()
  console.log(wrapText(skill.description, 2))
  console.log()

  if (skill.metadata) {
    for (const [key, value] of Object.entries(skill.metadata)) {
      console.log(`  ${chalk.dim(key + ':')} ${value}`)
    }
    console.log()
  }

  if (skill.license) {
    console.log(`  ${chalk.dim('License:')} ${skill.license}`)
  }

  if (skill.compatibility) {
    console.log(`  ${chalk.dim('Compatibility:')} ${skill.compatibility}`)
  }

  console.log(`  ${chalk.dim('Path:')} ${skill.dirPath}`)
  console.log()
}
