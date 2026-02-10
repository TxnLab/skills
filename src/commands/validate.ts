import { join } from 'node:path'
import { existsSync } from 'node:fs'
import chalk from 'chalk'
import { discoverSkills, getSkillsDir } from '../skills.ts'
import { validateSkill } from '../validator.ts'

export function validateCommand(skillName?: string): void {
  const skillsDir = getSkillsDir()

  if (skillName) {
    const skillDir = join(skillsDir, skillName)
    const skillMdPath = join(skillDir, 'SKILL.md')

    if (!existsSync(skillMdPath)) {
      console.error(chalk.red(`Skill "${skillName}" not found at ${skillDir}`))
      process.exit(1)
    }

    const result = validateSkill(skillMdPath, skillDir)
    printResult(skillName, result.valid, result.errors)

    if (!result.valid) {
      process.exit(1)
    }
    return
  }

  // Validate all skills
  const skills = discoverSkills(skillsDir)
  if (skills.length === 0) {
    console.log(chalk.yellow('No skills found to validate.'))
    return
  }

  let allValid = true

  console.log()
  console.log(chalk.bold('Validating skills...'))
  console.log()

  for (const skill of skills) {
    const result = validateSkill(skill.skillMdPath, skill.dirPath)
    printResult(skill.name, result.valid, result.errors)
    if (!result.valid) {
      allValid = false
    }
  }

  console.log()

  if (allValid) {
    console.log(chalk.green(`  All ${skills.length} skills passed validation.`))
  } else {
    console.error(chalk.red('  Some skills failed validation.'))
    process.exit(1)
  }

  console.log()
}

function printResult(
  name: string,
  valid: boolean,
  errors: { field: string; message: string }[],
): void {
  if (valid) {
    console.log(`  ${chalk.green('✔')} ${name}`)
  } else {
    console.log(`  ${chalk.red('✘')} ${name}`)
    for (const err of errors) {
      console.log(`    ${chalk.dim(err.field + ':')} ${err.message}`)
    }
  }
}
