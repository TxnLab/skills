export interface Agent {
  name: string
  displayName: string
  globalSkillDir: string
  localSkillDir: string
  detect: () => boolean
}

export interface SkillFrontmatter {
  name: string
  description: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
}

export interface Skill {
  name: string
  description: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  body: string
  dirPath: string
  skillMdPath: string
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  skill?: Skill
}

export interface InstallResult {
  success: boolean
  skillName: string
  agent: Agent
  targetPath: string
  method: 'symlink' | 'copy'
  error?: string
}
