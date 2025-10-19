/**
 * Advanced Search Filters Component
 *
 * This component provides comprehensive search filtering capabilities:
 * - Faceted search with multiple filter types
 * - Advanced filtering with custom conditions
 * - Filter persistence and state management
 * - Real-time filter updates
 * - Filter analytics and usage tracking
 * - Filter optimization and recommendations
 * - Multi-language support
 * - Accessibility features
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Filter,
  Search,
  Calendar,
  Users,
  FileText,
  Tag,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  RefreshCw,
  Save,
  X,
  Eye,
  EyeOff,
  Settings,
  Download,
  Zap,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
  Globe,
  MapPin,
  Database,
  HardDrive,
  Image,
  Video,
  Music,
  Archive,
  File,
  Folder,
  FolderOpen,
  Hash,
  AtSign,
  Link,
  Shield,
  Award,
  Target,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  FilterIcon
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Type definitions
export interface FilterOption {
  id: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'range' | 'boolean' | 'custom'
  label: string
  field: string
  value: any
  defaultValue?: any
  placeholder?: string
  description?: string
  options?: Array<{
    value: string
    label: string
    count?: number
    icon?: React.ReactNode
  }>
  min?: number
  max?: number
  step?: number
  unit?: string
  required?: boolean
  visible?: boolean
  disabled?: boolean
  group?: string
  category?: string
  priority?: number
  icon?: React.ReactNode
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
  onValueChange?: (value: any) => void
  onClear?: () => void
}

export interface FilterGroup {
  id: string
  name: string
  label: string
  description?: string
  collapsed?: boolean
  visible?: boolean
  required?: boolean
  icon?: React.ReactNode
  options: FilterOption[]
  onToggle?: () => void
  onClear?: () => void
}

export interface FilterState {
  activeFilters: Record<string, any>
  appliedFilters: Record<string, any>
  availableFilters: Record<string, FilterOption>
  filterGroups: FilterGroup[]
  savedFilters: Array<{
    id: string
    name: string
    description?: string
    filters: Record<string, any>
    createdAt: Date
    updatedAt: Date
    createdBy: string
    isPublic: boolean
    usage: number
  }>
  recentSearches: Array<{
    query: string
    filters: Record<string, any>
    timestamp: Date
    resultsCount: number
  }>
  analytics: {
    filterUsage: Record<string, number>
    popularFilters: Array<{
      filter: string
      value: string
      count: number
    }>
    filterCombinations: Array<{
      combination: Record<string, any>
      count: number
    }>
  }
}

export interface SearchFiltersProps {
  projectId?: string
  projectName?: string
  filters: FilterOption[]
  filterGroups?: FilterGroup[]
  onFiltersChange?: (filters: Record<string, any>) => void
  onFilterApply?: (filters: Record<string, any>) => void
  onFilterClear?: () => void
  onFilterSave?: (name: string, description?: string) => void
  onFilterLoad?: (filterId: string) => void
  onExport?: (filters: any) => void
  allowSave?: boolean
  allowExport?: boolean
  showAnalytics?: boolean
  showRecentSearches?: boolean
  showSavedFilters?: boolean
  realTime?: boolean
}

const defaultFilterGroups: FilterGroup[] = [
  {
    id: 'content',
    name: 'Content',
    label: 'Content Filters',
    description: 'Filter by content type and properties',
    collapsed: false,
    visible: true,
    icon: <FileText className="h-4 w-4" />,
    options: [
      {
        id: 'type',
        type: 'multiselect',
        label: 'Document Type',
        field: 'type',
        value: [],
        placeholder: 'Select document types',
        description: 'Filter by document type',
        options: [
          { value: 'document', label: 'Document', icon: <FileText className="h-4 w-4" /> },
          { value: 'proposal', label: 'Proposal', icon: <FileText className="h-4 w-4" /> },
          { value: 'user', label: 'User', icon: <Users className="h-4 w-4" /> },
          { value: 'project', label: 'Project', icon: <Database className="h-4 w-4" /> },
          { value: 'template', label: 'Template', icon: <FileText className="h-4 w-4" /> },
          { value: 'report', label: 'Report', icon: <FileText className="h-4 w-4" /> },
          { value: 'other', label: 'Other', icon: <FileText className="h-4 w-4" /> }
        ]
      },
      {
        id: 'category',
        type: 'multiselect',
        label: 'Category',
        field: 'category',
        value: [],
        placeholder: 'Select categories',
        description: 'Filter by document category',
        options: [
          { value: 'business', label: 'Business', icon: <Target className="h-4 w-4" /> },
          { value: 'technical', label: 'Technical', icon: <Database className="h-4 w-4" /> },
          { value: 'legal', label: 'Legal', icon: <Shield className="h-4 w-4" /> },
          { value: 'financial', label: 'Financial', icon: <DollarSign className="h-4 w-4" /> },
          { value: 'marketing', label: 'Marketing', icon: <TrendingUp className="h-4 w-4" /> },
          { value: 'hr', label: 'HR', icon: <Users className="h-4 w-4" /> },
          { value: 'operations', label: 'Operations', icon: <Activity className="h-4 w-4" /> }
        ]
      },
      {
        id: 'tags',
        type: 'multiselect',
        label: 'Tags',
        field: 'tags',
        value: [],
        placeholder: 'Select tags',
        description: 'Filter by document tags',
        options: []
      }
    ]
  },
  {
    id: 'date',
    name: 'Date',
    label: 'Date Filters',
    description: 'Filter by date and time',
    collapsed: true,
    visible: true,
    icon: <Calendar className="h-4 w-4" />,
    options: [
      {
        id: 'created_after',
        type: 'date',
        label: 'Created After',
        field: 'createdAt',
        value: null,
        placeholder: 'Select date',
        description: 'Documents created after this date'
      },
      {
        id: 'created_before',
        type: 'date',
        label: 'Created Before',
        field: 'createdAt',
        value: null,
        placeholder: 'Select date',
        description: 'Documents created before this date'
      },
      {
        id: 'updated_after',
        type: 'date',
        label: 'Updated After',
        field: 'updatedAt',
        value: null,
        placeholder: 'Select date',
        description: 'Documents updated after this date'
      },
      {
        id: 'updated_before',
        type: 'date',
        label: 'Updated Before',
        field: 'updatedAt',
        value: null,
        placeholder: 'Select date',
        description: 'Documents updated before this date'
      },
      {
        id: 'date_range',
        type: 'custom',
        label: 'Date Range',
        field: 'date_range',
        value: {},
        placeholder: 'Select date range',
        description: 'Filter by custom date range'
      }
    ]
  },
  {
    id: 'size',
    name: 'Size',
    label: 'Size Filters',
    description: 'Filter by file size and properties',
    collapsed: true,
    visible: true,
    icon: <HardDrive className="h-4 w-4" />,
    options: [
      {
        id: 'file_size_min',
        type: 'range',
        label: 'Min File Size',
        field: 'fileSize',
        value: 0,
        min: 0,
        max: 1000000000,
        step: 1000,
        unit: 'bytes',
        placeholder: 'Select minimum file size',
        description: 'Minimum file size in bytes'
      },
      {
        id: 'file_size_max',
        type: 'range',
        label: 'Max File Size',
        field: 'fileSize',
        value: 1000000000,
        min: 0,
        max: 1000000000,
        step: 1000,
        unit: 'bytes',
        placeholder: 'Select maximum file size',
        description: 'Maximum file size in bytes'
      },
      {
        id: 'file_type',
        type: 'multiselect',
        label: 'File Type',
        field: 'fileType',
        value: [],
        placeholder: 'Select file types',
        description: 'Filter by file type',
        options: [
          { value: 'pdf', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
          { value: 'doc', label: 'Word', icon: <FileText className="h-4 w-4" /> },
          { value: 'docx', label: 'Word', icon: <FileText className="h-4 w-4" /> },
          { value: 'xls', label: 'Excel', icon: <FileText className="h-4 w-4" /> },
          { value: 'xlsx', label: 'Excel', icon: <FileText className="h-4 w-4" /> },
          { value: 'ppt', label: 'PowerPoint', icon: <FileText className="h-4 w-4" /> },
          { value: 'pptx', label: 'PowerPoint', icon: <FileText className="h-4 w-4" /> },
          { value: 'jpg', label: 'JPEG', icon: <Image className="h-4 w-4" /> },
          { value: 'png', label: 'PNG', icon: <Image className="h-4 w-4" /> },
          { value: 'gif', label: 'GIF', icon: <Image className="h-4 w-4" /> },
          { value: 'mp4', label: 'Video', icon: <Video className="h-4 w-4" /> },
          { value: 'mp3', label: 'Audio', icon: <Music className="h-4 w-4" /> },
          { value: 'zip', label: 'Archive', icon: <Archive className="h-4 w-4" /> }
        ]
      }
    ]
  },
  {
    id: 'author',
    name: 'Author',
    label: 'Author Filters',
    description: 'Filter by author and creator',
    collapsed: true,
    visible: true,
    icon: <Users className="h-4 w-4" />,
    options: [
      {
        id: 'author',
        type: 'multiselect',
        label: 'Author',
        field: 'author',
        value: [],
        placeholder: 'Select authors',
        description: 'Filter by document author',
        options: []
      },
      {
        id: 'created_by',
        type: 'multiselect',
        label: 'Created By',
        field: 'createdBy',
        value: [],
        placeholder: 'Select creators',
        description: 'Filter by document creator',
        options: []
      },
      {
        id: 'last_modified_by',
        type: 'multiselect',
        label: 'Last Modified By',
        field: 'lastModifiedBy',
        value: [],
        placeholder: 'Select modifiers',
        description: 'Filter by last modifier',
        options: []
      }
    ]
  },
  {
    id: 'location',
    name: 'Location',
    label: 'Location Filters',
    description: 'Filter by location and geography',
    collapsed: true,
    visible: true,
    icon: <MapPin className="h-4 w-4" />,
    options: [
      {
        id: 'country',
        type: 'multiselect',
        label: 'Country',
        field: 'country',
        value: [],
        placeholder: 'Select countries',
        description: 'Filter by country',
        options: [
          { value: 'ID', label: 'Indonesia', icon: <Globe className="h-4 w-4" /> },
          { value: 'US', label: 'United States', icon: <Globe className="h-4 w-4" /> },
          { value: 'UK', label: 'United Kingdom', icon: <Globe className="h-4 w-4" /> },
          { value: 'CN', label: 'China', icon: <Globe className="h-4 w-4" /> },
          { value: 'JP', label: 'Japan', icon: <Globe className="h-4 w-4" /> },
          { value: 'KR', label: 'South Korea', icon: <Globe className="h-4 w-4" /> },
          { value: 'DE', label: 'Germany', icon: <Globe className="h-4 w-4" /> },
          { value: 'FR', label: 'France', icon: <Globe className="h-4 w-4" /> }
        ]
      },
      {
        id: 'region',
        type: 'multiselect',
        label: 'Region',
        field: 'region',
        value: [],
        placeholder: 'Select regions',
        description: 'Filter by region',
        options: [
          { value: 'asia', label: 'Asia', icon: <Globe className="h-4 w-4" /> },
          { value: 'europe', label: 'Europe', icon: <Globe className="h-4 w-4" /> },
          { value: 'americas', label: 'Americas', icon: <Globe className="h-4 w-4" /> },
          { value: 'africa', label: 'Africa', icon: <Globe className="h-4 w-4" /> },
          { value: 'oceania', label: 'Oceania', icon: <Globe className="h-4 w-4" /> }
        ]
      },
      {
        id: 'city',
        type: 'text',
        label: 'City',
        field: 'city',
        value: '',
        placeholder: 'Enter city name',
        description: 'Filter by city'
      }
    ]
  },
  {
    id: 'language',
    name: 'Language',
    label: 'Language Filters',
    description: 'Filter by language and locale',
    collapsed: true,
    visible: true,
    icon: <Globe className="h-4 w-4" />,
    options: [
      {
        id: 'language',
        type: 'multiselect',
        label: 'Language',
        field: 'language',
        value: [],
        placeholder: 'Select languages',
        description: 'Filter by document language',
        options: [
          { value: 'en', label: 'English', icon: <Globe className="h-4 w-4" /> },
          { value: 'id', label: 'Indonesian', icon: <Globe className="h-4 w-4" /> },
          { value: 'zh', label: 'Chinese', icon: <Globe className="h-4 w-4" /> },
          { value: 'ja', label: 'Japanese', icon: <Globe className="h-4 w-4" /> },
          { value: 'ko', label: 'Korean', icon: <Globe className="h-4 w-4" /> },
          { value: 'fr', label: 'French', icon: <Globe className="h-4 w-4" /> },
          { value: 'de', label: 'German', icon: <Globe className="h-4 w-4" /> },
          { value: 'es', label: 'Spanish', icon: <Globe className="h-4 w-4" /> },
          { value: 'pt', label: 'Portuguese', icon: <Globe className="h-4 w-4" /> },
          { value: 'ru', label: 'Russian', icon: <Globe className="h-4 w-4" /> }
        ]
      },
      {
        id: 'locale',
        type: 'multiselect',
        label: 'Locale',
        field: 'locale',
        value: [],
        placeholder: 'Select locales',
        description: 'Filter by document locale',
        options: [
          { value: 'en-US', label: 'English (US)', icon: <Globe className="h-4 w-4" /> },
          { value: 'id-ID', label: 'Indonesian (ID)', icon: <Globe className="h-4 w-4" /> },
          { value: 'zh-CN', label: 'Chinese (CN)', icon: <Globe className="h-4 w-4" /> },
          { value: 'ja-JP', label: 'Japanese (JP)', icon: <Globe className="h-4 w-4" /> },
          { value: 'ko-KR', label: 'Korean (KR)', icon: <Globe className="h-4 w-4" /> }
        ]
      }
    ]
  },
  {
    id: 'permissions',
    name: 'Permissions',
    label: 'Permission Filters',
    description: 'Filter by access permissions',
    collapsed: true,
    visible: true,
    icon: <Shield className="h-4 w-4" />,
    options: [
      {
        id: 'access_level',
        type: 'select',
        label: 'Access Level',
        field: 'accessLevel',
        value: 'all',
        placeholder: 'Select access level',
        description: 'Filter by access level',
        options: [
          { value: 'all', label: 'All Documents', icon: <FileText className="h-4 w-4" /> },
          { value: 'public', label: 'Public', icon: <Eye className="h-4 w-4" /> },
          { value: 'private', label: 'Private', icon: <EyeOff className="h-4 w-4" /> },
          { value: 'shared', label: 'Shared', icon: <Users className="h-4 w-4" /> }
        ]
      },
      {
        id: 'permission_read',
        type: 'multiselect',
        label: 'Read Access',
        field: 'permissions.read',
        value: [],
        placeholder: 'Select users with read access',
        description: 'Filter by read permissions',
        options: []
      },
      {
        id: 'permission_write',
        type: 'multiselect',
        label: 'Write Access',
        field: 'permissions.write',
        value: [],
        placeholder: 'Select users with write access',
        description: 'Filter by write permissions',
        options: []
      },
      {
        id: 'permission_admin',
        type: 'multiselect',
        label: 'Admin Access',
        field: 'permissions.admin',
        value: [],
        placeholder: 'Select users with admin access',
        description: 'Filter by admin permissions',
        options: []
      }
    ]
  },
  {
    id: 'custom',
    name: 'Custom',
    label: 'Custom Filters',
    description: 'Custom filters for specific use cases',
    collapsed: false,
    visible: false,
    icon: <Settings className="h-4 w-4" />,
    options: []
  }
]

export default function SearchFilters({
  projectId,
  projectName,
  filters,
  filterGroups = defaultFilterGroups,
  onFiltersChange,
  onFilterApply,
  onFilterClear,
  onFilterSave,
  onFilterLoad,
  onExport,
  allowSave = true,
  allowExport = true,
  showAnalytics = true,
  showRecentSearches = true,
  showSavedFilters = true,
  realTime = true
}: SearchFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({})
  const [availableFilters, setAvailableFilters] = useState<Record<string, FilterOption>>({})
  const [savedFilters, setSavedFilters] = useState<Array<{
    id: string
    name: string
    description?: string
    filters: Record<string, any>
    createdAt: Date
    updatedAt: Date
    createdBy: string
    isPublic: boolean
    usage: number
  }>>([])
  const [recentSearches, setRecentSearches] = useState<Array<{
    query: string
    filters: Record<string, any>
    timestamp: Date
    resultsCount: number
  }>>([])
  const [analytics, setAnalytics] = useState({
    filterUsage: {} as Record<string, number>,
    popularFilters: [] as Array<{
      filter: string
      value: string
      count: number
    }>,
    filterCombinations: [] as Array<{
      combination: Record<string, any>
      count: number
    }>
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [selectedFilterId, setSelectedFilterId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId: projectId || 'default',
    channel: 'search_filters',
    enabled: realTime
  })

  // Initialize available filters
  useEffect(() => {
    const available: Record<string, FilterOption> = {}

    filterGroups.forEach(group => {
      group.options.forEach(option => {
        available[option.id] = option
      })
    })

    filters.forEach(filter => {
      available[filter.id] = filter
    })

    setAvailableFilters(available)
  }, [filters, filterGroups])

  // Handle filter value change
  const handleFilterChange = useCallback((filterId: string, value: any, apply = true) => {
    const newActiveFilters = { ...activeFilters, [filterId]: value }
    setActiveFilters(newActiveFilters)

    if (apply) {
      setAppliedFilters(newActiveFilters)
      onFiltersChange?.(newActiveFilters)
      onFilterApply?.(newActiveFilters)

      // Update analytics
      setAnalytics(prev => ({
        ...prev,
        filterUsage: {
          ...prev.filterUsage,
          [filterId]: (prev.filterUsage[filterId] || 0) + 1
        }
      }))

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'filter_changed',
          data: {
            filterId,
            value,
            filters: newActiveFilters,
            timestamp: new Date()
          }
        })
      }
    }
  }, [activeFilters, onFiltersChange, onFilterApply, isConnected, sendMessage])

  // Handle filter clear
  const handleFilterClear = useCallback((filterId?: string) => {
    let newActiveFilters = { ...activeFilters }

    if (filterId) {
      delete newActiveFilters[filterId]
    } else {
      newActiveFilters = {}
    }

    setActiveFilters(newActiveFilters)
    setAppliedFilters(newActiveFilters)
    onFiltersChange?.(newActiveFilters)
    onFilterClear?.()

    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      filterUsage: filterId ? { ...prev.filterUsage, [filterId]: Math.max(0, (prev.filterUsage[filterId] || 0) - 1)] } : {}
    }))

    // Send WebSocket notification
    if (isConnected) {
      sendMessage({
        type: 'filter_cleared',
        data: {
          filterId,
          filters: newActiveFilters,
          timestamp: new Date()
        }
      })
    }
  }, [activeFilters, onFiltersChange, onFilterClear, isConnected, sendMessage])

  // Handle filter apply
  const handleFilterApply = useCallback(() => {
    setAppliedFilters(activeFilters)
    onFiltersChange?.(activeFilters)
    onFilterApply?.(activeFilters)

    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      filterCombinations: [
        ...prev.filterCombinations,
        {
          combination: activeFilters,
          count: 1
        }
      ]
    }))

    // Send WebSocket notification
    if (isConnected) {
      sendMessage({
        type: 'filter_applied',
        data: {
          filters: activeFilters,
          timestamp: new Date()
        }
      })
    }
  }, [activeFilters, onFiltersChange, onFilterApply, isConnected, sendMessage])

  // Handle filter save
  const handleFilterSave = useCallback(() => {
    if (!saveName.trim()) {
      toast.error('Please enter a name for the saved filter')
      return
    }

    const newSavedFilter = {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: saveName,
      description: saveDescription,
      filters: activeFilters,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user',
      isPublic: false,
      usage: 0
    }

    setSavedFilters(prev => [...prev, newSavedFilter])
    setShowSaveDialog(false)
    setSaveName('')
    setSaveDescription('')

    toast.success('Filter saved successfully', {
      description: `${saveName} has been saved`
    })

    // Send WebSocket notification
    if (isConnected) {
      sendMessage({
        type: 'filter_saved',
        data: {
          filter: newSavedFilter,
          timestamp: new Date()
        }
      })
    }
  }, [saveName, saveDescription, activeFilters, isConnected, sendMessage])

  // Handle filter load
  const handleFilterLoad = useCallback((filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId)
    if (!filter) {
      toast.error('Filter not found')
      return
    }

    setActiveFilters(filter.filters)
    setAppliedFilters(filter.filters)
    onFilterLoad?.(filterId)

    // Update analytics
    setSavedFilters(prev => prev.map(f =>
      f.id === filterId ? { ...f, usage: f.usage + 1 } : f
    ))

    toast.success('Filter loaded successfully', {
      description: `${filter.name} has been loaded`
    })

    // Send WebSocket notification
    if (isConnected) {
      sendMessage({
        type: 'filter_loaded',
        data: {
          filterId,
          timestamp: new Date()
        }
      })
    }
  }, [savedFilters, onFilterLoad, isConnected, sendMessage])

  // Handle filter export
  const handleFilterExport = useCallback(() => {
    const exportData = {
      activeFilters,
      appliedFilters,
      availableFilters,
      savedFilters,
      recentSearches,
      analytics,
      exportedAt: new Date(),
      exportedBy: 'user'
    }

    onExport?.(exportData)
    toast.success('Filters exported successfully')
  }, [activeFilters, appliedFilters, availableFilters, savedFilters, recentSearches, analytics, onExport])

  // Handle group toggle
  const handleGroupToggle = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [])

  // Render filter option
  const renderFilterOption = useCallback((option: FilterOption) => {
    switch (option.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <Input
              value={option.value || ''}
              onChange={(e) => handleFilterChange(option.id, e.target.value, false)}
              placeholder={option.placeholder}
              disabled={option.disabled}
              className="w-full"
            />
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <Input
              type="number"
              value={option.value || ''}
              onChange={(e) => handleFilterChange(option.id, e.target.value, false)}
              placeholder={option.placeholder}
              min={option.min}
              max={option.max}
              step={option.step}
              disabled={option.disabled}
              className="w-full"
            />
            {option.unit && (
              <p className="text-xs text-gray-500">Unit: {option.unit}</p>
            )}
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'date':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <Input
              type="date"
              value={option.value ? option.value.toISOString().split('T')[0] : ''}
              onChange={(e) => handleFilterChange(option.id, e.target.value, false)}
              disabled={option.disabled}
              className="w-full"
            />
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <Select
              value={option.value || ''}
              onValueChange={(value) => handleFilterChange(option.id, value, false)}
              disabled={option.disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={option.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {option.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center space-x-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                      {opt.count && (
                        <span className="text-xs text-gray-500">({opt.count})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <Select
              value={option.value || []}
              onValueChange={(value) => handleFilterChange(option.id, value, false)}
              disabled={option.disabled}
              multiple
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={option.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {option.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center space-x-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                      {opt.count && (
                        <span className="text-xs text-gray-500">({opt.count})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={option.id}
              checked={option.value || false}
              onCheckedChange={(checked) => handleFilterChange(option.id, checked, false)}
              disabled={option.disabled}
            />
            <label htmlFor={option.id} className="text-sm font-medium text-gray-700">
              {option.label}
            </label>
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'range':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <div className="flex items-center space-x-2">
              <Slider
                value={option.value || option.min || 0}
                onValueChange={(value) => handleFilterChange(option.id, value, false)}
                min={option.min}
                max={option.max}
                step={option.step}
                disabled={option.disabled}
                className="flex-1"
              />
              <span className="text-sm text-gray-600">
                {option.value || option.min || 0} {option.unit}
              </span>
            </div>
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={option.id}
              checked={option.value || false}
              onCheckedChange={(checked) => handleFilterChange(option.id, checked, false)}
              disabled={option.disabled}
            />
            <label htmlFor={option.id} className="text-sm font-medium text-gray-700">
              {option.label}
            </label>
            {option.description && (
              <p className="text-xs text-gray-500">{option.description}</p>
            )}
          </div>
        )

      case 'custom':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{option.label}</label>
            <div className="text-sm text-gray-500">
              Custom filter: {option.field}
            </div>
          </div>
        )

      default:
        return null
    }
  }, [handleFilterChange, isConnected, sendMessage])

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FilterIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Search Filters</CardTitle>
              <p className="text-sm text-gray-600">
                {projectName || 'Search System'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterApply()}
            >
              <Search className="h-4 w-4 mr-2" />
              Apply
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterClear()}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>

            {allowSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}

            {showSavedFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoadDialog(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load
              </Button>
            )}

            {allowExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterExport()}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Active Filters Summary */}
          {Object.keys(appliedFilters).length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FilterIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {Object.keys(appliedFilters).length} Active Filters
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterClear()}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(appliedFilters).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {Array.isArray(value) ? value.join(', ') : value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Groups */}
      <div className="space-y-4">
        {filterGroups.map(group => (
          <Card key={group.id} className={group.visible ? '' : 'hidden'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGroupToggle(group.id)}
                    className="p-1"
                  >
                    {expandedGroups.has(group.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  {group.icon}
                  <CardTitle className="text-lg">{group.label}</CardTitle>
                </div>
                {group.required && (
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
            </CardHeader>

            {expandedGroups.has(group.id) && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {group.options.map(option => (
                    <div key={option.id} className={option.visible ? '' : 'hidden'}>
                      {renderFilterOption(option)}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Advanced filters will be implemented here with custom conditions and logic.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Save Filter</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Enter filter name"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Enter filter description"
                  className="w-full h-20"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleFilterSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Load Filter Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Load Filter</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLoadDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Select Filter</label>
                <Select
                  value={selectedFilterId}
                  onValueChange={setSelectedFilterId}
                  className="w-full"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a saved filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFilters.map(filter => (
                      <SelectItem key={filter.id} value={filter.id}>
                        <div className="flex items-center space-x-2">
                          <span>{filter.name}</span>
                          <span className="text-xs text-gray-500">({filter.usage} uses)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                {selectedFilterId && (
                  <p>Filter will be loaded and applied</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowLoadDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => selectedFilterId && handleFilterLoad(selectedFilterId)}>
                Load
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
              Filter Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{Object.keys(appliedFilters).length}</div>
                <div className="text-sm text-gray-600">Active Filters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{savedFilters.length}</div>
                <div className="text-sm text-gray-600">Saved Filters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{recentSearches.length}</div>
                <div className="text-sm text-gray-600">Recent Searches</div>
              </div>
            </div>

            {/* Filter Usage Chart */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Filter Usage</h4>
              <div className="space-y-2">
                {Object.entries(analytics.filterUsage).slice(0, 5).map(([filter, count], index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">{filter}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(count / Math.max(...Object.values(analytics.filterUsage)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 ml-2">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
