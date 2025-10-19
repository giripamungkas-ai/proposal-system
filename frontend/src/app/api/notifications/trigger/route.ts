import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Sample notification events for testing
const SAMPLE_EVENTS = [
  {
    type: 'PROPOSAL_APPROVED',
    data: {
      projectName: 'SMS Campaign 2025',
      approverName: 'BS Manager',
      approvedAt: new Date().toISOString()
    }
  },
  {
    type: 'RFP_SUBMITTED',
    data: {
      projectName: 'Digital Advertising Q2',
      submittedByName: 'Sales Representative',
      projectCode: 'PRJ-2025-002'
    }
  },
  {
    type: 'PROPOSAL_REJECTED',
    data: {
      projectName: 'Smartcard Printing',
      approverName: 'Sales Manager',
      reason: 'Budget exceeds limit'
    }
  },
  {
    type: 'PROJECT_STATUS_CHANGED',
    data: {
      projectName: 'Email Marketing Campaign',
      newStatus: 'PROPOSAL_FINALIZED',
      oldStatus: 'BS_PENDING_MANAGER_APPROVAL'
    }
  },
  {
    type: 'DEADLINE_APPROACHING',
    data: {
      projectName: 'Q3 Proposal Bundle',
      daysLeft: 3,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
]

// Notification trigger function
async function triggerNotification(
  type: string,
  data: Record<string, any>,
  userId?: number,
  sendEmail: boolean = false
) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        data,
        userId,
        sendEmail
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to trigger notification:', error)
    return { status: 'error', message: 'Failed to trigger notification' }
  }
}

// POST: Trigger notification events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { eventType, customData, userId, sendEmail = false } = body

    let notifications = []

    if (eventType === 'SAMPLE_ALL') {
      // Trigger all sample events
      for (const event of SAMPLE_EVENTS) {
        const result = await triggerNotification(
          event.type,
          event.data,
          userId,
          sendEmail
        )
        notifications.push(result)
      }
    } else if (eventType && customData) {
      // Trigger custom event
      const result = await triggerNotification(eventType, customData, userId, sendEmail)
      notifications.push(result)
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields: eventType and customData' },
        { status: 400 }
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'notifications_triggered',
        meta: JSON.stringify({
          eventType,
          notificationCount: notifications.length,
          sendEmail
        })
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        triggeredNotifications: notifications,
        summary: {
          totalEvents: notifications.length,
          successful: notifications.filter(n => n.status === 'success').length,
          failed: notifications.filter(n => n.status === 'error').length
        }
      },
      message: `Successfully triggered ${notifications.length} notification event(s)`
    })

  } catch (error) {
    console.error('Notification trigger error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to trigger notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// GET: List available notification types and sample data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeSamples = searchParams.get('includeSamples') === 'true'

    const response = {
      status: 'success',
      data: {
        availableTypes: [
          {
            type: 'PROPOSAL_APPROVED',
            description: 'Triggered when a proposal is approved',
            requiredFields: ['projectName', 'approverName'],
            optionalFields: ['approvedAt']
          },
          {
            type: 'RFP_SUBMITTED',
            description: 'Triggered when a new RFP is submitted',
            requiredFields: ['projectName', 'submittedByName'],
            optionalFields: ['projectCode']
          },
          {
            type: 'PROPOSAL_REJECTED',
            description: 'Triggered when a proposal is rejected',
            requiredFields: ['projectName', 'approverName'],
            optionalFields: ['reason']
          },
          {
            type: 'PROJECT_STATUS_CHANGED',
            description: 'Triggered when project status changes',
            requiredFields: ['projectName', 'newStatus'],
            optionalFields: ['oldStatus']
          },
          {
            type: 'DEADLINE_APPROACHING',
            description: 'Triggered when project deadline is approaching',
            requiredFields: ['projectName', 'daysLeft'],
            optionalFields: ['deadline']
          },
          {
            type: 'FILE_UPLOADED',
            description: 'Triggered when files are uploaded to project',
            requiredFields: ['projectName', 'fileName', 'folder'],
            optionalFields: ['uploadedByName', 'fileCount']
          }
        ]
      },
      message: 'Available notification types retrieved successfully'
    }

    if (includeSamples) {
      response.data.samples = SAMPLE_EVENTS
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Notification types error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve notification types',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
