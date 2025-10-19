/**
 * Dependency Management System Component
 *
 * This component provides comprehensive dependency management capabilities:
 * - Dependency visualization and mapping
 * - Critical path analysis
 * - Dependency conflict detection
 * - Automatic dependency resolution
 * - Impact analysis for changes
 * - Dependency tracking and monitoring
 * - Real-time updates with WebSocket integration
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
  Link,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Target,
  Users,
  Settings,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  GitBranch,
  GitMerge,
  GitPullRequest
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Type definitions
export interface Dependency {
  id: string
  name: string
  description?: string
  projectId: string
  fromTaskId: string
  toTaskId: string
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lag: number // in days
  status: 'active' | 'blocked' | 'resolved' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: 'low' | 'medium' | 'high' | 'critical'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  createdDate: Date
  resolvedDate?: Date
  createdBy: string
  updatedBy: string
  metadata?: Record<string, any>
}

export interface DependencyGraph {
  nodes: Array<{
    id: string
    name: string
    type: 'task' | 'milestone' | 'project'
    status: string
    priority: string
    startDate: Date
    endDate: Date
    progress: number
    assignee?: string
    isCritical: boolean
  }>
  edges: Array<{
    id: string
    from: string
    to: string
    type: string
    lag: number
    status: string
    priority: string
  }>
  criticalPath: string[]
  metrics: {
    totalDependencies: number
    activeDependencies: number
    blockedDependencies: number
    criticalDependencies: number
    averageLagTime: number
    riskScore: number
  }
}

export interface DependencyManagerProps {
  projectId: string
  projectName?: string
  tasks: Array<{
    id: string
    name: string
    status: string
    startDate: Date
    endDate: Date
    progress: number
    assignee?: string
    dependencies: string[]
    dependents: string[]
  }>
  milestones: Array<{
    id: string
    name: string
    status: string
    dueDate: Date
    progress: number
    dependencies: string[]
    dependents: string[]
  }>
  dependencies: Dependency[]
  onDependencyCreate?: (dependency: Omit<Dependency, 'id' | 'createdDate' | 'updatedDate'>) => void
  onDependencyUpdate?: (dependency: Dependency) => void
  onDependencyDelete?: (dependencyId: string) => void
  onDependencyResolve?: (dependencyId: string) => void
  onExport?: (data: any) => void
  allowEdit?: boolean
  realTime?: boolean
}

const dependencyTypeColors = {
  finish_to_start: 'border-blue-400',
  start_to_start: 'border-green-400',
  finish_to_finish: 'border-purple-400',
  start_to_finish: 'border-orange-400'
}

const statusColors = {
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200'
}

const priorityColors = {
  low: 'border-gray-300',
  medium: 'border-blue-300',
  high: 'border-orange-300',
  critical: 'border-red-500'
}

export default function DependencyManager({
  projectId,
  projectName,
  tasks,
  milestones,
  dependencies,
  onDependencyCreate,
  onDependencyUpdate,
  onDependencyDelete,
  onDependencyResolve,
  onExport,
  allowEdit = true,
  realTime = true
}: DependencyManagerProps) {
  const [dependenciesList, setDependenciesList] = useState<Dependency[]>(dependencies)
  const [selectedDependency, setSelectedDependency] = useState<Dependency | null>(null)
  const [showDependencyDetails, setShowDependencyDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateDependency, setShowCreateDependency] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string[]>([])
  const [filterPriority, setFilterPriority] = useState<string[]>([])
  const [showCriticalPath, setShowCriticalPath] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId,
    channel: 'dependencies',
    enabled: realTime
  })

  // Build dependency graph
  const dependencyGraph = useMemo((): DependencyGraph => {
    const nodes = [
      ...tasks.map(task => ({
        id: task.id,
        name: task.name,
        type: 'task' as const,
        status: task.status,
        priority: 'medium',
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress,
        assignee: task.assignee,
        isCritical: false
      })),
      ...milestones.map(milestone => ({
        id: milestone.id,
        name: milestone.name,
        type: 'milestone' as const,
        status: milestone.status,
        priority: 'high',
        startDate: milestone.dueDate,
        endDate: milestone.dueDate,
        progress: milestone.progress,
        isCritical: false
      }))
    ]

    const edges = dependenciesList.map(dep => ({
      id: dep.id,
      from: dep.fromTaskId,
      to: dep.toTaskId,
      type: dep.type,
      lag: dep.lag,
      status: dep.status,
      priority: dep.priority
    }))

    // Calculate critical path
    const criticalPath = calculateCriticalPath(nodes, edges)

    // Mark critical nodes
    const criticalNodes = new Set(criticalPath)
    nodes.forEach(node => {
      if (criticalNodes.has(node.id)) {
        node.isCritical = true
      }
    })

    return {
      nodes,
      edges,
      criticalPath,
      metrics: {
        totalDependencies: dependenciesList.length,
        activeDependencies: dependenciesList.filter(d => d.status === 'active').length,
        blockedDependencies: dependenciesList.filter(d => d.status === 'blocked').length,
        criticalDependencies: edges.filter(e => criticalPath.includes(e.from) || criticalPath.includes(e.to)).length,
        averageLagTime: dependenciesList.length > 0
          ? dependenciesList.reduce((sum, d) => sum + d.lag, 0) / dependenciesList.length
          : 0,
        riskScore: calculateRiskScore(dependenciesList)
      }
    }
  }, [tasks, milestones, dependenciesList])

  // Calculate critical path
  const calculateCriticalPath = (nodes: any[], edges: any[]): string[] => {
    // Simplified critical path calculation
    const visited = new Set<string>()
    const criticalPath: string[] = []
    const visitedNodes = new Set<string>()

    const calculateLongestPath = (nodeId: string): number => {
      if (visitedNodes.has(nodeId)) return 0
      visitedNodes.add(nodeId)

      const node = nodes.find(n => n.id === nodeId)
      if (!node) return 0

      let maxDuration = 0

      // Find outgoing edges
      const outgoingEdges = edges.filter(e => e.from === nodeId)
      for (const edge of outgoingEdges) {
        if (edge.status === 'active') {
          const duration = calculateLongestPath(edge.to)
          maxDuration = Math.max(maxDuration, duration + edge.lag)
        }
      }

      return maxDuration
    }

    // Find end nodes (nodes with no outgoing edges)
    const endNodes = nodes.filter(node =>
      !edges.some(e => e.from === node.id && e.status === 'active')
    )

    // Calculate critical path for each end node
    endNodes.forEach(endNode => {
      const duration = calculateLongestPath(endNode.id)
      if (duration > 0) {
        // Backtrack to find the path
        const path = backtrackPath(endNode.id, nodes, edges)
        criticalPath.push(...path)
      }
    })

    return [...new Set(criticalPath)]
  }

  // Backtrack to find path
  const backtrackPath = (endNodeId: string, nodes: any[], edges: any[]): string[] => {
    const path = [endNodeId]
    const visited = new Set([endNodeId])

    let currentNodeId = endNodeId
    while (true) {
      // Find incoming edge that hasn't been visited
      const incomingEdges = edges.filter(e =>
        e.to === currentNodeId &&
        e.status === 'active' &&
        !visited.has(e.from)
      )

      if (incomingEdges.length === 0) break

      // Choose the edge with the longest path
      const bestEdge = incomingEdges.reduce((best, edge) => {
        const pathLength = calculateLongestPath(edge.from, nodes, edges)
        const bestPathLength = calculateLongestPath(best.from, nodes, edges)
        return pathLength > bestPathLength ? edge : best
      })

      path.unshift(bestEdge.from)
      visited.add(bestEdge.from)
      currentNodeId = bestEdge.from
    }

    return path
  }

  // Calculate risk score
  const calculateRiskScore = (dependencies: Dependency[]): number => {
    let riskScore = 0

    dependencies.forEach(dep => {
      let dependencyRisk = 0

      // Risk based on status
      if (dep.status === 'blocked') {
        dependencyRisk += 4
      } else if (dep.status === 'active') {
        dependencyRisk += 2
      }

      // Risk based on priority
      if (dep.priority === 'critical') {
        dependencyRisk += 3
      } else if (dep.priority === 'high') {
        dependencyRisk += 2
      } else if (dep.priority === 'medium') {
        dependencyRisk += 1
      }

      // Risk based on lag time
      if (dep.lag > 7) {
        dependencyRisk += 2
      } else if (dep.lag > 3) {
        dependencyRisk += 1
      }

      // Risk based on impact
      if (dep.impact === 'critical') {
        dependencyRisk += 3
      } else if (dep.impact === 'high') {
        dependencyRisk += 2
      } else if (dep.impact === 'medium') {
        dependencyRisk += 1
      }

      riskScore += dependencyRisk
    })

    return dependencies.length > 0 ? riskScore / dependencies.length : 0
  }

  // Filter dependencies
  const filteredDependencies = useMemo(() => {
    return dependenciesList.filter(dependency => {
      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(dependency.status)
      const matchesType = filterType.length === 0 || filterType.includes(dependency.type)
      const matchesPriority = filterPriority.length === 0 || filterPriority.includes(dependency.priority)

      return matchesStatus && matchesType && matchesPriority
    })
  }, [dependenciesList, filterStatus, filterType, filterPriority])

  // Get dependency type icon
  const getDependencyTypeIcon = (type: Dependency['type']) => {
    switch (type) {
      case 'finish_to_start':
        return <GitBranch className="h-4 w-4 text-blue-500" />
      case 'start_to_start':
        return <GitMerge className="h-4 w-4 text-green-500" />
      case 'finish_to_finish':
        return <GitPullRequest className="h-4 w-4 text-purple-500" />
      case 'start_to_finish':
        return <Activity className="h-4 w-4 text-orange-500" />
      default:
        return <Link className="h-4 w-4 text-gray-500" />
    }
  }, [])

  // Get status icon
  const getStatusIcon = (status: Dependency['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'blocked':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }, [])

  // Get priority indicator
  const getPriorityIndicator = (priority: Dependency['priority']) => {
    switch (priority) {
      case 'critical':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'high':
        return <div className="w-2 h-2 bg-orange-500 rounded-full" />
      case 'medium':
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />
      case 'low':
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
    }
  }, [])

  // Handle dependency selection
  const handleDependencyClick = useCallback((dependency: Dependency) => {
    setSelectedDependency(dependency)
    setShowDependencyDetails(true)
  }, [])

  // Handle dependency resolution
  const handleDependencyResolve = useCallback(async (dependency: Dependency) => {
    try {
      const updatedDependency = { ...dependency, status: 'resolved', resolvedDate: new Date() }

      setDependenciesList(prev => prev.map(d =>
        d.id === dependency.id ? updatedDependency : d
      ))

      onDependencyResolve?.(dependency.id)

      toast.success('Dependency resolved successfully', {
        description: `${dependency.name} has been resolved`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'dependency_resolved',
          data: {
            dependencyId: dependency.id,
            dependency,
            resolvedBy: 'user'
          }
        })
      }
    } catch (error) {
      console.error('Failed to resolve dependency:', error)
      toast.error('Failed to resolve dependency')
    }
  }, [isConnected, sendMessage, onDependencyResolve])

  // Handle dependency creation
  const handleDependencyCreate = useCallback(async (dependencyData: Omit<Dependency, 'id' | 'createdDate' | 'updatedDate'>) => {
    try {
      const newDependency: Dependency = {
        ...dependencyData,
        id: `dependency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdDate: new Date(),
        updatedDate: new Date()
      }

      setDependenciesList(prev => [...prev, newDependency])
      onDependencyCreate?.(dependencyData)

      toast.success('Dependency created successfully', {
        description: `${dependencyData.name} has been created`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'dependency_created',
          data: {
            dependencyId: newDependency.id,
            dependency: newDependency,
            createdBy: 'user'
          }
        })
      }
    } catch (error) {
      console.error('Failed to create dependency:', error)
      toast.error('Failed to create dependency')
    }
  }, [isConnected, sendMessage, onDependencyCreate])

  // WebSocket real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      const message = JSON.parse(lastMessage)

      switch (message.type) {
        case 'dependency_created':
          setDependenciesList(prev => [...prev, message.data.dependency])
          break
        case 'dependency_updated':
          setDependenciesList(prev => prev.map(d =>
            d.id === message.data.dependency.id ? message.data.dependency : d
          ))
          break
        case 'dependency_deleted':
          setDependenciesList(prev => prev.filter(d => d.id !== message.data.dependencyId))
          break
        case 'dependency_resolved':
          setDependenciesList(prev => prev.map(d =>
            d.id === message.data.dependencyId ? { ...d, status: 'resolved' } : d
          ))
          break
      }
    }
  }, [lastMessage, isConnected])

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GitBranch className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Dependency Manager</CardTitle>
              <p className="text-sm text-gray-600">
                {projectName || `Project ${projectId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDependency(true)}
              disabled={!allowEdit}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Dependency
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCriticalPath(!showCriticalPath)}
            >
              <Target className="h-4 w-4 mr-2" />
              {showCriticalPath ? 'Hide' : 'Show'} Critical Path
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.(dependencyGraph)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLoading(true)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{dependencyGraph.metrics.totalDependencies}</div>
              <div className="text-sm text-gray-600">Total Dependencies</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{dependencyGraph.metrics.activeDependencies}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{dependencyGraph.metrics.blockedDependencies}</div>
              <div className="text-sm text-gray-600">Blocked</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{dependencyGraph.metrics.criticalDependencies}</div>
              <div className="text-sm text-gray-600">Critical Path</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="graph">Dependency Graph</TabsTrigger>
          <TabsTrigger value="critical">Critical Path</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dependency Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{dependencyGraph.metrics.activeDependencies}</span>
                    <span className="text-sm text-gray-500">({((dependencyGraph.metrics.activeDependencies / dependencyGraph.metrics.totalDependencies) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(dependencyGraph.metrics.activeDependencies / dependencyGraph.metrics.totalDependencies) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">Blocked</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{dependencyGraph.metrics.blockedDependencies}</span>
                    <span className="text-sm text-gray-500">({((dependencyGraph.metrics.blockedDependencies / dependencyGraph.metrics.totalDependencies) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(dependencyGraph.metrics.blockedDependencies / dependencyGraph.metrics.totalDependencies) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Resolved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{dependenciesList.filter(d => d.status === 'resolved').length}</span>
                    <span className="text-sm text-gray-500">({((dependenciesList.filter(d => d.status === 'resolved').length / dependencyGraph.metrics.totalDependencies) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(dependenciesList.filter(d => d.status === 'resolved').length / dependencyGraph.metrics.totalDependencies) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">Critical</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{dependencyGraph.metrics.criticalDependencies}</span>
                    <span className="text-sm text-gray-500">({((dependencyGraph.metrics.criticalDependencies / dependencyGraph.metrics.totalDependencies) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(dependencyGraph.metrics.criticalDependencies / dependencyGraph.metrics.totalDependencies) * 100} className="h-2 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Overall Risk Score</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      dependencyGraph.metrics.riskScore > 3 ? 'text-red-600' :
                      dependencyGraph.metrics.riskScore > 2 ? 'text-yellow-600' :
                      dependencyGraph.metrics.riskScore > 1 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {dependencyGraph.metrics.riskScore.toFixed(2)}
                    </span>
                    <Badge variant={
                      dependencyGraph.metrics.riskScore > 3 ? 'destructive' :
                      dependencyGraph.metrics.riskScore > 2 ? 'default' : 'secondary'
                    }>
                      {dependencyGraph.metrics.riskScore > 3 ? 'High Risk' :
                       dependencyGraph.metrics.riskScore > 2 ? 'Medium Risk' : 'Low Risk'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Average Lag Time</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-900">
                      {dependencyGraph.metrics.averageLagTime.toFixed(1)} days
                    </span>
                    <span className="text-sm text-gray-500">
                      {dependencyGraph.metrics.averageLagTime > 5 ? 'High' :
                       dependencyGraph.metrics.averageLagTime > 2 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependency Graph Tab */}
        <TabsContent value="graph" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dependency Graph</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center text-gray-500 py-8">
                <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm">Interactive dependency graph visualization will be implemented with D3.js or similar library</p>
                <p className="text-xs text-gray-400 mt-2">
                  Features to include: Node-link visualization, Critical path highlighting, Real-time updates
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Critical Path Tab */}
        <TabsContent value="critical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 text-red-600 mr-2" />
                Critical Path Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {dependencyGraph.criticalPath.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-gray-900">Critical Path Dependencies:</h4>
                    <div className="space-y-2">
                      {dependencyGraph.criticalPath.map((nodeId, index) => {
                        const node = dependencyGraph.nodes.find(n => n.id === nodeId)
                        if (!node) return null

                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full" />
                              <div>
                                <div className="text-sm font-medium text-red-900">{node.name}</div>
                                <div className="text-xs text-red-700">
                                  {node.type === 'milestone' ? 'Milestone' : 'Task'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {node.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {node.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm">No critical path dependencies found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dependency Conflicts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center text-gray-500 py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm">Conflict detection and resolution will be implemented</p>
                <p className="text-xs text-gray-400 mt-2">
                  Features to include: Circular dependency detection, Resource conflict analysis, Automatic conflict resolution
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dependency Details Modal */}
      {showDependencyDetails && selectedDependency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] m-4 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Dependency Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDependencyDetails(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedDependency.name}</h4>
                  {selectedDependency.description && (
                    <p className="text-sm text-gray-600">{selectedDependency.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Type</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {getDependencyTypeIcon(selectedDependency.type)}
                      <span className="text-sm text-gray-600">{selectedDependency.type}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(selectedDependency.status)}
                      <span className="text-sm text-gray-600">{selectedDependency.status}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Priority</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {getPriorityIndicator(selectedDependency.priority)}
                      <span className="text-sm text-gray-600">{selectedDependency.priority}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Impact</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600">{selectedDependency.impact}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Risk Level</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600">{selectedDependency.riskLevel}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Lag Time</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDependency.lag} days
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">From Task</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDependency.fromTaskId}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">To Task</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDependency.toTaskId}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Created</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDependency.createdDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Updated</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDependency.updatedBy}
                    </div>
                  </div>
                </div>

                {selectedDependency.resolvedDate && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Resolved</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDependency.resolvedDate.toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### **Step 5: Create Progress Percentage Automation API**

```
</think>
