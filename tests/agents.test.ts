import { describe, test, expect } from 'bun:test'
import { agents, findAgent, getAgentNames } from '../src/agents.ts'

describe('agents', () => {
  test('has claude-code agent defined', () => {
    const claude = agents.find((a) => a.name === 'claude-code')
    expect(claude).toBeDefined()
    expect(claude?.displayName).toBe('Claude Code')
    expect(claude?.globalSkillDir).toContain('.claude')
  })

  test('has codex agent defined', () => {
    const codex = agents.find((a) => a.name === 'codex')
    expect(codex).toBeDefined()
    expect(codex?.displayName).toBe('Codex')
  })

  test('has cursor agent defined', () => {
    const cursor = agents.find((a) => a.name === 'cursor')
    expect(cursor).toBeDefined()
  })

  test('has opencode agent defined', () => {
    const opencode = agents.find((a) => a.name === 'opencode')
    expect(opencode).toBeDefined()
  })
})

describe('findAgent', () => {
  test('finds agent by name', () => {
    const agent = findAgent('claude-code')
    expect(agent).toBeDefined()
    expect(agent?.name).toBe('claude-code')
  })

  test('returns undefined for unknown agent', () => {
    const agent = findAgent('unknown-agent')
    expect(agent).toBeUndefined()
  })
})

describe('getAgentNames', () => {
  test('returns all agent names', () => {
    const names = getAgentNames()
    expect(names).toContain('claude-code')
    expect(names).toContain('codex')
    expect(names).toContain('cursor')
    expect(names).toContain('opencode')
  })
})
