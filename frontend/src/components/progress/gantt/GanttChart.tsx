/**
 * Interactive Gantt Chart Component for Advanced Progress Tracking
 *
 * This component provides comprehensive project timeline management with:
 * - Interactive Gantt chart visualization
 * - Milestone tracking and management
 * - Dependency management and visualization
 * - Resource allocation and assignment
 * - Progress tracking with automatic calculations
 * - Critical path analysis
 * - Real-time updates with WebSocket integration
 * - Export functionality for reports
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Link,
  Settings,
  Download,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  Info,
  Target,
  Activity
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Type definitions
export interface GanttTask {
  id: string
  name: string
  description?: string
  projectId: string
  milestoneId?: string
  assigneeId?: string
  assigneeName?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'blocked' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  progress: number
  duration: number // in days
  startDate: Date
  endDate: Date
  plannedStartDate: Date
  plannedEndDate: Date
  dependencies: string[] // Task IDs this task depends on
  dependents: string[] // Task IDs that depend on this task
  resources: {
    assigned: string[]
    required: string[]
    allocated: string[]
  }
  tags: string[]
  metadata?: Record<string, any>
  isMilestone: boolean
  isCriticalPath: boolean
  color?: string
}

export interface GanttMilestone {
  id: string
  name: string
  description?: string
  projectId: string
  dueDate: Date
  status: 'pending' | 'completed' | 'delayed' | 'cancelled'
  progress: number
  tasks: string[] // Task IDs associated with this milestone
  color?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  deliverables: string[]
  metadata?: Record<string, any>
}

export interface GanttProject {
  id: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  status: 'planning' | 'active' | 'completed' | 'delayed' | 'cancelled'
  tasks: GanttTask[]
  milestones: GanttMilestone[]
  resources: {
    team: Array<{
      id: string
      name: string
      role: string
      capacity: number
      availability: number
      skills: string[]
    }>
    equipment: Array<{
      id: string
      name: string
      type: string
      availability: number
    }>
  }
  dependencies: Array<{
    from: string
    to: string
    type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish'
    lag: number // in days
  }>
  metadata?: Record<string, any>
}

export interface GanttViewOptions {
  zoomLevel: number
  showWeekends: boolean
  showDependencies: boolean
  showMilestones: boolean
  showCriticalPath: boolean
  showResources: boolean
  showProgress: boolean
  dateFormat: 'compact' | 'full' | 'iso'
  timeScale: 'day' | 'week' | 'month'
  viewMode: 'gantt' | 'timeline' | 'calendar'
}

export interface GanttChartProps {
  project: GanttProject
  viewOptions?: Partial<GanttViewOptions>
  onTaskUpdate?: (task: GanttTask) => void
  onMilestoneUpdate?: (milestone: GanttMilestone) => void
  onDependencyUpdate?: (dependency: any) => void
  onExport?: (data: any) => void
  onRefresh?: () => void
  allowEdit?: boolean
  realTime?: boolean
}

const defaultViewOptions: GanttViewOptions = {
  zoomLevel: 1,
  showWeekends: true,
  showDependencies: true,
  showMilestones: true,
  showCriticalPath: true,
  showResources: true,
  showProgress: true,
  dateFormat: 'compact',
  timeScale: 'day',
  viewMode: 'gantt'
}

const statusColors = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  delayed: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200'
}

const priorityColors = {
  low: 'border-gray-300',
  medium: 'border-blue-300',
  high: 'border-orange-300',
  critical: 'border-red-500'
}

export default function GanttChart({
  project,
  viewOptions = {},
  onTaskUpdate,
  onMilestoneUpdate,
  onDependencyUpdate,
  onExport,
  onRefresh,
  allowEdit = true,
  realTime = true
}: GanttChartProps) {
  const [options, setOptions] = useState<GanttViewOptions>({
    ...defaultViewOptions,
    ...viewOptions
  })

  const [tasks, setTasks] = useState<GanttTask[]>(project.tasks)
  const [milestones, setMilestones] = useState<GanttMilestone[]>(project.milestones)
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<GanttMilestone | null>(null)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId: project.id,
    channel: 'gantt',
    enabled: realTime
  })

  // Calculate project timeline
  const projectTimeline = useMemo(() => {
    const allDates = [
      project.startDate,
      project.endDate,
      ...tasks.flatMap(task => [task.startDate, task.endDate]),
      ...milestones.flatMap(milestone => [milestone.dueDate])
    ]

    return {
      start: new Date(Math.min(...allDates.map(d => d.getTime()))),
      end: new Date(Math.max(...allDates.map(d => d.getTime()))),
      totalDays: Math.ceil((Math.max(...allDates.map(d => d.getTime())) - Math.min(...allDates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24))
    }
  }, [project, tasks, milestones])

  // Calculate critical path
  const criticalPath = useMemo(() => {
    const visited = new Set<string>()
    const criticalTasks: GanttTask[] = []
    const visitedTasks = new Set<string>()

    const calculateCriticalPath = (taskId: string): number => {
      if (visitedTasks.has(taskId)) return 0
      visitedTasks.add(taskId)

      const task = tasks.find(t => t.id === taskId)
      if (!task) return 0

      let maxDuration = task.duration

      // Check dependencies
      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          maxDuration = Math.max(maxDuration, calculateCriticalPath(depId))
        }
      }

      return maxDuration
    }

    // Find end tasks (tasks with no dependents)
    const endTasks = tasks.filter(task =>
      !tasks.some(t => t.dependencies.includes(task.id))
    )

    // Calculate critical path for each end task
    endTasks.forEach(endTask => {
      const duration = calculateCriticalPath(endTask.id)
      if (duration > 0) {
        criticalTasks.push(endTask)
      }
    })

    return criticalTasks
  }, [tasks])

  // Generate date grid for Gantt chart
  const dateGrid = useMemo(() => {
    const dates: Date[] = []
    const startDate = new Date(projectTimeline.start)
    const endDate = new Date(projectTimeline.end)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }

    return dates
  }, [projectTimeline])

  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    const rowHeight = 40
    const headerHeight = 60
    const timelineHeight = 30
    const taskRowHeight = 40
    const milestoneRowHeight = 30

    const totalRows =
      1 + // Header row
      1 + // Timeline row
      tasks.length + // Task rows
      1 // Milestones row
    milestones.length

    return {
      headerHeight,
      timelineHeight,
      taskRowHeight,
      milestoneRowHeight,
      rowHeight,
      totalHeight: totalRows * rowHeight,
      columnWidth: 120 * options.zoomLevel,
      totalWidth: dateGrid.length * (120 * options.zoomLevel)
    }
  }, [dateGrid, tasks, milestones, options.zoomLevel])

  // Format date for display
  const formatDate = useCallback((date: Date): string => {
    switch (options.dateFormat) {
      case 'compact':
        return `${date.getDate()}/${date.getMonth() + 1}`
      case 'full':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      case 'iso':
        return date.toISOString().split('T')[0]
      default:
        return date.toLocaleDateString()
    }
  }, [options.dateFormat])

  // Check if date is weekend
  const isWeekend = useCallback((date: Date): boolean => {
    return date.getDay() === 0 || date.getDay() === 6
  }, [])

  // Check if date is today
  const isToday = useCallback((date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }, [])

  // Check if date is past due
  const isPastDue = useCallback((date: Date): boolean => {
    return date < new Date()
  }, [])

  // Calculate task position on Gantt chart
  const getTaskPosition = useCallback((task: GanttTask) => {
    const startIndex = dateGrid.findIndex(d =>
      d.toDateString() === task.plannedStartDate.toDateString()
    )
    const endIndex = dateGrid.findIndex(d =>
      d.toDateString() === task.plannedEndDate.toDateString()
    )

    return {
      start: startIndex,
      end: endIndex,
      duration: endIndex - startIndex + 1
    }
  }, [dateGrid])

  // Toggle task expansion
  const toggleTaskExpansion = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }, [])

  // Handle task selection
  const handleTaskClick = useCallback((task: GanttTask) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }, [])

  // Handle task update
  const handleTaskUpdate = useCallback((updatedTask: GanttTask) => {
    setTasks(prev => prev.map(task =>
      task.id === updatedTask.id ? updatedTask : task
    ))

    onTaskUpdate?.(updatedTask)

    toast.success('Task updated successfully', {
      description: `${updatedTask.name} has been updated`
    })
  }, [onTaskUpdate])

  // Handle milestone update
  const handleMilestoneUpdate = useCallback((updatedMilestone: GanttMilestone) => {
    setMilestones(prev => prev.map(milestone =>
      milestone.id === updatedMilestone.id ? updatedMilestone : milestone
    ))

    onMilestoneUpdate?.(updatedMilestone)

    toast.success('Milestone updated successfully', {
      description: `${updatedMilestone.name} has been updated`
    })
  }, [onMilestoneUpdate])

  // WebSocket real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      const message = JSON.parse(lastMessage)

      switch (message.type) {
        case 'task_updated':
          handleTaskUpdate(message.data)
          break
        case 'milestone_updated':
          handleMilestoneUpdate(message.data)
          break
        case 'project_updated':
          // Handle project updates
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

  // Calculate progress percentage for display
  const calculateProgressPercentage = useCallback((progress: number): string => {
    return `${Math.round(progress * 100)}%`
  }, [])

  // Get status icon
  const getStatusIcon = (status: GanttTask['status']) => {
    switch (status) {
      case 'not_started':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'delayed':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'blocked':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }, [])

  // Get priority indicator
  const getPriorityIndicator = (priority: GanttTask['priority']) => {
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

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Gantt Chart - {project.name}</CardTitle>
              <p className="text-sm text-gray-600">
                {formatDate(projectTimeline.start)} - {formatDate(projectTimeline.end)}
                ({projectTimeline.totalDays} days)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptions(prev => ({
                ...prev,
                zoomLevel: Math.max(0.5, prev.zoomLevel - 0.25)
              }))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
              <span className="text-sm font-medium text-gray-700">
                {Math.round(options.zoomLevel * 100)}%
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptions(prev => ({
                ...prev,
                zoomLevel: Math.min(2, prev.zoomLevel + 0.25)
              }))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptions(prev => ({
                ...prev,
                showDependencies: !prev.showDependencies
              }))}
            >
              <Link className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptions(prev => ({
                ...prev,
                showMilestones: !prev.showMilestones
              }))}
            >
              <Target className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptions(prev => ({
                ...prev,
                showCriticalPath: !prev.showCriticalPath
              }))}
            >
              <Activity className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh?.()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.({
                project,
                tasks,
                milestones,
                options,
                criticalPath,
                timestamp: new Date().toISOString()
              })}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Project Overview */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{milestones.length}</div>
              <div className="text-sm text-gray-600">Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{criticalPath.length}</div>
              <div className="text-sm text-gray-600">Critical Path</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(
                  tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length * 100
                )}%
              </div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Timeline Gantt Chart</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {options.timeScale.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {options.zoomLevel === 1 ? '100%' : `${Math.round(options.zoomLevel * 100)}%`}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ScrollArea className="border border-gray-200 rounded-lg" style={{ height: gridDimensions.totalHeight + 200 }}>
            {/* Timeline Header */}
            <div className="flex border-b border-gray-200 bg-gray-50" style={{ height: gridDimensions.timelineHeight }}>
              <div className="flex" style={{ marginLeft: gridDimensions.columnWidth * 2 }}>
                <div className="w-full h-full flex items-center px-4">
                  <span className="text-sm font-medium text-gray-700">
                    {formatDate(projectTimeline.start)} - {formatDate(projectTimeline.end)}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Grid */}
            <div className="relative">
              {/* Day Headers */}
              <div className="flex border-b border-gray-200" style={{ height: gridDimensions.headerHeight }}>
                {/* Task Header */}
                <div className="w-64 border-r border-gray-200 bg-gray-50 px-4 py-2">
                  <span className="text-sm font-medium text-gray-700">Task</span>
                </div>

                {/* Date Columns */}
                {dateGrid.map((date, index) => {
                  const isWeekendDate = options.showWeekends && isWeekend(date)
                  const isTodayDate = isToday(date)

                  return (
                    <div
                      key={index}
                      className={`flex-shrink-0 border-r border-gray-200 px-2 py-2 text-center ${
                        isWeekendDate ? 'bg-gray-100' : ''
                      } ${isTodayDate ? 'bg-blue-50' : ''}`}
                      style={{ width: gridDimensions.columnWidth }}
                    >
                      <div className="text-xs font-medium">
                        <div className={isTodayDate ? 'text-blue-600' : 'text-gray-600'}>
                          {formatDate(date)}
                        </div>
                        {isWeekendDate && (
                          <div className="text-xs text-gray-500">Weekend</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tasks */}
              {tasks.map((task, taskIndex) => (
                <div key={task.id} className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors" style={{ height: gridDimensions.taskRowHeight }}>
                  {/* Task Info */}
                  <div className="w-64 border-r border-gray-200 px-4 py-2 flex items-center">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {task.name}
                        </div>
                        {task.assigneeName && (
                          <div className="text-xs text-gray-500">
                            {task.assigneeName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getPriorityIndicator(task.priority)}
                      {task.isMilestone && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      )}
                      {task.isCriticalPath && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </div>
                  </div>

                  {/* Task Timeline */}
                  <div className="flex">
                    {dateGrid.map((date, index) => {
                      const taskPosition = getTaskPosition(task)
                      const isTaskDate = index >= taskPosition.start && index <= taskPosition.end
                      const isStartDate = index === taskPosition.start
                      const isEndDate = index === taskPosition.end
                      const isPastDue = isPastDue(date) && task.status !== 'completed'

                      return (
                        <div
                          key={index}
                          className={`flex-shrink-0 border-r border-gray-200 ${
                            isTaskDate ? statusColors[task.status] : ''
                          } ${isPastDue ? 'bg-red-50' : ''}`}
                          style={{ width: gridDimensions.columnWidth }}
                        >
                          {isStartDate && (
                            <div className="text-xs font-medium text-gray-700">
                              Start
                            </div>
                          )}
                          {isEndDate && (
                            <div className="text-xs font-medium text-gray-700">
                              End
                            </div>
                          )}
                          {isTaskDate && !isStartDate && !isEndDate && (
                            <div className="h-full flex items-center justify-center">
                              <div className="w-full bg-gray-300 rounded" style={{ height: '2px' }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-32 border-r border-gray-200 px-4 py-2">
                    <Progress
                      value={task.progress}
                      className="h-2"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {calculateProgressPercentage(task.progress)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-24 px-4 py-2 flex items-center justify-end space-x-1">
                    {allowEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTaskClick(task)}
                        className="text-gray-500 hover:text-blue-600"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {allowEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTaskClick(task)}
                        className="text-gray-500 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Milestones */}
              {options.showMilestones && (
                <div className="border-t-2 border-purple-200 bg-purple-50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Milestones</span>
                    </div>
                  </div>

                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="flex items-center justify-between px-4 py-2 border-b border-purple-100 last:border-b-0">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        <div>
                          <div className="text-sm font-medium text-purple-900">
                            {milestone.name}
                          </div>
                          <div className="text-xs text-purple-700">
                            Due: {formatDate(milestone.dueDate)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant={milestone.status === 'completed' ? 'default' : 'secondary'}>
                          {milestone.status}
                        </Badge>
                        <Progress value={milestone.progress} className="h-2 w-24" />
                        <span className="text-xs text-gray-600 ml-2">
                          {calculateProgressPercentage(milestone.progress)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Task Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTaskDetails(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedTask.name}</h4>
                  {selectedTask.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedTask.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <Badge className="mt-1">{selectedTask.status}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Priority</span>
                    <Badge className="mt-1">{selectedTask.priority}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <div className="mt-1">
                      <Progress value={selectedTask.progress} className="h-2" />
                      <span className="text-xs text-gray-600">
                        {calculateProgressPercentage(selectedTask.progress)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Duration</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedTask.duration} days
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Start Date</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDate(selectedTask.startDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">End Date</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDate(selectedTask.endDate)}
                    </div>
                  </div>
                </div>

                {selectedTask.assigneeName && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Assignee</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedTask.assigneeName}
                    </div>
                  </div>
                )}

                {selectedTask.dependencies.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Dependencies</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.dependencies.map((depId, index) => {
                        const depTask = tasks.find(t => t.id === depId)
                        return (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {depTask?.name || depId}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selectedTask.tags.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
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

---

## 📋 **STEP 2: Create Milestone Management System**

### **Create Milestone Management Component**
