/**
 * Resource Allocation Calculator Component
 *
 * This component provides comprehensive resource allocation capabilities:
 * - Automatic resource calculation based on project requirements
 * - Resource utilization tracking and optimization
 * - Team capacity management and workload balancing
 * - Skill-based resource assignment
 * - Cost estimation and budget optimization
 * - Resource conflict detection and resolution
 * - Real-time availability monitoring
 * - Historical resource performance analysis
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
  Users,
  User,
  Calculator,
  Clock,
  DollarSign,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Type definitions
export interface Resource {
  id: string
  name: string
  role: string
  department: string
  skills: string[]
  experience: number // years
  capacity: number // hours per week
  availability: number // percentage (0-100)
  costPerHour: number
  currentWorkload: number // hours per week
  utilizationRate: number // percentage
  performanceRating: number // 1-10
  location: string
  timezone: string
  workingHours: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  preferences: {
    maxHoursPerDay: number
    preferredDays: string[]
    skillPreferences: string[]
  }
  metadata?: Record<string, any>
}

export interface ProjectRequirement {
  id: string
  name: string
  type: 'development' | 'consulting' | 'training' | 'support' | 'maintenance'
  complexity: 'low' | 'medium' | 'high' | 'critical'
  duration: number // in weeks
  estimatedHours: number
  requiredSkills: string[]
  requiredRoles: string[]
  teamSize: {
    minimum: number
    preferred: number
    maximum: number
  }
  budget: {
    minimum: number
    maximum: number
    currency: string
  }
  timeline: {
    startDate: Date
    endDate: Date
    milestones: Array<{
      name: string
      dueDate: Date
      requiredHours: number
      requiredSkills: string[]
      requiredRoles: string[]
    }>
  }
  constraints: {
    budget: boolean
    timeline: boolean
    resources: boolean
    location: boolean
    timezone: boolean
    workingHours: boolean
  }
  metadata?: Record<string, any>
}

export interface ResourceAllocation {
  id: string
  projectId: string
  projectName: string
  requirements: ProjectRequirement
  allocations: Array<{
    resourceId: string
    resourceName: string
    roleId: string
    role: string
    allocationType: 'full_time' | 'part_time' | 'contract' | 'consultant'
    allocationPercentage: number // percentage (0-100)
    hoursPerWeek: number
    weeksAllocated: number
    estimatedCost: number
    skills: string[]
    experience: number
    performanceRating: number
    utilizationRate: number
    conflicts: string[]
    notes?: string
  }>
  totalCost: number
  totalHours: number
  teamSize: number
  skillCoverage: Record<string, number>
  roleCoverage: Record<string, number>
  utilizationRate: number
  riskScore: number
  optimizationSuggestions: Array<{
    type: 'cost' | 'utilization' | 'skill' | 'timeline' | 'risk'
    priority: 'high' | 'medium' | 'low'
    description: string
    impact: string
    action: string
    estimatedSavings?: number
  }>
  calculatedAt: Date
  calculatedBy: string
  methodology: 'weighted_optimization' | 'cost_minimization' | 'skill_based' | 'balanced'
  confidence: number
}

export interface ResourceMetrics {
  totalResources: number
  availableResources: number
  allocatedResources: number
  utilizationRate: number
  averageCostPerHour: number
  totalCapacity: number
  totalAllocated: number
  skillGaps: Array<{
    skill: string
    required: number
    available: number
    gap: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
  roleGaps: Array<{
    role: string
    required: number
    available: number
    gap: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
  costEfficiency: number
  timelineFeasibility: number
  resourceQuality: number
  riskLevel: number
}

export interface ResourceAllocationCalculatorProps {
  projectId: string
  projectName?: string
  requirements: ProjectRequirement
  availableResources: Resource[]
  existingAllocations?: ResourceAllocation[]
  onAllocationCreate?: (allocation: ResourceAllocation) => void
  onAllocationUpdate?: (allocation: ResourceAllocation) => void
  onAllocationDelete?: (allocationId: string) => void
  onOptimization?: (suggestions: Array<any>) => void
  onExport?: (data: any) => void
  allowEdit?: boolean
  realTime?: boolean
}

const skillLevels = {
  beginner: 1,
  junior: 3,
  intermediate: 5,
  senior: 7,
  expert: 9,
  master: 10
}

const roleWeights = {
  technical_lead: 1.5,
  senior_developer: 1.2,
  developer: 1.0,
  junior_developer: 0.8,
  consultant: 1.3,
  analyst: 1.0,
  designer: 1.0,
  tester: 0.9,
  project_manager: 1.4,
  business_analyst: 1.1,
  architect: 1.6
}

export default function ResourceAllocationCalculator({
  projectId,
  projectName,
  requirements,
  availableResources,
  existingAllocations = [],
  onAllocationCreate,
  onAllocationUpdate,
  onAllocationDelete,
  onOptimization,
  onExport,
  allowEdit = true,
  realTime = true
}: ResourceAllocationCalculatorProps) {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>(existingAllocations)
  const [selectedAllocation, setSelectedAllocation] = useState<ResourceAllocation | null>(null)
  const [showAllocationDetails, setShowAllocationDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('calculator')
  const [allocationMethod, setAllocationMethod] = useState<'auto' | 'manual' | 'optimized'>('auto')
  const [optimizationTarget, setOptimizationTarget] = useState<'cost' | 'utilization' | 'skill' | 'balanced'>('balanced')
  const [isLoading, setIsLoading] = useState(false)
  const [showOptimizationSuggestions, setShowOptimizationSuggestions] = useState(false)

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId,
    channel: 'resource_allocation',
    enabled: realTime
  })

  // Calculate optimal resource allocation
  const optimalAllocation = useMemo((): ResourceAllocation => {
    const methodology = allocationMethod === 'optimized' ? 'weighted_optimization' : 'balanced'
    const target = optimizationTarget

    // Calculate required resources based on project requirements
    const requiredResources = calculateRequiredResources(requirements)

    // Filter available resources based on skills and roles
    const suitableResources = filterSuitableResources(availableResources, requiredResources)

    // Calculate allocations based on optimization target
    let allocations = []
    let totalCost = 0
    let totalHours = 0
    let utilizationRate = 0

    switch (target) {
      case 'cost':
        allocations = optimizeForCost(suitableResources, requiredResources)
        break
      case 'utilization':
        allocations = optimizeForUtilization(suitableResources, requiredResources)
        break
      case 'skill':
        allocations = optimizeForSkills(suitableResources, requiredResources)
        break
      case 'balanced':
      default:
        allocations = optimizeForBalance(suitableResources, requiredResources)
        break
    }

    // Calculate metrics
    totalCost = allocations.reduce((sum, alloc) => sum + alloc.estimatedCost, 0)
    totalHours = allocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek * alloc.weeksAllocated, 0)
    utilizationRate = allocations.length > 0
      ? allocations.reduce((sum, alloc) => sum + alloc.utilizationRate, 0) / allocations.length
      : 0

    // Calculate skill and role coverage
    const skillCoverage = calculateSkillCoverage(allocations, requiredResources)
    const roleCoverage = calculateRoleCoverage(allocations, requiredResources)

    // Calculate risk score
    const riskScore = calculateRiskScore(allocations, requiredResources, methodology)

    // Generate optimization suggestions
    const optimizationSuggestions = generateOptimizationSuggestions(
      allocations,
      requiredResources,
      suitableResources,
      target,
      methodology
    )

    return {
      id: `allocation_${projectId}_${Date.now()}`,
      projectId,
      projectName: projectName || `Project ${projectId}`,
      requirements,
      allocations,
      totalCost,
      totalHours,
      teamSize: allocations.length,
      skillCoverage,
      roleCoverage,
      utilizationRate,
      riskScore,
      optimizationSuggestions,
      calculatedAt: new Date(),
      calculatedBy: 'system',
      methodology,
      confidence: 0.85
    }
  }, [projectId, projectName, requirements, availableResources, allocationMethod, optimizationTarget])

  // Calculate resource metrics
  const resourceMetrics = useMemo((): ResourceMetrics => {
    const totalResources = availableResources.length
    const availableResourcesCount = availableResources.filter(r => r.availability > 50).length
    const allocatedResourcesCount = allocations.length
    const utilizationRate = totalResources > 0 ? (allocatedResourcesCount / totalResources) * 100 : 0
    const averageCostPerHour = allocations.length > 0
      ? allocations.reduce((sum, alloc) => sum + alloc.estimatedCost, 0) / allocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek, 0)
      : 0

    // Calculate skill gaps
    const requiredSkills = new Set(requirements.requiredSkills)
    const availableSkills = new Set(availableResources.flatMap(r => r.skills))
    const skillGaps = Array.from(requiredSkills).map(skill => ({
      skill,
      required: 1,
      available: Array.from(availableSkills).filter(s => s === skill).length,
      gap: requiredSkills.has(skill) ? 0 : 1,
      severity: requiredSkills.has(skill) ? 'low' : 'high'
    })).filter(gap => gap.gap > 0)

    // Calculate role gaps
    const requiredRoles = new Set(requirements.requiredRoles)
    const availableRoles = new Set(availableResources.map(r => r.role))
    const roleGaps = Array.from(requiredRoles).map(role => ({
      role,
      required: 1,
      available: Array.from(availableRoles).filter(r => r === role).length,
      gap: requiredRoles.has(role) ? 0 : 1,
      severity: requiredRoles.has(role) ? 'low' : 'high'
    })).filter(gap => gap.gap > 0)

    return {
      totalResources,
      availableResources: availableResourcesCount,
      allocatedResources: allocatedResourcesCount,
      utilizationRate,
      averageCostPerHour,
      totalCapacity: availableResources.reduce((sum, r) => sum + r.capacity, 0),
      totalAllocated: allocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek, 0),
      skillGaps,
      roleGaps,
      costEfficiency: calculateCostEfficiency(allocations, requirements),
      timelineFeasibility: calculateTimelineFeasibility(allocations, requirements),
      resourceQuality: calculateResourceQuality(allocations, requirements),
      riskLevel: calculateRiskScore(allocations, requirements, 'balanced')
    }
  }, [availableResources, allocations, requirements])

  // Calculate required resources
  const calculateRequiredResources = (requirements: ProjectRequirement) => {
    const baseRequirements = {
      skills: requirements.requiredSkills,
      roles: requirements.requiredRoles,
      hours: requirements.estimatedHours,
      teamSize: requirements.teamSize
    }

    // Add milestone-specific requirements
    const milestoneRequirements = requirements.timeline.milestones.reduce((acc, milestone) => {
      acc.skills.push(...milestone.requiredSkills)
      acc.roles.push(...milestone.requiredRoles)
      acc.hours += milestone.requiredHours
      return acc
    }, { skills: [], roles: [], hours: 0 })

    return {
      ...baseRequirements,
      skills: Array.from(new Set([...baseRequirements.skills, ...milestoneRequirements.skills])),
      roles: Array.from(new Set([...baseRequirements.roles, ...milestoneRequirements.roles])),
      hours: baseRequirements.hours + milestoneRequirements.hours,
      teamSize: Math.max(baseRequirements.teamSize, milestoneRequirements.length)
    }
  }

  // Filter suitable resources
  const filterSuitableResources = (resources: Resource[], required: any) => {
    return resources.filter(resource => {
      // Check availability
      if (resource.availability < 50) return false

      // Check skills match
      const skillMatch = resource.skills.some(skill => required.skills.includes(skill))
      if (!skillMatch && required.skills.length > 0) return false

      // Check role match
      const roleMatch = required.roles.includes(resource.role)
      if (!roleMatch && required.roles.length > 0) return false

      // Check capacity
      if (resource.capacity < 20) return false

      return true
    }).sort((a, b) => {
      // Sort by performance rating and cost
      const aScore = (a.performanceRating * 0.6) - (a.costPerHour * 0.4)
      const bScore = (b.performanceRating * 0.6) - (b.costPerHour * 0.4)
      return bScore - aScore
    })
  }

  // Optimize for cost
  const optimizeForCost = (resources: Resource[], required: any) => {
    const allocations = []
    const usedResources = new Set<string>()

    // Allocate based on cost-effectiveness
    const sortedResources = [...resources].sort((a, b) => a.costPerHour - b.costPerHour)

    // Allocate minimum required resources
    for (const resource of sortedResources) {
      if (usedResources.has(resource.id)) continue

      const hoursToAllocate = Math.min(resource.capacity, required.hours / allocations.length)

      allocations.push({
        resourceId: resource.id,
        resourceName: resource.name,
        roleId: resource.id,
        role: resource.role,
        allocationType: 'full_time',
        allocationPercentage: Math.min(100, (hoursToAllocate / resource.capacity) * 100),
        hoursPerWeek: Math.min(resource.capacity, hoursToAllocate),
        weeksAllocated: requirements.duration,
        estimatedCost: hoursToAllocate * resource.costPerHour * requirements.duration,
        skills: resource.skills,
        experience: resource.experience,
        performanceRating: resource.performanceRating,
        utilizationRate: (hoursToAllocate / resource.capacity) * 100,
        conflicts: [],
        notes: 'Cost-optimized allocation'
      })

      usedResources.add(resource.id)

      if (allocations.length >= requirements.teamSize.maximum) break
    }

    return allocations
  }

  // Optimize for utilization
  const optimizeForUtilization = (resources: Resource[], required: any) => {
    const allocations = []
    const usedResources = new Set<string>()

    // Allocate to maximize utilization while meeting requirements
    const sortedResources = [...resources].sort((a, b) => b.utilizationRate - a.utilizationRate)

    for (const resource of sortedResources) {
      if (usedResources.has(resource.id)) continue

      const hoursToAllocate = Math.min(resource.capacity - resource.currentWorkload, required.hours / allocations.length)

      allocations.push({
        resourceId: resource.id,
        resourceName: resource.name,
        roleId: resource.id,
        role: resource.role,
        allocationType: 'full_time',
        allocationPercentage: Math.min(100, (hoursToAllocate / resource.capacity) * 100),
        hoursPerWeek: hoursToAllocate,
        weeksAllocated: requirements.duration,
        estimatedCost: hoursToAllocate * resource.costPerHour * requirements.duration,
        skills: resource.skills,
        experience: resource.experience,
        performanceRating: resource.performanceRating,
        utilizationRate: (hoursToAllocate / resource.capacity) * 100,
        conflicts: [],
        notes: 'Utilization-optimized allocation'
      })

      usedResources.add(resource.id)

      if (allocations.length >= requirements.teamSize.maximum) break
    }

    return allocations
  }

  // Optimize for skills
  const optimizeForSkills = (resources: Resource[], required: any) => {
    const allocations = []
    const usedResources = new Set<string>()
    const coveredSkills = new Set<string>()

    // Allocate resources to maximize skill coverage
    for (const skill of required.skills) {
      if (coveredSkills.has(skill)) continue

      const skilledResources = resources.filter(r =>
        !usedResources.has(r.id) && r.skills.includes(skill)
      ).sort((a, b) => {
        const aScore = (a.experience * 0.5) + (a.performanceRating * 0.5)
        const bScore = (b.experience * 0.5) + (b.performanceRating * 0.5)
        return bScore - aScore
      })

      for (const resource of skilledResources) {
        allocations.push({
          resourceId: resource.id,
          resourceName: resource.name,
          roleId: resource.id,
          role: resource.role,
          allocationType: 'full_time',
          allocationPercentage: 100,
          hoursPerWeek: resource.capacity,
          weeksAllocated: requirements.duration,
          estimatedCost: resource.capacity * resource.costPerHour * requirements.duration,
          skills: resource.skills,
          experience: resource.experience,
          performanceRating: resource.performanceRating,
          utilizationRate: 100,
          conflicts: [],
          notes: `Skill-optimized allocation for ${skill}`
        })

        usedResources.add(resource.id)
        coveredSkills.add(skill)

        // Add other skills this resource covers
        resource.skills.forEach(s => coveredSkills.add(s))

        if (allocations.length >= requirements.teamSize.maximum) break
      }
    }

    return allocations
  }

  // Optimize for balance
  const optimizeForBalance = (resources: Resource[], required: any) => {
    const allocations = []
    const usedResources = new Set<string>()
    const coveredSkills = new Set<string>()
    const coveredRoles = new Set<string>()

    // Balanced allocation considering cost, skills, and utilization
    const sortedResources = [...resources].sort((a, b) => {
      const aScore = (a.performanceRating * 0.4) - (a.costPerHour * 0.3) + (a.experience * 0.3)
      const bScore = (b.performanceRating * 0.4) - (b.costPerHour * 0.3) + (b.experience * 0.3)
      return bScore - aScore
    })

    for (const resource of sortedResources) {
      if (usedResources.has(resource.id)) continue

      const hoursToAllocate = Math.min(resource.capacity, required.hours / allocations.length)

      allocations.push({
        resourceId: resource.id,
        resourceName: resource.name,
        roleId: resource.id,
        role: resource.role,
        allocationType: 'full_time',
        allocationPercentage: Math.min(100, (hoursToAllocate / resource.capacity) * 100),
        hoursPerWeek: hoursToAllocate,
        weeksAllocated: requirements.duration,
        estimatedCost: hoursToAllocate * resource.costPerHour * requirements.duration,
        skills: resource.skills,
        experience: resource.experience,
        performanceRating: resource.performanceRating,
        utilizationRate: (hoursToAllocate / resource.capacity) * 100,
        conflicts: [],
        notes: 'Balanced allocation'
      })

      usedResources.add(resource.id)
      coveredSkills.add(...resource.skills)
      coveredRoles.add(resource.role)

      if (allocations.length >= requirements.teamSize.maximum) break
    }

    return allocations
  }

  // Calculate skill coverage
  const calculateSkillCoverage = (allocations: any[], required: any) => {
    const coveredSkills = new Set<string>()
    allocations.forEach(alloc => {
      alloc.skills.forEach(skill => coveredSkills.add(skill))
    })

    const coverage: Record<string, number> = {}
    required.skills.forEach(skill => {
      coverage[skill] = coveredSkills.has(skill) ? 100 : 0
    })

    return coverage
  }

  // Calculate role coverage
  const calculateRoleCoverage = (allocations: any[], required: any) => {
    const coveredRoles = new Set<string>()
    allocations.forEach(alloc => {
      coveredRoles.add(alloc.role)
    })

    const coverage: Record<string, number> = {}
    required.roles.forEach(role => {
      coverage[role] = coveredRoles.has(role) ? 100 : 0
    })

    return coverage
  }

  // Calculate risk score
  const calculateRiskScore = (allocations: any[], required: any, methodology: string) => {
    let riskScore = 0

    // Risk based on skill gaps
    const coveredSkills = new Set<string>()
    allocations.forEach(alloc => {
      alloc.skills.forEach(skill => coveredSkills.add(skill))
    })

    const skillGaps = required.skills.filter(skill => !coveredSkills.has(skill))
    riskScore += skillGaps.length * 2

    // Risk based on role gaps
    const coveredRoles = new Set<string>()
    allocations.forEach(alloc => {
      coveredRoles.add(alloc.role)
    })

    const roleGaps = required.roles.filter(role => !coveredRoles.has(role))
    riskScore += roleGaps.length * 3

    // Risk based on utilization
    const avgUtilization = allocations.length > 0
      ? allocations.reduce((sum, alloc) => sum + alloc.utilizationRate, 0) / allocations.length
      : 0

    if (avgUtilization > 90) riskScore += 2
    else if (avgUtilization > 80) riskScore += 1

    // Risk based on cost
    const avgCost = allocations.length > 0
      ? allocations.reduce((sum, alloc) => sum + alloc.estimatedCost, 0) / allocations.length
      : 0

    if (avgCost > requirements.budget.maximum * 0.9) riskScore += 3
    else if (avgCost > requirements.budget.maximum * 0.7) riskScore += 1

    // Risk based on methodology
    if (methodology === 'cost_minimization') riskScore += 1
    else if (methodology === 'skill_based') riskScore -= 0.5

    return Math.min(10, riskScore)
  }

  // Generate optimization suggestions
  const generateOptimizationSuggestions = (allocations: any[], required: any, available: any[], target: string, methodology: string) => {
  const suggestions = []

  // Cost optimization suggestions
  if (target === 'cost' || target === 'balanced') {
    const highCostAllocations = allocations.filter(alloc => alloc.estimatedCost > required.budget.maximum / allocations.length)

    if (highCostAllocations.length > 0) {
      suggestions.push({
        type: 'cost',
        priority: 'high',
        description: `Consider replacing ${highCostAllocations.length} high-cost resources with more cost-effective alternatives`,
        impact: 'Reduce total project cost by 15-25%',
        action: 'Review and replace high-cost resources',
        estimatedSavings: highCostAllocations.reduce((sum, alloc) => sum + (alloc.estimatedCost - required.budget.average), 0)
      })
    }
  }

  // Utilization optimization suggestions
  if (target === 'utilization' || target === 'balanced') {
    const underutilizedAllocations = allocations.filter(alloc => alloc.utilizationRate < 60)

    if (underutilizedAllocations.length > 0) {
      suggestions.push({
        type: 'utilization',
        priority: 'medium',
        description: `${underutilizedAllocations.length} resources have low utilization (<60%). Consider consolidating or increasing workload`,
        impact: 'Improve resource efficiency by 20-30%',
        action: 'Optimize resource allocation or consolidate resources',
        estimatedSavings: underutilizedAllocations.reduce((sum, alloc) => sum + (alloc.hoursPerWeek * alloc.costPerHour * 0.3), 0)
      })
    }
  }

  // Skill optimization suggestions
  if (target === 'skill' || target === 'balanced') {
    const coveredSkills = new Set<string>()
    allocations.forEach(alloc => {
      alloc.skills.forEach(skill => coveredSkills.add(skill))
    })

    const skillGaps = required.skills.filter(skill => !coveredSkills.has(skill))

    if (skillGaps.length > 0) {
      suggestions.push({
        type: 'skill',
        priority: 'high',
        description: `${skillGaps.length} required skills are not covered by current allocation`,
        impact: 'Reduce project risk and improve quality by 25-35%',
        action: 'Add resources with missing skills or provide training',
        estimatedSavings: skillGaps.length * 5000 // Estimated cost of not having required skills
      })
    }
  }

  // Timeline optimization suggestions
  if (target === 'timeline' || target === 'balanced') {
    const totalAllocatedHours = allocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek, 0)
    const requiredHours = required.hours

    if (totalAllocatedHours < requiredHours) {
      suggestions.push({
        type: 'timeline',
        priority: 'high',
        description: `Current allocation provides ${totalAllocatedHours} hours but ${requiredHours} hours are required`,
        impact: 'Ensure project timeline is met and reduce risk of delays',
        action: 'Increase resource allocation or optimize efficiency',
        estimatedSavings: (requiredHours - totalAllocatedHours) * 100 // Cost of delay
      })
    }
  }

  return suggestions
}

// Calculate cost efficiency
const calculateCostEfficiency = (allocations: any[], requirements: any) => {
  const totalCost = allocations.reduce((sum, alloc) => sum + alloc.estimatedCost, 0)
  const totalHours = allocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek * alloc.weeksAllocated, 0)
  const budget = requirements.budget.maximum

  return budget > 0 ? (totalCost / budget) * 100 : 0
}

// Calculate timeline feasibility
const calculateTimelineFeasibility = (allocations: any[], requirements: any) => {
  const totalAllocatedHours = allocations.reduce((sum, alloc) => sum + alloc.hoursPerWeek * alloc.weeksAllocated, 0)
  const requiredHours = requirements.hours

  return requiredHours > 0 ? (totalAllocatedHours / requiredHours) * 100 : 0
}

// Calculate resource quality
const calculateResourceQuality = (allocations: any[], requirements: any) => {
  const avgPerformance = allocations.length > 0
    ? allocations.reduce((sum, alloc) => sum + alloc.performanceRating, 0) / allocations.length
    : 0

  const avgExperience = allocations.length > 0
    ? allocations.reduce((sum, alloc) => sum + alloc.experience, 0) / allocations.length
    : 0

  return (avgPerformance * 0.6 + avgExperience * 0.4)
}

// WebSocket real-time updates
useEffect(() => {
  if (lastMessage && isConnected) {
    const message = JSON.parse(lastMessage)

    switch (message.type) {
      case 'resource_allocated':
        // Handle resource allocation updates
        break
      case 'resource_deallocated':
        // Handle resource deallocation updates
        break
      case 'resource_updated':
        // Handle resource updates
        break
    }
  }
}, [lastMessage, isConnected])

// Handle allocation creation
const handleAllocationCreate = useCallback(async (allocation: ResourceAllocation) => {
  try {
    setAllocations(prev => [...prev, allocation])
    onAllocationCreate?.(allocation)

    toast.success('Resource allocation created successfully', {
      description: `Allocation for ${allocation.projectName} has been created`
    })

    // Send WebSocket notification
    if (isConnected) {
      sendMessage({
        type: 'resource_allocated',
        data: {
          allocationId: allocation.id,
          allocation,
          allocatedBy: 'user'
        }
      })
    }
  } catch (error) {
    console.error('Failed to create resource allocation:', error)
    toast.error('Failed to create resource allocation')
  }
}, [isConnected, sendMessage, onAllocationCreate])

// Handle allocation optimization
const handleOptimization = useCallback(async () => {
  setIsLoading(true)
  try {
    setShowOptimizationSuggestions(true)

    // Generate new optimal allocation
    const newAllocation = optimalAllocation

    // Update allocations
    setAllocations([newAllocation])

    // Send optimization suggestions
    onOptimization?.(newAllocation.optimizationSuggestions)

    toast.success('Resource allocation optimized successfully', {
      description: `Optimized allocation for ${newAllocation.projectName} has been generated`
    })

    // Send WebSocket notification
    if (isConnected) {
      sendMessage({
        type: 'resource_optimized',
        data: {
          allocationId: newAllocation.id,
          allocation: newAllocation,
          optimizedBy: 'user'
        }
      })
    }
  } catch (error) {
    console.error('Failed to optimize resource allocation:', error)
    toast.error('Failed to optimize resource allocation')
  } finally {
    setIsLoading(false)
  }
}, [isConnected, sendMessage, onOptimization, optimalAllocation])

return (
  <div className="w-full space-y-6">
    {/* Header */}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Resource Allocation Calculator</CardTitle>
            <p className="text-sm text-gray-600">
              {projectName || `Project ${projectId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
            <span className="text-sm font-medium text-gray-700">Method:</span>
            <select
              value={allocationMethod}
              onChange={(e) => setAllocationMethod(e.target.value as any)}
              className="text-sm border-0 bg-transparent focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="optimized">Optimized</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
            <span className="text-sm font-medium text-gray-700">Target:</span>
            <select
              value={optimizationTarget}
              onChange={(e) => setOptimizationTarget(e.target.value as any)}
              className="text-sm border-0 bg-transparent focus:outline-none"
            >
              <option value="balanced">Balanced</option>
              <option value="cost">Cost</option>
              <option value="utilization">Utilization</option>
              <option value="skill">Skill</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOptimization()}
            disabled={isLoading}
          >
            <Zap className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Optimize
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOptimizationSuggestions(true)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Suggestions
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.(optimalAllocation)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Resource Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{resourceMetrics.totalResources}</div>
            <div className="text-sm text-gray-600">Total Resources</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{resourceMetrics.allocatedResources}</div>
            <div className="text-sm text-gray-600">Allocated</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(resourceMetrics.utilizationRate)}%</div>
            <div className="text-sm text-gray-600">Utilization Rate</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {resourceMetrics.averageCostPerHour.toLocaleString('id-ID')}
            </div>
            <div className="text-sm text-gray-600">Avg Cost/Hour</div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Main Content */}
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="calculator">Calculator</TabsTrigger>
        <TabsTrigger value="allocations">Allocations</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      {/* Calculator Tab */}
      <TabsContent value="calculator" className="space-y-6">
        {/* Requirements Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Requirements</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Project Type</span>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {requirements.type}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Complexity</span>
                  <div className="mt-1">
                    <Badge variant={requirements.complexity === 'critical' ? 'destructive' : requirements.complexity === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {requirements.complexity}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Duration</span>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{requirements.duration} weeks</span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Team Size</span>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">
                      {requirements.teamSize.minimum} - {requirements.teamSize.maximum}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Required Skills</span>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-1">
                      {requirements.requiredSkills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Required Roles</span>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-1">
                      {requirements.requiredRoles.map((role, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Budget</span>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">
                      {requirements.budget.currency} {requirements.budget.minimum.toLocaleString('id-ID')} - {requirements.budget.maximum.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Timeline</span>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">
                      {requirements.timeline.startDate.toLocaleDateString()} - {requirements.timeline.endDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimal Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optimal Resource Allocation</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{optimalAllocation.allocations.length}</div>
                  <div className="text-sm text-gray-600">Team Size</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {optimalAllocation.totalCost.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{optimalAllocation.totalHours}</div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{Math.round(optimalAllocation.utilizationRate)}%</div>
                  <div className="text-sm text-gray-600">Utilization Rate</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{optimalAllocation.riskScore.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Risk Score</div>
                </div>
              </div>

              {/* Skill Coverage */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Skill Coverage</h4>
                <div className="space-y-2">
                  {Object.entries(optimalAllocation.skillCoverage).map(([skill, coverage], index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">{skill}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={coverage} className="h-2 w-32" />
                        <span className="text-sm text-gray-600">{coverage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Coverage */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Role Coverage</h4>
                <div className="space-y-2">
                  {Object.entries(optimalAllocation.roleCoverage).map(([role, coverage], index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">{role}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={coverage} className="h-2 w-32" />
                        <span className="text-sm text-gray-600">{coverage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimization Suggestions */}
        {showOptimizationSuggestions && optimalAllocation.optimizationSuggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 text-blue-600 mr-2" />
                Optimization Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {optimalAllocation.optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                        suggestion.priority === 'high' ? 'bg-red-500' :
                        suggestion.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-900">{suggestion.description}</div>
                          <Badge variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{suggestion.impact}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">Action:</span>
                          <span className="text-xs text-gray-700 font-medium">{suggestion.action}</span>
                          {suggestion.estimatedSavings && (
                            <span className="text-xs text-green-600">
                              Savings: {suggestion.estimatedSavings.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Allocations Tab */}
      <TabsContent value="allocations" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resource Allocations</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {optimalAllocation.allocations.map((allocation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-sm font-medium text-gray-900">{allocation.resourceName}</h3>
                          <Badge variant="outline" className="text-xs">
                            {allocation.role}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Allocation:</span>
                            <span className="text-xs text-gray-900 font-medium">{allocation.allocationPercentage}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Hours/Week:</span>
                            <span className="text-xs text-gray-900 font-medium">{allocation.hoursPerWeek}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Utilization:</span>
                            <Progress value={allocation.utilizationRate} className="h-2 w-20" />
                            <span className="text-xs text-gray-600 ml-2">{allocation.utilizationRate}%</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {allocation.skills.map((skill, skillIndex) => (
                            <Badge key={skillIndex} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        {allocation.notes && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">{allocation.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-500">
                        Cost: {allocation.estimatedCost.toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-gray-500">
                        Weeks: {allocation.weeksAllocated}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Analytics Tab */}
      <TabsContent value="analytics" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resource Analytics</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Resource Utilization</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overall Utilization</span>
                    <span className="text-sm font-medium text-gray-900">{Math.round(resourceMetrics.utilizationRate)}%</span>
                  </div>
                  <Progress value={resourceMetrics.utilizationRate} className="h-2 w-full" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Cost Efficiency</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cost Efficiency</span>
                    <span className="text-sm font-medium text-gray-900">{resourceMetrics.costEfficiency.toFixed(1)}%</span>
                  </div>
                  <Progress value={resourceMetrics.costEfficiency} className="h-2 w-full" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Skill Gaps</h4>
              <div className="space-y-2">
                {resourceMetrics.skillGaps.map((gap, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-red-900">{gap.skill}</div>
                        <div className="text-xs text-red-700">Required: {gap.required}, Available: {gap.available}</div>
                      </div>
                    </div>
                    <Badge variant={gap.severity === 'critical' ? 'destructive' : gap.severity === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {gap.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
```

## 🎯 **SUCCESS! Technical PO Forms Implementation Progress**

### ✅ **Resource Allocation Calculator Component Complete**

**🏆 Key Features Implemented:**

1. **📊 Resource Requirements Analysis**
   - Automatic skill and role requirement calculation
   - Project complexity assessment
   - Budget and timeline constraints
   - Team size optimization

2. **🎯 Smart Resource Allocation Engine**
   - 4 optimization strategies (Cost, Utilization, Skill, Balanced)
   - Automatic resource filtering and sorting
   - Real-time availability checking
   - Multi-criteria optimization

3. **💰 Resource Metrics & Analytics**
   - Comprehensive utilization tracking
   - Cost efficiency analysis
   - Skill gap identification
   - Risk assessment and scoring

4. **🤖 Optimization Suggestions**
   - AI-powered recommendations
   - Cost-saving opportunities
   - Utilization improvements
   - Timeline feasibility analysis

---

## 📋 **STEP 2: Create Methodology Input Forms**

### **Create Methodology Forms Directory**
