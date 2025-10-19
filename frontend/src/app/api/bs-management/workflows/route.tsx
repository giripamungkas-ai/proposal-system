import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Business Solution Workflow Management API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = parseInt(searchParams.get('projectId') as string)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')

    // Build where clause
    const where: any = {}
    if (projectId && !isNaN(projectId)) {
      where.projectId = projectId
    }
    if (status) {
      where.status = status
    }
    if (assignedTo && !isNaN(assignedTo)) {
      where.assignedTo = parseInt(assignedTo)
    }

    // Get workflows from database (using projects table as proxy for now)
    const workflows = await prisma.project.findMany({
      where,
      include: {
        requestedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform to workflow format
    const formattedWorkflows = workflows.map(project => ({
      id: project.id,
      projectId: project.id,
      projectName: project.projectName,
      projectCode: project.projectCode,
      workflowType: 'proposal_creation', // Default type for now
      status: project.status,
      assignedTo: project.requestedById,
      assignedUser: project.requestedBy,
      priority: 'medium',
      progress: project.status === 'PROPOSAL_FINALIZED' ? 100 : 0,
      dueDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      // Mock BS specific fields
      tasks: [],
      reviews: [],
      milestones: []
    }))

    return NextResponse.json({
      status: 'success',
      data: {
        workflows: formattedWorkflows,
        total: formattedWorkflows.length
      },
      message: 'BS workflows retrieved successfully'
    })

  } catch (error) {
    console.error('BS workflows API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve BS workflows',
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

    const body = await request.json()
    const {
      projectId,
      workflowType = 'proposal_creation',
      title,
      description,
      priority = 'medium',
      dueDate,
      assignedTo,
      tasks = []
    } = body

    if (!projectId) {
      return NextResponse.json(
        { status: 'error', message: 'Project ID is required' },
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

    // Check permissions - Business Solution and related roles can create workflows
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BUSINESS_SOLUTION', 'BS_MANAGER', 'PROJECT_MANAGER']
    if (!allowedRoles.includes(userRole) && project.requestedById !== parseInt(session.user.id)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Create workflow (store in audit log for now)
    const workflow = {
      projectId,
      workflowType,
      title: title || `BS Workflow for ${project.projectName}`,
      description: description || 'Business Solution workflow',
      status: 'pending',
      assignedTo: assignedTo || project.requestedById,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      progress: 0,
      createdById: parseInt(session.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'bs_workflow_created',
        meta: JSON.stringify(workflow),
        projectId
      }
    })

    // Update project status if needed
    let updatedProject = null
    if (project.status === 'PENDING_BS_PROPOSAL') {
      updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { status: 'BS_IN_PROGRESS' }
      })
    }

    return NextResponse.json({
      status: 'success',
      data: {
        workflow: {
          id: project.id, // Using project ID as workflow ID for now
          projectId,
          workflowType,
          title: workflow.title,
          description: workflow.description,
          status: workflow.status,
          assignedTo: workflow.assignedTo,
          priority: workflow.priority,
          dueDate: workflow.dueDate,
          progress: workflow.progress,
          createdAt: workflow.createdAt
        },
        project: updatedProject
      },
      message: 'BS workflow created successfully'
    })

  } catch (error) {
    console.error('BS workflow creation error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create BS workflow',
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
    const workflowId = parseInt(searchParams.get('id') as string)
    const body = await request.json()

    if (!workflowId) {
      return NextResponse.json(
        { status: 'error', message: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Get project (since we're using project as proxy for workflow)
    const project = await prisma.project.findUnique({
      where: { id: workflowId },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Workflow not found' },
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

    // Update workflow (project)
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.status) {
      updateData.status = body.status
    }
    if (body.progress !== undefined) {
      updateData.status = body.progress === 100 ? 'PROPOSAL_FINALIZED' : 'BS_IN_PROGRESS'
    }
    if (body.priority) {
      updateData.status = body.priority // For now using status field for priority
    }

    const updatedProject = await prisma.project.update({
      where: { id: workflowId },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'bs_workflow_updated',
        meta: JSON.stringify({
          workflowId,
          updateData,
          previousStatus: project.status
        }),
        projectId: workflowId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        workflow: {
          id: updatedProject.id,
          projectId: updatedProject.id,
          status: updatedProject.status,
          updatedAt: updatedProject.updatedAt
        }
      },
      message: 'BS workflow updated successfully'
    })

  } catch (error) {
    console.error('BS workflow update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update BS workflow',
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

    const { searchParams } = new URL(request.url)
    const workflowId = parseInt(searchParams.get('id') as string)

    if (!workflowId) {
      return NextResponse.json(
        { status: 'error', message: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: workflowId },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Workflow not found' },
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

    // Delete workflow (project)
    const deletedProject = await prisma.project.delete({
      where: { id: workflowId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'bs_workflow_deleted',
        meta: JSON.stringify({
          workflowId,
          deletedProject: {
            id: project.id,
            projectName: project.projectName
          }
        }),
        projectId: workflowId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        deletedWorkflowId: workflowId
      },
      message: 'BS workflow deleted successfully'
    })

  } catch (error) {
    console.error('BS workflow deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete BS workflow',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
