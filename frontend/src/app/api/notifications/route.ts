import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Notification types and templates
const NOTIFICATION_TEMPLATES = {
  PROPOSAL_APPROVED: {
    title: 'Proposal Approved',
    message: 'Proposal for {projectName} has been approved by {approverName}',
    channels: ['dashboard', 'email']
  },
  RFP_SUBMITTED: {
    title: 'New RFP Submitted',
    message: 'New RFP "{projectName}" submitted by {submittedByName}',
    channels: ['dashboard', 'email']
  },
  PROPOSAL_REJECTED: {
    title: 'Proposal Rejected',
    message: 'Proposal for {projectName} has been rejected by {approverName}',
    channels: ['dashboard', 'email']
  },
  PROJECT_STATUS_CHANGED: {
    title: 'Project Status Updated',
    message: 'Project "{projectName}" status changed to {newStatus}',
    channels: ['dashboard']
  },
  DEADLINE_APPROACHING: {
    title: 'Deadline Approaching',
    message: 'Project "{projectName}" deadline is in {daysLeft} days',
    channels: ['dashboard', 'email']
  },
  FILE_UPLOADED: {
    title: 'File Uploaded',
    message: '{fileName} uploaded to {folder} folder by {uploadedByName}',
    channels: ['dashboard']
  }
}

// Role-based notification rules
const NOTIFICATION_RULES = {
  PROPOSAL_APPROVED: ['ADMIN', 'SALES_MANAGER', 'BS_MANAGER', 'SALES'],
  RFP_SUBMITTED: ['ADMIN', 'SALES_MANAGER', 'BUSINESS_SOLUTION', 'BS_MANAGER'],
  PROPOSAL_REJECTED: ['ADMIN', 'SALES_MANAGER', 'BUSINESS_SOLUTION', 'SALES'],
  PROJECT_STATUS_CHANGED: ['ADMIN', 'PROJECT_MANAGER', 'SALES_MANAGER', 'BS_MANAGER'],
  DEADLINE_APPROACHING: ['ADMIN', 'PROJECT_MANAGER', 'SALES', 'BUSINESS_SOLUTION'],
  FILE_UPLOADED: ['ADMIN', 'PROJECT_MANAGER']
}

// Weekly summary email template
const WEEKLY_SUMMARY_TEMPLATE = `
Weekly Proposal Report - MDMEDIA System
Generated on: {date}

SUMMARY:
- Total Projects: {totalProjects}
- New Proposals: {newProposals}
- Approved Proposals: {approvedProposals}
- Rejected Proposals: {rejectedProposals}
- Pending Approvals: {pendingApprovals}

TOP PERFORMERS:
{topPerformers}

RECENT ACTIVITIES:
{recentActivities}

UPCOMING DEADLINES:
{upcomingDeadlines}

This report is generated automatically by the MDMEDIA Proposal Management System.
`

// AI summarizer function (mock implementation)
async function generateWeeklySummary(): Promise<string> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Fetch weekly data
  const [
    totalProjects,
    newProjects,
    approvedProjects,
    rejectedProjects,
    pendingProjects,
    recentActivities,
    upcomingDeadlines,
    topPerformers
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({
      where: { createdAt: { gte: oneWeekAgo } }
    }),
    prisma.project.count({
      where: {
        status: 'PROPOSAL_FINALIZED',
        updatedAt: { gte: oneWeekAgo }
      }
    }),
    prisma.project.count({
      where: {
        status: 'REJECTED_BY_SALES_MANAGER',
        updatedAt: { gte: oneWeekAgo }
      }
    }),
    prisma.project.count({
      where: {
        status: { in: ['PENDING_SALES_MANAGER_APPROVAL', 'PENDING_BS_PROPOSAL', 'BS_PENDING_MANAGER_APPROVAL'] }
      }
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        project: { select: { projectName: true } }
      }
    }),
    prisma.project.findMany({
      where: {
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      take: 5,
      orderBy: { endDate: 'asc' },
      include: { requestedBy: { select: { name: true } } }
    }),
    // Mock top performers (in real implementation, calculate based on metrics)
    prisma.user.findMany({
      where: { role: { in: ['SALES', 'BUSINESS_SOLUTION'] } },
      take: 3,
      include: {
        projects: {
          where: { status: 'PROPOSAL_FINALIZED' },
          select: { id: true }
        }
      }
    })
  ])

  // Format top performers
  const topPerformersText = topPerformers
    .sort((a, b) => b.projects.length - a.projects.length)
    .slice(0, 3)
    .map((user, index) =>
      `${index + 1}. ${user.name} (${user.projects.length} approved proposals)`
    ).join('\n')

  // Format recent activities
  const recentActivitiesText = recentActivities
    .map(log =>
      `${log.createdAt.toLocaleDateString()}: ${log.user?.name} ${log.action.replace('_', ' ')}${log.project ? ` - ${log.project.projectName}` : ''}`
    ).join('\n')

  // Format upcoming deadlines
  const upcomingDeadlinesText = upcomingDeadlines
    .map(project =>
      `${project.projectName} - ${project.endDate.toLocaleDateString()} (${project.requestedBy.name})`
    ).join('\n')

  // Generate summary
  const summary = WEEKLY_SUMMARY_TEMPLATE
    .replace('{date}', new Date().toLocaleDateString())
    .replace('{totalProjects}', totalProjects.toString())
    .replace('{newProposals}', newProjects.toString())
    .replace('{approvedProposals}', approvedProjects.toString())
    .replace('{rejectedProposals}', rejectedProjects.toString())
    .replace('{pendingApprovals}', pendingProjects.toString())
    .replace('{topPerformers}', topPerformersText || 'No data available')
    .replace('{recentActivities}', recentActivitiesText || 'No recent activities')
    .replace('{upcomingDeadlines}', upcomingDeadlinesText || 'No upcoming deadlines')

  return summary
}

// Create notification function
async function createNotification(
  type: keyof typeof NOTIFICATION_TEMPLATES,
  data: Record<string, any>,
  userId?: number
) {
  const template = NOTIFICATION_TEMPLATES[type]
  const targetRoles = NOTIFICATION_RULES[type]

  if (!template) return

  // Get target users
  let targetUsers: any[] = []

  if (userId) {
    // Specific user
    targetUsers = await prisma.user.findMany({
      where: { id: userId }
    })
  } else {
    // Role-based
    targetUsers = await prisma.user.findMany({
      where: { role: { in: targetRoles } }
    })
  }

  // Create notifications
  const notifications = await Promise.all(
    targetUsers.map(user => {
      const personalizedMessage = template.message.replace(
        /\{(\w+)\}/g,
        (match, key) => data[key] || match
      )

      return prisma.notification.create({
        data: {
          recipientId: user.id,
          channel: template.channels[0], // Primary channel
          template: type,
          payloadJson: JSON.stringify({
            ...data,
            originalMessage: personalizedMessage,
            channels: template.channels
          }),
          status: 'sent'
        }
      })
    })
  )

  // Log notification creation
  await prisma.auditLog.create({
    data: {
      action: 'notification_created',
      meta: JSON.stringify({
        type,
        recipientCount: notifications.length,
        data
      })
    }
  })

  return notifications
}

// Send email notification (mock implementation)
async function sendEmailNotification(
  recipient: { email: string; name: string },
  subject: string,
  message: string
) {
  // In production, integrate with actual email service
  console.log(`📧 EMAIL SENT TO: ${recipient.email}`)
  console.log(`Subject: ${subject}`)
  console.log(`Message: ${message}`)
  console.log('---')
}

// Send weekly summary to GM and Directors
async function sendWeeklySummary() {
  try {
    const summary = await generateWeeklySummary()

    // Get GM and Directors
    const executives = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SALES_MANAGER', 'BS_MANAGER'] } }
    })

    for (const executive of executives) {
      await sendEmailNotification(
        executive,
        'Weekly Proposal Report - MDMEDIA System',
        summary
      )

      // Also create in-app notification
      await createNotification('WEEKLY_SUMMARY', {
        summary: summary.substring(0, 200) + '...',
        generatedAt: new Date().toISOString()
      }, executive.id)
    }

    console.log('✅ Weekly summary sent to executives')
  } catch (error) {
    console.error('❌ Failed to send weekly summary:', error)
  }
}

// POST: Create notification
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
    const { type, data, userId, sendEmail = false } = body

    if (!type || !data) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    // Create notifications
    const notifications = await createNotification(type, data, userId)

    // Send email notifications if requested
    if (sendEmail) {
      const template = NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES]
      if (template && template.channels.includes('email')) {
        for (const notification of notifications) {
          const recipient = await prisma.user.findUnique({
            where: { id: notification.recipientId }
          })

          if (recipient) {
            const personalizedMessage = template.message.replace(
              /\{(\w+)\}/g,
              (match, key) => data[key] || match
            )

            await sendEmailNotification(
              recipient,
              template.title,
              personalizedMessage
            )
          }
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        notificationsCreated: notifications.length,
        notifications
      },
      message: 'Notifications created successfully'
    })

  } catch (error) {
    console.error('Notification creation error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// GET: Retrieve notifications
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'User not found' },
        { status: 404 }
      )
    }

    const where = {
      recipientId: user.id,
      ...(unreadOnly ? { read: false } : {})
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where })
    ])

    // Parse payload JSON
    const notificationsWithData = notifications.map(notification => ({
      ...notification,
      payload: JSON.parse(notification.payloadJson || '{}')
    }))

    return NextResponse.json({
      status: 'success',
      data: {
        notifications: notificationsWithData,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: 'Notifications retrieved successfully'
    })

  } catch (error) {
    console.error('Notification retrieval error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// PUT: Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationIds, markAll = false } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'User not found' },
        { status: 404 }
      )
    }

    let updatedCount = 0

    if (markAll) {
      updatedCount = await prisma.notification.updateMany({
        where: {
          recipientId: user.id,
          read: false
        },
        data: { read: true }
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      updatedCount = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          recipientId: user.id
        },
        data: { read: true }
      })
    }

    return NextResponse.json({
      status: 'success',
      data: { updatedCount: updatedCount.count || updatedCount },
      message: 'Notifications marked as read'
    })

  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to mark notifications as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Weekly summary endpoint (can be called by cron job)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await sendWeeklySummary()

    return NextResponse.json({
      status: 'success',
      message: 'Weekly summary sent successfully'
    })

  } catch (error) {
    console.error('Weekly summary error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to send weekly summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
