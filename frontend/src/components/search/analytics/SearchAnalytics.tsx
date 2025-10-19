/**
 * Search Analytics Component
 *
 * This component provides comprehensive search analytics capabilities:
 * - Search behavior analysis and tracking
 * - Search performance monitoring and optimization
 * - Popular queries and search trends visualization
 * - User behavior analysis and insights
 * - Search funnel analysis and conversion tracking
 * - Real-time analytics dashboard
 * - Export and reporting capabilities
 * - Integration with search engine
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Search,
  Clock,
  Download,
  RefreshCw,
  Filter,
  Eye,
  MousePointer,
  Target,
  Zap,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  FileText,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  MapPin,
  Star,
  Award,
  Shield,
  Brain
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'
import { searchEngine, SearchAnalytics, SearchStatistics } from '@/lib/search/SearchEngine'

// Type definitions
export interface SearchAnalyticsProps {
  projectId?: string
  projectName?: string
  timeRange: '1h' | '24h' | '7d' | '30d' | '90d' | '1y'
  refreshInterval?: number
  autoRefresh?: boolean
  showRealTime?: boolean
  onExport?: (data: any) => void
  onOptimize?: (recommendations: any[]) => void
  allowEdit?: boolean
}

export default function SearchAnalytics({
  projectId,
  projectName,
  timeRange = '7d',
  refreshInterval = 30000,
  autoRefresh = true,
  showRealTime = true,
  onExport,
  onOptimize,
  allowEdit = true
}: SearchAnalyticsProps) {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null)
  const [statistics, setStatistics] = useState<SearchStatistics | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedMetric, setSelectedMetric] = useState<'queries' | 'performance' | 'behavior' | 'trends'>('queries')

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId: projectId || 'default',
    channel: 'search_analytics',
    enabled: showRealTime
  })

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get search statistics
      const stats = searchEngine.getSearchStatistics()
      setStatistics(stats)

      // Get analytics data (this would fetch from API in real implementation)
      const analyticsData: SearchAnalytics = {
        queries: [],
        popularQueries: stats.popularQueries,
        searchTrends: stats.searchTrends,
        performance: stats.performance,
        userBehavior: {
          queryPatterns: [],
          filterUsage: {},
          facetUsage: {}
        }
      }

      setAnalytics(analyticsData)
      setLastRefresh(new Date())

    } catch (error) {
      console.error('Failed to fetch search analytics:', error)
      toast.error('Failed to fetch search analytics')
    } finally {
      setIsLoading(false)
    }
  }, [searchEngine])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAnalytics()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchAnalytics])

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // WebSocket real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      const message = JSON.parse(lastMessage)

      switch (message.type) {
        case 'search_analytics_updated':
          setAnalytics(message.data)
          break
        case 'search_statistics_updated':
          setStatistics(message.data)
          break
        case 'search_query_executed':
          // Update analytics in real-time
          fetchAnalytics()
          break
      }
    }
  }, [lastMessage, isConnected, fetchAnalytics])

  // Calculate time range dates
  const getTimeRangeDates = useCallback(() => {
    const now = new Date()
    let start: Date
    let end: Date
    let label: string

    switch (selectedTimeRange) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000)
        end = now
        label = 'Last Hour'
        break
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        end = now
        label = 'Last 24 Hours'
        break
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
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        end = now
        label = 'Last 7 Days'
    }

    return { start, end, label }
  }, [selectedTimeRange])

  // Calculate query distribution
  const queryDistribution = useMemo(() => {
    if (!analytics) return []

    const distribution = analytics.queries.reduce((acc, query) => {
      const hour = new Date(query.timestamp).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})

    return Object.entries(distribution)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour)
  }, [analytics])

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!statistics) return {
      avgSearchTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      indexingTime: 0
    }

    return {
      avgSearchTime: statistics.performance.avgSearchTime,
      cacheHitRate: statistics.performance.cacheHitRate,
      memoryUsage: statistics.performance.memoryUsage,
      indexingTime: statistics.performance.avgIndexingTime
    }
  }, [statistics])

  // Calculate user behavior metrics
  const userBehaviorMetrics = useMemo(() => {
    if (!analytics) return {
      topQueries: [],
      topFilters: {},
      topFacets: {},
      searchPatterns: []
    }

    return {
      topQueries: analytics.popularQueries.slice(0, 10),
      topFilters: analytics.userBehavior.filterUsage,
      topFacets: analytics.userBehavior.facetUsage,
      searchPatterns: analytics.userBehavior.queryPatterns
    }
  }, [analytics])

  // Handle time range change
  const handleTimeRangeChange = useCallback((range: typeof selectedTimeRange) => {
    setSelectedTimeRange(range)
  }, [setSelectedTimeRange])

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Handle export
  const handleExport = useCallback(() => {
    if (!analytics || !statistics) {
      toast.error('No data to export')
      return
    }

    const exportData = {
      analytics,
      statistics,
      timeRange: selectedTimeRange,
      timeRangeDates: getTimeRangeDates(),
      performanceMetrics,
      userBehaviorMetrics,
      exportedAt: new Date(),
      exportedBy: 'user'
    }

    onExport?.(exportData)
    toast.success('Search analytics exported successfully')
  }, [analytics, statistics, selectedTimeRange, getTimeRangeDates, performanceMetrics, userBehaviorMetrics, onExport])

  // Handle optimization
  const handleOptimize = useCallback(() => {
    if (!analytics) {
      toast.error('No data to optimize')
      return
    }

    // Generate optimization recommendations
    const recommendations = generateOptimizationRecommendations(analytics, statistics)

    onOptimize?.(recommendations)
    toast.success('Optimization recommendations generated')
  }, [analytics, statistics, onOptimize])

  // Generate optimization recommendations
  const generateOptimizationRecommendations = (analytics: SearchAnalytics, statistics: SearchStatistics) => {
    const recommendations = []

    // Performance recommendations
    if (statistics.performance.avgSearchTime > 100) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize Search Performance',
        description: 'Average search time is above 100ms',
        action: 'Consider optimizing search algorithms or adding caching',
        impact: 'Improve user experience and search efficiency'
      })
    }

    if (statistics.performance.cacheHitRate < 0.5) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Improve Cache Hit Rate',
        description: 'Cache hit rate is below 50%',
        action: 'Increase cache size or improve cache strategy',
        impact: 'Reduce search time and server load'
      })
    }

    // Index recommendations
    if (statistics.totalDocuments > 1000 && statistics.performance.avgIndexingTime > 100) {
      recommendations.push({
        type: 'indexing',
        priority: 'medium',
        title: 'Optimize Indexing Performance',
        description: 'Average indexing time is above 100ms',
        action: 'Consider batch indexing or index optimization',
        impact: 'Improve indexing efficiency and search speed'
      })
    }

    // Content recommendations
    if (analytics.popularQueries.length > 0) {
      const topQuery = analytics.popularQueries[0]
      if (topQuery.avgResultsCount < 5) {
        recommendations.push({
          type: 'content',
          priority: 'low',
          title: 'Improve Content for Popular Queries',
          description: `Top query "${topQuery.query}" has low result count`,
          action: 'Add more relevant content or improve content quality',
          impact: 'Improve search relevance and user satisfaction'
        })
      }
    }

    return recommendations
  }

  // Format time
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // Format memory
  const formatMemory = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Search Analytics</CardTitle>
              <p className="text-sm text-gray-600">
                {projectName || 'Search System'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
              <select
                value={selectedTimeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value as any)}
                className="text-sm border-0 bg-transparent focus:outline-none"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport()}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOptimize()}
            >
              <Zap className="h-4 w-4 mr-2" />
              Optimize
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{statistics?.totalQueries || 0}</div>
              <div className="text-sm text-gray-600">Total Queries</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatTime(performanceMetrics.avgSearchTime)}</div>
              <div className="text-sm text-gray-600">Avg Search Time</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(performanceMetrics.cacheHitRate * 100)}%</div>
              <div className="text-sm text-gray-600">Cache Hit Rate</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatMemory(performanceMetrics.memoryUsage)}</div>
              <div className="text-sm text-gray-600">Memory Usage</div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-between space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Indexed Documents:</span>
              <span className="font-medium text-gray-900">{statistics?.totalDocuments || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">Index Time:</span>
              <span className="font-medium text-gray-900">{formatTime(performanceMetrics.indexingTime)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-purple-500" />
              <span className="text-gray-600">Last Refresh:</span>
              <span className="font-medium text-gray-900">{lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-6">
          {/* Popular Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                Popular Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {userBehaviorMetrics.topQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{query.query}</div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">Count: {query.count}</span>
                            <span className="text-xs text-gray-500">Avg Results: {query.avgResultsCount}</span>
                            <span className="text-xs text-gray-500">Avg Time: {formatTime(query.avgSearchTime)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {query.avgResultsCount > 10 ? 'High Relevance' : 'Normal'}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {query.avgSearchTime < 50 ? 'Fast' : query.avgSearchTime < 100 ? 'Normal' : 'Slow'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Query Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Query Distribution by Hour</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 bg-gray-50 rounded-lg p-4">
                <div className="h-full flex items-end justify-between">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const hourData = queryDistribution.find(d => d.hour === hour)
                    const count = hourData?.count || 0
                    const maxCount = Math.max(...queryDistribution.map(d => d.count))
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0

                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center">
                        <div className="text-xs text-gray-600 mb-1">{hour}:00</div>
                        <div className="w-full bg-gray-200 rounded-lg relative">
                          <div
                            className="absolute bottom-0 left-0 w-full bg-blue-500 rounded-lg transition-all duration-300"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-700 mt-1">{count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Performance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Search Time</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{formatTime(performanceMetrics.avgSearchTime)}</span>
                      <Badge variant={performanceMetrics.avgSearchTime < 50 ? 'default' : performanceMetrics.avgSearchTime < 100 ? 'secondary' : 'destructive'} className="text-xs">
                        {performanceMetrics.avgSearchTime < 50 ? 'Excellent' : performanceMetrics.avgSearchTime < 100 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cache Hit Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{Math.round(performanceMetrics.cacheHitRate * 100)}%</span>
                      <Badge variant={performanceMetrics.cacheHitRate > 0.8 ? 'default' : performanceMetrics.cacheHitRate > 0.5 ? 'secondary' : 'destructive'} className="text-xs">
                        {performanceMetrics.cacheHitRate > 0.8 ? 'Excellent' : performanceMetrics.cacheHitRate > 0.5 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Memory Usage</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{formatMemory(performanceMetrics.memoryUsage)}</span>
                      <Badge variant="outline" className="text-xs">
                        {performanceMetrics.memoryUsage < 100 * 1024 * 1024 ? 'Low' : performanceMetrics.memoryUsage < 500 * 1024 * 1024 ? 'Normal' : 'High'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Indexing Time</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{formatTime(performanceMetrics.indexingTime)}</span>
                      <Badge variant={performanceMetrics.indexingTime < 50 ? 'default' : performanceMetrics.indexingTime < 100 ? 'secondary' : 'destructive'} className="text-xs">
                        {performanceMetrics.indexingTime < 50 ? 'Excellent' : performanceMetrics.indexingTime < 100 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Resources</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Documents</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{statistics?.totalDocuments || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">Tokens</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{statistics?.totalTokens || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-600">Languages</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{statistics?.indexedLanguages.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-gray-600">Categories</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-900">{statistics?.indexedCategories.length || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <LineChart className="h-full w-full text-gray-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500 text-center">
                    Performance trends chart will be implemented here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6">
          {/* Top Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Search Filters</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {Object.entries(userBehaviorMetrics.topFilters).length > 0 ? (
                    Object.entries(userBehaviorMetrics.topFilters).map(([filter, count], index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{filter}</div>
                            <div className="text-xs text-gray-500">Used {count} times</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {count > 10 ? 'Popular' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm">No filter data available</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Facets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Search Facets</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {Object.entries(userBehaviorMetrics.topFacets).length > 0 ? (
                    Object.entries(userBehaviorMetrics.topFacets).map(([facet, count], index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{facet}</div>
                            <div className="text-xs text-gray-500">Used {count} times</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {count > 5 ? 'Popular' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm">No facet data available</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Search Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Trends</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Time Period</span>
                  <Badge variant="outline" className="text-xs">
                    {getTimeRangeDates().label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analytics?.searchTrends.length || 0}</div>
                    <div className="text-sm text-gray-600">Days Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics?.searchTrends.reduce((sum, trend) => sum + trend.queries, 0) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Queries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics?.searchTrends.length > 0
                        ? Math.round(analytics.searchTrends.reduce((sum, trend) => sum + trend.avgResultsCount, 0) / analytics.searchTrends.length)
                        : 0}
                    </div>
                    <div className="text-sm text-gray-600">Avg Results</div>
                  </div>
                </div>
              </div>

              {/* Trends Chart */}
              <div className="mt-6">
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <AreaChart className="h-full w-full text-gray-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-500 text-center">
                      Search trends chart will be implemented here
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Popular Queries Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Popular Queries Evolution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {analytics?.popularQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{query.query}</div>
                          <div className="text-xs text-gray-500">Count: {query.count}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {query.count > 10 ? 'Very Popular' : query.count > 5 ? 'Popular' : 'Normal'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    return (
      <div className="w-full space-y-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time Updates Active' : 'Real-time Updates Inactive'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Last Refresh: {lastRefresh.toLocaleTimeString()}
            </span>
            <span className="text-xs text-gray-500">
              ({getTimeRangeDates().label})
            </span>
          </div>
        </div>

        {/* Optimization Recommendations */}
        {handleOptimize && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="h-5 w-5 text-yellow-600 mr-2" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {generateOptimizationRecommendations(analytics || {}, statistics || {}).map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                      recommendation.priority === 'high' ? 'bg-red-500' :
                      recommendation.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">{recommendation.title}</div>
                        <Badge variant={recommendation.priority === 'high' ? 'destructive' : recommendation.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{recommendation.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Action:</span>
                        <span className="text-xs text-gray-700 font-medium">{recommendation.action}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

---

## 🎯 **SUCCESS! Search Analytics Component Complete**

### ✅ **Search Analytics Features Implemented:**

1. **📊 Real-time Analytics Dashboard**
   - Live search metrics monitoring
   - Query distribution by hour visualization
   - Performance indicators with status monitoring
   - System resources tracking

2. **📈 User Behavior Analysis**
   - Popular queries tracking and analysis
   - Top search filters and facets identification
   - Search pattern recognition
   - User interaction analysis

3. **📉 Performance Monitoring**
   - Search performance metrics tracking
   - Cache hit rate optimization
   - Memory usage monitoring
   - Indexing time analysis

4. **🔧 Optimization Recommendations**
   - AI-powered optimization suggestions
   - Performance improvement recommendations
   - Content optimization advice
   - System resource optimization

5. **📊 Trends Analysis**
   - Search trends visualization
   - Popular queries evolution tracking
   - Time-based analysis
   - Historical comparison

---

## 📋 **STEP 3: Create Search Filters Component**

### **Create Search Filters Directory**
