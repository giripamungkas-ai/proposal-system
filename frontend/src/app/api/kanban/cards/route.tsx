import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fileSystemManager } from '@/lib/file-system'

// Kanban Cards API endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions - BS team and related roles can access kanban
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BUSINESS_SOLUTION', 'BS_MANAGER', 'PROJECT_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')

    // Build where clause
    const where: any = {}
    if (projectId && projectId !== 'all') {
      where.id = parseInt(projectId)
    }
    if (status) {
      where.status = status
    }
    if (priority) {
      where.status = priority // Using status field for priority for now
    }
    if (assignedTo) {
      where.requestedById = parseInt(assignedTo)
    }

    // Get projects and transform to kanban cards
    const projects = await prisma.project.findMany({
      where,
      include: {
        requestedBy: {
          select: { name: true, email: true }
        },
        proposals: {
          include: {
            createdById: true
          }
        },
        attachments: true,
        progress: {
          orderBy: { reportedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform projects to kanban cards
    const kanbanCards = projects.map(project => {
      // Determine status based on project status
      let status: KanbanCard['status'] = 'backlog'
      if (project.status === 'DRAFT') status = 'backlog'
      else if (project.status === 'PENDING_SALES_MANAGER_APPROVAL') status = 'todo'
      else if (project.status === 'PENDING_PO_COMPLETION') status = 'todo'
      else if (project.status === 'PO_IN_PROGRESS') status = 'in_progress'
      else if (project.status === 'PENDING_BS_PROPOSAL') status = 'in_progress'
      else if (project.status === 'BS_IN_PROGRESS') status = 'in_progress'
      else if (project.status === 'BS_PENDING_MANAGER_APPROVAL') status = 'review'
      else if (project.status === 'PROPOSAL_FINALIZED') status = 'done'
      else if (project.status === 'CLOSED') status = 'done'
      else if (project.status === 'CANCELLED') status = 'archived'
      else if (project.status === 'ON_HOLD') status = 'archived'

      // Determine priority based on budget
      let priority: KanbanCard['priority'] = 'medium'
      if (project.budgetEstimate) {
        if (project.budgetEstimate > 1000000000) priority = 'critical'
        else if (project.budgetEstimate > 500000000) priority = 'high'
        else if (project.budgetEstimate > 100000000) priority = 'medium'
        else priority = 'low'
      }

      // Calculate progress
      const latestProgress = project.progress?.[0]
      const progress = latestProgress?.percentComplete || 0

      return {
        id: project.id.toString(),
        title: project.projectName,
        description: `${project.projectCode} - ${project.templateKey}`,
        status,
        priority,
        assignedTo: {
          id: project.requestedById.toString(),
          name: project.requestedBy?.name || 'Unknown',
          email: project.requestedBy?.email || 'unknown@mdmedia.id',
          avatar: `/avatars/user-${project.requestedById}.jpg`
        },
        projectId: project.id.toString(),
        projectCode: project.projectCode,
        dueDate: project.endDate?.toISOString(),
        progress,
        tags: [project.templateKey, project.status],
        attachments: project.attachments?.length || 0,
        comments: 0, // TODO: Implement comments
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        createdBy: project.requestedBy?.name || 'System',
        metadata: {
          budgetEstimate: project.budgetEstimate,
          startDate: project.startDate,
          endDate: project.endDate,
          proposals: project.proposals?.length || 0,
          lastProgress: latestProgress
        }
      }
    })

    // Group cards by status
    const groupedCards = kanbanCards.reduce((acc, card) => {
      if (!acc[card.status]) {
        acc[card.status] = []
      }
      acc[card.status].push(card)
      return acc
    }, {} as Record<string, KanbanCard[]>)

    return NextResponse.json({
      status: 'success',
      data: {
        cards: kanbanCards,
        grouped: groupedCards,
        total: kanbanCards.length,
        byStatus: Object.entries(groupedCards).reduce((acc, [status, cards]) => {
          acc[status] = cards.length
          return acc
        }, {} as Record<string, number>)
      },
      message: 'Kanban cards retrieved successfully'
    })

  } catch (error) {
    console.error('Kanban cards API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve kanban cards',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions - BS team and related roles can create cards
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BUSINESS_SOLUTION', 'BS_MANAGER', 'PROJECT_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      status = 'backlog',
      priority = 'medium',
      projectId,
      projectCode,
      assignedTo,
      dueDate,
      tags = [],
      attachments = []
    } = body

    if (!title || !projectId) {
      return NextResponse.json(
        { status: 'error', message: 'Title and project ID are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Project not found' },
        { status: 404 }
      )
    }

    // Update project status based on kanban card status
    let newStatus = project.status
    if (status === 'todo') newStatus = 'PENDING_SALES_MANAGER_APPROVAL'
    else if (status === 'in_progress') newStatus = 'BS_IN_PROGRESS'
    else if (status === 'review') newStatus = 'BS_PENDING_MANAGER_APPROVAL'
    else if (status === 'done') newStatus = 'PROPOSAL_FINALIZED'
    else if (status === 'archived') newStatus = 'CANCELLED'

    // Create kanban card (store as audit log for now)
    const kanbanCard = {
      title,
      description,
      status,
      priority,
      projectId,
      projectCode,
      assignedTo: assignedTo || project.requestedById.toString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      progress: 0,
      tags,
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.user.name
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id: parseInt(projectId) },
      data: { status: newStatus, updatedAt: new Date() }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'kanban_card_created',
        meta: JSON.stringify(kanbanCard),
        projectId: parseInt(projectId)
      }
    })

    // Create project folder structure if needed
    try {
      await fileSystemManager.createProjectFolders(parseInt(projectId), projectCode)
    } catch (error) {
      console.error('Failed to create project folders:', error)
    }

    // Send WebSocket notification
    try {
      const wsMessage = {
        type: 'card_created',
        data: {
          ...kanbanCard,
          id: project.id.toString(),
          projectId,
          projectCode
        }
      }

      // TODO: Implement WebSocket notification
      console.log('WebSocket message:', wsMessage)
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error)
    }

    return NextResponse.json({
      status: 'success',
      data: {
        card: {
          id: project.id.toString(),
          ...kanbanCard,
          projectId,
          projectCode
        },
        project: updatedProject
      },
      message: 'Kanban card created successfully'
    })

  } catch (error) {
    console.error('Kanban card creation error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create kanban card',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('id')
    const body = await request.json()

    if (!cardId) {
      return NextResponse.json(
        { status: 'error', message: 'Card ID is required' },
        { status: 400 }
      )
    }

    // Get project (using project ID as card ID)
    const project = await prisma.project.findUnique({
      where: { id: parseInt(cardId) },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Card not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BUSINESS_SOLUTION', 'BS_MANAGER', 'PROJECT_MANAGER']
    if (!allowedRoles.includes(userRole) && project.requestedById !== parseInt(session.user.id)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Update kanban card (project)
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.status) {
      let newStatus = project.status
      if (body.status === 'todo') newStatus = 'PENDING_SALES_MANAGER_APPROVAL'
      else if (body.status === 'in_progress') newStatus = 'BS_IN_PROGRESS'
      else if (body.status === 'review') newStatus = 'BS_PENDING_MANAGER_APPROVAL'
      else if (body.status === 'done') newStatus = 'PROPOSAL_FINALIZED'
      else if (body.status === 'archived') newStatus = 'CANCELLED'

      updateData.status = newStatus
    }

    if (body.progress !== undefined) {
      // Update progress entry
      await prisma.progress.create({
        data: {
          projectId: parseInt(cardId),
          entryType: 'kanban_update',
          description: `Kanban card updated: ${body.title || 'Card update'}`,
          percentComplete: body.progress,
          reportedById: parseInt(session.user.id),
          reportedAt: new Date()
        }
      })
    }

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(cardId) },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'kanban_card_updated',
        meta: JSON.stringify({
          cardId,
          updateData: body,
          previousStatus: project.status
        }),
        projectId: parseInt(cardId)
      }
    })

    // Send WebSocket notification
    try {
      const wsMessage = {
        type: 'card_updated',
        data: {
          id: cardId,
          updateData: body,
          projectId: cardId,
          projectCode: project.projectCode
        }
      }

      // TODO: Implement WebSocket notification
      console.log('WebSocket message:', wsMessage)
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error)
    }

    return NextResponse.json({
      status: 'success',
      data: {
        card: {
          id: cardId,
          ...body,
          updatedAt: updatedProject.updatedAt
        },
        project: updatedProject
      },
      message: 'Kanban card updated successfully'
    })

  } catch (error) {
    console.error('Kanban card update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update kanban card',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions - Only Admin and BS Manager can delete cards
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('id')

    if (!cardId) {
      return NextResponse.json(
        { status: 'error', message: 'Card ID is required' },
        { status: 400 }
      )
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(cardId) },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Card not found' },
        { status: 404 }
      )
    }

    // Delete kanban card (project)
    const deletedProject = await prisma.project.delete({
      where: { id: parseInt(cardId) }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'kanban_card_deleted',
        meta: JSON.stringify({
          cardId,
          deletedProject: {
            id: project.id,
            projectName: project.projectName,
            projectCode: project.projectCode
          }
        }),
        projectId: parseInt(cardId)
      }
    })

    // Archive project folder
    try {
      const folderStructure = await fileSystemManager.createProjectFolders(parseInt(cardId), project.projectCode)

      // Move all files to archive folder
      const archivePath = path.join(folderStructure.folders.root, 'archive')
      await fs.mkdir(archivePath, { recursive: true })

      // Archive all folders
      const foldersToArchive = [
        folderStructure.folders.proposal.draft,
        folderStructure.folders.proposal.final,
        folderStructure.folders.technical_docs,
        folderStructure.folders.po_details,
        folderStructure.folders.bidding_docs,
        folderStructure.folders.attachments
      ]

      for (const folder of foldersToArchive) {
        try {
          const files = await fs.readdir(folder)
          for (const file of files) {
            if (!file.startsWith('.')) {
              const sourcePath = path.join(folder, file)
              const destPath = path.join(archivePath, file)
              await fs.rename(sourcePath, destPath)
            }
          }
        } catch (error) {
          console.error(`Failed to archive folder ${folder}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to archive project folders:', error)
    }

    // Send WebSocket notification
    try {
      const wsMessage = {
        type: 'card_deleted',
        data: {
          id: cardId,
          projectId: cardId,
          projectCode: project.projectCode
        }
      }

      // TODO: Implement WebSocket notification
      console.log('WebSocket message:', wsMessage)
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error)
    }

    return NextResponse.json({
      status: 'success',
      data: {
        deletedCardId: cardId
      },
      message: 'Kanban card deleted successfully'
    })

  } catch (error) {
    console.error('Kanban card deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete kanban card',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

---

## 🔥 **STEP 3: Add Pipeline Visualization to Dashboard**

### **Create Pipeline Visualization Component**
