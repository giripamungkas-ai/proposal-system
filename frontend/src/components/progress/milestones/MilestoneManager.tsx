/**
 * Milestone Management System Component
 *
 * This component provides comprehensive milestone management capabilities:
 * - Milestone creation and editing
 * - Progress tracking and visualization
 * - Task assignment and dependency management
 * - Deadline monitoring and alerts
 * - Milestone completion workflows
 * - Reporting and analytics
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
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Settings,
  FileText,
  Link
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Type definitions
export interface Milestone {
  id: string
  name: string
  description?: string
  projectId: string
  projectName?: string
  dueDate: Date
  plannedDate: Date
  completedDate?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled' | 'at_risk'
  priority: 'low' | 'medium' | 'high' | 'critical'
  progress: number
  tasks: string[] // Task IDs associated with this milestone
  assignedTo: string[] // User IDs
  deliverables: Array<{
    id: string
    name: string
    type: 'document' | 'presentation' | 'code' | 'review' | 'approval' | 'other'
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    dueDate?: Date
    submittedDate?: Date
    url?: string
  }>
  dependencies: string[] // Milestone IDs this depends on
  dependents: string[] // Milestone IDs that depend on this
  tags: string[]
  budget?: number
  actualCost?: number
  estimatedHours?: number
  actualHours?: number
  risks: Array<{
    id: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    status: 'open' | 'mitigated' | 'accepted'
    mitigation?: string
  }>
  metadata?: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface MilestoneMetrics {
  totalMilestones: number
  completedMilestones: number
  delayedMilestones: number
  atRiskMilestones: number
  overallProgress: number
  averageCompletionRate: number
  onTimeCompletionRate: number
  totalBudget: number
  totalActualCost: number
  totalEstimatedHours: number
  totalActualHours: number
  upcomingDeadlines: Array<{
    milestoneId: string
    milestoneName: string
    dueDate: Date
    daysUntilDue: number
    priority: string
  }>
}

export interface MilestoneManagerProps {
  projectId: string
  projectName?: string
  milestones: Milestone[]
  tasks: Array<{
    id: string
    name: string
    status: string
    milestoneId?: string
    assigneeId?: string
  }>
  resources: Array<{
    id: string
    name: string
    role: string
    availability: number
    skills: string[]
  }>
  onMilestoneCreate?: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => void
  onMilestoneUpdate?: (milestone: Milestone) => void
  onMilestoneDelete?: (milestoneId: string) => void
  onTaskAssignment?: (milestoneId: string, taskId: string) => void
  onExport?: (data: any) => void
  allowEdit?: boolean
  realTime?: boolean
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  delayed: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  at_risk: 'bg-red-100 text-red-700 border-red-200'
}

const priorityColors = {
  low: 'border-gray-300',
  medium: 'border-blue-300',
  high: 'border-orange-300',
  critical: 'border-red-500'
}

export default function MilestoneManager({
  projectId,
  projectName,
  milestones,
  tasks,
  resources,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete,
  onTaskAssignment,
  onExport,
  allowEdit = true,
  realTime = true
}: MilestoneManagerProps) {
  const [milestonesList, setMilestonesList] = useState<Milestone[]>(milestones)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [showMilestoneDetails, setShowMilestoneDetails] = useState(false)
  const [showCreateMilestone, setShowCreateMilestone] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterPriority, setFilterPriority] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId,
    channel: 'milestones',
    enabled: realTime
  })

  // Calculate milestone metrics
  const metrics = useMemo((): MilestoneMetrics => {
    const total = milestonesList.length
    const completed = milestonesList.filter(m => m.status === 'completed').length
    const delayed = milestonesList.filter(m => m.status === 'delayed').length
    const atRisk = milestonesList.filter(m => m.status === 'at_risk').length
    const inProgress = milestonesList.filter(m => m.status === 'in_progress').length

    const overallProgress = total > 0
      ? milestonesList.reduce((sum, m) => sum + m.progress, 0) / total
      : 0

    const upcomingDeadlines = milestonesList
      .filter(m => m.status !== 'completed' && m.status !== 'cancelled')
      .map(m => ({
        milestoneId: m.id,
        milestoneName: m.name,
        dueDate: m.dueDate,
        daysUntilDue: Math.ceil((m.dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24)),
        priority: m.priority
      }))
      .filter(m => m.daysUntilDue <= 30)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

    return {
      totalMilestones: total,
      completedMilestones: completed,
      delayedMilestones: delayed,
      atRiskMilestones: atRisk,
      overallProgress,
      averageCompletionRate: total > 0 ? (completed / total) * 100 : 0,
      onTimeCompletionRate: total > 0 ? ((total - delayed - atRisk) / total) * 100 : 0,
      totalBudget: milestonesList.reduce((sum, m) => sum + (m.budget || 0), 0),
      totalActualCost: milestonesList.reduce((sum, m) => sum + (m.actualCost || 0), 0),
      totalEstimatedHours: milestonesList.reduce((sum, m) => sum + (m.estimatedHours || 0), 0),
      totalActualHours: milestonesList.reduce((sum, m) => sum + (m.actualHours || 0), 0),
      upcomingDeadlines
    }
  }, [milestonesList, currentTime])

  // Filter milestones
  const filteredMilestones = useMemo(() => {
    return milestonesList.filter(milestone => {
      const matchesSearch = !searchQuery ||
        milestone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        milestone.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(milestone.status)
      const matchesPriority = filterPriority.length === 0 || filterPriority.includes(milestone.priority)

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [milestonesList, searchQuery, filterStatus, filterPriority])

  // Get milestone status icon
  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'delayed':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-400" />
      case 'at_risk':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }, [])

  // Get priority indicator
  const getPriorityIndicator = (priority: Milestone['priority']) => {
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

  // Calculate days until due
  const getDaysUntilDue = useCallback((dueDate: Date): number => {
    const now = new Date()
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }, [])

  // Get deadline urgency
  const getDeadlineUrgency = useCallback((dueDate: Date): {
    color: string
    text: string
    days: number
  } => {
    const daysUntil = getDaysUntilDue(dueDate)

    if (daysUntil < 0) {
      return {
        color: 'text-red-600',
        text: 'Overdue',
        days: daysUntil
      }
    } else if (daysUntil <= 3) {
      return {
        color: 'text-red-600',
        text: 'Urgent',
        days: daysUntil
      }
    } else if (daysUntil <= 7) {
      return {
        color: 'text-yellow-600',
        text: 'Soon',
        days: daysUntil
      }
    } else if (daysUntil <= 14) {
      return {
        color: 'text-blue-600',
        text: 'Upcoming',
        days: daysUntil
      }
    } else {
      return {
        color: 'text-green-600',
        text: 'Future',
        days: daysUntil
      }
    }
  }, [])

  // Handle milestone selection
  const handleMilestoneClick = useCallback((milestone: Milestone) => {
    setSelectedMilestone(milestone)
    setShowMilestoneDetails(true)
  }, [])

  // Handle milestone status update
  const handleMilestoneStatusUpdate = useCallback(async (milestone: Milestone, newStatus: Milestone['status']) => {
    try {
      const updatedMilestone = { ...milestone, status: newStatus, updatedAt: new Date() }

      // Add completed date if status is completed
      if (newStatus === 'completed') {
        updatedMilestone.completedDate = new Date()
        updatedMilestone.progress = 100
      }

      setMilestonesList(prev => prev.map(m =>
        m.id === milestone.id ? updatedMilestone : m
      ))

      onMilestoneUpdate?.(updatedMilestone)

      toast.success('Milestone status updated successfully', {
        description: `${milestone.name} status changed to ${newStatus}`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'milestone_status_updated',
          data: {
            milestoneId: milestone.id,
            oldStatus: milestone.status,
            newStatus,
            updatedBy: 'user'
          }
        })
      }
    } catch (error) {
      console.error('Failed to update milestone status:', error)
      toast.error('Failed to update milestone status')
    }
  }, [milestone, isConnected, onMilestoneUpdate, sendMessage])

  // Handle milestone creation
  const handleMilestoneCreate = useCallback(async (milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newMilestone: Milestone = {
        ...milestoneData,
        id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setMilestonesList(prev => [...prev, newMilestone])
      onMilestoneCreate?.(milestoneData)

      toast.success('Milestone created successfully', {
        description: `${milestoneData.name} has been created`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'milestone_created',
          data: {
            milestoneId: newMilestone.id,
            milestone: newMilestone,
            createdBy: 'user'
          }
        })
      }
    } catch (error) {
      console.error('Failed to create milestone:', error)
      toast.error('Failed to create milestone')
    }
  }, [isConnected, sendMessage, onMilestoneCreate])

  // Handle milestone deletion
  const handleMilestoneDelete = useCallback(async (milestoneId: string) => {
    try {
      const milestone = milestonesList.find(m => m.id === milestoneId)
      if (!milestone) return

      setMilestonesList(prev => prev.filter(m => m.id !== milestoneId))
      onMilestoneDelete?.(milestoneId)

      toast.success('Milestone deleted successfully', {
        description: `${milestone.name} has been deleted`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'milestone_deleted',
          data: {
            milestoneId,
            milestone,
            deletedBy: 'user'
          }
        })
      }
    } catch (error) {
      console.error('Failed to delete milestone:', error)
      toast.error('Failed to delete milestone')
    }
  }, [milestonesList, isConnected, sendMessage, onMilestoneDelete])

  // WebSocket real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      const message = JSON.parse(lastMessage)

      switch (message.type) {
        case 'milestone_created':
          setMilestonesList(prev => [...prev, message.data.milestone])
          break
        case 'milestone_updated':
          setMilestonesList(prev => prev.map(m =>
            m.id === message.data.milestone.id ? message.data.milestone : m
          ))
          break
        case 'milestone_deleted':
          setMilestonesList(prev => prev.filter(m => m.id !== message.data.milestoneId))
          break
        case 'milestone_status_updated':
          setMilestonesList(prev => prev.map(m =>
            m.id === message.data.milestoneId ? { ...m, status: message.data.newStatus } : m
          ))
          break
      }
    }
  }, [lastMessage, isConnected])

  // Auto-refresh current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Milestone Manager</CardTitle>
              <p className="text-sm text-gray-600">
                {projectName || `Project ${projectId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateMilestone(true)}
              disabled={!allowEdit}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Milestone
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.(metrics)}
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
              <div className="text-2xl font-bold text-gray-900">{metrics.totalMilestones}</div>
              <div className="text-sm text-gray-600">Total Milestones</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.completedMilestones}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(metrics.overallProgress * 100)}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(metrics.onTimeCompletionRate)}%</div>
              <div className="text-sm text-gray-600">On-Time Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{metrics.completedMilestones}</span>
                    <span className="text-sm text-gray-500">({((metrics.completedMilestones / metrics.totalMilestones) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(metrics.completedMilestones / metrics.totalMilestones) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">In Progress</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{milestonesList.filter(m => m.status === 'in_progress').length}</span>
                    <span className="text-sm text-gray-500">({((milestonesList.filter(m => m.status === 'in_progress').length / metrics.totalMilestones) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(milestonesList.filter(m => m.status === 'in_progress').length / metrics.totalMilestones) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{milestonesList.filter(m => m.status === 'pending').length}</span>
                    <span className="text-sm text-gray-500">({((milestonesList.filter(m => m.status === 'pending').length / metrics.totalMilestones) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(milestonesList.filter(m => m.status === 'pending').length / metrics.totalMilestones) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Delayed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{metrics.delayedMilestones}</span>
                    <span className="text-sm text-gray-500">({((metrics.delayedMilestones / metrics.totalMilestones) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(metrics.delayedMilestones / metrics.totalMilestones) * 100} className="h-2 w-32" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">At Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{metrics.atRiskMilestones}</span>
                    <span className="text-sm text-gray-500">({((metrics.atRiskMilestones / metrics.totalMilestones) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress value={(metrics.atRiskMilestones / metrics.totalMilestones) * 100} className="h-2 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          {metrics.upcomingDeadlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {metrics.upcomingDeadlines.map((deadline, index) => (
                      <div key={deadline.milestoneId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex items-center space-x-3">
                          {getPriorityIndicator(deadline.priority as Milestone['priority'])}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{deadline.milestoneName}</div>
                            <div className="text-xs text-gray-500">
                              Due: {deadline.dueDate.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${getDeadlineUrgency(deadline.dueDate).color}`}>
                            {getDeadlineUrgency(deadline.dueDate).text}
                          </span>
                          <span className="text-xs text-gray-500">
                            {deadline.daysUntilDue === 0 ? 'Today' :
                             deadline.daysUntilDue === 1 ? 'Tomorrow' :
                             `${deadline.daysUntilDue} days`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Milestone Filters</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    multiple
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(Array.from(e.target.selectedOptions))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="at_risk">At Risk</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <select
                    multiple
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(Array.from(e.target.selectedOptions))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search milestones..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Milestones ({filteredMilestones.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${statusColors[milestone.status]}`}
                      onClick={() => handleMilestoneClick(milestone)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {getStatusIcon(milestone.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-sm font-medium text-gray-900">{milestone.name}</h3>
                              {getPriorityIndicator(milestone.priority)}
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {milestone.dueDate.toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {milestone.assignedTo.length} assigned
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500">
                          Tasks: {milestone.tasks.length}
                        </div>
                        <div className="text-xs text-gray-500">
                          Deliverables: {milestone.deliverables.length}
                        </div>
                        {milestone.risks.length > 0 && (
                          <div className="text-xs text-red-500">
                            Risks: {milestone.risks.length}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(milestone.progress * 100)}%</span>
                          </div>
                          <Progress value={milestone.progress} className="h-2 w-32" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Milestone Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center text-gray-500 py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm">Timeline view will be implemented with interactive Gantt chart integration</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Milestone Analytics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Completion Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="text-sm font-medium text-gray-900">{metrics.averageCompletionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">On-Time Rate</span>
                      <span className="text-sm font-medium text-gray-900">{metrics.onTimeCompletionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Budget Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Budget</span>
                      <span className="text-sm font-medium text-gray-900">
                        {metrics.totalBudget.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actual Cost</span>
                      <span className="text-sm font-medium text-gray-900">
                        {metrics.totalActualCost.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Milestone Details Modal */}
      {showMilestoneDetails && selectedMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] m-4 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Milestone Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMilestoneDetails(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedMilestone.name}</h4>
                  {selectedMilestone.description && (
                    <p className="text-sm text-gray-600">{selectedMilestone.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <Badge className="mt-1">{selectedMilestone.status}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Priority</span>
                    <Badge className="mt-1">{selectedMilestone.priority}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <div className="mt-1">
                      <Progress value={selectedMilestone.progress} className="h-2" />
                      <span className="text-xs text-gray-600 mt-1">
                        {Math.round(selectedMilestone.progress * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Due Date</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedMilestone.dueDate.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {selectedMilestone.tasks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Associated Tasks</h4>
                    <div className="space-y-2">
                      {selectedMilestone.tasks.map((taskId, index) => {
                        const task = tasks.find(t => t.id === taskId)
                        return task ? (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <span className="text-sm font-medium text-gray-900">{task.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {selectedMilestone.deliverables.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Deliverables</h4>
                    <div className="space-y-2">
                      {selectedMilestone.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{deliverable.name}</div>
                              <div className="text-xs text-gray-500">{deliverable.type}</div>
                            </div>
                          </div>
                          <Badge variant={deliverable.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {deliverable.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMilestone.risks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Risks</h4>
                    <div className="space-y-2">
                      {selectedMilestone.risks.map((risk, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-1 ${
                            risk.severity === 'critical' ? 'bg-red-500' :
                            risk.severity === 'high' ? 'bg-orange-500' :
                            risk.severity === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-red-900">{risk.description}</div>
                            <div className="text-xs text-red-700 mt-1">
                              Status: {risk.status}
                            </div>
                            {risk.mitigation && (
                              <div className="text-xs text-red-600 mt-1">
                                Mitigation: {risk.mitigation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Created</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedMilestone.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Updated</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedMilestone.updatedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```
### **Step 3: Create Milestone Management API Endpoint**
