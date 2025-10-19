/**
 * File System Manager for MDMEDIA Strategic Proposal System
 * Implements proper folder hierarchy: /projects/PROJECT_<id>/{proposal,draft,final,technical_docs,po_details,bidding_docs,audit_logs}
 */

import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export interface FolderStructure {
  projectId: number
  projectCode: string
  folders: {
    root: string
    proposal: {
      draft: string
      final: string
      archive: string
    }
    technical_docs: string
    po_details: string
    bidding_docs: string
    audit_logs: string
    attachments: string
    temp: string
  }
}

export class FileSystemManager {
  private static instance: FileSystemManager
  private baseDir: string

  private constructor() {
    this.baseDir = process.env.NODE_ENV === 'production'
      ? '/app/data'
      : path.join(process.cwd(), 'public', 'data')
  }

  public static getInstance(): FileSystemManager {
    if (!FileSystemManager.instance) {
      FileSystemManager.instance = new FileSystemManager()
    }
    return FileSystemManager.instance
  }

  /**
   * Create proper folder structure for a project
   */
  async createProjectFolders(projectId: number, projectCode: string): Promise<FolderStructure> {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    const projectPath = path.join(this.baseDir, 'projects', projectFolder)

    // Ensure base directories exist
    await fs.mkdir(path.join(this.baseDir, 'projects'), { recursive: true })
    await fs.mkdir(projectPath, { recursive: true })

    // Create all required folders
    const folders: FolderStructure['folders'] = {
      root: projectPath,
      proposal: {
        draft: path.join(projectPath, 'proposal', 'draft'),
        final: path.join(projectPath, 'proposal', 'final'),
        archive: path.join(projectPath, 'proposal', 'archive')
      },
      technical_docs: path.join(projectPath, 'technical_docs'),
      po_details: path.join(projectPath, 'po_details'),
      bidding_docs: path.join(projectPath, 'bidding_docs'),
      audit_logs: path.join(projectPath, 'audit_logs'),
      attachments: path.join(projectPath, 'attachments'),
      temp: path.join(projectPath, 'temp')
    }

    // Create all directories
    const allPaths = [
      folders.proposal.draft,
      folders.proposal.final,
      folders.proposal.archive,
      folders.technical_docs,
      folders.po_details,
      folders.bidding_docs,
      folders.audit_logs,
      folders.attachments,
      folders.temp
    ]

    await Promise.all(allPaths.map(dir => fs.mkdir(dir, { recursive: true })))

    // Create .gitkeep files to preserve empty directories
    await Promise.all(allPaths.map(dir =>
      fs.writeFile(path.join(dir, '.gitkeep'), '', 'utf8')
    ))

    // Create project metadata file
    const metadata = {
      projectId,
      projectCode,
      createdAt: new Date().toISOString(),
      folderStructure: 'MDMEDIA v1.0',
      compliance: {
        folderFormat: 'PROJECT_<id>_<code>',
        departmentHierarchy: true,
        versionControl: true,
        auditLogging: true
      }
    }

    await fs.writeFile(
      path.join(projectPath, '.metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    )

    return {
      projectId,
      projectCode,
      folders
    }
  }

  /**
   * Get file path for proposal based on status
   */
  getProposalPath(projectId: number, projectCode: string, status: 'draft' | 'final' | 'archive' = 'draft'): string {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    const basePath = path.join(this.baseDir, 'projects', projectFolder, 'proposal', status)
    return basePath
  }

  /**
   * Get file path for technical documents
   */
  getTechnicalDocsPath(projectId: number, projectCode: string): string {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    return path.join(this.baseDir, 'projects', projectFolder, 'technical_docs')
  }

  /**
   * Get file path for PO details
   */
  getPODetailsPath(projectId: number, projectCode: string): string {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    return path.join(this.baseDir, 'projects', projectFolder, 'po_details')
  }

  /**
   * Get file path for bidding documents
   */
  getBiddingDocsPath(projectId: number, projectCode: string): string {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    return path.join(this.baseDir, 'projects', projectFolder, 'bidding_docs')
  }

  /**
   * Get file path for audit logs
   */
  getAuditLogsPath(projectId: number, projectCode: string): string {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    return path.join(this.baseDir, 'projects', projectFolder, 'audit_logs')
  }

  /**
   * Get file path for attachments
   */
  getAttachmentsPath(projectId: number, projectCode: string): string {
    const projectFolder = `PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}`
    return path.join(this.baseDir, 'projects', projectFolder, 'attachments')
  }

  /**
   * Save file to appropriate folder
   */
  async saveFile(
    projectId: number,
    projectCode: string,
    folderType: keyof FolderStructure['folders'],
    filename: string,
    content: Buffer | string,
    metadata?: Record<string, any>
  ): Promise<{ path: string; url: string }> {
    let targetPath: string

    switch (folderType) {
      case 'proposal':
        // Handle proposal subfolders
        if (metadata?.status) {
          targetPath = this.getProposalPath(projectId, projectCode, metadata.status)
        } else {
          targetPath = this.getProposalPath(projectId, projectCode, 'draft')
        }
        break
      case 'technical_docs':
        targetPath = this.getTechnicalDocsPath(projectId, projectCode)
        break
      case 'po_details':
        targetPath = this.getPODetailsPath(projectId, projectCode)
        break
      case 'bidding_docs':
        targetPath = this.getBiddingDocsPath(projectId, projectCode)
        break
      case 'audit_logs':
        targetPath = this.getAuditLogsPath(projectId, projectCode)
        break
      case 'attachments':
        targetPath = this.getAttachmentsPath(projectId, projectCode)
        break
      default:
        targetPath = this.getAttachmentsPath(projectId, projectCode)
    }

    // Create directory if it doesn't exist
    await fs.mkdir(targetPath, { recursive: true })

    // Save file
    const filePath = path.join(targetPath, filename)
    const fileContent = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
    await fs.writeFile(filePath, fileContent)

    // Save metadata if provided
    if (metadata) {
      const metadataPath = filePath + '.meta.json'
      await fs.writeFile(metadataPath, JSON.stringify({
        ...metadata,
        savedAt: new Date().toISOString(),
        projectId,
        projectCode
      }, null, 2), 'utf8')
    }

    // Generate URL for web access
    const url = `/data/projects/PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}/${folderType}/${filename}`

    return { path: filePath, url }
  }

  /**
   * Delete file from project folder
   */
  async deleteFile(projectId: number, projectCode: string, filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)

      // Delete metadata file if exists
      const metadataPath = filePath + '.meta.json'
      await fs.unlink(metadataPath).catch(() => {}) // Ignore if metadata doesn't exist
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error}`)
    }
  }

  /**
   * List files in a project folder
   */
  async listFiles(
    projectId: number,
    projectCode: string,
    folderType: keyof FolderStructure['folders']
  ): Promise<Array<{ name: string; path: string; url: string; metadata?: any }>> {
    let targetPath: string

    switch (folderType) {
      case 'proposal':
        targetPath = this.getProposalPath(projectId, projectCode, 'draft')
        break
      case 'technical_docs':
        targetPath = this.getTechnicalDocsPath(projectId, projectCode)
        break
      case 'po_details':
        targetPath = this.getPODetailsPath(projectId, projectCode)
        break
      case 'bidding_docs':
        targetPath = this.getBiddingDocsPath(projectId, projectCode)
        break
      case 'audit_logs':
        targetPath = this.getAuditLogsPath(projectId, projectCode)
        break
      case 'attachments':
        targetPath = this.getAttachmentsPath(projectId, projectCode)
        break
      default:
        targetPath = this.getAttachmentsPath(projectId, projectCode)
    }

    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true })

      return entries
        .filter(entry => !entry.isFile() || !entry.name.startsWith('.'))
        .map(entry => {
          const filePath = path.join(targetPath, entry.name)
          const metadataPath = filePath + '.meta.json'
          let metadata: any = null

          // Try to read metadata
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8')
            metadata = JSON.parse(metadataContent)
          } catch {
            // Metadata file doesn't exist or is invalid
          }

          return {
            name: entry.name,
            path: filePath,
            url: `/data/projects/PROJECT_${projectId}_${projectCode.replace(/[^a-zA-Z0-9]/g, '_')}/${folderType}/${entry.name}`,
            metadata
          }
        })
    } catch (error) {
      throw new Error(`Failed to list files in ${targetPath}: ${error}`)
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(projectId: number, projectCode: string, maxAge = 24 * 60 * 60 * 1000): Promise<void> {
    const tempPath = this.getAttachmentsPath(projectId, projectCode)

    try {
      const entries = await fs.readdir(tempPath, { withFileTypes: true })
      const now = Date.now()

      for (const entry of entries) {
        const filePath = path.join(tempPath, entry.name)

        if (entry.isFile()) {
          const stats = await fs.stat(filePath)
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath).catch(() => {})
          }
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup temp files: ${error}`)
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: number, projectCode: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      totalFiles: 0,
      proposalDraft: 0,
      proposalFinal: 0,
      technicalDocs: 0,
      poDetails: 0,
      biddingDocs: 0,
      auditLogs: 0,
      attachments: 0,
      totalSize: 0
    }

    const folderTypes: Array<keyof FolderStructure['folders']> = [
      'proposal', 'technical_docs', 'po_details', 'bidding_docs', 'audit_logs', 'attachments'
    ]

    for (const folderType of folderTypes) {
      try {
        const files = await this.listFiles(projectId, projectCode, folderType)
        stats[folderType] = files.length

        // Calculate total files and size
        for (const file of files) {
          if (file.name !== '.gitkeep') {
            stats.totalFiles++

            try {
              const fileStats = await fs.stat(file.path)
              stats.totalSize += fileStats.size
            } catch {
              // Skip if file doesn't exist
            }
          }
        }
      } catch (error) {
        stats[folderType] = 0
      }
    }

    return stats
  }

  /**
   * Archive old proposal files
   */
  async archiveProposals(projectId: number, projectCode: string, olderThanDays = 90): Promise<void> {
    const draftPath = this.getProposalPath(projectId, projectCode, 'draft')
    const archivePath = this.getProposalPath(projectId, projectCode, 'archive')
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    try {
      const files = await fs.readdir(draftPath, { withFileTypes: true })

      for (const file of files) {
        if (file.isFile() && !file.name.startsWith('.')) {
          const filePath = path.join(draftPath, file.name)
          const stats = await fs.stat(filePath)

          if (stats.mtime < cutoffDate) {
            const archiveFilePath = path.join(archivePath, file.name)
            await fs.rename(filePath, archiveFilePath)
          }
        }
      }
    } catch (error) {
      console.error(`Failed to archive proposals: ${error}`)
    }
  }

  /**
   * Validate folder structure compliance
   */
  async validateFolderStructure(projectId: number, projectCode: string): Promise<{
    compliant: boolean
    issues: string[]
    structure: FolderStructure
  }> {
    const issues: string[] = []
    const structure = await this.createProjectFolders(projectId, projectCode)

    // Check if all required folders exist
    const requiredFolders = [
      structure.folders.proposal.draft,
      structure.folders.proposal.final,
      structure.folders.technical_docs,
      structure.folders.po_details,
      structure.folders.bidding_docs,
      structure.folders.audit_logs,
      structure.folders.attachments
    ]

    for (const folder of requiredFolders) {
      try {
        await fs.access(folder)
      } catch {
        issues.push(`Missing required folder: ${folder}`)
      }
    }

    // Check if .metadata.json exists
    try {
      await fs.access(path.join(structure.folders.root, '.metadata.json'))
    } catch {
      issues.push('Missing project metadata file')
    }

    return {
      compliant: issues.length === 0,
      issues,
      structure
    }
  }
}

// Export singleton instance
export const fileSystemManager = FileSystemManager.getInstance()

// Export type for external use
export type { FolderStructure }
```

---

## 🔥 **STEP 2: Implement Kanban BS Solution Board**

### **Create Kanban Board Component**
