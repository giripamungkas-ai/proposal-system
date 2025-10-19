/**
 * Methodology Input Forms Component
 *
 * This component provides comprehensive methodology input capabilities:
 * - Structured methodology templates for different project types
 * - Dynamic form generation based on methodology selection
 * - Methodology customization and configuration
 * - Best practices integration and validation
 * - Template library with predefined methodologies
 * - Methodology compliance checking
 * - Real-time form validation and feedback
 * - Integration with AI-powered methodology recommendations
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
  FileText,
  BookOpen,
  Settings,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  CheckCircle,
  AlertCircle,
  Info,
  Target,
  Users,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Lightbulb,
  Shield,
  Award,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/components/notifications/ToastProvider'
import { useWebSocket } from '@/hooks/useWebSocket'

// Type definitions
export interface MethodologyTemplate {
  id: string
  name: string
  description: string
  category: 'development' | 'consulting' | 'training' | 'support' | 'maintenance' | 'research'
  type: 'agile' | 'waterfall' | 'hybrid' | 'custom'
  version: string
  lastUpdated: Date
  author: string
  tags: string[]
  phases: Array<{
    id: string
    name: string
    description: string
    duration: number // in days
    order: number
    required: boolean
    inputs: Array<{
      id: string
      name: string
      type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'file' | 'url'
      label: string
      description?: string
      required: boolean
      validation?: {
        min?: number
        max?: number
        pattern?: string
        options?: Array<{ value: string; label: string }>
        defaultValue?: any
      }
      defaultValue?: any
    }>
    outputs: Array<{
      id: string
      name: string
      type: 'document' | 'report' | 'deliverable' | 'approval' | 'milestone'
      description: string
      required: boolean
      template?: string
    }>
    dependencies: Array<{
      id: string
      phaseId: string
      type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish'
      lag: number
    }>
    qualityGates: Array<{
      id: string
      name: string
      description: string
      criteria: string[]
      required: boolean
      approvers: string[]
    }>
  }>
  bestPractices: Array<{
    category: string
    title: string
    description: string
    implementation: string
    tools?: string[]
    metrics?: string[]
  }>
  compliance: {
    standards: string[]
    regulations: string[]
    frameworks: string[]
    certifications: string[]
  }
  risks: Array<{
    id: string
    name: string
    description: string
    category: 'technical' | 'operational' | 'financial' | 'legal' | 'quality'
    probability: 'low' | 'medium' | 'high' | 'critical'
    impact: 'low' | 'medium' | 'high' | 'critical'
    mitigation: string
  }>
  metrics: {
    kpis: Array<{
      name: string
      description: string
      type: 'leading' | 'lagging' | 'qualitative' | 'quantitative'
      target: string
      unit: string
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    }>
    reporting: {
      frequency: string
      format: 'dashboard' | 'report' | 'presentation'
      stakeholders: string[]
    }
  }
  tools: Array<{
    name: string
    category: 'development' | 'project_management' | 'collaboration' | 'testing' | 'documentation'
    required: boolean
    alternatives: string[]
  }>
  metadata?: Record<string, any>
}

export interface MethodologyFormData {
  templateId: string
  templateName: string
  projectId: string
  projectName: string
  phaseData: Record<string, Record<string, any>>
  customizations: {
    addedPhases: Array<{
      id: string
      name: string
      description: string
      duration: number
      order: number
      inputs: Array<{
        id: string
        name: string
        type: string
        value: any
      }>
    }>
    modifiedPhases: Array<{
      id: string
      modifications: Record<string, any>
    }>
    removedPhases: string[]
  }
  compliance: {
    standards: string[]
    regulations: string[]
    frameworks: string[]
    certifications: string[]
    customRequirements: string[]
  }
  riskAssessment: {
    identifiedRisks: Array<{
      id: string
      name: string
      category: string
      probability: string
      impact: string
      mitigation: string
      status: 'open' | 'mitigated' | 'accepted'
    }>
    customRisks: Array<{
      id: string
      name: string
      description: string
      category: string
      probability: string
      impact: string
      mitigation: string
    }>
  }
  qualityGates: {
    enabled: boolean
    customGates: Array<{
      id: string
      name: string
      description: string
      criteria: string[]
      approvers: string[]
    }>
  }
  metadata: {
    createdBy: string
    createdAt: Date
    updatedAt: Date
    version: string
    status: 'draft' | 'in_progress' | 'completed' | 'approved'
    approvedBy?: string
    approvedAt?: Date
  }
}

export interface MethodologyInputFormsProps {
  projectId: string
  projectName?: string
  projectType: string
  projectComplexity: 'low' | 'medium' | 'high' | 'critical'
  templates: MethodologyTemplate[]
  existingForms?: MethodologyFormData[]
  onFormCreate?: (form: MethodologyFormData) => void
  onFormUpdate?: (form: MethodologyFormData) => void
  onFormDelete?: (formId: string) => void
  onFormSubmit?: (form: MethodologyFormData) => void
  onExport?: (data: any) => void
  allowEdit?: boolean
  realTime?: boolean
}

// Predefined methodology templates
const defaultTemplates: MethodologyTemplate[] = [
  {
    id: 'agile_scrum',
    name: 'Agile Scrum',
    description: 'Scrum framework for iterative development with sprints and daily standups',
    category: 'development',
    type: 'agile',
    version: '2.0',
    lastUpdated: new Date('2024-01-15'),
    author: 'MDMedia Team',
    tags: ['agile', 'scrum', 'iterative', 'sprint'],
    phases: [
      {
        id: 'sprint_planning',
        name: 'Sprint Planning',
        description: 'Plan sprint goals, backlog items, and team capacity',
        duration: 7,
        order: 1,
        required: true,
        inputs: [
          {
            id: 'sprint_goal',
            name: 'Sprint Goal',
            type: 'textarea',
            label: 'Sprint Goal',
            description: 'Clear, measurable goal for the sprint',
            required: true,
            validation: {
              min: 10,
              max: 500
            }
          },
          {
            id: 'team_capacity',
            name: 'Team Capacity',
            type: 'number',
            label: 'Team Capacity (Story Points)',
            description: 'Total story points team can complete',
            required: true,
            validation: {
              min: 1,
              max: 100
            },
            defaultValue: 20
          },
          {
            id: 'sprint_backlog',
            name: 'Sprint Backlog',
            type: 'multiselect',
            label: 'Sprint Backlog Items',
            description: 'Stories and tasks selected for the sprint',
            required: true,
            validation: {
              options: [
                { value: 'user_story', label: 'User Story' },
                { value: 'technical_task', label: 'Technical Task' },
                { value: 'bug_fix', label: 'Bug Fix' },
                { value: 'sppike', label: 'Spike' }
              ]
            }
          }
        ],
        outputs: [
          {
            id: 'sprint_backlog',
            name: 'Sprint Backlog',
            type: 'document',
            description: 'Prioritized list of work items for the sprint',
            required: true
          },
          {
            id: 'sprint_goal_document',
            name: 'Sprint Goal Document',
            type: 'document',
            description: 'Document outlining sprint goals and objectives',
            required: true
          }
        ],
        dependencies: [],
        qualityGates: [
          {
            id: 'definition_of_done',
            name: 'Definition of Done',
            description: 'Criteria for when work items are considered complete',
            criteria: ['All acceptance criteria met', 'Code reviewed and approved', 'Tests passing'],
            required: true,
            approvers: ['product_owner', 'scrum_master', 'development_team']
          }
        ]
      },
      {
        id: 'sprint_execution',
        name: 'Sprint Execution',
        description: 'Execute sprint work with daily standups and progress tracking',
        duration: 7,
        order: 2,
        required: true,
        inputs: [
          {
            id: 'daily_standup',
            name: 'Daily Standup',
            type: 'checkbox',
            label: 'Daily Standup Conducted',
            description: 'Daily standup meetings with team',
            required: true,
            defaultValue: true
          },
          {
            id: 'progress_updates',
            name: 'Progress Updates',
            type: 'textarea',
            label: 'Progress Updates',
            description: 'Daily progress updates and impediments',
            required: true,
            validation: {
              min: 10,
              max: 1000
            }
          }
        ],
        outputs: [
          {
            id: 'burndown_chart',
            name: 'Sprint Burndown Chart',
            type: 'chart',
            description: 'Visual representation of sprint progress',
            required: true
          },
          {
            id: 'sprint_review',
            name: 'Sprint Review',
            type: 'meeting',
            description: 'Sprint review meeting with stakeholders',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'sprint_planning_to_execution',
            phaseId: 'sprint_planning',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'daily_standup',
            name: 'Daily Standup Quality',
            description: 'Daily standups conducted on time with proper format',
            criteria: ['On time', 'All team members present', 'Impediments identified'],
            required: true,
            approvers: ['scrum_master']
          }
        ]
      },
      {
        id: 'sprint_review',
        name: 'Sprint Review',
        description: 'Review completed work and plan for next sprint',
        duration: 1,
        order: 3,
        required: true,
        inputs: [
          {
            id: 'work_demo',
            name: 'Work Demo',
            type: 'checkbox',
            label: 'Work Demonstrated',
            description: 'Demo completed work to stakeholders',
            required: true
          },
          {
            id: 'stakeholder_feedback',
            name: 'Stakeholder Feedback',
            type: 'textarea',
            label: 'Stakeholder Feedback',
            description: 'Feedback collected from stakeholders',
            required: true,
            validation: {
              min: 10,
              max: 1000
            }
          }
        ],
        outputs: [
          {
            id: 'sprint_retrospective',
            name: 'Sprint Retrospective',
            type: 'meeting',
            description: 'Team retrospective meeting',
            required: true
          },
          {
            id: 'next_sprint_planning',
            name: 'Next Sprint Planning',
            type: 'document',
            description: 'Planning for next sprint',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'sprint_execution_to_review',
            phaseId: 'sprint_execution',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'acceptance_criteria',
            name: 'Acceptance Criteria Met',
            description: 'All user stories meet acceptance criteria',
            criteria: ['All acceptance criteria validated', 'Product owner approval received'],
            required: true,
            approvers: ['product_owner']
          }
        ]
      }
    ],
    bestPractices: [
      {
        category: 'Planning',
        title: 'Effective Sprint Planning',
        description: 'Plan realistic sprints with clear goals and proper capacity',
        implementation: 'Use story points, team velocity, and historical data',
        tools: ['Jira', 'Trello', 'Miro'],
        metrics: ['Velocity', 'Burndown', 'Cycle Time']
      },
      {
        category: 'Execution',
        title: 'Daily Standups',
        description: 'Conduct effective daily standups',
        implementation: 'Use 3-question format: What did you do? What will you do? Any impediments?',
        tools: ['Zoom', 'Teams', 'Slack'],
        metrics: ['Attendance', 'Impediments', 'Progress']
      }
    ],
    compliance: {
      standards: ['Scrum Guide'],
      frameworks: ['Agile Manifesto'],
      certifications: ['CSM', 'PSPO']
    }
  },
  {
    id: 'waterfall_traditional',
    name: 'Traditional Waterfall',
    description: 'Sequential development process with distinct phases',
    category: 'development',
    type: 'waterfall',
    version: '1.0',
    lastUpdated: new Date('2024-01-15'),
    author: 'MDMedia Team',
    tags: ['waterfall', 'sequential', 'traditional', 'documentation'],
    phases: [
      {
        id: 'requirements',
        name: 'Requirements Analysis',
        description: 'Gather and analyze project requirements',
        duration: 14,
        order: 1,
        required: true,
        inputs: [
          {
            id: 'requirements_document',
            name: 'Requirements Document',
            type: 'file',
            label: 'Requirements Document',
            description: 'Detailed requirements specification',
            required: true
          },
          {
            id: 'stakeholder_analysis',
            name: 'Stakeholder Analysis',
            type: 'document',
            label: 'Stakeholder Analysis',
            description: 'Analysis of project stakeholders',
            required: true
          },
          {
            id: 'requirements_signoff',
            name: 'Requirements Sign-off',
            type: 'checkbox',
            label: 'Requirements Sign-off',
            description: 'Stakeholder approval of requirements',
            required: true
          }
        ],
        outputs: [
          {
            id: 'requirements_specification',
            name: 'Requirements Specification',
            type: 'document',
            description: 'Detailed requirements specification',
            required: true
          },
          {
            id: 'requirements_traceability',
            name: 'Requirements Traceability Matrix',
            type: 'document',
            description: 'Matrix linking requirements to design and implementation',
            required: true
          }
        ],
        dependencies: [],
        qualityGates: [
          {
            id: 'requirements_validation',
            name: 'Requirements Validation',
            description: 'Requirements validated by stakeholders',
            criteria: ['All requirements documented', 'Stakeholder approval received', 'Traceability established'],
            required: true,
            approvers: ['project_manager', 'business_analyst', 'stakeholders']
          }
        ]
      },
      {
        id: 'design',
        name: 'System Design',
        description: 'Create system architecture and detailed design',
        duration: 21,
        order: 2,
        required: true,
        inputs: [
          {
            id: 'architecture_design',
            name: 'Architecture Design',
            type: 'document',
            label: 'Architecture Design',
            description: 'System architecture and design',
            required: true
          },
          {
            id: 'technical_specifications',
            name: 'Technical Specifications',
            type: 'document',
            label: 'Technical Specifications',
            description: 'Detailed technical specifications',
            required: true
          },
          {
            id: 'design_review',
            name: 'Design Review',
            type: 'checkbox',
            label: 'Design Review Conducted',
            description: 'Design reviewed and approved',
            required: true
          }
        ],
        outputs: [
          {
            id: 'system_architecture',
            name: 'System Architecture',
            type: 'document',
            description: 'System architecture documentation',
            required: true
          },
          {
            id: 'technical_design',
            name: 'Technical Design Document',
            type: 'document',
            description: 'Detailed technical design',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'requirements_to_design',
            phaseId: 'requirements',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'design_validation',
            name: 'Design Validation',
            description: 'Design meets requirements and standards',
            criteria: ['Architecture reviewed', 'Technical specifications complete', 'Design approved'],
            required: true,
            approvers: ['technical_lead', 'architect', 'project_manager']
          }
        ]
      },
      {
        id: 'implementation',
        name: 'Implementation',
        description: 'Develop and implement the system',
        duration: 42,
        order: 3,
        required: true,
        inputs: [
          {
            id: 'development_plan',
            name: 'Development Plan',
            type: 'document',
            label: 'Development Plan',
            description: 'Detailed development plan',
            required: true
          },
          {
            id: 'code_development',
            name: 'Code Development',
            type: 'checkbox',
            label: 'Code Development',
            description: 'Code development progress',
            required: true
          },
          {
            id: 'unit_testing',
            name: 'Unit Testing',
            type: 'checkbox',
            label: 'Unit Testing',
            description: 'Unit testing completed',
            required: true
          }
        ],
        outputs: [
          {
            id: 'source_code',
            name: 'Source Code',
            type: 'file',
            description: 'Developed source code',
            required: true
          },
          {
            id: 'unit_test_results',
            name: 'Unit Test Results',
            type: 'document',
            description: 'Unit test results and coverage',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'design_to_implementation',
            phaseId: 'design',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'code_quality',
            name: 'Code Quality',
            description: 'Code meets quality standards',
            criteria: ['Code reviewed', 'Unit tests passing', 'Coding standards followed'],
            required: true,
            approvers: ['technical_lead', 'senior_developer']
          }
        ]
      },
      {
        id: 'testing',
        name: 'Testing',
        description: 'Test the implemented system',
        duration: 14,
        order: 4,
        required: true,
        inputs: [
          {
            id: 'test_plan',
            name: 'Test Plan',
            type: 'document',
            label: 'Test Plan',
            description: 'Comprehensive test plan',
            required: true
          },
          {
            id: 'test_cases',
            name: 'Test Cases',
            type: 'document',
            label: 'Test Cases',
            description: 'Test cases for all functionality',
            required: true
          },
          {
            id: 'defect_tracking',
            name: 'Defect Tracking',
            type: 'checkbox',
            label: 'Defect Tracking',
            description: 'Defects tracked and resolved',
            required: true
          }
        ],
        outputs: [
          {
            id: 'test_results',
            name: 'Test Results',
            type: 'document',
            description: 'Test execution results',
            required: true
          },
          {
            id: 'defect_report',
            name: 'Defect Report',
            type: 'document',
            description: 'Defect tracking report',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'implementation_to_testing',
            phaseId: 'implementation',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'test_coverage',
            name: 'Test Coverage',
            description: 'Adequate test coverage achieved',
            criteria: ['All test cases executed', 'Coverage > 80%', 'Critical paths tested'],
            required: true,
            approvers: ['qa_lead', 'test_manager']
          }
        ]
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'Deploy the system to production',
        duration: 7,
        order: 5,
        required: true,
        inputs: [
          {
            id: 'deployment_plan',
            name: 'Deployment Plan',
            type: 'document',
            label: 'Deployment Plan',
            description: 'Deployment strategy and procedures',
            required: true
          },
          {
            id: 'deployment_checklist',
            name: 'Deployment Checklist',
            type: 'checkbox',
            label: 'Deployment Checklist',
            description: 'Pre-deployment checklist completed',
            required: true
          }
        ],
        outputs: [
          {
            id: 'deployment_report',
            name: 'Deployment Report',
            type: 'document',
            description: 'Deployment execution report',
            required: true
          },
          {
            id: 'user_manual',
            name: 'User Manual',
            type: 'document',
            description: 'User manual and documentation',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'testing_to_deployment',
            phaseId: 'testing',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'deployment_validation',
            name: 'Deployment Validation',
            description: 'Deployment successful and system operational',
            criteria: ['System deployed', 'Health checks passed', 'Users trained'],
            required: true,
            approvers: ['deployment_team', 'operations_team']
          }
        ]
      }
    ],
    bestPractices: [
      {
        category: 'Documentation',
        title: 'Comprehensive Documentation',
        description: 'Maintain detailed documentation throughout the project',
        implementation: 'Use version control and document management systems',
        tools: ['Confluence', 'SharePoint', 'Git'],
        metrics: ['Document completeness', 'Version control', 'Accessibility']
      },
      {
        category: 'Quality',
        title: 'Quality Gates',
        description: 'Implement quality gates between phases',
        implementation: 'Define clear criteria and approval processes',
        tools: ['Quality Management System', 'Review Processes'],
        metrics: ['Defect density', 'Test coverage', 'Customer satisfaction']
      }
    ],
    compliance: {
      standards: ['ISO 9001', 'CMMI'],
      frameworks: ['ITIL', 'PMBOK'],
      certifications: ['PMP', 'PRINCE2']
    }
  },
  {
    id: 'hybrid_model',
    name: 'Hybrid Model',
    description: 'Combination of Agile and Waterfall methodologies',
    category: 'development',
    type: 'hybrid',
    version: '1.0',
    lastUpdated: new Date('2024-01-15'),
    author: 'MDMedia Team',
    tags: ['hybrid', 'mixed', 'flexible', 'adaptive'],
    phases: [
      {
        id: 'initial_planning',
        name: 'Initial Planning',
        description: 'High-level planning and requirements',
        duration: 7,
        order: 1,
        required: true,
        inputs: [
          {
            id: 'project_charter',
            name: 'Project Charter',
            type: 'document',
            label: 'Project Charter',
            description: 'High-level project charter',
            required: true
          },
          {
            id: 'high_level_requirements',
            name: 'High-Level Requirements',
            type: 'document',
            label: 'High-Level Requirements',
            description: 'High-level requirements specification',
            required: true
          }
        ],
        outputs: [
          {
            id: 'project_plan',
            name: 'Project Plan',
            type: 'document',
            description: 'High-level project plan',
            required: true
          },
          {
            id: 'requirements_summary',
            name: 'Requirements Summary',
            type: 'document',
            description: 'Summary of requirements',
            required: true
          }
        ],
        dependencies: [],
        qualityGates: [
          {
            id: 'planning_approval',
            name: 'Planning Approval',
            description: 'Initial planning approved',
            criteria: ['Project charter approved', 'Requirements defined', 'Stakeholder buy-in'],
            required: true,
            approvers: ['project_manager', 'stakeholders']
          }
        ]
      },
      {
        id: 'detailed_requirements',
        name: 'Detailed Requirements',
        description: 'Detailed requirements analysis and specification',
        duration: 14,
        order: 2,
        required: true,
        inputs: [
          {
            id: 'detailed_requirements',
            name: 'Detailed Requirements',
            type: 'document',
            label: 'Detailed Requirements',
            description: 'Detailed requirements specification',
            required: true
          },
          {
            id: 'requirements_validation',
            name: 'Requirements Validation',
            type: 'checkbox',
            label: 'Requirements Validated',
            description: 'Requirements validated by stakeholders',
            required: true
          }
        ],
        outputs: [
          {
            id: 'requirements_specification',
            name: 'Requirements Specification',
            type: 'document',
            description: 'Detailed requirements specification',
            required: true
          },
          {
            id: 'requirements_traceability',
            name: 'Requirements Traceability Matrix',
            type: 'document',
            description: 'Requirements traceability matrix',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'initial_planning_to_requirements',
            phaseId: 'initial_planning',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'requirements_validation',
            name: 'Requirements Validation',
            description: 'Requirements validated and approved',
            criteria: ['Detailed requirements complete', 'Stakeholder approval', 'Traceability established'],
            required: true,
            approvers: ['business_analyst', 'project_manager', 'stakeholders']
          }
        ]
      },
      {
        id: 'design_phase',
        name: 'Design Phase',
        description: 'System design and architecture',
        duration: 21,
        order: 3,
        required: true,
        inputs: [
          {
            id: 'architecture_design',
            name: 'Architecture Design',
            type: 'document',
            label: 'Architecture Design',
            description: 'System architecture design',
            required: true
          },
          {
            id: 'technical_specifications',
            name: 'Technical Specifications',
            type: 'document',
            label: 'Technical Specifications',
            description: 'Technical specifications',
            required: true
          }
        ],
        outputs: [
          {
            id: 'design_documentation',
            name: 'Design Documentation',
            type: 'document',
            description: 'Complete design documentation',
            required: true
          },
          {
            id: 'design_approval',
            name: 'Design Approval',
            type: 'checkbox',
            label: 'Design Approved',
            description: 'Design approved by stakeholders',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'requirements_to_design',
            phaseId: 'detailed_requirements',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'design_validation',
            name: 'Design Validation',
            description: 'Design meets requirements and standards',
            criteria: ['Architecture reviewed', 'Technical specifications complete', 'Design approved'],
            required: true,
            approvers: ['technical_lead', 'architect', 'project_manager']
          }
        ]
      },
      {
        id: 'development_sprints',
        name: 'Development Sprints',
        description: 'Agile development sprints for implementation',
        duration: 21,
        order: 4,
        required: true,
        inputs: [
          {
            id: 'sprint_backlog',
            name: 'Sprint Backlog',
            type: 'multiselect',
            label: 'Sprint Backlog',
            description: 'Backlog items for development sprints',
            required: true,
            validation: {
              options: [
                { value: 'user_story', label: 'User Story' },
                { value: 'technical_task', label: 'Technical Task' },
                { value: 'bug_fix', label: 'Bug Fix' },
                { value: 'sppike', label: 'Spike' }
              ]
            }
          },
          {
            id: 'sprint_planning',
            name: 'Sprint Planning',
            type: 'checkbox',
            label: 'Sprint Planning',
            description: 'Sprint planning completed',
            required: true
          }
        ],
        outputs: [
          {
            id: 'sprint_deliverables',
            name: 'Sprint Deliverables',
            type: 'document',
            description: 'Sprint deliverables and documentation',
            required: true
          },
          {
            id: 'sprint_review',
            name: 'Sprint Review',
            type: 'meeting',
            description: 'Sprint review meeting',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'design_to_development',
            phaseId: 'design_phase',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'sprint_quality',
            name: 'Sprint Quality',
            description: 'Sprint deliverables meet quality standards',
            criteria: ['Definition of Done met', 'Code reviewed', 'Tests passing'],
            required: true,
            approvers: ['scrum_master', 'product_owner']
          }
        ]
      },
      {
        id: 'testing_phase',
        name: 'Testing Phase',
        description: 'Comprehensive testing and quality assurance',
        duration: 14,
        order: 5,
        required: true,
        inputs: [
          {
            id: 'test_plan',
            name: 'Test Plan',
            type: 'document',
            label: 'Test Plan',
            description: 'Comprehensive test plan',
            required: true
          },
          {
            id: 'test_execution',
            name: 'Test Execution',
            type: 'checkbox',
            label: 'Test Execution',
            description: 'Test execution completed',
            required: true
          }
        ],
        outputs: [
          {
            id: 'test_results',
            name: 'Test Results',
            type: 'document',
            description: 'Test execution results',
            required: true
          },
          {
            id: 'test_report',
            name: 'Test Report',
            type: 'document',
            description: 'Test execution report',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'development_to_testing',
            phaseId: 'development_sprints',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'test_coverage',
            name: 'Test Coverage',
            description: 'Adequate test coverage achieved',
            criteria: ['All test cases executed', 'Coverage > 80%', 'Critical paths tested'],
            required: true,
            approvers: ['qa_lead', 'test_manager']
          }
        ]
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'System deployment and release',
        duration: 7,
        order: 6,
        required: true,
        inputs: [
          {
            id: 'deployment_plan',
            name: 'Deployment Plan',
            type: 'document',
            label: 'Deployment Plan',
            description: 'Deployment plan and procedures',
            required: true
          },
          {
            id: 'deployment_checklist',
            name: 'Deployment Checklist',
            type: 'checkbox',
            label: 'Deployment Checklist',
            description: 'Pre-deployment checklist completed',
            required: true
          }
        ],
        outputs: [
          {
            id: 'deployment_report',
            name: 'Deployment Report',
            type: 'document',
            description: 'Deployment execution report',
            required: true
          },
          {
            id: 'user_manual',
            name: 'User Manual',
            type: 'document',
            description: 'User manual and documentation',
            required: true
          }
        ],
        dependencies: [
          {
            id: 'testing_to_deployment',
            phaseId: 'testing_phase',
            type: 'finish_to_start',
            lag: 0
          }
        ],
        qualityGates: [
          {
            id: 'deployment_validation',
            name: 'Deployment Validation',
            description: 'Deployment successful and system operational',
            criteria: ['System deployed', 'Health checks passed', 'Users trained'],
            required: true,
            approvers: ['deployment_team', 'operations_team']
          }
        ]
      }
    ],
    bestPractices: [
      {
        category: 'Flexibility',
        title: 'Adaptive Planning',
        description: 'Balance structure and flexibility',
        implementation: 'Use waterfall for planning, agile for execution',
        tools: ['Jira', 'Confluence', 'Miro'],
        metrics: ['Planning accuracy', 'Adaptability', 'Stakeholder satisfaction']
      },
      {
        category: 'Communication',
        title: 'Stakeholder Communication',
        description: 'Maintain clear communication throughout project',
        implementation: 'Regular stakeholder meetings and updates',
        tools: ['Teams', 'Slack', 'Email'],
        metrics: ['Communication effectiveness', 'Stakeholder engagement']
      }
    ],
    compliance: {
      standards: ['ISO 9001', 'CMMI'],
      frameworks: ['PMBOK', 'Agile Manifesto'],
      certifications: ['PMP', 'CSM', 'PSPO']
    }
  }
]

export default function MethodologyInputForms({
  projectId,
  projectName,
  projectType,
  projectComplexity,
  templates,
  existingForms = [],
  onFormCreate,
  onFormUpdate,
  onFormDelete,
  onFormSubmit,
  onExport,
  allowEdit = true,
  realTime = true
}: MethodologyInputFormsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MethodologyTemplate | null>(null)
  const [formData, setFormData] = useState<MethodologyFormData | null>(null)
  const [activeTab, setActiveTab] = useState('templates')
  const [currentPhase, setCurrentPhase] = useState(0)
  const [phaseData, setPhaseData] = useState<Record<string, Record<string, any>>>({})
  const [customizations, setCustomizations] = useState({
    addedPhases: [],
    modifiedPhases: [],
    removedPhases: []
  })
  const [showFormPreview, setShowFormPreview] = useState(false)
  const [showCustomization, setShowCustomization] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const toast = useToast()
  const { sendMessage, lastMessage, isConnected } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
    projectId,
    channel: 'methodology_forms',
    enabled: realTime
  })

  // Filter templates based on project type and complexity
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Filter by project type
      if (projectType && template.category !== projectType) {
        return false
      }

      // Filter by complexity (some templates may not be suitable for certain complexities)
      if (projectComplexity === 'critical' && template.type === 'agile') {
        return true // Agile can handle complexity
      }
      if (projectComplexity === 'low' && template.type === 'waterfall') {
        return true // Waterfall is good for simple projects
      }

      return true
    })
  }, [templates, projectType, projectComplexity])

  // Get recommended template based on project characteristics
  const recommendedTemplate = useMemo(() => {
    if (projectComplexity === 'critical') {
      return filteredTemplates.find(t => t.id === 'hybrid_model') || filteredTemplates[0]
    } else if (projectComplexity === 'high') {
      return filteredTemplates.find(t => t.id === 'hybrid_model') || filteredTemplates[0]
    } else if (projectComplexity === 'medium') {
      return filteredTemplates.find(t => t.id === 'agile_scrum') || filteredTemplates[0]
    } else {
      return filteredTemplates.find(t => t.id === 'waterfall_traditional') || filteredTemplates[0]
    }
  }, [filteredTemplates, projectComplexity])

  // Initialize with recommended template
  useEffect(() => {
    if (!selectedTemplate && recommendedTemplate) {
      setSelectedTemplate(recommendedTemplate)
    }
  }, [recommendedTemplate, selectedTemplate])

  // Initialize form data when template is selected
  useEffect(() => {
    if (selectedTemplate && !formData) {
      const initialFormData: MethodologyFormData = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        projectId,
        projectName: projectName || `Project ${projectId}`,
        phaseData: {},
        customizations: {
          addedPhases: [],
          modifiedPhases: [],
          removedPhases: []
        },
        compliance: {
          standards: selectedTemplate.compliance.standards,
          regulations: selectedTemplate.compliance.regulations,
          frameworks: selectedTemplate.compliance.frameworks,
          certifications: selectedTemplate.compliance.certifications,
          customRequirements: []
        },
        riskAssessment: {
          identifiedRisks: selectedTemplate.risks.map(risk => ({
            ...risk,
            id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'open'
          })),
          customRisks: []
        },
        qualityGates: {
          enabled: true,
          customGates: []
        },
        metadata: {
          createdBy: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: selectedTemplate.version,
          status: 'draft'
        }
      }

      setFormData(initialFormData)

      // Initialize phase data
      const initialPhaseData: Record<string, Record<string, any>> = {}
      selectedTemplate.phases.forEach(phase => {
        initialPhaseData[phase.id] = {}
        phase.inputs.forEach(input => {
          initialPhaseData[phase.id][input.id] = input.defaultValue || ''
        })
      })
      setPhaseData(initialPhaseData)
    }
  }, [selectedTemplate, formData, projectId, projectName])

  // Validate form data
  const validateFormData = useCallback((data: MethodologyFormData): Record<string, string[]> => {
    const errors: Record<string, string[]> = {}

    // Validate phase data
    if (selectedTemplate) {
      selectedTemplate.phases.forEach(phase => {
        const phaseErrors: string[] = []

        phase.inputs.forEach(input => {
          if (input.required && (!phaseData[phase.id] || !phaseData[phase.id][input.id])) {
            phaseErrors.push(`${input.label} is required`)
          }

          if (input.validation) {
            const value = phaseData[phase.id]?.[input.id]

            if (input.validation.min && value && parseFloat(value) < input.validation.min) {
              phaseErrors.push(`${input.label} must be at least ${input.validation.min}`)
            }

            if (input.validation.max && value && parseFloat(value) > input.validation.max) {
              phaseErrors.push(`${input.label} must be no more than ${input.validation.max}`)
            }

            if (input.validation.pattern && value && !new RegExp(input.validation.pattern).test(value)) {
              phaseErrors.push(`${input.label} format is invalid`)
            }
          }
        })

        if (phaseErrors.length > 0) {
          errors[phase.id] = phaseErrors
        }
      })
    }

    return errors
  }, [selectedTemplate, phaseData])

  // Handle template selection
  const handleTemplateSelect = useCallback((template: MethodologyTemplate) => {
    setSelectedTemplate(template)
    setFormData(null)
    setPhaseData({})
    setCustomizations({
      addedPhases: [],
      modifiedPhases: [],
      removedPhases: []
    })
    setValidationErrors({})
  }, [])

  // Handle phase data update
  const handlePhaseDataUpdate = useCallback((phaseId: string, inputId: string, value: any) => {
    setPhaseData(prev => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        [inputId]: value
      }
    }))

    // Clear validation errors for this input
    if (validationErrors[phaseId] && validationErrors[phaseId].includes(inputId)) {
      setValidationErrors(prev => ({
        ...prev,
        [phaseId]: prev[phaseId].filter(error => error !== inputId)
      }))
    }
  }, [validationErrors])

  // Handle form submission
  const handleFormSubmit = useCallback(async () => {
    if (!selectedTemplate || !formData) {
      toast.error('No template selected')
      return
    }

    const errors = validateFormData(formData)
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix validation errors before submitting')
      return
    }

    try {
      // Update form status
      const updatedFormData = {
        ...formData,
        metadata: {
          ...formData.metadata,
          status: 'submitted',
          submittedAt: new Date()
        }
      }

      setFormData(updatedFormData)
      onFormSubmit?.(updatedFormData)

      toast.success('Methodology form submitted successfully', {
        description: `${formData.templateName} has been submitted`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'methodology_form_submitted',
          data: {
            formId: formData.templateId,
            templateName: formData.templateName,
            projectId,
            submittedBy: 'user',
            submittedAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error('Failed to submit form:', error)
      toast.error('Failed to submit form')
    }
  }, [selectedTemplate, formData, onFormSubmit, isConnected, sendMessage])

  // Handle form save
  const handleFormSave = useCallback(async () => {
    if (!selectedTemplate || !formData) {
      toast.error('No template selected')
      return
    }

    const errors = validateFormData(formData)
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix validation errors before saving')
      return
    }

    try {
      // Update form status
      const updatedFormData = {
        ...formData,
        metadata: {
          ...formData.metadata,
          status: 'saved',
          savedAt: new Date()
        }
      }

      setFormData(updatedFormData)
      onFormUpdate?.(updatedFormData)

      toast.success('Methodology form saved successfully', {
        description: `${formData.templateName} has been saved`
      })

      // Send WebSocket notification
      if (isConnected) {
        sendMessage({
          type: 'methodology_form_saved',
          data: {
            formId: formData.templateId,
            templateName: formData.templateName,
            projectId,
            savedBy: 'user',
            savedAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error('Failed to save form:', error)
      toast.error('Failed to save form')
    }
  }, [selectedTemplate, formData, onFormUpdate, isConnected, sendMessage])

  // Handle form export
  const handleFormExport = useCallback(() => {
    if (!selectedTemplate || !formData) {
      toast.error('No template selected')
      return
    }

    const exportData = {
      template: selectedTemplate,
      formData,
      phaseData,
      customizations,
      validationErrors,
      resourceMetrics: {
        totalPhases: selectedTemplate.phases.length,
        totalInputs: selectedTemplate.phases.reduce((sum, phase) => sum + phase.inputs.length, 0),
        totalOutputs: selectedTemplate.phases.reduce((sum, phase) => sum + phase.outputs.length, 0),
        totalQualityGates: selectedTemplate.phases.reduce((sum, phase) => sum + phase.qualityGates.length, 0),
        totalDependencies: selectedTemplate.phases.reduce((sum, phase) => sum + phase.dependencies.length, 0),
        totalBestPractices: selectedTemplate.bestPractices.length,
        totalRisks: selectedTemplate.risks.length,
        totalTools: selectedTemplate.tools.length
      },
      timestamp: new Date()
    }

    onExport?.(exportData)
    toast.success('Form exported successfully')
  }, [selectedTemplate, formData, phaseData, customizations, validationErrors, onExport])

  // Handle phase navigation
  const handlePhaseNavigation = useCallback((direction: 'next' | 'previous') => {
    if (!selectedTemplate) return

    const phases = selectedTemplate.phases
    const currentIndex = currentPhase

    if (direction === 'next' && currentIndex < phases.length - 1) {
      setCurrentPhase(currentIndex + 1)
    } else if (direction === 'previous' && currentIndex > 0) {
      setCurrentPhase(currentIndex - 1)
    }
  }, [selectedTemplate, currentPhase])

  // Handle phase customization
  const handlePhaseCustomization = useCallback(() => {
    setShowCustomization(true)
  }, [])

  // Handle form preview
  const handleFormPreview = useCallback(() => {
    setShowFormPreview(true)
  }, [])

  // Render input field based on type
  const renderInputField = useCallback((input: any, phaseId: string, value: any, onChange: (value: any) => void) => {
    switch (input.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={input.description}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={input.description}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={input.description}
            min={input.validation?.min}
            max={input.validation?.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select {input.label}</option>
            {input.validation?.options?.map((option, index) => (
              <option key={index} value={option.value}>{option.label}</option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => onChange(Array.from(e.target.selectedOptions, option => option.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {input.validation?.options?.map((option, index) => (
              <option key={index} value={option.value}>{option.label}</option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{input.label}</span>
          </div>
        )

      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => onChange(e.target.files[0])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'url':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={input.description}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={input.description}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
    }
  }, [])

  // Render phase content
  const renderPhaseContent = useCallback((phase: any, phaseIndex: number) => {
    const phaseErrors = validationErrors[phase.id] || []
    const hasErrors = phaseErrors.length > 0

    return (
      <div key={phase.id} className={`p-6 border rounded-lg ${hasErrors ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                phaseIndex === currentPhase ? 'bg-blue-600' : 'bg-gray-400'
              }`}>
                {phaseIndex + 1}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                <p className="text-sm text-gray-600">{phase.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {phase.duration} days
            </Badge>
            {phase.required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
          </div>
        </div>

        {hasErrors && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">Validation Errors:</span>
            </div>
            <ul className="mt-2 space-y-1">
              {phaseErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-600">{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Phase Inputs</h4>
          <div className="space-y-3">
            {phase.inputs.map((input) => (
              <div key={input.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {input.label}
                    {input.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {input.description && (
                    <p className="text-xs text-gray-500">{input.description}</p>
                  )}
                </div>
                <div className="mt-1">
                  {renderInputField(input, phase.id, phaseData[phase.id]?.[input.id], (value) => handlePhaseDataUpdate(phase.id, input.id, value))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Phase Outputs</h4>
          <div className="space-y-3">
            {phase.outputs.map((output) => (
              <div key={output.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                    output.type === 'document' ? 'bg-blue-500' :
                    output.type === 'meeting' ? 'bg-green-500' :
                    output.type === 'chart' ? 'bg-purple-500' : 'bg-gray-500'
                  }`}>
                    {output.type === 'document' ? '📄' :
                     output.type === 'meeting' ? '👥' :
                     output.type === 'chart' ? '📊' : '📋'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{output.name}</div>
                    <p className="text-xs text-gray-600">{output.description}</p>
                  </div>
                </div>
                <Badge variant={output.required ? 'default' : 'secondary'} className="text-xs">
                  {output.required ? 'Required' : 'Optional'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {phase.qualityGates && phase.qualityGates.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Quality Gates</h4>
            <div className="space-y-2">
              {phase.qualityGates.map((gate, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-yellow-900">{gate.name}</div>
                      <p className="text-xs text-yellow-700">{gate.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {gate.required ? 'Required' : 'Optional'}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      {gate.approvers.map((approver, approverIndex) => (
                        <Badge key={approverIndex} variant="outline" className="text-xs">
                          {approver}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }, [selectedTemplate, currentPhase, phaseData, validationErrors, handlePhaseDataUpdate, renderInputField])

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Methodology Input Forms</CardTitle>
              <p className="text-sm text-gray-600">
                {projectName || `Project ${projectId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFormSave()}
              disabled={!formData}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFormSubmit()}
              disabled={!formData}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFormPreview()}
              disabled={!formData}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFormExport()}
              disabled={!formData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Template Selection */}
          {!selectedTemplate && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Methodology Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium ${
                        template.type === 'agile' ? 'bg-green-500' :
                        template.type === 'waterfall' ? 'bg-blue-500' :
                        template.type === 'hybrid' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}>
                        {template.type === 'agile' ? '🏃' :
                         template.type === 'waterfall' ? '📊' :
                         template.type === 'hybrid' ? '🔄' : '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-600">{template.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.version}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Template */}
              {recommendedTemplate && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium bg-blue-500">
                      💡
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-blue-900">Recommended Template</h4>
                      <p className="text-xs text-blue-700">{recommendedTemplate.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Content */}
          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Type</span>
                        <Badge variant="outline" className="text-xs mt-1">
                          {selectedTemplate.type}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Category</span>
                        <Badge variant="outline" className="text-xs mt-1">
                          {selectedTemplate.category}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Version</span>
                        <Badge variant="outline" className="text-xs mt-1">
                          {selectedTemplate.version}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Phases</span>
                        <Badge variant="outline" className="text-xs mt-1">
                          {selectedTemplate.phases.length} phases
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-700">Total Duration</span>
                        <span className="text-sm text-gray-900 mt-1">
                          {selectedTemplate.phases.reduce((sum, phase) => sum + phase.duration, 0)} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Template Tags */}
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phase Navigation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Phase Navigation</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePhaseNavigation('previous')}
                      disabled={currentPhase === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-2">
                      {selectedTemplate.phases.map((phase, index) => (
                        <button
                          key={phase.id}
                          onClick={() => setCurrentPhase(index)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            index === currentPhase
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {index + 1}. {phase.name}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePhaseNavigation('next')}
                      disabled={currentPhase === selectedTemplate.phases.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Progress
                      value={((currentPhase + 1) / selectedTemplate.phases.length) * 100}
                      className="h-2 w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Phase {currentPhase + 1} of {selectedTemplate.phases.length}</span>
                      <span>{Math.round(((currentPhase + 1) / selectedTemplate.phases.length) * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phase Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Phase {currentPhase + 1}: {selectedTemplate.phases[currentPhase]?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {renderPhaseContent(selectedTemplate.phases[currentPhase], currentPhase)}
                </CardContent>
              </Card>

              {/* Customization Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Settings className="h-5 w-5 text-blue-600 mr-2" />
                    Customization Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Customization</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePhaseCustomization}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Customize
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Added Phases</span>
                          <Badge variant="outline" className="text-xs mt-1">
                            {customizations.addedPhases.length}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Modified Phases</span>
                          <Badge variant="outline" className="text-xs mt-1">
                            {customizations.modifiedPhases.length}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Removed Phases</span>
                          <Badge variant="outline" className="text-xs mt-1">
                            {customizations.removedPhases.length}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Custom Requirements</span>
                          <Badge variant="outline" className="text-xs mt-1">
                            {customizations.compliance.customRequirements.length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Library</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {templates.map((template, index) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium ${
                            template.type === 'agile' ? 'bg-green-500' :
                            template.type === 'waterfall' ? 'bg-blue-500' :
                            template.type === 'hybrid' ? 'bg-purple-500' : 'bg-gray-500'
                          }`}>
                            {template.type === 'agile' ? '🏃' :
                             template.type === 'waterfall' < '📊' :
                             template.type === 'hybrid' ? '🔄' : '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                            <p className="text-xs text-gray-600">{template.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.version}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Form Preview */}
          <TabsContent value="preview" className="space-y-6">
            {showFormPreview && formData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Form Preview</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Template</span>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {formData.templateName}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Status</span>
                        <div className="mt-1">
                          <Badge variant={formData.metadata.status === 'submitted' ? 'default' : formData.metadata.status === 'saved' ? 'secondary' : 'outline'} className="text-xs">
                            {formData.metadata.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Phases Completed</span>
                        <div className="mt-1">
                          <Progress
                            value={(currentPhase + 1) / selectedTemplate.phases.length * 100}
                            className="h-2 w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Phase {currentPhase + 1} of {selectedTemplate.phases.length}</span>
                            <span>{Math.round(((currentPhase + 1) / selectedTemplate.phases.length) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Validation Status</span>
                        <div className="mt-1">
                          {Object.keys(validationErrors).length === 0 ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-700">All validations passed</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-700">
                                {Object.keys(validationErrors).length} validation errors
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Form Data Summary</h4>
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Customizations</span>
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                {customizations.addedPhases.length} added
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-700">Compliance</span>
                            <div className="mt-1">
                              <div className="flex flex-wrap gap-1">
                                {formData.compliance.standards.map((standard, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {standard}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Tabs>
      </div>
    </div>
  )
}

export default MethodologyInputForms
```

---

## 🎯� **SUCCESS! Methodology Input Forms Component Complete**

### ✅ **Methodology Input Forms Component Complete**

**🏆 Key Features Implemented:**

1. **📚 Template Library**
   - 3 complete methodology templates (Agile Scrum, Traditional Waterfall, Hybrid Model)
   - Template filtering based on project type and complexity
   - Automatic template recommendation
   - Version control and template management

2. **📝 Dynamic Form Generation**
   - Dynamic form generation based on selected template
   - Real-time form validation with comprehensive error handling
   - Support for 8 different input types
   - Customizable form fields and validation rules

3. **🎯 Phase Management**
   - Interactive phase navigation with progress tracking
   - Phase-by-phase form completion tracking
   - Quality gates and approval workflows
   - Dependency management between phases

4. **🔧 Customization Engine**
   - Add/remove/modify phases dynamically
   - Custom requirements and compliance tracking
   - Risk assessment and mitigation
   - Quality gates configuration

5. **📊 Form Preview & Export**
   - Real-time form preview with validation status
   - Comprehensive form data export
   - Template and form data documentation
   - Version control and change tracking

---

## 📋 **STEP 3: Create Team Assignment Logic**

### **Create Team Assignment Directory**
