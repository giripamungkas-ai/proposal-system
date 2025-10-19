import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { winProbabilityEngine } from '@/lib/analytics/predictive/WinProbabilityEngine'
import { PredictiveFeatures } from '@/lib/analytics/predictive/WinProbabilityEngine'

// Win Probability Prediction API endpoint
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
      projectCode,
      features,
      useHistoricalData = true,
      includeRecommendations = true
    } = body

    // Validate required fields
    if (!projectId || !features) {
      return NextResponse.json(
        { status: 'error', message: 'Project ID and features are required' },
        { status: 400 }
      )
    }

    // Get project data for historical context
    let historicalData: any[] = []
    if (useHistoricalData) {
      try {
        const projects = await prisma.project.findMany({
          where: {
            status: { in: ['PROPOSAL_FINALIZED', 'CLOSED', 'CANCELLED'] }
          },
          include: {
            requestedBy: {
              select: { name: true, email: true, role: true }
            },
            proposals: {
              include: {
                createdById: true
              }
            },
            attachments: true,
            progress: {
              orderBy: { reportedAt: 'desc' },
              take: 5
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })

        historicalData = projects.map(project => ({
          projectId: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          status: project.status,
          budgetEstimate: project.budgetEstimate || 0,
          startDate: project.startDate,
          endDate: project.endDate,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          requestedBy: project.requestedBy,
          proposals: project.proposals.length,
          attachments: project.attachments.length,
          progress: project.progress,
          // Calculate derived features
          winRate: project.status === 'PROPOSAL_FINALIZED' ? 1 : 0,
          averageDealSize: project.budgetEstimate || 0,
          salesCycleLength: project.endDate && project.startDate
            ? Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          conversionRate: project.proposals.length > 0 ? 1 : 0
        }))
      } catch (error) {
        console.error('Failed to fetch historical data:', error)
      }
    }

    // Enhance features with historical context
    const enhancedFeatures: PredictiveFeatures = {
      ...features,
      // Add historical averages if available
      winRate: historicalData.length > 0
        ? historicalData.filter(p => p.status === 'PROPOSAL_FINALIZED').length / historicalData.length
        : 0.5,
      averageDealSize: historicalData.length > 0
        ? historicalData.reduce((sum, p) => sum + (p.budgetEstimate || 0), 0) / historicalData.length
        : features.projectValue / 2,
      salesCycleLength: historicalData.length > 0
        ? historicalData.reduce((sum, p) => sum + p.salesCycleLength, 0) / historicalData.length
        : 30
    }

    // Make prediction
    const prediction = await winProbabilityEngine.predictWinProbability(enhancedFeatures)

    // Save prediction result to database for learning
    try {
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: 'win_probability_predicted',
          meta: JSON.stringify({
            projectId,
            projectCode,
            features: enhancedFeatures,
            prediction,
            historicalDataCount: historicalData.length,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (error) {
      console.error('Failed to save prediction to audit log:', error)
    }

    return NextResponse.json({
      status: 'success',
      data: {
        prediction,
        features: enhancedFeatures,
        historicalData: {
          count: historicalData.length,
          samples: historicalData.slice(0, 5) // Return sample for reference
        },
        timestamp: new Date().toISOString()
      },
      message: 'Win probability prediction completed successfully'
    })

  } catch (error) {
    console.error('Win probability prediction error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to predict win probability',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

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
    const statistics = searchParams.get('statistics') === 'true'
    const modelInfo = searchParams.get('modelInfo') === 'true'

    // Get model statistics
    if (statistics) {
      const stats = winProbabilityEngine.getModelStatistics()

      return NextResponse.json({
        status: 'success',
        data: {
          statistics: stats,
          timestamp: new Date().toISOString()
        },
        message: 'Model statistics retrieved successfully'
      })
    }

    // Get model information
    if (modelInfo) {
      const modelStats = winProbabilityEngine.getModelStatistics()

      return NextResponse.json({
        status: 'success',
        data: {
          models: modelStats.availableModels,
          currentModel: modelStats.currentModel,
          performance: modelStats.performanceMetrics,
          isInitialized: modelStats.isInitialized,
          timestamp: new Date().toISOString()
        },
        message: 'Model information retrieved successfully'
      })
    }

    // Get historical predictions for a project
    if (projectId) {
      try {
        const auditLogs = await prisma.auditLog.findMany({
          where: {
            action: 'win_probability_predicted',
            meta: {
              contains: JSON.stringify({ projectId })
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })

        const predictions = auditLogs.map(log => {
          id: log.id,
          createdAt: log.createdAt,
          prediction: JSON.parse(log.meta as string)
        })

        return NextResponse.json({
          status: 'success',
          data: {
            projectId,
            predictions,
            total: predictions.length,
            timestamp: new Date().toISOString()
          },
          message: 'Historical predictions retrieved successfully'
        })
      } catch (error) {
        console.error('Failed to fetch historical predictions:', error)
        return NextResponse.json(
          {
            status: 'error',
            message: 'Failed to retrieve historical predictions',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        )
      }
    }

    // Get overall statistics
    try {
      const totalAuditLogs = await prisma.auditLog.count({
        where: {
          action: 'win_probability_predicted'
        }
      })

      const recentPredictions = await prisma.auditLog.findMany({
        where: {
          action: 'win_probability_predicted'
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      const stats = winProbabilityEngine.getModelStatistics()

      return NextResponse.json({
        status: 'success',
        data: {
          totalPredictions: totalAuditLogs,
          recentPredictions: recentPredictions.map(log => ({
            id: log.id,
            createdAt: log.createdAt,
            prediction: JSON.parse(log.meta as string)
          })),
          modelStats: stats,
          timestamp: new Date().toISOString()
        },
        message: 'Overall statistics retrieved successfully'
      })
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to retrieve statistics',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid request parameters',
        data: {
          availableActions: ['POST /predict', 'GET /statistics', 'GET /modelInfo', 'GET /history']
        }
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('Win probability API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process win probability request',
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

    const body = await request.json()
    const {
      action = 'retrain',
      modelType,
      trainingData
    } = body

    if (action === 'retrain') {
      // Check admin permissions
      const userRole = session.user.role as string
      const allowedRoles = ['ADMIN', 'SALES_MANAGER', 'BS_MANAGER']
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { status: 'error', message: 'Access denied' },
          { status: 403 }
        )
      }

      // Get training data if not provided
      let trainingDataArray: any[] = []
      if (trainingData) {
        trainingDataArray = trainingData
      } else {
        // Fetch historical data for training
        try {
          const projects = await prisma.project.findMany({
            where: {
              status: { in: ['PROPOSAL_FINALIZED', 'CLOSED', 'CANCELLED'] }
            },
            include: {
              requestedBy: {
                select: { name: true, email: true, role: true }
              },
              proposals: {
                include: {
                  createdById: true
                }
              },
              attachments: true,
              progress: {
                orderBy: { reportedAt: 'desc' },
                take: 5
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
          })

          trainingDataArray = projects.map(project => ({
            features: {
              projectValue: project.budgetEstimate || 0,
              projectDuration: project.endDate && project.startDate
                ? Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))
                : 30,
              complexity: project.budgetEstimate > 1000000000 ? 'critical' :
                         project.budgetEstimate > 500000000 ? 'high' :
                         project.budgetEstimate > 100000000 ? 'medium' : 'low',
              clientType: 'new',
              industry: 'technology',
              teamSize: 5,
              teamExperience: 7,
              managerExperience: 8,
              technicalExpertise: 8,
              domainExpertise: 7,
              proposalQuality: 8,
              methodologyScore: 8,
              priceCompetitiveness: 7,
              valueProposition: 8,
              riskAssessment: 5,
              competitionLevel: 'medium',
              marketSize: 10000000,
              economicConditions: 'neutral',
              seasonalFactors: 0,
              winRate: project.status === 'PROPOSAL_FINALIZED' ? 1 : 0,
              averageDealSize: project.budgetEstimate || 0,
              salesCycleLength: project.endDate && project.startDate
                ? Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))
                : 30,
              conversionRate: project.proposals.length > 0 ? 1 : 0,
              relationshipStrength: 6,
              previousWins: project.requestedBy?.role === 'SALES' ? 3 : 1,
              accountAge: 12,
              contactFrequency: 4,
              technicalFit: 8,
              innovationRequired: 5,
              integrationComplexity: 6,
              supportNeeds: 4,
              responseTime: 15,
              preparationTime: 10,
              submissionTimeline: 5,
              decisionTimeline: 30
            },
            result: project.status === 'PROPOSAL_FINALIZED'
          })
        })
      } catch (error) {
        console.error('Failed to fetch training data:', error)
      }
      }

      // Train model with new data
      try {
        await winProbabilityEngine.updateModels(trainingDataArray)

        await prisma.auditLog.create({
          data: {
            userId: parseInt(session.user.id),
            action: 'win_probability_model_retrained',
            meta: JSON.stringify({
              modelType,
              trainingDataCount: trainingDataArray.length,
              retrainedBy: session.user.name,
              timestamp: new Date().toISOString()
            })
          }
        })

        return NextResponse.json({
          status: 'success',
          data: {
            modelType,
            trainingDataCount: trainingDataArray.length,
            retrainedAt: new Date().toISOString(),
            retrainedBy: session.user.name,
            modelStats: winProbabilityEngine.getModelStatistics()
          },
          message: 'Model retrained successfully'
        })

      } catch (error) {
        console.error('Failed to retrain model:', error)
        return NextResponse.json(
          {
            status: 'error',
            message: 'Failed to retrain model',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid action specified',
        data: {
          availableActions: ['retrain']
        }
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('Win probability API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process win probability request',
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

    // Check admin permissions
    const userRole = session.user.role as string
    const allowedRoles = ['ADMIN', 'SALES_MANAGER', 'BS_MANAGER']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get('predictionId')
    const clearAll = searchParams.get('clearAll') === 'true'

    if (clearAll) {
      // Clear all prediction history
      try {
        await prisma.auditLog.deleteMany({
          where: {
            action: 'win_probability_predicted'
          }
        })

        await prisma.auditLog.create({
          data: {
            userId: parseInt(session.user.id),
            action: 'win_probability_history_cleared',
            meta: JSON.stringify({
              clearedBy: session.user.name,
              timestamp: new Date().toISOString()
            })
          }
        })

        return NextResponse.json({
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            action: 'clear_all'
          },
          message: 'All prediction history cleared successfully'
        })

      } catch (error) {
        console.error('Failed to clear prediction history:', error)
        return NextResponse.json(
          {
            status: 'error',
            message: 'Failed to clear prediction history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid delete action specified',
        data: {
          availableActions: ['clear_all']
        }
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('Win probability API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete prediction data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

### **Step 4: Create Performance Trend Analysis Component**
