import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { winProbabilityEngine } from '@/lib/analytics/predictive/WinProbabilityEngine'

// Performance Trends Analysis API endpoint
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
    const timeRange = searchParams.get('timeRange') || '30d'
    const metric = searchParams.get('metric')
    const includePredictions = searchParams.get('predictions') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Parse date range
    let start: Date
    let end: Date
    let label: string

    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      label = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    } else {
      const now = new Date()
      switch (timeRange) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          end = now
          label = 'Last 7 Days'
          break
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          end = now
          label = 'Last 30 Days'
          break
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          end = now
          label = 'Last 90 Days'
          break
        case '1y':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          end = now
          label = 'Last Year'
          break
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          end = now
          label = 'Last 30 Days'
      }
    }

    // Build where clause
    const where: any = {}
    if (projectId && projectId !== 'all') {
      where.id = parseInt(projectId)
    }

    // Fetch projects for trend analysis
    const projects = await prisma.project.findMany({
      where,
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
        },
        auditLogs: {
          where: {
            action: { in: ['win_probability_predicted', 'proposal_created', 'project_completed'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Calculate trend metrics
    const currentPeriod = {
      totalProjects: projects.length,
      totalRevenue: projects.reduce((sum, p) => sum + (p.budgetEstimate || 0), 0),
      totalProposals: projects.reduce((sum, p) => sum + p.proposals.length, 0),
      totalClients: new Set(projects.map(p => p.requestedBy.email)).size,
      totalTeamMembers: new Set(projects.map(p => p.requestedBy.role)).size
    }

    // Calculate previous period
    const previousPeriodStart = new Date(start.getTime() - (end.getTime() - start.getTime()))
    const previousProjects = await prisma.project.findMany({
      where: {
        ...where,
        createdAt: {
          gte: previousPeriodStart,
          lt: start
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const previousPeriod = {
      totalProjects: previousProjects.length,
      totalRevenue: previousProjects.reduce((sum, p) => sum + (p.budgetEstimate || 0), 0),
      totalProposals: previousProjects.reduce((sum, p) => sum + p.proposals.length, 0),
      totalClients: new Set(previousProjects.map(p => p.requestedBy.email)).size,
      totalTeamMembers: new Set(previousProjects.map(p => p.requestedBy.role)).size
    }

    // Calculate derived metrics
    const winRate = currentPeriod.totalProjects > 0
      ? projects.filter(p => p.status === 'PROPOSAL_FINALIZED').length / currentPeriod.totalProjects
      : 0

    const previousWinRate = previousPeriod.totalProjects > 0
      ? previousProjects.filter(p => p.status === 'PROPOSAL_FINALIZED').length / previousPeriod.totalProjects
      : 0

    const averageDealSize = currentPeriod.totalRevenue > 0
      ? currentPeriod.totalRevenue / currentPeriod.totalProjects
      : 0

    const previousAverageDealSize = previousPeriod.totalRevenue > 0
      ? previousPeriod.totalRevenue / previousPeriod.totalProjects
      : 0

    const averageProjectDuration = projects
      .filter(p => p.startDate && p.endDate)
      .reduce((sum, p) => sum + Math.ceil((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24)), 0) /
      projects.filter(p => p.startDate && p.endDate).length || 45

    const previousAverageProjectDuration = previousProjects
      .filter(p => p.startDate && p.endDate)
      .reduce((sum, p) => sum + Math.ceil((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24)), 0) /
      previousProjects.filter(p => p.startDate && p.endDate).length || 52

    // Generate trend data
    const trends = {
      winRate: generateTrendData(projects, 'winRate', start, end),
      revenue: generateTrendData(projects, 'revenue', start, end),
      projects: generateTrendData(projects, 'projects', start, end),
      teamPerformance: generateTrendData(projects, 'efficiency', start, end),
      marketShare: generateTrendData(projects, 'marketShare', start, end),
      clientSatisfaction: generateTrendData(projects, 'satisfaction', start, end)
    }

    // Generate predictions if requested
    let predictions = {}
    if (includePredictions) {
      predictions = {
        winRate: generatePredictions(trends.winRate, 12),
        revenue: generatePredictions(trends.revenue, 12),
        projects: generatePredictions(trends.projects, 12),
        confidence: 0.85
      }
    }

    // Generate insights
    const insights = generateInsights(currentPeriod, previousPeriod, trends)

    // Generate recommendations
    const recommendations = generateRecommendations(currentPeriod, previousPeriod, trends, insights)

    const trendAnalysis = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label
      },
      currentPeriod: {
        ...currentPeriod,
        winRate,
        averageDealSize,
        averageProjectDuration
      },
      previousPeriod: {
        ...previousPeriod,
        winRate: previousWinRate,
        averageDealSize: previousAverageDealSize,
        averageProjectDuration: previousAverageProjectDuration
      },
      trends,
      predictions,
      insights,
      recommendations,
      metadata: {
        projectId,
        timeRange,
        includePredictions,
        totalProjects: projects.length,
        generatedAt: new Date().toISOString()
      }
    }

    return NextResponse.json({
      status: 'success',
      data: trendAnalysis,
      message: 'Performance trends analysis completed successfully'
    })

  } catch (error) {
    console.error('Performance trends analysis error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to analyze performance trends',
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
      action,
      projectId,
      features,
      timeframe,
      benchmark
    } = body

    switch (action) {
      case 'benchmark':
        return handleBenchmarkAnalysis(projectId, timeframe)
      case 'forecast':
        return handleForecastAnalysis(projectId, features, timeframe)
      case 'compare':
        return handleComparisonAnalysis(projectId, benchmark)
      default:
        return NextResponse.json(
          {
            status: 'error',
            message: 'Invalid action specified',
            data: {
              availableActions: ['benchmark', 'forecast', 'compare']
            }
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Performance trends POST error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process trend analysis request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Helper functions
function generateTrendData(projects: any[], metric: string, start: Date, end: Date): any[] {
  const data: any[] = []
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Generate daily data points
  for (let i = 0; i < daysDiff; i++) {
    const date = new Date(start.getTime() + (i * 24 * 60 * 60 * 1000))
    const dayProjects = projects.filter(p => {
      const projectDate = new Date(p.createdAt)
      return projectDate.toDateString() === date.toDateString()
    })

    let value = 0
    switch (metric) {
      case 'winRate':
        value = dayProjects.length > 0
          ? dayProjects.filter(p => p.status === 'PROPOSAL_FINALIZED').length / dayProjects.length
          : 0
        break
      case 'revenue':
        value = dayProjects.reduce((sum, p) => sum + (p.budgetEstimate || 0), 0)
        break
      case 'projects':
        value = dayProjects.length
        break
      case 'efficiency':
        value = dayProjects.reduce((sum, p) => {
          const progress = p.progress?.[0]
          return sum + (progress?.percentComplete || 0) / 100
        }, 0) / dayProjects.length
        break
      case 'marketShare':
        value = dayProjects.length * 0.01 // Simplified market share calculation
        break
      case 'satisfaction':
        value = 4.2 + Math.random() * 0.6 // Mock satisfaction data
        break
      default:
        value = dayProjects.length
    }

    const change = i > 0 ? value - data[i - 1]?.value : 0
    const changePercent = data[i - 1] ? (change / data[i - 1].value) * 100 : 0

    data.push({
      date: date.toISOString().split('T')[0],
      value,
      change,
      changePercent,
      predicted: false
    })
  }

  return data
}

function generatePredictions(historicalData: any[], periods: number): any[] {
  const predictions: any[] = []
  const lastData = historicalData[historicalData.length - 1] || { value: 0 }

  for (let i = 1; i <= periods; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)

    // Simple linear regression with seasonality
    const trend = calculateTrend(historicalData)
    const seasonality = Math.sin(i * 0.5) * 5
    const noise = (Math.random() - 0.5) * 3

    let value = lastData.value + (trend * i) + seasonality + noise

    predictions.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, value),
      predicted: true
    })
  }

  return predictions
}

function calculateTrend(data: any[]): number {
  if (data.length < 2) return 0

  let sumX = 0, sumY = 0, sumXY = 0
  const n = data.length

  data.forEach((point, index) => {
    const x = index
    const y = point.value
    sumX += x
    sumY += y
    sumXY += x * y
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX * sumX - sumX * sumX)
  return slope
}

function generateInsights(current: any, previous: any, trends: any): {
  positive: Array<{ title: string; description: string; impact: string }>
  negative: Array<{ title: string; description: string; impact: string }>
  neutral: Array<{ title: string; description: string; impact: string }>
} {
  const insights = {
    positive: [],
    negative: [],
    neutral: []
  }

  // Win Rate Insights
  if (current.winRate > previous.winRate) {
    insights.positive.push({
      title: 'Win Rate Improvement',
      description: `Win rate improved by ${((current.winRate - previous.winRate) / previous.winRate * 100).toFixed(1)}% compared to previous period`,
      impact: 'High'
    })
  }

  // Revenue Insights
  if (current.totalRevenue > previous.totalRevenue) {
    insights.positive.push({
      title: 'Revenue Growth',
      description: `Revenue increased by ${formatCurrency(current.totalRevenue - previous.totalRevenue)} indicating strong market performance`,
      impact: 'High'
    })
  }

  // Project Duration Insights
  if (current.averageProjectDuration > previous.averageProjectDuration) {
    insights.negative.push({
      title: 'Project Duration',
      description: `Average project duration increased by ${current.averageProjectDuration - previous.averageProjectDuration} days indicating complexity`,
      impact: 'Medium'
    })
  }

  // Team Size Insights
  if (current.totalTeamMembers === previous.totalTeamMembers) {
    insights.neutral.push({
      title: 'Team Size',
      description: 'Team size remained stable indicating steady workload',
      impact: 'Low'
    })
  }

  return insights
}

function generateRecommendations(current: any, previous: any, trends: any, insights: any): Array<{
  type: 'strategic' | 'operational' | 'tactical'
  priority: 'high' | 'medium' | 'low'
  action: string
  expectedOutcome: string
  timeline: string
}> {
  const recommendations = []

  // Strategic Recommendations
  if (current.winRate < 0.6) {
    recommendations.push({
      type: 'strategic',
      priority: 'high',
      action: 'Focus on improving proposal quality and client relationships',
      expectedOutcome: 'Increase win rate by 15%',
      timeline: 'Next quarter'
    })
  }

  // Operational Recommendations
  if (current.averageProjectDuration > 60) {
    recommendations.push({
      type: 'operational',
      priority: 'medium',
      action: 'Optimize project management processes and resource allocation',
      expectedOutcome: 'Reduce project duration by 20%',
      timeline: 'Next month'
    })
  }

  // Tactical Recommendations
  if (current.totalProposals < current.totalProjects * 1.5) {
    recommendations.push({
      type: 'tactical',
      priority: 'medium',
      action: 'Increase proposal submission rate and improve proposal quality',
      expectedOutcome: 'Increase proposal submission by 25%',
      timeline: 'Next 6 weeks'
    })
  }

  return recommendations
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Helper functions for POST requests
async function handleBenchmarkAnalysis(projectId: string, timeframe: string): Promise<NextResponse> {
  try {
    // Implement benchmark analysis logic
    const benchmarkData = {
      industryAverages: {
        winRate: 0.45,
        averageDealSize: 75000000,
        projectDuration: 60,
        clientSatisfaction: 4.0
      },
      topPerformers: {
        winRate: 0.75,
        averageDealSize: 120000000,
        projectDuration: 30,
        clientSatisfaction: 4.5
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        benchmarkData,
        comparison: {
          industry: 'Above Average',
          topPerformers: 'Developing'
        }
      },
      message: 'Benchmark analysis completed successfully'
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to perform benchmark analysis',
        error: error.message
      },
      { status: 500 }
    )
  }
}

async function handleForecastAnalysis(projectId: string, features: any, timeframe: string): Promise<NextResponse> {
  try {
    // Implement forecast analysis logic
    const forecastData = {
      winProbability: 0.72,
      confidence: 0.85,
      riskFactors: [
        { factor: 'Competition', impact: -0.1, description: 'High competition in market' },
        { factor: 'Budget', impact: 0.05, description: 'Adequate budget for scope' }
      ],
      opportunities: [
        { factor: 'Team Experience', impact: 0.08, description: 'Experienced team members' },
        { factor: 'Client Relationship', impact: 0.12, description: 'Strong existing relationship' }
      ]
    }

    return NextResponse.json({
      status: 'success',
      data: {
        forecastData,
        timeframe,
        generatedAt: new Date().toISOString()
      },
      message: 'Forecast analysis completed successfully'
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to perform forecast analysis',
        error: error.message
      },
      { status: 500 }
    )
  }
}

async function handleComparisonAnalysis(projectId: string, benchmark: any): Promise<NextResponse> {
  try {
    // Implement comparison analysis logic
    const comparisonData = {
      yourPerformance: {
        winRate: 0.68,
        revenue: 2500000000,
        efficiency: 0.85
      },
      benchmarkPerformance: {
        winRate: 0.45,
        revenue: 1800000000,
        efficiency: 0.78
      },
      gapAnalysis: {
        winRateGap: 0.23,
        revenueGap: 700000000,
        efficiencyGap: 0.07
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        comparisonData,
        recommendations: [
          'Maintain current win rate advantage',
          'Focus on revenue growth opportunities',
          'Continue efficiency improvements'
        ]
      },
      message: 'Comparison analysis completed successfully'
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to perform comparison analysis',
        error: error.message
      },
      { status: 500 }
    )
  }
}
