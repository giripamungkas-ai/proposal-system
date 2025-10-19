import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { stat } from 'fs/promises'
import { join } from 'path'

// Role-based folder permissions
const ROLE_PERMISSIONS = {
  SALES: ['attachments'],
  PRODUCT_OWNER: ['attachments', 'technical'],
  BUSINESS_SOLUTION: ['attachments', 'proposal'],
  BS_MANAGER: ['attachments', 'proposal', 'technical'],
  PROJECT_MANAGER: ['attachments', 'technical', 'proposal', 'bidding'],
  BIDDING_TEAM: ['attachments', 'bidding'],
  ADMIN: ['attachments', 'technical', 'proposal', 'bidding'],
  SALES_MANAGER: ['attachments', 'technical', 'proposal', 'bidding']
}

async function getFolderFiles(projectId: number, folder: string): Promise<any[]> {
  const basePath = join(process.cwd(), 'public', 'uploads', `PROJECT_${projectId}`, folder)

  if (!existsSync(basePath)) {
    return []
  }

  const files = await prisma.attachment.findMany({
    where: {
      projectId,
      filepath: {
        startsWith: `/uploads/PROJECT_${projectId}/${folder}/`
      }
    },
    include: {
      uploadedBy: {
        select: { name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Add file size info
  const filesWithSize = await Promise.all(
    files.map(async (file) => {
      const fullPath = join(process.cwd(), 'public', file.filepath)
      let fileSize = 0

      try {
        const stats = await stat(fullPath)
        fileSize = stats.size
      } catch (error) {
        console.warn(`File not found: ${fullPath}`)
      }

      return {
        id: file.id,
        filename: file.filename,
        originalName: file.filename,
        filepath: file.filepath,
        filetype: file.filetype,
        fileSize,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.createdAt,
        folder
      }
    })
  )

  return filesWithSize
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { project_id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = parseInt(params.project_id)
    if (isNaN(projectId)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid project ID' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requestedBy: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Project not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const userRole = session.user.role as string
    if (userRole === 'SALES' && project.requestedById !== parseInt(session.user.id)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get user's allowed folders
    const allowedFolders = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || []

    // Get files for each allowed folder
    const filesByFolder: Record<string, any[]> = {}
    let totalFiles = 0
    let totalSize = 0

    for (const folder of allowedFolders) {
      const files = await getFolderFiles(projectId, folder)
      filesByFolder[folder] = files.map(file => ({
        ...file,
        formattedSize: formatFileSize(file.fileSize),
        downloadUrl: `/api/files/download/${file.id}`
      }))

      totalFiles += files.length
      totalSize += files.reduce((sum, file) => sum + file.fileSize, 0)
    }

    // Get folder statistics
    const folderStats = Object.keys(filesByFolder).map(folder => ({
      folder,
      fileCount: filesByFolder[folder].length,
      totalSize: filesByFolder[folder].reduce((sum, file) => sum + file.fileSize, 0),
      formattedTotalSize: formatFileSize(
        filesByFolder[folder].reduce((sum, file) => sum + file.fileSize, 0)
      )
    }))

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          status: project.status,
          requestedBy: project.requestedBy.name
        },
        files: filesByFolder,
        statistics: {
          totalFiles,
          totalSize,
          formattedTotalSize: formatFileSize(totalSize),
          folderStats
        },
        permissions: {
          canUpload: allowedFolders.length > 0,
          allowedFolders,
          userRole
        }
      },
      message: 'Files retrieved successfully'
    })

  } catch (error) {
    console.error('File list error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve files',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { project_id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = parseInt(params.project_id)
    const { searchParams } = new URL(request.url)
    const fileId = parseInt(searchParams.get('fileId') as string)

    if (!fileId) {
      return NextResponse.json(
        { status: 'error', message: 'File ID is required' },
        { status: 400 }
      )
    }

    // Get file details
    const file = await prisma.attachment.findUnique({
      where: { id: fileId },
      include: {
        project: {
          include: { requestedBy: true }
        },
        uploadedBy: true
      }
    })

    if (!file) {
      return NextResponse.json(
        { status: 'error', message: 'File not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const userId = parseInt(session.user.id)

    // Users can only delete their own files (except admins)
    if (userRole !== 'ADMIN' && file.uploadedById !== userId) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Sales can only access their own projects
    if (userRole === 'SALES' && file.project.requestedById !== userId) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Extract folder from filepath
    const folder = file.filepath.split('/')[3]
    const allowedFolders = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || []

    if (!allowedFolders.includes(folder)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied for this folder' },
        { status: 403 }
      )
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), 'public', file.filepath)
    try {
      const fs = require('fs')
      if (existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      console.warn(`Failed to delete file: ${filePath}`, error)
    }

    // Delete file record from database
    await prisma.attachment.delete({
      where: { id: fileId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'file_deleted',
        meta: JSON.stringify({
          fileId,
          filename: file.filename,
          projectId,
          folder
        }),
        projectId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        deletedFile: {
          id: file.id,
          filename: file.filename
        }
      },
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
