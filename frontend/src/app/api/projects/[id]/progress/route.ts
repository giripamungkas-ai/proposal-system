import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Retrieve progress entries for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = parseInt(params.id)
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
        requestedBy: true,
        progress: {
          include: {
            reportedBy: {
              select: { name: true, email: true }
            }
          },
          orderBy: { reportedAt: 'desc' }
        }
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

    // Calculate current progress percentage
    const latestProgress = project.progress[0]
    const currentProgress = latestProgress?.percentComplete || 0

    // Calculate progress trend
    const progressTrend = project.progress.slice(0, 5).reverse().map(p => ({
      date: p.reportedAt,
      percentage: p.percentComplete,
      entryType: p.entryType,
      description: p.description
    }))

    // Calculate average progress for similar projects
    const avgProgress = await prisma.progress.aggregate({
      where: {
        project: {
          templateKey: project.templateKey
        }
      },
      _avg: {
        percentComplete: true
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          status: project.status,
          templateKey: project.templateKey
        },
        progress: {
          current: currentProgress,
          entries: project.progress,
          trend: progressTrend,
          averageForTemplate: avgProgress._avg.percentComplete || 0
        },
        statistics: {
          totalEntries: project.progress.length,
          lastUpdated: latestProgress?.reportedAt,
          milestones: project.progress.filter(p => p.entryType === 'milestone').length,
          updates: project.progress.filter(p => p.entryType === 'update').length
        }
      },
      message: 'Progress data retrieved successfully'
    })

  } catch (error) {
    console.error('Progress retrieval error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve progress data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// POST: Create new progress entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = parseInt(params.id)
    const body = await request.json()
    const { entryType, description, percentComplete } = body

    if (!entryType || percentComplete === undefined) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields: entryType, percentComplete' },
        { status: 400 }
      )
    }

    // Validate values
    if (percentComplete < 0 || percentComplete > 100) {
      return NextResponse.json(
        { status: 'error', message: 'Percent complete must be between 0 and 100' },
        { status: 400 }
      )
    }

    const validEntryTypes = ['milestone', 'update', 'issue', 'risk', 'decision']
    if (!validEntryTypes.includes(entryType)) {
      return NextResponse.json(
        { status: 'error', message: `Invalid entry type. Must be one of: ${validEntryTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Project not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const userRole = session.user.role as string
    const userId = parseInt(session.user.id)

    // Sales can only update their own projects
    if (userRole === 'SALES' && project.requestedById !== userId) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user has permission to add progress
    const canUpdateProgress = ['ADMIN', 'PROJECT_MANAGER', 'SALES_MANAGER', 'BS_MANAGER', 'BUSINESS_SOLUTION'].includes(userRole)
    if (!canUpdateProgress) {
      return NextResponse.json(
        { status: 'error', message: 'Insufficient permissions to update progress' },
        { status: 403 }
      )
    }

    // Create progress entry
    const progressEntry = await prisma.progress.create({
      data: {
        projectId,
        entryType,
        description: description || '',
        percentComplete,
        reportedById: userId,
        reportedAt: new Date()
      },
      include: {
        reportedBy: {
          select: { name: true, email: true }
        }
      }
    })

    // Update project status based on progress
    let newStatus = project.status
    if (percentComplete === 100) {
      newStatus = 'PROPOSAL_FINALIZED'
    } else if (percentComplete >= 75 && project.status === 'BS_IN_PROGRESS') {
      newStatus = 'BS_PENDING_MANAGER_APPROVAL'
    }

    if (newStatus !== project.status) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: newStatus }
      })

      // Trigger notification for status change
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'PROJECT_STATUS_CHANGED',
            data: {
              projectName: project.projectName,
              newStatus,
              oldStatus: project.status,
              updatedBy: session.user.name
            },
            sendEmail: false
          })
        })
      } catch (notificationError) {
        console.error('Failed to trigger notification:', notificationError)
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'progress_updated',
        meta: JSON.stringify({
          projectId,
          entryType,
          percentComplete,
          description,
          previousStatus: project.status,
          newStatus
        }),
        projectId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        progressEntry,
        projectStatus: newStatus
      },
      message: 'Progress entry created successfully'
    })

  } catch (error) {
    console.error('Progress creation error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create progress entry',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// PUT: Update progress entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = parseInt(params.id)
    const body = await request.json()
    const { progressId, entryType, description, percentComplete } = body

    if (!progressId) {
      return NextResponse.json(
        { status: 'error', message: 'Progress ID is required' },
        { status: 400 }
      )
    }

    // Get existing progress entry
    const existingEntry = await prisma.progress.findUnique({
      where: { id: progressId },
      include: {
        project: {
          include: { requestedBy: true }
        },
        reportedBy: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { status: 'error', message: 'Progress entry not found' },
        { status: 404 }
      )
    }

    // Verify project access
    if (existingEntry.projectId !== projectId) {
      return NextResponse.json(
        { status: 'error', message: 'Progress entry does not belong to this project' },
        { status: 400 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const userId = parseInt(session.user.id)

    // Users can only update their own entries (except admins and project managers)
    if (userRole !== 'ADMIN' && userRole !== 'PROJECT_MANAGER' && existingEntry.reportedById !== userId) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Sales can only update their own projects
    if (userRole === 'SALES' && existingEntry.project.requestedById !== userId) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Update progress entry
    const updatedEntry = await prisma.progress.update({
      where: { id: progressId },
      data: {
        ...(entryType && { entryType }),
        ...(description !== undefined && { description }),
        ...(percentComplete !== undefined && { percentComplete })
      },
      include: {
        reportedBy: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      status: 'success',
      data: { progressEntry: updatedEntry },
      message: 'Progress entry updated successfully'
    })

  } catch (error) {
    console.error('Progress update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update progress entry',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE: Delete progress entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const progressId = parseInt(searchParams.get('progressId') as string)

    if (!progressId) {
      return NextResponse.json(
        { status: 'error', message: 'Progress ID is required' },
        { status: 400 }
      )
    }

    // Get existing progress entry
    const existingEntry = await prisma.progress.findUnique({
      where: { id: progressId },
      include: {
        project: {
          include: { requestedBy: true }
        },
        reportedBy: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { status: 'error', message: 'Progress entry not found' },
        { status: 404 }
      )
    }

    // Verify project access
    if (existingEntry.projectId !== projectId) {
      return NextResponse.json(
        { status: 'error', message: 'Progress entry does not belong to this project' },
        { status: 400 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const userId = parseInt(session.user.id)

    // Only admins and project managers can delete progress entries
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Insufficient permissions to delete progress entries' },
        { status: 403 }
      )
    }

    // Delete progress entry
    await prisma.progress.delete({
      where: { id: progressId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'progress_deleted',
        meta: JSON.stringify({
          projectId,
          progressId,
          deletedEntry: {
            entryType: existingEntry.entryType,
            percentComplete: existingEntry.percentComplete,
            description: existingEntry.description
          }
        }),
        projectId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: { deletedProgressId: progressId },
      message: 'Progress entry deleted successfully'
    })

  } catch (error) {
    console.error('Progress deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete progress entry',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
