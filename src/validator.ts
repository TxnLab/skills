import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import type { ValidationError, ValidationResult } from './types.ts'
import { parseSkillMd } from './skills.ts'

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export function validateSkill(
  skillMdPath: string,
  dirPath: string,
): ValidationResult {
  const errors: ValidationError[] = []

  const skill = parseSkillMd(skillMdPath, dirPath)
  if (!skill) {
    errors.push({
      field: 'SKILL.md',
      message: 'Could not parse SKILL.md file',
    })
    return { valid: false, errors }
  }

  // name: required, 1-64 chars, lowercase alphanumeric + hyphens
  if (!skill.name) {
    errors.push({ field: 'name', message: 'Required field "name" is missing' })
  } else {
    if (skill.name.length > 64) {
      errors.push({
        field: 'name',
        message: `Name must be 1-64 characters, got ${skill.name.length}`,
      })
    }
    if (!NAME_REGEX.test(skill.name)) {
      errors.push({
        field: 'name',
        message:
          'Name must be lowercase alphanumeric with hyphens, no leading/trailing/consecutive hyphens',
      })
    }
    if (skill.name.includes('--')) {
      errors.push({
        field: 'name',
        message: 'Name must not contain consecutive hyphens',
      })
    }
    // Directory name must match
    const dirName = basename(dirPath)
    if (skill.name !== dirName) {
      errors.push({
        field: 'name',
        message: `Name "${skill.name}" does not match directory name "${dirName}"`,
      })
    }
  }

  // description: required, 1-1024 chars
  if (!skill.description) {
    errors.push({
      field: 'description',
      message: 'Required field "description" is missing',
    })
  } else if (skill.description.length > 1024) {
    errors.push({
      field: 'description',
      message: `Description must be 1-1024 characters, got ${skill.description.length}`,
    })
  }

  // license: if present, must be a string
  if (skill.license !== undefined && typeof skill.license !== 'string') {
    errors.push({
      field: 'license',
      message: 'License must be a string',
    })
  }

  // compatibility: if present, 1-500 chars
  if (skill.compatibility !== undefined) {
    if (typeof skill.compatibility !== 'string') {
      errors.push({
        field: 'compatibility',
        message: 'Compatibility must be a string',
      })
    } else if (skill.compatibility.length > 500) {
      errors.push({
        field: 'compatibility',
        message: `Compatibility must be 1-500 characters, got ${skill.compatibility.length}`,
      })
    }
  }

  // metadata: if present, must be key-value map of strings
  if (skill.metadata !== undefined) {
    if (typeof skill.metadata !== 'object' || Array.isArray(skill.metadata)) {
      errors.push({
        field: 'metadata',
        message: 'Metadata must be a key-value map',
      })
    } else {
      for (const [key, value] of Object.entries(skill.metadata)) {
        if (typeof value !== 'string') {
          errors.push({
            field: 'metadata',
            message: `Metadata value for key "${key}" must be a string`,
          })
        }
      }
    }
  }

  // Body must exist
  if (!skill.body || skill.body.trim().length === 0) {
    errors.push({
      field: 'body',
      message: 'SKILL.md body must contain content after frontmatter',
    })
  }

  // Check referenced files exist
  const fileRefs = extractFileReferences(skill.body)
  for (const ref of fileRefs) {
    const refPath = `${dirPath}/${ref}`
    if (!existsSync(refPath)) {
      errors.push({
        field: 'references',
        message: `Referenced file "${ref}" does not exist at ${refPath}`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    skill,
  }
}

function extractFileReferences(body: string): string[] {
  // Strip fenced code blocks and inline code before extracting links
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')

  const refs: string[] = []
  // Match markdown links to local files: [text](path)
  // Exclude URLs (http://, https://, mailto:, #)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = linkRegex.exec(stripped)) !== null) {
    const href = match[2]
    if (
      href &&
      !href.startsWith('http://') &&
      !href.startsWith('https://') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('#')
    ) {
      refs.push(href)
    }
  }
  return refs
}
