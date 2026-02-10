import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { discoverSkills, parseSkillMd, findSkill } from '../src/skills.ts'

const tmpDir = join(import.meta.dir, '.tmp-skills')

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true })

  // Create test skills
  const skill1Dir = join(tmpDir, 'alpha')
  mkdirSync(skill1Dir, { recursive: true })
  writeFileSync(
    join(skill1Dir, 'SKILL.md'),
    '---\nname: alpha\ndescription: Alpha skill.\n---\n\n# Alpha\n\nContent.',
  )

  const skill2Dir = join(tmpDir, 'beta')
  mkdirSync(skill2Dir, { recursive: true })
  writeFileSync(
    join(skill2Dir, 'SKILL.md'),
    '---\nname: beta\ndescription: Beta skill.\nmetadata:\n  author: test\n---\n\n# Beta\n\nContent.',
  )

  // Create a directory without SKILL.md (should be ignored)
  const noSkillDir = join(tmpDir, 'not-a-skill')
  mkdirSync(noSkillDir, { recursive: true })
  writeFileSync(join(noSkillDir, 'README.md'), '# Not a skill')

  // Create a file (not directory) in skills dir (should be ignored)
  writeFileSync(join(tmpDir, 'stray-file.txt'), 'nothing')
})

afterAll(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true })
  }
})

describe('discoverSkills', () => {
  test('discovers skills sorted by name', () => {
    const skills = discoverSkills(tmpDir)
    expect(skills).toHaveLength(2)
    expect(skills[0]?.name).toBe('alpha')
    expect(skills[1]?.name).toBe('beta')
  })

  test('returns empty array for nonexistent dir', () => {
    const skills = discoverSkills('/nonexistent/path')
    expect(skills).toHaveLength(0)
  })

  test('ignores directories without SKILL.md', () => {
    const skills = discoverSkills(tmpDir)
    const names = skills.map((s) => s.name)
    expect(names).not.toContain('not-a-skill')
  })
})

describe('parseSkillMd', () => {
  test('parses frontmatter and body', () => {
    const skillMdPath = join(tmpDir, 'alpha', 'SKILL.md')
    const dirPath = join(tmpDir, 'alpha')
    const skill = parseSkillMd(skillMdPath, dirPath)
    expect(skill).not.toBeNull()
    expect(skill?.name).toBe('alpha')
    expect(skill?.description).toBe('Alpha skill.')
    expect(skill?.body).toContain('# Alpha')
  })

  test('parses metadata', () => {
    const skillMdPath = join(tmpDir, 'beta', 'SKILL.md')
    const dirPath = join(tmpDir, 'beta')
    const skill = parseSkillMd(skillMdPath, dirPath)
    expect(skill?.metadata).toEqual({ author: 'test' })
  })

  test('returns null for invalid file', () => {
    const result = parseSkillMd('/nonexistent/SKILL.md', '/nonexistent')
    expect(result).toBeNull()
  })
})

describe('findSkill', () => {
  test('finds skill by name', () => {
    const skill = findSkill('alpha', tmpDir)
    expect(skill).not.toBeUndefined()
    expect(skill?.name).toBe('alpha')
  })

  test('returns undefined for missing skill', () => {
    const skill = findSkill('nonexistent', tmpDir)
    expect(skill).toBeUndefined()
  })
})
