/**
 * Performance Trends Analysis Component
 *
 * This component provides comprehensive performance trend analysis including:
 * - Historical win rate trends
 * - Revenue trends over time
 * - Team performance metrics
 * - Market analysis and insights
 * - Predictive trend forecasting
 * - Interactive chart visualizations
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Users,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  Zap,
  Eye,
  Settings
} from 'lucide-react'

interface TrendData {
  date: string
  value: number
  change?: number
  changePercent?: number
  predicted?: boolean
}

interface TrendMetrics {
  totalProjects: number
  totalRevenue: number
  winRate: number
  averageDealSize: number
  totalTeamMembers: number
  totalProposals: number
  totalClients: number
  averageProjectDuration: number
  clientSatisfaction: number
  teamEfficiency: number
  marketShare: number
  competitiveIndex: number
}

interface TrendAnalysis {
  period: {
    start: Date
    end: Date
    label: string
  }
  currentPeriod: TrendMetrics
  previousPeriod: TrendMetrics
  trends: {
    winRate: TrendData[]
    revenue: TrendData[]
    projects: TrendData[]
    teamPerformance: TrendData[]
    marketShare: TrendData[]
    clientSatisfaction: TrendData[]
  }
  predictions: {
    winRate: TrendData[]
    revenue: TrendData[]
    projects: TrendData[]
    confidence: number
  }
  insights: {
    positive: Array<{ title: string; description: string; impact: string }>
    negative: Array<{ title: string; description: string; impact: string }>
    neutral: Array<{ title: string; description: string; impact: string }>
  }
  recommendations: Array<{
    type: 'strategic' | 'operational' | 'tactical'
    priority: 'high' | 'medium' | 'low'
    action: string
    expectedOutcome: string
    timeline: string
  }>
}

interface PerformanceTrendsProps {
  projectId?: string
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'custom'
  customRange?: {
    start: string
    end: string
  }
  showPredictions?: boolean
  showRecommendations?: boolean
  allowCustomization?: boolean
  onExport?: (data: TrendAnalysis) => void
  onRefresh?: () => void
}

const defaultTrendAnalysis: TrendAnalysis = {
  period: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 30 Days'
  },
  currentPeriod: {
    totalProjects: 45,
    totalRevenue: 2500000000,
    winRate: 0.68,
    averageDealSize: 55000000,
    totalTeamMembers: 12,
    totalProposals: 67,
    totalClients: 23,
    averageProjectDuration: 45,
    clientSatisfaction: 4.2,
    teamEfficiency: 0.85,
    marketShare: 0.12,
    competitiveIndex: 0.78
  },
  previousPeriod: {
    totalProjects: 38,
    totalRevenue: 2100000000,
    winRate: 0.62,
    averageDealSize: 48000000,
    totalTeamMembers: 10,
    totalProposals: 55,
    totalClients: 20,
    averageProjectDuration: 52,
    clientSatisfaction: 4.0,
    teamEfficiency: 0.78,
    marketShare: 0.10,
    competitiveIndex: 0.72
  },
  trends: {
    winRate: [],
    revenue: [],
    projects: [],
    teamPerformance: [],
    marketShare: [],
    clientSatisfaction: []
  },
  predictions: {
    winRate: [],
    revenue: [],
    projects: [],
    confidence: 0.85
  },
  insights: {
    positive: [],
    negative: [],
    neutral: []
  },
  recommendations: []
}

export default function PerformanceTrends({
  projectId,
  timeRange = '30d',
  customRange,
  showPredictions = true,
  showRecommendations = true,
  allowCustomization = true,
  onExport,
  onRefresh
}: PerformanceTrendsProps) {
  const [analysis, setAnalysis] = useState<TrendAnalysis>(defaultTrendAnalysis)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<string>('winRate')
  const [comparisonMode, setComparisonMode] = useState<'period' | 'year'>('period')
  const [forecastEnabled, setForecastEnabled] = useState(showPredictions)

  // Generate mock trend data
  const generateTrendData = (metric: string, period: number): TrendData[] => {
    const data: TrendData[] = []
    const now = new Date()

    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      const baseValue = Math.random() * 100 + 50
      const trend = Math.sin(i * 0.5) * 20
      const noise = (Math.random() - 0.5) * 10

      let value = baseValue + trend + noise
      let change = i > 0 ? value - data[period - i - 1]?.value : 0
      let changePercent = change > 0 ? (change / data[period - i - 1]?.value) * 100 : 0

      // Adjust based on metric type
      switch (metric) {
        case 'winRate':
          value = Math.min(100, Math.max(0, value))
          break
        case 'revenue':
          value = value * 1000000
          change = change * 1000000
          break
        case 'projects':
          value = Math.floor(value)
          break
        case 'clientSatisfaction':
          value = Math.min(5, Math.max(1, value))
          break
        case 'teamEfficiency':
          value = Math.min(1, Math.max(0, value / 100))
          break
      }

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

  // Generate predictions
  const generatePredictions = (historicalData: TrendData[], periods: number): TrendData[] => {
    const predictions: TrendData[] = []
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

  // Calculate trend
  const calculateTrend = (data: TrendData[]): number => {
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

  // Fetch trend analysis data
  const fetchTrendAnalysis = useCallback(async () => {
    setIsLoading(true)
    try {
      // In production, this would fetch from API
      // For now, generate mock data
      const mockAnalysis: TrendAnalysis = {
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
          label: 'Last 30 Days'
        },
        currentPeriod: {
          totalProjects: 45,
          totalRevenue: 2500000000,
          winRate: 0.68,
          averageDealSize: 55000000,
          totalTeamMembers: 12,
          totalProposals: 67,
          totalClients: 23,
          averageProjectDuration: 45,
          clientSatisfaction: 4.2,
          teamEfficiency: 0.85,
          marketShare: 0.12,
          competitiveIndex: 0.78
        },
        previousPeriod: {
          totalProjects: 38,
          totalRevenue: 2100000000,
          winRate: 0.62,
          averageDealSize: 48000000,
          totalTeamMembers: 10,
          totalProposals: 55,
          totalClients: 20,
          averageProjectDuration: 52,
          clientSatisfaction: 4.0,
          teamEfficiency: 0.78,
          marketShare: 0.10,
          competitiveIndex: 0.72
        },
        trends: {
          winRate: generateTrendData('winRate', 30),
          revenue: generateTrendData('revenue', 30),
          projects: generateTrendData('projects', 30),
          teamPerformance: generateTrendData('teamEfficiency', 30),
          marketShare: generateTrendData('marketShare', 30),
          clientSatisfaction: generateTrendData('clientSatisfaction', 30)
        },
        predictions: {
          winRate: generatePredictions(generateTrendData('winRate', 30), 12),
          revenue: generatePredictions(generateTrendData('revenue', 30), 12),
          projects: generatePredictions(generateTrendData('projects', 30), 12),
          confidence: 0.85
        },
        insights: {
          positive: [
            {
              title: 'Win Rate Improvement',
              description: 'Win rate improved by 9.7% compared to previous period',
              impact: 'High'
            },
            {
              title: 'Revenue Growth',
              description: 'Revenue increased by 19% indicating strong market performance',
              impact: 'High'
            },
            {
              title: 'Team Efficiency',
              description: 'Team efficiency improved by 9% showing better resource utilization',
              impact: 'Medium'
            }
          ],
          negative: [
            {
              title: 'Project Duration',
              description: 'Average project duration increased by 13% indicating complexity',
              impact: 'Medium'
            },
            {
              title: 'Competition',
              description: 'Competitive index suggests increased market competition',
              impact: 'Low'
            }
          ],
          neutral: [
            {
              title: 'Team Size',
              description: 'Team size remained stable indicating steady workload',
              impact: 'Low'
            }
          ]
        },
        recommendations: [
          {
            type: 'strategic',
            priority: 'high',
            action: 'Focus on high-value projects to maximize revenue',
            expectedOutcome: 'Increase average deal size by 15%',
            timeline: 'Next quarter'
          },
          {
            type: 'operational',
            priority: 'medium',
            action: 'Optimize project management to reduce duration',
            expectedOutcome: 'Improve project completion rate by 10%',
            timeline: 'Next month'
          },
          {
            type: 'tactical',
            priority: 'low',
            action: 'Enhance team training to improve efficiency',
            expectedOutcome: 'Increase team efficiency by 5%',
            timeline: 'Next 2 months'
          }
        ]
      }

      setAnalysis(mockAnalysis)
    } catch (error) {
      console.error('Failed to fetch trend analysis:', error)
      setAnalysis(defaultTrendAnalysis)
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize component
  useEffect(() => {
    fetchTrendAnalysis()
  }, [timeRange, customRange])

  // Calculate period comparison
  const periodComparison = useMemo(() => {
    const current = analysis.currentPeriod
    const previous = analysis.previousPeriod

    return {
      projects: {
        current: current.totalProjects,
        previous: previous.totalProjects,
        change: current.totalProjects - previous.totalProjects,
        changePercent: ((current.totalProjects - previous.totalProjects) / previous.totalProjects) * 100
      },
      revenue: {
        current: current.totalRevenue,
        previous: previous.totalRevenue,
        change: current.totalRevenue - previous.totalRevenue,
        changePercent: ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
      },
      winRate: {
        current: current.winRate,
        previous: previous.winRate,
        change: current.winRate - previous.winRate,
        changePercent: ((current.winRate - previous.winRate) / previous.winRate) * 100
      },
      efficiency: {
        current: current.teamEfficiency,
        previous: previous.teamEfficiency,
        change: current.teamEfficiency - previous.teamEfficiency,
        changePercent: ((current.teamEfficiency - previous.teamEfficiency) / previous.teamEfficiency) * 100
      }
    }
  }, [analysis])

  // Get trend data for selected metric
  const getTrendData = useCallback((metric: string): TrendData[] => {
    switch (metric) {
      case 'winRate':
        return analysis.trends.winRate
      case 'revenue':
        return analysis.trends.revenue
      case 'projects':
        return analysis.trends.projects
      case 'teamPerformance':
        return analysis.trends.teamPerformance
      case 'marketShare':
        return analysis.trends.marketShare
      case 'clientSatisfaction':
        return analysis.trends.clientSatisfaction
      default:
        return analysis.trends.winRate
    }
  }, [analysis])

  // Get predictions for selected metric
  const getPredictions = useCallback((metric: string): TrendData[] => {
    switch (metric) {
      case 'winRate':
        return analysis.predictions.winRate
      case 'revenue':
        return analysis.predictions.revenue
      case 'projects':
        return analysis.predictions.projects
      default:
        return analysis.predictions.winRate
    }
  }, [analysis])

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  // Get trend icon
  const getTrendIcon = (change: number, predicted: boolean = false) => {
    if (predicted) {
      return <Clock className="h-4 w-4 text-blue-500" />
    }
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : change < 0 ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <Activity className="h-4 w-4 text-gray-500" />
    )
  }

  // Get trend color
  const getTrendColor = (change: number, predicted: boolean = false) => {
    if (predicted) {
      return 'text-blue-600'
    }
    return change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Performance Trends Analysis</CardTitle>
              <p className="text-sm text-gray-600">{analysis.period.label}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTrendAnalysis()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport && onExport(analysis)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setForecastEnabled(!forecastEnabled)}
            >
              <Zap className="h-4 w-4 mr-2" />
              {forecastEnabled ? 'Hide' : 'Show'} Forecast
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Key Metrics Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{periodComparison.projects.current}</div>
              <div className="text-sm text-gray-600">Total Projects</div>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(periodComparison.projects.change)}
                <span className={`text-xs ${getTrendColor(periodComparison.projects.change)} ml-1`}>
                  {periodComparison.projects.change > 0 ? '+' : ''}{periodComparison.projects.change}
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(periodComparison.revenue.current)}</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(periodComparison.revenue.change)}
                <span className={`text-xs ${getTrendColor(periodComparison.revenue.change)} ml-1`}>
                  {periodComparison.revenue.changePercent > 0 ? '+' : ''}{periodComparison.revenue.changePercent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatPercentage(periodComparison.winRate.current)}</div>
              <div className="text-sm text-gray-600">Win Rate</div>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(periodComparison.winRate.change)}
                <span className={`text-xs ${getTrendColor(periodComparison.winRate.change)} ml-1`}>
                  {periodComparison.winRate.changePercent > 0 ? '+' : ''}{periodComparison.winRate.changePercent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatPercentage(periodComparison.efficiency.current)}</div>
              <div className="text-sm text-gray-600">Team Efficiency</div>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(periodComparison.efficiency.change)}
                <span className={`text-xs ${getTrendColor(periodComparison.efficiency.change)} ml-1`}>
                  {periodComparison.efficiency.changePercent > 0 ? '+' : ''}{periodComparison.efficiency.changePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="winRate">Win Rate</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="teamPerformance">Team Performance</TabsTrigger>
              <TabsTrigger value="marketShare">Market Share</TabsTrigger>
              <TabsTrigger value="clientSatisfaction">Client Satisfaction</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs value={selectedMetric} className="mt-4">
            <TabsContent value="winRate" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Win Rate Trend</h3>
                <Badge variant="outline">
                  {analysis.currentPeriod.winRate > 0.7 ? 'Excellent' :
                   analysis.currentPeriod.winRate > 0.5 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>

              {/* Line Chart */}
              <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                <div className="h-full flex items-end justify-between">
                  {getTrendData('winRate').map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs text-gray-500">{point.date}</div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {formatPercentage(point.value)}
                      </div>
                      {point.predicted && (
                        <div className="w-2 h-2 bg-blue-300 rounded-full mt-1 border-2 border-blue-500 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Current Win Rate</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(analysis.currentPeriod.winRate)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Period Change</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(periodComparison.winRate.change)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Forecast (Next 30d)</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(getPredictions('winRate')[0]?.value || analysis.currentPeriod.winRate)}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <Badge variant="outline">
                  {periodComparison.revenue.changePercent > 15 ? 'Excellent Growth' :
                   periodComparison.revenue.changePercent > 5 ? 'Good Growth' : 'Slow Growth'}
                </Badge>
              </div>

              {/* Revenue Chart */}
              <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                <div className="h-full flex items-end justify-between">
                  {getTrendData('revenue').map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs text-gray-500">{point.date}</div>
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {formatCurrency(point.value)}
                      </div>
                      {point.predicted && (
                        <div className="w-2 h-2 bg-green-300 rounded-full mt-1 border-2 border-green-500 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Current Revenue</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(analysis.currentPeriod.totalRevenue)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Period Change</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(periodComparison.revenue.change)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Forecast (Next 30d)</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(getPredictions('revenue')[0]?.value || analysis.currentPeriod.totalRevenue)}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Project Volume Trend</h3>
                <Badge variant="outline">
                  {periodComparison.projects.change > 0 ? 'Growing' : 'Stable'}
                </Badge>
              </div>

              {/* Projects Chart */}
              <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                <div className="h-full flex items-end justify-between">
                  {getTrendData('projects').map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs text-gray-500">{point.date}</div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1"></div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {point.value}
                      </div>
                      {point.predicted && (
                        <div className="w-2 h-2 bg-purple-300 rounded-full mt-1 border-2 border-purple-500 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Current Projects</div>
                  <div className="text-lg font-bold text-gray-900">
                    {analysis.currentPeriod.totalProjects}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Period Change</div>
                  <div className="text-lg font-bold text-gray-900">
                    {periodComparison.projects.change > 0 ? '+' : ''}{periodComparison.projects.change}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Forecast (Next 30d)</div>
                  <div className="text-lg font-bold text-gray-900">
                    {getPredictions('projects')[0]?.value || analysis.currentPeriod.totalProjects}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="teamPerformance" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
                <Badge variant="outline">
                  {periodComparison.efficiency.change > 0 ? 'Improving' : 'Stable'}
                </Badge>
              </div>

              {/* Performance Chart */}
              <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                <div className="h-full flex items-end justify-between">
                  {getTrendData('teamPerformance').map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs text-gray-500">{point.date}</div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-1"></div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {formatPercentage(point.value)}
                      </div>
                      {point.predicted && (
                        <div className="w-2 h-2 bg-orange-300 rounded-full mt-1 border-2 border-orange-500 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Current Efficiency</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(analysis.currentPeriod.teamEfficiency)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Period Change</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(periodComparison.efficiency.change)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Forecast (Next 30d)</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(getPredictions('teamPerformance')[0]?.value || analysis.currentPeriod.teamEfficiency)}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="marketShare" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Market Share</h3>
                <Badge variant="outline">
                  {analysis.currentPeriod.marketShare > 0.15 ? 'Strong Position' : 'Developing'}
                </Badge>
              </div>

              {/* Market Share Chart */}
              <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                <div className="h-full flex items-end justify-between">
                  {getTrendData('marketShare').map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs text-gray-500">{point.date}</div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full mt-1"></div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {formatPercentage(point.value)}
                      </div>
                      {point.predicted && (
                        <div className="w-2 h-2 bg-teal-300 rounded-full mt-1 border-2 border-teal-500 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Share Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Current Market Share</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(analysis.currentPeriod.marketShare)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Period Change</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(analysis.currentPeriod.marketShare - analysis.previousPeriod.marketShare)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Forecast (Next 30d)</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(getPredictions('marketShare')[0]?.value || analysis.currentPeriod.marketShare)}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="clientSatisfaction" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Client Satisfaction</h3>
                <Badge variant="outline">
                  {analysis.currentPeriod.clientSatisfaction > 4.2 ? 'Excellent' :
                   analysis.currentPeriod.clientSatisfaction > 3.8 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>

              {/* Satisfaction Chart */}
              <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                <div className="h-full flex items-end justify-between">
                  {getTrendData('clientSatisfaction').map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs text-gray-500">{point.date}</div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full mt-1"></div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {point.value.toFixed(1)}
                      </div>
                      {point.predicted && (
                        <div className="w-2 h-2 bg-pink-300 rounded-full mt-1 border-2 border-pink-500 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Satisfaction Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Current Satisfaction</div>
                  <div className="text-lg font-bold text-gray-900">
                    {analysis.currentPeriod.clientSatisfaction.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Period Change</div>
                  <div className="text-lg font-bold text-gray-900">
                    {(analysis.currentPeriod.clientSatisfaction - analysis.previousPeriod.clientSatisfaction).toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Forecast (Next 30d)</div>
                  <div className="text-lg font-bold text-gray-900">
                    {getPredictions('clientSatisfaction')[0]?.value.toFixed(1) || analysis.currentPeriod.clientSatisfaction.toFixed(1)}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      {showRecommendations && (
        <div className="space-y-6">
          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-700 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Positive Insights
                  </h4>
                  <div className="space-y-2">
                    {analysis.insights.positive.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                        <div>
                          <div className="font-medium text-green-800">{insight.title}</div>
                          <p className="text-sm text-green-700 mt-1">{insight.description}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {insight.impact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-red-700 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Areas for Improvement
                  </h4>
                  <div className="space-y-2">
                    {analysis.insights.negative.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                        <div>
                          <div className="font-medium text-red-800">{insight.title}</div>
                          <p className="text-sm text-red-700 mt-1">{insight.description}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {insight.impact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Observations
                  </h4>
                  <div className="space-y-2">
                    {analysis.insights.neutral.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0 w-2 h-2 bg-gray-500 rounded-full mt-1"></div>
                        <div>
                          <div className="font-medium text-gray-800">{insight.title}</div>
                          <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {insight.impact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actionable Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${
                      rec.priority === 'high' ? 'bg-red-500' :
                      rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">{rec.action}</div>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.expectedOutcome}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {rec.type}
                        </Badge>
                        <span className="text-xs text-gray-500">{rec.timeline}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
```

### **Step 5: Create Performance Trend Analysis API Endpoint**
