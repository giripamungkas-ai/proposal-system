import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Bidding Package Management API
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
    const packageType = searchParams.get('packageType')

    // Build where clause
    const where: any = {}
    if (projectId && !isNaN(projectId)) {
      where.projectId = projectId
    }
    if (status) {
      where.status = status
    }
    if (packageType) {
      where.status = packageType // Using status field for now
    }

    // Get bidding packages from database (using projects table as proxy for now)
    const biddingPackages = await prisma.project.findMany({
      where: {
        ...where,
        status: { in: ['BS_PENDING_MANAGER_APPROVAL', 'PROPOSAL_FINALIZED', 'CLOSED'] } // Filter for bidding-ready projects
      },
      include: {
        requestedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform to bidding package format
    const formattedPackages = biddingPackages.map(project => ({
      id: project.id,
      projectId: project.id,
      projectName: project.projectName,
      projectCode: project.projectCode,
      packageType: 'proposal', // Default type for now
      status: project.status,
      version: 1,
      title: `Bidding Package for ${project.projectName}`,
      description: `Complete bidding package for ${project.projectName}`,
      requirements: JSON.stringify({
        client: project.requestedBy?.name || 'Unknown',
        budget: project.budgetEstimate,
        deadline: project.endDate
      }),
      deliverables: JSON.stringify([
        'Technical specifications',
        'Commercial terms',
        'Legal documents',
        'Implementation timeline'
      ]),
      timeline: JSON.stringify({
        preparation: '3 days',
        review: '2 days',
        finalization: '1 day'
      }),
      teamComposition: JSON.stringify({
        projectManager: 1,
        technicalLead: 1,
        commercialLead: 1,
        legalAdvisor: 1
      }),
      finalBidAmount: project.budgetEstimate,
      currency: 'IDR',
      submittedAt: project.updatedAt,
      reviewedAt: null,
      approvedAt: project.status === 'PROPOSAL_FINALIZED' ? project.updatedAt : null,
      rejectedAt: null,
      createdById: project.requestedById,
      createdBy: project.requestedBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      // Mock bidding specific fields
      reviews: [],
      documents: [],
      history: []
    }))

    return NextResponse.json({
      status: 'success',
      data: {
        packages: formattedPackages,
        total: formattedPackages.length
      },
      message: 'Bidding packages retrieved successfully'
    })

  } catch (error) {
    console.error('Bidding packages API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve bidding packages',
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
      packageType = 'proposal',
      title,
      description,
      requirements,
      deliverables,
      timeline,
      teamComposition,
      finalBidAmount,
      currency = 'IDR'
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

    // Check permissions - Bidding Team and related roles can create packages
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BIDDING_TEAM', 'PROJECT_MANAGER', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole) && project.requestedById !== parseInt(session.user.id)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Create bidding package (store in audit log for now)
    const biddingPackage = {
      projectId,
      packageType,
      title: title || `Bidding Package for ${project.projectName}`,
      description: description || 'Complete bidding package',
      status: 'draft',
      version: 1,
      requirements: requirements ? JSON.stringify(requirements) : null,
      deliverables: deliverables ? JSON.stringify(deliverables) : null,
      timeline: timeline ? JSON.stringify(timeline) : null,
      teamComposition: teamComposition ? JSON.stringify(teamComposition) : null,
      finalBidAmount,
      currency,
      submittedAt: null,
      reviewedAt: null,
      approvedAt: null,
      rejectedAt: null,
      createdById: parseInt(session.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'bidding_package_created',
        meta: JSON.stringify(biddingPackage),
        projectId
      }
    })

    // Update project status if needed
    let updatedProject = null
    if (project.status === 'PROPOSAL_FINALIZED') {
      updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { status: 'BIDDING_IN_PROGRESS' }
      })
    }

    return NextResponse.json({
      status: 'success',
      data: {
        package: {
          id: project.id, // Using project ID as package ID for now
          projectId,
          packageType,
          title: biddingPackage.title,
          description: biddingPackage.description,
          status: biddingPackage.status,
          version: biddingPackage.version,
          requirements: biddingPackage.requirements,
          deliverables: biddingPackage.deliverables,
          timeline: biddingPackage.timeline,
          teamComposition: biddingPackage.teamComposition,
          finalBidAmount: biddingPackage.finalBidAmount,
          currency: biddingPackage.currency,
          createdAt: biddingPackage.createdAt
        },
        project: updatedProject
      },
      message: 'Bidding package created successfully'
    })

  } catch (error) {
    console.error('Bidding package creation error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create bidding package',
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
    const packageId = parseInt(searchParams.get('id') as string)
    const body = await request.json()

    if (!packageId) {
      return NextResponse.json(
        { status: 'error', message: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Get project (since we're using project as proxy for package)
    const project = await prisma.project.findUnique({
      where: { id: packageId },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Package not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BIDDING_TEAM', 'PROJECT_MANAGER', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole) && project.requestedById !== parseInt(session.user.id)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Update package (project)
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.status) {
      updateData.status = body.status
    }
    if (body.finalBidAmount) {
      updateData.budgetEstimate = body.finalBidAmount
    }
    if (body.submittedAt) {
      updateData.submittedAt = new Date(body.submittedAt)
    }
    if (body.approvedAt) {
      updateData.approvedAt = new Date(body.approvedAt)
    }
    if (body.rejectedAt) {
      updateData.rejectedAt = new Date(body.rejectedAt)
    }

    const updatedProject = await prisma.project.update({
      where: { id: packageId },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'bidding_package_updated',
        meta: JSON.stringify({
          packageId,
          updateData,
          previousStatus: project.status
        }),
        projectId: packageId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        package: {
          id: updatedProject.id,
          projectId: updatedProject.id,
          status: updatedProject.status,
          updatedAt: updatedProject.updatedAt
        }
      },
      message: 'Bidding package updated successfully'
    })

  } catch (error) {
    console.error('Bidding package update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update bidding package',
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
    const packageId = parseInt(searchParams.get('id') as string)

    if (!packageId) {
      return NextResponse.json(
        { status: 'error', message: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: packageId },
      include: { requestedBy: true }
    })

    if (!project) {
      return NextResponse.json(
        { status: 'error', message: 'Package not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'BIDDING_TEAM', 'PROJECT_MANAGER', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole) && project.requestedById !== parseInt(session.user.id)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete package (project)
    const deletedProject = await prisma.project.delete({
      where: { id: packageId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'bidding_package_deleted',
        meta: JSON.stringify({
          packageId,
          deletedProject: {
            id: project.id,
            projectName: project.projectName
          }
        }),
        projectId: packageId
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        deletedPackageId: packageId
      },
      message: 'Bidding package deleted successfully'
    })

  } catch (error) {
    console.error('Bidding package deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete bidding package',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

### **🔹 Step 3: System Settings & Admin Tools (Bab 14)**
