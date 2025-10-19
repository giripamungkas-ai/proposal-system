import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { useToast } from '@/components/notifications/ToastProvider'

// Milestone Management API endpoint
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
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')
    const includeTasks = searchParams.get('includeTasks') === 'true'
    const includeMetrics = searchParams.get('metrics') === 'true'

    // Build where clause
    const where: any = {}
    if (projectId && projectId !== 'all') {
      where.projectId = parseInt(projectId)
    }
    if (status) {
      where.status = status
    }
    if (priority) {
      where.priority = priority
    }
    if (assignedTo) {
      where.assignedTo = { has: assignedTo.split(',') }
    }

    // Fetch milestones from database (using audit logs as proxy for now)
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['milestone_created', 'milestone_updated', 'milestone_completed'] },
        meta: {
          contains: projectId ? JSON.stringify({ projectId }) : '{}'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Transform audit logs to milestone format
    const milestones = auditLogs.map(log => {
      const data = JSON.parse(log.meta as string)
      return {
        id: log.id.toString(),
        name: data.name || `Milestone ${log.id}`,
        description: data.description || 'No description available',
        projectId: projectId || data.projectId || log.id.toString(),
        projectName: data.projectName || `Project ${projectId}`,
        dueDate: new Date(data.dueDate || log.createdAt),
        plannedDate: new Date(data.plannedDate || log.createdAt),
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        progress: data.progress || 0,
        tasks: data.tasks || [],
        assignedTo: data.assignedTo || [],
        deliverables: data.deliverables || [],
        dependencies: data.dependencies || [],
        dependents: data.dependents || [],
        tags: data.tags || [],
        budget: data.budget,
        actualCost: data.actualCost,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        risks: data.risks || [],
        metadata: data,
        createdBy: data.createdBy || session.user.name,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt || log.createdAt
      }
    })

    // Filter milestones based on query parameters
    const filteredMilestones = milestones.filter(milestone => {
      if (status && milestone.status !== status) return false
      if (priority && milestone.priority !== priority) return false
      if (assignedTo && !milestone.assignedTo.includes(assignedTo)) return false
      return true
    })

    // Get metrics if requested
    let metrics = null
    if (includeMetrics) {
      const total = filteredMilestones.length
      const completed = filteredMilestones.filter(m => m.status === 'completed').length
      const delayed = filteredMilestones.filter(m => m.status === 'delayed').length
      const atRisk = filteredMilestones.filter(m => m.status === 'at_risk').length
      const inProgress = filteredMilestones.filter(m => m.status === 'in_progress').length
      const overallProgress = total > 0
        ? filteredMilestones.reduce((sum, m) => sum + m.progress, 0) / total
        : 0

      metrics = {
        totalMilestones: total,
        completedMilestones: completed,
        delayedMilestones: delayed,
        atRiskMilestones: atRisk,
        overallProgress,
        averageCompletionRate: total > 0 ? (completed / total) * 100 : 0,
        onTimeCompletionRate: total > 0 ? ((total - delayed - atRisk) / total) * 100 : 0,
        totalBudget: filteredMilestones.reduce((sum, m) => sum + (m.budget || 0), 0),
        totalActualCost: filteredMilestones.reduce((sum, m) => sum + (m.actualCost || 0), 0),
        totalEstimatedHours: filteredMilestones.reduce((sum, m) => sum + (m.estimatedHours || 0), 0),
        totalActualHours: filteredMilestones.reduce((sum, m) => sum + (m.actualHours || 0), 0),
        upcomingDeadlines: filteredMilestones
          .filter(m => m.status !== 'completed' && m.status !== 'cancelled')
          .map(m => ({
            milestoneId: m.id,
            milestoneName: m.name,
            dueDate: m.dueDate,
            daysUntilDue: Math.ceil((m.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
            priority: m.priority
          }))
          .filter(m => m.daysUntilDue <= 30)
          .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      }
    }

    // Get tasks if requested
    let tasks = []
    if (includeTasks) {
      const taskLogs = await prisma.auditLog.findMany({
        where: {
          action: { in: ['task_created', 'task_updated', 'task_completed'] },
          meta: {
            contains: projectId ? JSON.stringify({ projectId }) : '{}'
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      tasks = taskLogs.map(log => {
        const data = JSON.parse(log.meta as string)
        return {
          id: log.id.toString(),
          name: data.name || `Task ${log.id}`,
          status: data.status || 'not_started',
          milestoneId: data.milestoneId,
          assigneeId: data.assigneeId,
          assigneeName: data.assigneeName || 'Unassigned',
          progress: data.progress || 0,
          createdAt: log.createdAt
        }
      })
    }

    return NextResponse.json({
      status: 'success',
      data: {
        milestones: filteredMilestones,
        tasks: includeTasks ? tasks : undefined,
        metrics,
        total: filteredMilestones.length,
        timestamp: new Date().toISOString()
      },
      message: 'Milestones retrieved successfully'
    })

  } catch (error) {
    console.error('Milestones API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve milestones',
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
      action = 'create',
      projectId,
      name,
      description,
      dueDate,
      plannedDate,
      priority = 'medium',
      assignedTo = [],
      deliverables = [],
      tasks = [],
      dependencies = [],
      tags = [],
      budget,
      estimatedHours,
      risks = []
    } = body

    // Check permissions - Project Manager and BS Manager can create milestones
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'PROJECT_MANAGER', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    if (!projectId || !name || !dueDate) {
      return NextResponse.json(
        { status: 'error', message: 'Project ID, name, and due date are required' },
        { status: 400 }
      )
    }

    // Create milestone (store in audit log for now)
    const milestone = {
      name,
      description: description || 'No description',
      projectId,
      projectName: `Project ${projectId}`,
      dueDate: new Date(dueDate),
      plannedDate: plannedDate ? new Date(plannedDate) : new Date(dueDate),
      status: 'pending',
      priority,
      progress: 0,
      tasks,
      assignedTo,
      deliverables,
      dependencies,
      dependents: [],
      tags,
      budget,
      estimatedHours,
      risks,
      createdBy: session.user.name,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'milestone_created',
        meta: JSON.stringify(milestone),
        projectId: parseInt(projectId)
      }
    })

    // Create notification for assigned users
    if (assignedTo.length > 0) {
      for (const userId of assignedTo) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/notifications`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.user.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'MILESTONE_ASSIGNED',
              data: {
                milestoneId: auditLog.id.toString(),
                milestoneName: name,
                dueDate: new Date(dueDate).toISOString(),
                priority,
                description: description || 'No description',
                projectId,
                assigneeId: userId
              },
              sendEmail: true
            })
          })
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError)
        }
      }
    }

    // Create milestone response
    const responseMilestone = {
      id: auditLog.id.toString(),
      ...milestone,
      createdAt: auditLog.createdAt,
      updatedAt: auditLog.createdAt
    }

    return NextResponse.json({
      status: 'success',
      data: {
        milestone: responseMilestone,
        assignedTo,
        tasks,
        timestamp: new Date().toISOString()
      },
      message: 'Milestone created successfully'
    })

  } catch (error) {
    console.error('Milestone creation error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create milestone',
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
    const milestoneId = searchParams.get('id')
    const body = await request.json()
    const {
      action = 'update',
      name,
      description,
      dueDate,
      status,
      priority,
      progress,
      assignedTo,
      deliverables,
      tasks,
      dependencies,
      tags,
      budget,
      actualCost,
      estimatedHours,
      actualHours,
      risks
    } = body

    if (!milestoneId) {
      return NextResponse.json(
        { status: 'error', message: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    // Get existing milestone (from audit log)
    const existingLog = await prisma.auditLog.findUnique({
      where: { id: parseInt(milestoneId) }
    })

    if (!existingLog) {
      return NextResponse.json(
        { status: 'error', message: 'Milestone not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'PROJECT_MANAGER', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Parse existing milestone data
    const existingData = JSON.parse(existingLog.meta as string)
    const updatedData = {
      ...existingData,
      ...(name && { name }),
      ...(description && { description }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(progress !== undefined && { progress }),
      ...(assignedTo && { assignedTo }),
      ...(deliverables && { deliverables }),
      ...(tasks && { tasks }),
      ...(dependencies && { dependencies }),
      ...(tags && { tags }),
      ...(budget && { budget }),
      ...(actualCost && { actualCost }),
      ...(estimatedHours && { estimatedHours }),
      ...(actualHours && { actualHours }),
      ...(risks && { risks }),
      updatedAt: new Date(),
      updatedBy: session.user.name
    }

    // Update milestone (update audit log)
    const updatedLog = await prisma.auditLog.update({
      where: { id: parseInt(milestoneId) },
      data: {
        meta: JSON.stringify(updatedData),
        updatedAt: new Date()
      }
    })

    // Add completed date if status is completed
    if (status === 'completed') {
      updatedData.completedDate = new Date()
      updatedData.progress = 100
    }

    // Update audit log entry
    const finalUpdatedLog = await prisma.auditLog.update({
      where: { id: parseInt(milestoneId) },
      data: {
        meta: JSON.stringify(updatedData),
        updatedAt: new Date()
      }
    })

    // Create notification for status changes
    if (status && status !== existingData.status) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'MILESTONE_STATUS_UPDATED',
            data: {
              milestoneId,
              milestoneName: updatedData.name,
              oldStatus: existingData.status,
              newStatus: status,
              dueDate: updatedData.dueDate,
              priority: updatedData.priority,
              projectId: updatedData.projectId
            },
            sendEmail: true
          })
        })
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
      }
    }

    // Create milestone response
    const responseMilestone = {
      id: milestoneId,
      ...updatedData,
      createdAt: existingLog.createdAt,
      updatedAt: finalUpdatedLog.updatedAt
    }

    return NextResponse.json({
      status: 'success',
      data: {
        milestone: responseMilestone,
        timestamp: new Date().toISOString()
      },
      message: 'Milestone updated successfully'
    })

  } catch (error) {
    console.error('Milestone update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update milestone',
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
    const milestoneId = searchParams.get('id')

    if (!milestoneId) {
      return NextResponse.json(
        { status: 'error', message: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    // Check permissions - Only Admin and Project Manager can delete milestones
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'PROJECT_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get existing milestone
    const existingLog = await prisma.auditLog.findUnique({
      where: { id: parseInt(milestoneId) }
    })

    if (!existingLog) {
      return NextResponse.json(
        { status: 'error', message: 'Milestone not found' },
        { status: 404 }
      )
    }

    // Delete milestone (update audit log)
    const deletedLog = await prisma.auditLog.update({
      where: { id: parseInt(milestoneId) },
      data: {
        action: 'milestone_deleted',
        meta: JSON.stringify({
          milestoneId,
          deletedBy: session.user.name,
          deletedAt: new Date().toISOString()
        }),
        updatedAt: new Date()
      }
    })

    // Create notification for assigned users
    const existingData = JSON.parse(existingLog.meta as string)
    if (existingData.assignedTo && existingData.assignedTo.length > 0) {
      for (const userId of existingData.assignedTo) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/notifications`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.user.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'MILESTONE_DELETED',
              data: {
                milestoneId,
                milestoneName: existingData.name,
                dueDate: existingData.dueDate,
                priority: existingData.priority,
                projectId: existingData.projectId,
                deletedBy: session.user.name
              },
              sendEmail: true
            })
          })
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError)
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        deletedMilestoneId: milestoneId,
        timestamp: new Date().toISOString()
      },
      message: 'Milestone deleted successfully'
    })

  } catch (error) {
    console.error('Milestone deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete milestone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

---

## 📋 **STEP 4: Create Dependency Management System**

### **Create Dependency Management Directory**
