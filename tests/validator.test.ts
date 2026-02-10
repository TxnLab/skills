import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateSkill } from '../src/validator.ts'

const tmpDir = join(import.meta.dir, '.tmp-validator')

function createSkillDir(
  name: string,
  frontmatter: string,
  body: string,
): { skillMdPath: string; dirPath: string } {
  const dirPath = join(tmpDir, name)
  mkdirSync(dirPath, { recursive: true })
  const skillMdPath = join(dirPath, 'SKILL.md')
  writeFileSync(skillMdPath, `---\n${frontmatter}---\n\n${body}`)
  return { skillMdPath, dirPath }
}

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true })
})

afterAll(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true })
  }
})

describe('validateSkill', () => {
  test('valid skill passes', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'my-skill',
      'name: my-skill\ndescription: A test skill.\n',
      '# My Skill\n\nInstructions here.',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('missing name fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'no-name',
      'description: A test skill.\n',
      '# Body content',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'name')).toBe(true)
  })

  test('missing description fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'no-desc',
      'name: no-desc\n',
      '# Body content',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'description')).toBe(true)
  })

  test('name with uppercase fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'BadName',
      'name: BadName\ndescription: A test skill.\n',
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'name')).toBe(true)
  })

  test('name with consecutive hyphens fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'bad--name',
      'name: bad--name\ndescription: A test skill.\n',
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.field === 'name' && e.message.includes('consecutive'),
      ),
    ).toBe(true)
  })

  test('name exceeding 64 chars fails', () => {
    const longName = 'a'.repeat(65)
    const { skillMdPath, dirPath } = createSkillDir(
      longName,
      `name: ${longName}\ndescription: A test skill.\n`,
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.field === 'name' && e.message.includes('1-64'),
      ),
    ).toBe(true)
  })

  test('description exceeding 1024 chars fails', () => {
    const longDesc = 'x'.repeat(1025)
    const { skillMdPath, dirPath } = createSkillDir(
      'long-desc',
      `name: long-desc\ndescription: "${longDesc}"\n`,
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'description')).toBe(true)
  })

  test('empty body fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'empty-body',
      'name: empty-body\ndescription: A test skill.\n',
      '',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'body')).toBe(true)
  })

  test('directory name mismatch fails', () => {
    const dirPath = join(tmpDir, 'wrong-dir')
    mkdirSync(dirPath, { recursive: true })
    const skillMdPath = join(dirPath, 'SKILL.md')
    writeFileSync(
      skillMdPath,
      '---\nname: correct-name\ndescription: A test skill.\n---\n\n# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.field === 'name' && e.message.includes('does not match'),
      ),
    ).toBe(true)
  })

  test('referenced file that does not exist fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'bad-ref',
      'name: bad-ref\ndescription: A test skill.\n',
      '# Body\n\nSee [guide](references/guide.md) for details.',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'references')).toBe(true)
  })

  test('referenced file that exists passes', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'good-ref',
      'name: good-ref\ndescription: A test skill.\n',
      '# Body\n\nSee [guide](references/guide.md) for details.',
    )
    const refsDir = join(dirPath, 'references')
    mkdirSync(refsDir, { recursive: true })
    writeFileSync(join(refsDir, 'guide.md'), '# Guide')
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(true)
  })

  test('valid metadata passes', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'with-meta',
      'name: with-meta\ndescription: A test skill.\nmetadata:\n  author: test\n  version: "1.0"\n',
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(true)
  })

  test('skill with hyphens in name passes', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      'my-cool-skill',
      'name: my-cool-skill\ndescription: A test skill.\n',
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(true)
  })

  test('name starting with hyphen fails', () => {
    const { skillMdPath, dirPath } = createSkillDir(
      '-bad',
      'name: -bad\ndescription: A test skill.\n',
      '# Body',
    )
    const result = validateSkill(skillMdPath, dirPath)
    expect(result.valid).toBe(false)
  })
})
