import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Agent } from './types.ts'

const home = homedir()

export const agents: Agent[] = [
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    globalSkillDir: join(home, '.claude', 'skills'),
    localSkillDir: join('.claude', 'skills'),
    detect: () => {
      return (
        existsSync(join(home, '.claude')) ||
        existsSync(join(home, '.claude.json'))
      )
    },
  },
  {
    name: 'codex',
    displayName: 'Codex',
    globalSkillDir: join(home, '.codex', 'skills'),
    localSkillDir: join('.codex', 'skills'),
    detect: () => {
      return existsSync(join(home, '.codex'))
    },
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    globalSkillDir: join(home, '.cursor', 'skills'),
    localSkillDir: join('.cursor', 'skills'),
    detect: () => {
      return existsSync(join(home, '.cursor'))
    },
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    globalSkillDir: join(home, '.opencode', 'skills'),
    localSkillDir: join('.opencode', 'skills'),
    detect: () => {
      return existsSync(join(home, '.opencode'))
    },
  },
]

export function detectAgents(): Agent[] {
  return agents.filter((agent) => agent.detect())
}

export function findAgent(name: string): Agent | undefined {
  return agents.find((a) => a.name === name)
}

export function getAgentNames(): string[] {
  return agents.map((a) => a.name)
}
