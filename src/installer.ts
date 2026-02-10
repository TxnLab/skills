import {
  existsSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  lstatSync,
  cpSync,
  readlinkSync,
  rmSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import type { Agent, InstallResult, Skill } from './types.ts'

export function installSkill(
  skill: Skill,
  agent: Agent,
  options: { local?: boolean } = {},
): InstallResult {
  const targetDir = options.local
    ? join(process.cwd(), agent.localSkillDir)
    : agent.globalSkillDir
  const targetPath = join(targetDir, skill.name)
  const sourcePath = resolve(skill.dirPath)

  try {
    // Create parent dir if needed
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    // Check if target already exists
    if (existsSync(targetPath)) {
      const stat = lstatSync(targetPath)
      if (stat.isSymbolicLink()) {
        // Replace existing symlink
        unlinkSync(targetPath)
      } else {
        return {
          success: false,
          skillName: skill.name,
          agent,
          targetPath,
          method: 'symlink',
          error: `Target path already exists and is not a symlink: ${targetPath}`,
        }
      }
    }

    // Try symlink first, fall back to copy
    try {
      symlinkSync(sourcePath, targetPath, 'dir')
      return {
        success: true,
        skillName: skill.name,
        agent,
        targetPath,
        method: 'symlink',
      }
    } catch {
      // Symlink failed (e.g., Windows without dev mode), fall back to copy
      cpSync(sourcePath, targetPath, { recursive: true })
      return {
        success: true,
        skillName: skill.name,
        agent,
        targetPath,
        method: 'copy',
      }
    }
  } catch (err) {
    return {
      success: false,
      skillName: skill.name,
      agent,
      targetPath,
      method: 'symlink',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function uninstallSkill(
  skillName: string,
  agent: Agent,
  options: { local?: boolean } = {},
): { success: boolean; targetPath: string; error?: string } {
  const targetDir = options.local
    ? join(process.cwd(), agent.localSkillDir)
    : agent.globalSkillDir
  const targetPath = join(targetDir, skillName)

  try {
    if (!existsSync(targetPath)) {
      return {
        success: false,
        targetPath,
        error: `Skill "${skillName}" is not installed at ${targetPath}`,
      }
    }

    const stat = lstatSync(targetPath)
    if (stat.isSymbolicLink()) {
      unlinkSync(targetPath)
    } else {
      rmSync(targetPath, { recursive: true })
    }

    return { success: true, targetPath }
  } catch (err) {
    return {
      success: false,
      targetPath,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function devLink(
  skill: Skill,
  agent: Agent,
  options: { force?: boolean } = {},
): InstallResult {
  const targetDir = agent.globalSkillDir
  const targetPath = join(targetDir, skill.name)
  const sourcePath = resolve(skill.dirPath)

  try {
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    if (existsSync(targetPath)) {
      const stat = lstatSync(targetPath)
      if (stat.isSymbolicLink()) {
        unlinkSync(targetPath)
      } else if (!options.force) {
        return {
          success: false,
          skillName: skill.name,
          agent,
          targetPath,
          method: 'symlink',
          error: `Target already exists and is not a symlink: ${targetPath}. Use --force to overwrite.`,
        }
      } else {
        rmSync(targetPath, { recursive: true })
      }
    }

    symlinkSync(sourcePath, targetPath, 'dir')
    return {
      success: true,
      skillName: skill.name,
      agent,
      targetPath,
      method: 'symlink',
    }
  } catch (err) {
    return {
      success: false,
      skillName: skill.name,
      agent,
      targetPath,
      method: 'symlink',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function devUnlink(
  skillName: string,
  agent: Agent,
): { success: boolean; targetPath: string; error?: string } {
  const targetPath = join(agent.globalSkillDir, skillName)

  try {
    if (!existsSync(targetPath)) {
      return {
        success: false,
        targetPath,
        error: `No skill linked at ${targetPath}`,
      }
    }

    const stat = lstatSync(targetPath)
    if (!stat.isSymbolicLink()) {
      return {
        success: false,
        targetPath,
        error: `${targetPath} is not a symlink (not managed by dev link)`,
      }
    }

    unlinkSync(targetPath)
    return { success: true, targetPath }
  } catch (err) {
    return {
      success: false,
      targetPath,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function isSymlinkTo(targetPath: string, sourcePath: string): boolean {
  try {
    const stat = lstatSync(targetPath)
    if (!stat.isSymbolicLink()) return false
    const linkTarget = readlinkSync(targetPath)
    return resolve(linkTarget) === resolve(sourcePath)
  } catch {
    return false
  }
}
