#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, basename } from 'node:path'

const SKILLS_DIR = new URL('../skills', import.meta.url).pathname

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const yaml = match[1]
  const result = {}

  // Simple YAML parser for flat key-value pairs with multi-line string support
  let currentKey = null
  let currentValue = ''
  let isMultiline = false

  for (const line of yaml.split('\n')) {
    if (isMultiline) {
      if (/^\S/.test(line) && /^[\w-]+:/.test(line)) {
        // New key starts — save previous
        result[currentKey] = currentValue.trim()
        isMultiline = false
      } else {
        currentValue += ' ' + line.trim()
        continue
      }
    }

    const kvMatch = line.match(/^([\w-]+):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const value = kvMatch[2]

      if (value === '>' || value === '>-' || value === '|' || value === '|-') {
        // Multi-line scalar
        isMultiline = true
        currentValue = ''
      } else {
        result[currentKey] = value.replace(/^['"]|['"]$/g, '')
      }
    }
  }

  if (isMultiline && currentKey) {
    result[currentKey] = currentValue.trim()
  }

  return result
}

async function getSkillDirs() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

async function validateSkill(dirName) {
  const errors = []
  const skillMdPath = join(SKILLS_DIR, dirName, 'SKILL.md')

  try {
    await stat(skillMdPath)
  } catch {
    errors.push(`Missing SKILL.md`)
    return errors
  }

  const content = await readFile(skillMdPath, 'utf-8')
  const frontmatter = parseFrontmatter(content)

  if (!frontmatter) {
    errors.push(`Missing or invalid YAML frontmatter (must be between --- delimiters)`)
    return errors
  }

  if (!frontmatter.name) {
    errors.push(`Missing required field: name`)
  } else if (frontmatter.name !== dirName) {
    errors.push(
      `name "${frontmatter.name}" does not match directory name "${dirName}"`,
    )
  }

  if (!frontmatter.description) {
    errors.push(`Missing required field: description`)
  } else if (frontmatter.description.trim().length === 0) {
    errors.push(`description must be non-empty`)
  }

  return errors
}

async function main() {
  const targetSkill = process.argv[2]
  let skillDirs

  if (targetSkill) {
    try {
      await stat(join(SKILLS_DIR, targetSkill))
      skillDirs = [targetSkill]
    } catch {
      console.error(`Error: skill "${targetSkill}" not found in skills/`)
      process.exit(1)
    }
  } else {
    skillDirs = await getSkillDirs()
  }

  if (skillDirs.length === 0) {
    console.error('No skills found in skills/')
    process.exit(1)
  }

  let hasErrors = false

  for (const dir of skillDirs) {
    const errors = await validateSkill(dir)

    if (errors.length > 0) {
      hasErrors = true
      console.error(`\n  ${dir}/SKILL.md`)
      for (const error of errors) {
        console.error(`    - ${error}`)
      }
    } else {
      console.log(`  ${dir} ... ok`)
    }
  }

  if (hasErrors) {
    console.error('\nValidation failed.')
    process.exit(1)
  } else {
    console.log(`\nAll ${skillDirs.length} skill(s) valid.`)
  }
}

main()
