import { describe, test, expect, beforeEach, afterAll } from 'bun:test'
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  lstatSync,
  readlinkSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import {
  installSkill,
  uninstallSkill,
  devLink,
  devUnlink,
} from '../src/installer.ts'
import type { Agent, Skill } from '../src/types.ts'

const tmpDir = join(import.meta.dir, '.tmp-installer')
const skillSourceDir = join(tmpDir, 'source', 'my-skill')
const agentSkillsDir = join(tmpDir, 'agent-skills')

const mockAgent: Agent = {
  name: 'test-agent',
  displayName: 'Test Agent',
  globalSkillDir: agentSkillsDir,
  localSkillDir: join('.test-agent', 'skills'),
  detect: () => true,
}

const mockSkill: Skill = {
  name: 'my-skill',
  description: 'Test skill',
  body: '# Test',
  dirPath: skillSourceDir,
  skillMdPath: join(skillSourceDir, 'SKILL.md'),
}

beforeEach(() => {
  // Clean and recreate
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true })
  }
  mkdirSync(skillSourceDir, { recursive: true })
  writeFileSync(
    join(skillSourceDir, 'SKILL.md'),
    '---\nname: my-skill\ndescription: Test skill\n---\n\n# Test',
  )
})

afterAll(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true })
  }
})

describe('installSkill', () => {
  test('creates symlink to skill directory', () => {
    const result = installSkill(mockSkill, mockAgent)
    expect(result.success).toBe(true)
    expect(result.method).toBe('symlink')

    const targetPath = join(agentSkillsDir, 'my-skill')
    expect(existsSync(targetPath)).toBe(true)
    expect(lstatSync(targetPath).isSymbolicLink()).toBe(true)
  })

  test('creates parent directory if needed', () => {
    expect(existsSync(agentSkillsDir)).toBe(false)
    const result = installSkill(mockSkill, mockAgent)
    expect(result.success).toBe(true)
    expect(existsSync(agentSkillsDir)).toBe(true)
  })

  test('replaces existing symlink', () => {
    installSkill(mockSkill, mockAgent)
    const result = installSkill(mockSkill, mockAgent)
    expect(result.success).toBe(true)
  })

  test('fails if target is a regular directory', () => {
    const targetPath = join(agentSkillsDir, 'my-skill')
    mkdirSync(targetPath, { recursive: true })
    writeFileSync(join(targetPath, 'file.txt'), 'existing')

    const result = installSkill(mockSkill, mockAgent)
    expect(result.success).toBe(false)
    expect(result.error).toContain('not a symlink')
  })
})

describe('uninstallSkill', () => {
  test('removes symlinked skill', () => {
    installSkill(mockSkill, mockAgent)
    const result = uninstallSkill('my-skill', mockAgent)
    expect(result.success).toBe(true)

    const targetPath = join(agentSkillsDir, 'my-skill')
    expect(existsSync(targetPath)).toBe(false)
  })

  test('fails for nonexistent skill', () => {
    mkdirSync(agentSkillsDir, { recursive: true })
    const result = uninstallSkill('nonexistent', mockAgent)
    expect(result.success).toBe(false)
    expect(result.error).toContain('not installed')
  })
})

describe('devLink', () => {
  test('creates symlink for dev usage', () => {
    const result = devLink(mockSkill, mockAgent)
    expect(result.success).toBe(true)

    const targetPath = join(agentSkillsDir, 'my-skill')
    expect(lstatSync(targetPath).isSymbolicLink()).toBe(true)
    expect(resolve(readlinkSync(targetPath))).toBe(resolve(skillSourceDir))
  })

  test('fails on non-symlink without --force', () => {
    const targetPath = join(agentSkillsDir, 'my-skill')
    mkdirSync(targetPath, { recursive: true })
    writeFileSync(join(targetPath, 'file.txt'), 'existing')

    const result = devLink(mockSkill, mockAgent)
    expect(result.success).toBe(false)
    expect(result.error).toContain('--force')
  })

  test('overwrites non-symlink with --force', () => {
    const targetPath = join(agentSkillsDir, 'my-skill')
    mkdirSync(targetPath, { recursive: true })
    writeFileSync(join(targetPath, 'file.txt'), 'existing')

    const result = devLink(mockSkill, mockAgent, { force: true })
    expect(result.success).toBe(true)
    expect(lstatSync(targetPath).isSymbolicLink()).toBe(true)
  })
})

describe('devUnlink', () => {
  test('removes symlink', () => {
    devLink(mockSkill, mockAgent)
    const result = devUnlink('my-skill', mockAgent)
    expect(result.success).toBe(true)
  })

  test('fails for non-symlink', () => {
    const targetPath = join(agentSkillsDir, 'my-skill')
    mkdirSync(targetPath, { recursive: true })
    writeFileSync(join(targetPath, 'file.txt'), 'existing')

    const result = devUnlink('my-skill', mockAgent)
    expect(result.success).toBe(false)
    expect(result.error).toContain('not a symlink')
  })

  test('fails for nonexistent path', () => {
    mkdirSync(agentSkillsDir, { recursive: true })
    const result = devUnlink('nonexistent', mockAgent)
    expect(result.success).toBe(false)
  })
})
