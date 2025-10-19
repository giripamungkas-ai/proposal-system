'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Funnel,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react'

interface PipelineStage {
  id: string
  name: string
  description: string
  count: number
  value: number
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: React.ReactNode
  conversionRate: number
  averageTime: number
  trend: 'up' | 'down' | 'stable'
}

interface PipelineMetrics {
  totalProjects: number
  totalValue: number
  averageConversion: number
  totalRevenue: number
  stages: PipelineStage[]
  timeRange: {
    start: string
    end: string
    label: string
  }
  comparison: {
    previous: {
      totalProjects: number
      totalValue: number
      conversion: number
    }
    change: {
      projects: number
      value: number
      conversion: number
    }
  }
}

interface PipelineVisualizationProps {
  projectId?: string
  timeRange?: '7d' | '30d' | '90d' | '1y'
  showComparison?: boolean
  showDetails?: boolean
  onStageClick?: (stage: PipelineStage) => void
  onExport?: (data: PipelineMetrics) => void
  onRefresh?: () => void
}

const defaultStages: PipelineStage[] = [
  {
    id: 'rfp_received',
    name: 'RFP Received',
    description: 'Request for Proposal received from client',
    count: 0,
    value: 0,
    color: 'bg-blue-100',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: <Activity className="h-5 w-5 text-blue-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  },
  {
    id: 'rfp_parsed',
    name: 'RFP Parsed',
    description: 'AI-powered RFP parsing completed',
    count: 0,
    value: 0,
    color: 'bg-purple-100',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    icon: <Target className="h-5 w-5 text-purple-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  },
  {
    id: 'proposal_created',
    name: 'Proposal Created',
    description: 'Initial proposal draft generated',
    count: 0,
    value: 0,
    color: 'bg-green-100',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  },
  {
    id: 'proposal_reviewed',
    name: 'Proposal Reviewed',
    description: 'Internal review and quality check completed',
    count: 0,
    value: 0,
    color: 'bg-yellow-100',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  },
  {
    id: 'proposal_approved',
    name: 'Proposal Approved',
    description: 'Final approval obtained from BS Manager',
    count: 0,
    value: 0,
    color: 'bg-teal-100',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
    icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  },
  {
    id: 'client_submitted',
    name: 'Client Submitted',
    description: 'Proposal submitted to client',
    count: 0,
    value: 0,
    color: 'bg-orange-100',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    icon: <Clock className="h-5 w-5 text-orange-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  },
  {
    id: 'client_won',
    name: 'Client Won',
    description: 'Client accepted proposal and contract signed',
    count: 0,
    value: 0,
    color: 'bg-emerald-100',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
    conversionRate: 0,
    averageTime: 0,
    trend: 'stable'
  }
]

export default function PipelineVisualization({
  projectId,
  timeRange = '30d',
  showComparison = true,
  showDetails = true,
  onStageClick,
  onExport,
  onRefresh
}: PipelineVisualizationProps) {
  const [metrics, setMetrics] = useState<PipelineMetrics>()
  const [stages, setStages] = useState<PipelineStage[]>(defaultStages)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)

  // Calculate time range
  const getTimeRange = (range: string) => {
    const now = new Date()
    let start: Date
    let end: Date
    let label: string

    switch (range) {
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

    return { start, end, label }
  }

  // Fetch pipeline data
  const fetchPipelineData = async () => {
    setIsLoading(true)
    try {
      const { start, end, label } = getTimeRange(timeRange)
      const response = await fetch(`/api/analytics/pipeline?projectId=${projectId}&start=${start.toISOString()}&end=${end.toISOString()}`)

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setStages(data.stages)
      } else {
        // Generate mock data for demo
        const mockData = generateMockPipelineData()
        setMetrics(mockData.metrics)
        setStages(mockData.stages)
      }
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error)
      // Generate mock data for demo
      const mockData = generateMockPipelineData()
      setMetrics(mockData.metrics)
      setStages(mockData.stages)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate mock data for demo
  const generateMockPipelineData = (): PipelineMetrics => {
    const mockStages = defaultStages.map((stage, index) => {
      const count = Math.floor(Math.random() * 20) + 5
      const value = Math.floor(Math.random() * 1000000000) + 100000000
      const conversionRate = index > 0 ? Math.floor(Math.random() * 80) + 20 : 100
      const averageTime = Math.floor(Math.random() * 5) + 1
      const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.25 ? 'down' : 'stable'

      return {
        ...stage,
        count,
        value,
        conversionRate,
        averageTime,
        trend: trend as 'up' | 'down' | 'stable'
      }
    })

    const totalProjects = mockStages.reduce((sum, stage) => sum + stage.count, 0)
    const totalValue = mockStages.reduce((sum, stage) => sum + stage.value, 0)
    const averageConversion = mockStages.filter(s => s.conversionRate > 0).reduce((sum, s) => sum + s.conversionRate, 0) / mockStages.filter(s => s.conversionRate > 0).length
    const totalRevenue = mockStages[mockStages.length - 1].value

    return {
      totalProjects,
      totalValue,
      averageConversion,
      totalRevenue,
      stages: mockStages,
      timeRange: getTimeRange(timeRange),
      comparison: {
        previous: {
          totalProjects: Math.floor(Math.random() * 20) + 5,
          totalValue: Math.floor(Math.random() * 1000000000) + 100000000,
          conversion: Math.floor(Math.random() * 80) + 20
        },
        change: {
          projects: Math.floor(Math.random() * 10) - 5,
          value: Math.floor(Math.random() * 500000000) - 250000000,
          conversion: Math.floor(Math.random() * 20) - 10
        }
      }
    }
  }

  useEffect(() => {
    fetchPipelineData()
  }, [projectId, timeRange])

  // Calculate overall conversion
  const overallConversion = useMemo(() => {
    if (!metrics || stages.length === 0) return 0
    const lastStage = stages[stages.length - 1]
    return lastStage.conversionRate
  }, [stages])

  // Calculate drop-off rates
  const dropOffRates = useMemo(() => {
    if (!stages || stages.length === 0) return []

    return stages.slice(0, -1).map((stage, index) => {
      if (index === stages.length - 2) return { ...stage, dropOffRate: 0 }

      const nextStage = stages[index + 1]
      const dropOffRate = nextStage.count > 0
        ? ((stage.count - nextStage.count) / stage.count) * 100
        : 0

      return { ...stage, dropOffRate }
    })
  }, [stages])

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Funnel className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Pipeline Visualization</CardTitle>
              <p className="text-sm text-gray-600">{metrics?.timeRange?.label || 'Last 30 Days'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPipelineData()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport && onExport(metrics)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics?.totalProjects || 0}</div>
              <div className="text-sm text-gray-600">Total Projects</div>
              {showComparison && metrics?.comparison && (
                <div className="flex items-center justify-center mt-1">
                  {metrics.comparison.change.projects > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-xs ${metrics.comparison.change.projects > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.comparison.change.projects)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(metrics?.totalValue || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
              {showComparison && metrics?.comparison && (
                <div className="flex items-center justify-center mt-1">
                  {metrics.comparison.change.value > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-xs ${metrics.comparison.change.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.comparison.change.value).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{overallConversion}%</div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
              {showComparison && metrics?.comparison && (
                <div className="flex items-center justify-center mt-1">
                  {metrics.comparison.change.conversion > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-xs ${metrics.comparison.change.conversion > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.comparison.change.conversion)}%
                  </span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(metrics?.totalRevenue || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-gray-600">Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Funnel Visualization */}
          <div className="relative">
            {/* Funnel Shape */}
            <div className="mx-auto max-w-4xl">
              {stages.map((stage, index) => (
                <div key={stage.id} className="relative">
                  {/* Funnel Stage */}
                  <div
                    className={`relative ${stage.bgColor} ${stage.borderColor} border-2 rounded-lg p-4 mb-2 cursor-pointer transition-all hover:shadow-md`}
                    style={{
                      width: `${100 - (index * 10)}%`,
                      marginLeft: `${index * 5}%`,
                      zIndex: stages.length - index
                    }}
                    onClick={() => onStageClick && onStageClick(stage)}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {stage.icon}
                        <div>
                          <h3 className={`font-semibold ${stage.textColor}`}>{stage.name}</h3>
                          <p className={`text-xs ${stage.textColor} opacity-75`}>{stage.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {stage.count}
                        </Badge>

                        {stage.trend !== 'stable' && (
                          <div className="flex items-center">
                            {stage.trend === 'up' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${stage.textColor}`}>Projects:</span>
                        <span className={`font-bold ${stage.textColor}`}>{stage.count}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${stage.textColor}`}>Value:</span>
                        <span className={`font-bold ${stage.textColor}`}>
                          {stage.value.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {stage.conversionRate > 0 && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${stage.textColor}`}>Conversion:</span>
                          <div className="flex items-center space-x-1">
                            <Progress value={stage.conversionRate} className="h-2 w-20" />
                            <span className={`text-xs ${stage.textColor}`}>{stage.conversionRate}%</span>
                          </div>
                        </div>
                      )}

                      {stage.averageTime > 0 && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${stage.textColor}`}>Avg Time:</span>
                          <span className={`text-xs ${stage.textColor}`}>{stage.averageTime} days</span>
                        </div>
                      )}
                    </div>

                    {/* Drop-off Indicator */}
                    {index < stages.length - 1 && dropOffRates[index]?.dropOffRate > 0 && (
                      <div className="absolute -bottom-2 left-0 right-0 text-center">
                        <div className="inline-flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                          <span className="font-medium">Drop-off:</span>
                          <span className="font-bold">{dropOffRates[index]?.dropOffRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connection Line */}
                  {index < stages.length - 1 && (
                    <div
                      className="absolute left-1/2 bottom-0 w-0.5 h-4 bg-gray-300"
                      style={{
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: stages.length - index - 1
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Drop-off Analysis */}
          {showDetails && (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Drop-off Analysis</h4>
              <div className="space-y-2">
                {dropOffRates.map((stage, index) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{stage.count}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{stages[index + 1]?.count || 0}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Drop-off:</span>
                        <Badge
                          variant={stage.dropOffRate > 20 ? "destructive" : stage.dropOffRate > 10 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {stage.dropOffRate.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600">
                        Value: {(stage.value - (stages[index + 1]?.value || 0)).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Stage Details */}
      {selectedStage && showDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedStage.name} Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStage(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <Badge className="mt-1">{selectedStage.status}</Badge>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Count</span>
                  <div className="text-lg font-bold text-gray-900">{selectedStage.count}</div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Total Value</span>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedStage.value.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Progress value={selectedStage.conversionRate} className="h-2 flex-1" />
                    <span className="text-sm font-bold text-gray-900">{selectedStage.conversionRate}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Average Processing Time</span>
                  <div className="text-lg font-bold text-gray-900">{selectedStage.averageTime} days</div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Trend</span>
                  <div className="flex items-center space-x-2 mt-1">
                    {selectedStage.trend === 'up' && (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    )}
                    {selectedStage.trend === 'down' && (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-bold text-gray-900 capitalize">{selectedStage.trend}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 🔥 **STEP 4: Implement Smart Notification Batching**

### **Create Smart Notification Batching System**
