import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import matter from 'gray-matter'
import type { Skill } from './types.ts'

export function getSkillsDir(): string {
  // Resolve skills directory relative to the package root
  // When running from source: <repo>/skills/
  // When installed via npm: <package>/skills/
  const packageRoot = join(dirname(new URL(import.meta.url).pathname), '..')
  const skillsDir = join(packageRoot, 'skills')
  if (existsSync(skillsDir)) {
    return skillsDir
  }
  // Fallback: check CWD (for dev usage)
  const cwdSkills = join(process.cwd(), 'skills')
  if (existsSync(cwdSkills)) {
    return cwdSkills
  }
  throw new Error(
    'Could not find skills directory. Ensure you are running from the package root or have @txnlab/skills installed.',
  )
}

export function discoverSkills(skillsDir?: string): Skill[] {
  const dir = skillsDir ?? getSkillsDir()
  if (!existsSync(dir)) {
    return []
  }

  const entries = readdirSync(dir)
  const skills: Skill[] = []

  for (const entry of entries) {
    const entryPath = join(dir, entry)
    if (!statSync(entryPath).isDirectory()) continue

    const skillMdPath = join(entryPath, 'SKILL.md')
    if (!existsSync(skillMdPath)) continue

    const skill = parseSkillMd(skillMdPath, entryPath)
    if (skill) {
      skills.push(skill)
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

export function findSkill(name: string, skillsDir?: string): Skill | undefined {
  const skills = discoverSkills(skillsDir)
  return skills.find((s) => s.name === name)
}

export function parseSkillMd(
  skillMdPath: string,
  dirPath: string,
): Skill | null {
  try {
    const content = readFileSync(skillMdPath, 'utf-8')
    const { data, content: body } = matter(content)

    return {
      name: data.name ?? '',
      description: data.description ?? '',
      license: data.license,
      compatibility: data.compatibility,
      metadata: data.metadata,
      body: body.trim(),
      dirPath,
      skillMdPath,
    }
  } catch {
    return null
  }
}
