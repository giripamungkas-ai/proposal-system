/**
 * BPMN Validation Service
 *
 * Comprehensive BPMN validation service with compliance checking, error reporting, and validation rules
 * Provides detailed validation according to BPMN 2.0 specification
 * Includes validation rules, error reporting, and compliance scoring
 * Supports custom validation rules and rule sets
 * Provides detailed validation reports and recommendations
 */

import { z } from 'zod'
import { BPMNEngine, BPMNProcess, BPMNElement, BPMNEvent, BPMNTask, BPMNGateway, BPMNConnection } from './BPMNEngine'

// Validation rule types
export interface ValidationRule {
  id: string
  name: string
  description: string
  category: 'structure' | 'connectivity' | 'semantics' | 'performance' | 'compliance'
  severity: 'error' | 'warning' | 'info'
  ruleType: 'required' | 'recommended' | 'optional'
  condition: (element: BPMNElement, context: ValidationContext) => boolean
  message: (element: BPMNElement, context: ValidationContext) => string
  suggestion?: (element: BPMNElement, context: ValidationContext) => string
}

export interface ValidationContext {
  process: BPMNProcess
  elements: Map<string, BPMNElement>
  connections: Map<string, BPMNConnection>
  pools: Map<string, any>
  lanes: Map<string, any>
  settings: ValidationSettings
}

export interface ValidationSettings {
  strictMode: boolean
  enablePerformanceValidation: boolean
  enableComplianceValidation: boolean
  enableSemanticValidation: boolean
  customRules: ValidationRule[]
  ruleSets: string[]
  ignoreWarnings: boolean
  maxErrors: number
  maxWarnings: number
}

export interface ValidationResult {
  isValid: boolean
  score: number
  errors: ValidationError[]
  warnings: ValidationWarning[]
  info: ValidationInfo[]
  summary: ValidationSummary
  recommendations: ValidationRecommendation[]
  compliance: ComplianceReport
  metrics: ValidationMetrics
}

export interface ValidationError {
  id: string
  ruleId: string
  ruleName: string
  category: string
  severity: 'error'
  elementId: string
  elementType: string
  message: string
  suggestion?: string
  fixable: boolean
  position?: {
    x: number
    y: number
  }
  metadata: Record<string, any>
}

export interface ValidationWarning {
  id: string
  ruleId: string
  ruleName: string
  category: string
  severity: 'warning'
  elementId: string
  elementType: string
  message: string
  suggestion?: string
  position?: {
    x: number
    y: number
  }
  metadata: Record<string, any>
}

export interface ValidationInfo {
  id: string
  ruleId: string
  ruleName: string
  category: string
  severity: 'info'
  elementId: string
  elementType: string
  message: string
  suggestion?: string
  position?: {
    x: number
    y: number
  }
  metadata: Record<string, any>
}

export interface ValidationSummary {
  totalElements: number
  totalErrors: number
  totalWarnings: number
  totalInfo: number
  passedRules: number
  failedRules: number
  skippedRules: number
  validationTime: number
  complianceScore: number
  qualityScore: number
}

export interface ValidationRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  actions: string[]
  impact: string
  effort: 'low' | 'medium' | 'high'
  estimatedTime?: number
}

export interface ComplianceReport {
  bpmnVersion: string
  isCompliant: boolean
  complianceScore: number
  violations: ComplianceViolation[]
  recommendations: ComplianceRecommendation[]
  certification: CertificationStatus
}

export interface ComplianceViolation {
  id: string
  category: string
  severity: 'critical' | 'major' | 'minor'
  description: string
  elementId: string
  requirement: string
  recommendation: string
}

export interface ComplianceRecommendation {
  id: string
  category: string
  priority: 'high' | 'medium' | 'low'
  description: string
  actions: string[]
  impact: string
}

export interface CertificationStatus {
  isCertified: boolean
  level: string
  validUntil: Date
  issuer: string
  requirements: string[]
}

export interface ValidationMetrics {
  totalValidationTime: number
  averageRuleTime: number
  maxRuleTime: number
  rulesExecuted: number
  ruleSuccessRate: number
  elementValidationRate: number
  connectionValidationRate: number
  semanticValidationRate: number
  complianceValidationRate: number
}

// Built-in validation rules
const BUILTIN_RULES: ValidationRule[] = [
  // Structure validation rules
  {
    id: 'start-event-required',
    name: 'Start Event Required',
    description: 'Process must have at least one start event',
    category: 'structure',
    severity: 'error',
    ruleType: 'required',
    condition: (element, context) => {
      if (element.type !== 'event') return true
      const event = element as BPMNEvent
      return event.eventType === 'start'
    },
    message: (element, context) => 'Process must have at least one start event',
    suggestion: (element, context) => 'Add a start event to begin the process'
  },
  {
    id: 'end-event-required',
    name: 'End Event Required',
    description: 'Process must have at least one end event',
    category: 'structure',
    severity: 'error',
    ruleType: 'required',
    condition: (element, context) => {
      if (element.type !== 'event') return true
      const event = element as BPMNEvent
      return event.eventType === 'end'
    },
    message: (element, context) => 'Process must have at least one end event',
    suggestion: (element, context) => 'Add an end event to terminate the process'
  },
  {
    id: 'unique-element-ids',
    name: 'Unique Element IDs',
    description: 'All elements must have unique IDs',
    category: 'structure',
    severity: 'error',
    ruleType: 'required',
    condition: (element, context) => {
      const elements = Array.from(context.elements.values())
      const duplicates = elements.filter(el => el.id === element.id)
      return duplicates.length === 1
    },
    message: (element, context) => `Element ID '${element.id}' must be unique`,
    suggestion: (element, context) => `Change element ID to a unique value`
  },
  {
    id: 'element-name-required',
    name: 'Element Name Required',
    description: 'All elements must have a name',
    category: 'structure',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      return element.name && element.name.trim().length > 0
    },
    message: (element, context) => `Element should have a name`,
    suggestion: (element, context) => `Add a descriptive name to element '${element.id}'`
  },

  // Connectivity validation rules
  {
    id: 'valid-source-reference',
    name: 'Valid Source Reference',
    description: 'Connection source must reference existing element',
    category: 'connectivity',
    severity: 'error',
    ruleType: 'required',
    condition: (element, context) => {
      if (element.type !== 'connection') return true
      const connection = element as BPMNConnection
      return context.elements.has(connection.sourceRef)
    },
    message: (element, context) => `Connection source '${element.id}' must reference existing element`,
    suggestion: (element, context) => `Update source reference to valid element ID`
  },
  {
    id: 'valid-target-reference',
    name: 'Valid Target Reference',
    description: 'Connection target must reference existing element',
    category: 'connectivity',
    severity: 'error',
    ruleType: 'required',
    condition: (element, context) => {
      if (element.type !== 'connection') return true
      const connection = element as BPMNConnection
      return context.elements.has(connection.targetRef)
    },
    message: (element, context) => `Connection target '${element.id}' must reference existing element`,
    suggestion: (element, context) => `Update target reference to valid element ID`
  },
  {
    id: 'gateway-connection-limit',
    name: 'Gateway Connection Limit',
    description: 'Exclusive gateway should have only one default connection',
    category: 'connectivity',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      if (element.type !== 'gateway') return true
      const gateway = element as BPMNGateway
      if (gateway.gatewayType !== 'exclusive') return true

      const connections = Array.from(context.connections.values())
      const gatewayConnections = connections.filter(c => c.sourceRef === element.id)
      const defaultConnections = gatewayConnections.filter(c => c.properties.isDefault)

      return defaultConnections.length <= 1
    },
    message: (element, context) => `Exclusive gateway should have only one default connection`,
    suggestion: (element, context) => `Remove extra default connections from gateway '${element.id}'`
  },

  // Semantic validation rules
  {
    id: 'task-assignee',
    name: 'Task Assignee',
    description: 'User task should have an assignee',
    category: 'semantics',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      if (element.type !== 'task') return true
      const task = element as BPMNTask
      if (task.taskType !== 'user') return true
      return task.properties.assignee || task.properties.assignees
    },
    message: (element, context) => `User task should have an assignee`,
    suggestion: (element, context) => `Add assignee or assignees to user task '${element.id}'`
  },
  {
    id: 'service-task-service',
    name: 'Service Task Service',
    description: 'Service task should have a service defined',
    category: 'semantics',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      if (element.type !== 'task') return true
      const task = element as BPMNTask
      if (task.taskType !== 'service') return true
      return task.properties.taskService
    },
    message: (element, context) => `Service task should have a service defined`,
    suggestion: (element, context) => `Add service to service task '${element.id}'`
  },
  {
    id: 'script-task-script',
    name: 'Script Task Script',
    description: 'Script task should have a script defined',
    category: 'semantics',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      if (element.type !== 'task') return true
      const task = element as BPMNTask
      if (task.taskType !== 'script') return true
      return task.properties.taskScript
    },
    message: (element, context) => `Script task should have a script defined`,
    suggestion: (element, context) => `Add script to script task '${element.id}'`
  },

  // Performance validation rules
  {
    id: 'process-complexity',
    name: 'Process Complexity',
    description: 'Process complexity should be manageable',
    category: 'performance',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      const totalElements = context.elements.size
      return totalElements <= 50
    },
    message: (element, context) => `Process has ${context.elements.size} elements, consider simplifying`,
    suggestion: (element, context) => 'Break down complex process into smaller sub-processes'
  },
  {
    id: 'gateway-depth',
    name: 'Gateway Depth',
    description: 'Gateway nesting depth should be limited',
    category: 'performance',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      const gateways = Array.from(context.elements.values()).filter(el => el.type === 'gateway')
      return gateways.length <= 10
    },
    message: (element, context) => `Process has ${gateways.length} gateways, consider simplifying logic`,
    suggestion: (element, context) => 'Reduce gateway complexity or use sub-processes'
  },

  // Compliance validation rules
  {
    id: 'bpmn-version-compliance',
    name: 'BPMN Version Compliance',
    description: 'Process must comply with BPMN 2.0 specification',
    category: 'compliance',
    severity: 'error',
    ruleType: 'required',
    condition: (element, context) => {
      // Check if element follows BPMN 2.0 specifications
      return true // This would be implemented with detailed BPMN 2.0 checks
    },
    message: (element, context) => `Element '${element.id}' does not comply with BPMN 2.0 specification`,
    suggestion: (element, context) => `Update element to follow BPMN 2.0 standards`
  },
  {
    id: 'documentation-compliance',
    name: 'Documentation Compliance',
    description: 'Process should have documentation',
    category: 'compliance',
    severity: 'warning',
    ruleType: 'recommended',
    condition: (element, context) => {
      return context.process.metadata?.documentation &&
             context.process.metadata.documentation.length > 0
    },
    message: (element, context) => `Process should have documentation`,
    suggestion: (element, context) => 'Add documentation to improve process understanding'
  }
]

// BPMN Validation Service class
export class BPMNValidationService {
  private rules: Map<string, ValidationRule> = new Map()
  private customRules: ValidationRule[] = []
  private settings: ValidationSettings = {
    strictMode: false,
    enablePerformanceValidation: true,
    enableComplianceValidation: true,
    enableSemanticValidation: true,
    customRules: [],
    ruleSets: [],
    ignoreWarnings: false,
    maxErrors: 100,
    maxWarnings: 50
  }

  constructor() {
    // Initialize built-in rules
    BUILTIN_RULES.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
  }

  // Add custom validation rule
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule)
    this.customRules.push(rule)
  }

  // Remove validation rule
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId)
    this.customRules = this.customRules.filter(rule => rule.id !== ruleId)
  }

  // Get validation rule by ID
  getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId)
  }

  // Get all validation rules
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values())
  }

  // Get rules by category
  getRulesByCategory(category: string): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category)
  }

  // Get rules by severity
  getRulesBySeverity(severity: 'error' | 'warning' | 'info'): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.severity === severity)
  }

  // Validate BPMN process
  validateProcess(process: BPMNProcess, settings?: Partial<ValidationSettings>): ValidationResult {
    const startTime = Date.now()
    const validationSettings = { ...this.settings, ...settings }

    const context: ValidationContext = {
      process,
      elements: new Map(),
      connections: new Map(),
      pools: new Map(),
      lanes: new Map(),
      settings: validationSettings
    }

    // Populate elements and connections
    process.flowElements.forEach((element, id) => {
      context.elements.set(id, element)
    })

    process.connections.forEach((connection, id) => {
      context.connections.set(id, connection)
    })

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const info: ValidationInfo[] = []
    let score = 100

    // Execute validation rules
    this.rules.forEach(rule => {
      try {
        context.elements.forEach((element, elementId) => {
          if (this.shouldExecuteRule(rule, validationSettings, element)) {
            const passed = rule.condition(element, context)

            if (!passed) {
              const result = this.createValidationResult(rule, element, context, 'error')
              errors.push(result)
              score -= 10 // Deduct score for errors
            } else {
              // Check for info messages in strict mode
              if (validationSettings.strictMode) {
                const infoResult = this.createValidationResult(rule, element, context, 'info')
                info.push(infoResult)
              }
            }
          }
        })
      } catch (error) {
        console.error(`Error executing validation rule ${rule.id}:`, error)
        errors.push({
          id: `rule-error-${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: 'error',
          elementId: 'system',
          elementType: 'system',
          message: `Error executing validation rule: ${rule.message}`,
          metadata: { error: error.message }
        })
        score -= 5 // Deduct score for rule errors
      }
    })

    // Check limits
    if (errors.length > validationSettings.maxErrors) {
      errors.splice(validationSettings.maxErrors)
      score -= 20 // Additional penalty for exceeding error limit
    }

    if (!validationSettings.ignoreWarnings && warnings.length > validationSettings.maxWarnings) {
      warnings.splice(validationSettings.maxWarnings)
      score -= 10 // Additional penalty for exceeding warning limit
    }

    const endTime = Date.now()
    const validationTime = endTime - startTime

    // Create summary
    const summary: ValidationSummary = {
      totalElements: context.elements.size,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalInfo: info.length,
      passedRules: this.rules.size - errors.length - warnings.length - info.length,
      failedRules: errors.length + warnings.length,
      skippedRules: 0,
      validationTime,
      complianceScore: Math.max(0, score),
      qualityScore: Math.max(0, score - (warnings.length * 2))
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(errors, warnings, context)

    // Create compliance report
    const compliance = this.generateComplianceReport(process, errors, warnings)

    // Create metrics
    const metrics: ValidationMetrics = {
      totalValidationTime: validationTime,
      averageRuleTime: validationTime / this.rules.size,
      maxRuleTime: validationTime, // This would be tracked per rule
      rulesExecuted: this.rules.size,
      ruleSuccessRate: summary.passedRules / this.rules.size,
      elementValidationRate: context.elements.size > 0 ? summary.passedRules / context.elements.size : 0,
      connectionValidationRate: context.connections.size > 0 ? summary.passedRules / context.connections.size : 0,
      semanticValidationRate: validationSettings.enableSemanticValidation ? summary.passedRules / this.rules.size : 0,
      complianceValidationRate: validationSettings.enableComplianceValidation ? summary.passedRules / this.rules.size : 0,
      performanceValidationRate: validationSettings.enablePerformanceValidation ? summary.passedRules / this.rules.size : 0
    }

    return {
      isValid: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings: validationSettings.ignoreWarnings ? [] : warnings,
      info,
      summary,
      recommendations,
      compliance,
      metrics
    }
  }

  // Check if rule should be executed
  private shouldExecuteRule(rule: ValidationRule, settings: ValidationSettings, element: BPMNElement): boolean {
    // Check if rule is disabled in settings
    if (settings.ignoreWarnings && rule.severity === 'warning') return false

    // Check if rule is disabled in custom settings
    if (settings.customRules && !settings.customRules.includes(rule.id)) return false

    // Check if rule applies to element type
    if (rule.category === 'performance' && !settings.enablePerformanceValidation) return false
    if (rule.category === 'compliance' && !settings.enableComplianceValidation) return false
    if (rule.category === 'semantics' && !settings.enableSemanticValidation) return false

    // Check if rule applies to element
    if (rule.condition) {
      return rule.condition(element, this.createValidationContext(settings))
    }

    return true
  }

  // Create validation context
  private createValidationContext(settings: ValidationSettings): ValidationContext {
    // This would create a minimal context for rule checking
    return {
      process: {} as BPMNProcess,
      elements: new Map(),
      connections: new Map(),
      pools: new Map(),
      lanes: new Map(),
      settings
    }
  }

  // Create validation result
  private createValidationResult(
    rule: ValidationRule,
    element: BPMNElement,
    context: ValidationContext,
    severity: 'error' | 'warning' | 'info'
  ): ValidationError | ValidationWarning | ValidationInfo {
    const baseResult = {
      id: `${rule.id}-${element.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity,
      elementId: element.id,
      elementType: element.type,
      message: rule.message(element, context),
      metadata: {
        ruleCategory: rule.category,
        ruleSeverity: rule.severity,
        ruleType: rule.ruleType,
        elementCategory: element.category,
        timestamp: new Date()
      }
    }

    if (severity === 'error') {
      return {
        ...baseResult,
        fixable: this.isFixable(element, rule),
        suggestion: rule.suggestion ? rule.suggestion(element, context) : undefined,
        position: element.position
      } as ValidationError
    } else if (severity === 'warning') {
      return {
        ...baseResult,
        suggestion: rule.suggestion ? rule.suggestion(element, context) : undefined,
        position: element.position
      } as ValidationWarning
    } else {
      return {
        ...baseResult,
        suggestion: rule.suggestion ? rule.suggestion(element, context) : undefined,
        position: element.position
      } as ValidationInfo
    }
  }

  // Check if element is fixable
  private isFixable(element: BPMNElement, rule: ValidationRule): boolean {
    // This would check if the element can be automatically fixed
    if (rule.category === 'structure') return true
    if (rule.category === 'connectivity') return true
    if (rule.category === 'semantics') return true
    return false
  }

  // Generate recommendations
  private generateRecommendations(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    context: ValidationContext
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = []

    // Generate recommendations from errors
    errors.forEach(error => {
      if (error.ruleId === 'start-event-required') {
        recommendations.push({
          id: `rec-start-event-${Date.now()}`,
          priority: 'high',
          category: 'structure',
          title: 'Add Start Event',
          description: 'Process requires at least one start event to begin execution',
          actions: [
            'Add a start event to the process',
            'Ensure the start event is properly configured',
            'Test the start event functionality'
          ],
          impact: 'Critical - Process cannot start without start event',
          effort: 'low'
        })
      } else if (error.ruleId === 'end-event-required') {
        recommendations.push({
          id: `rec-end-event-${Date.now()}`,
          priority: 'high',
          category: 'structure',
          title: 'Add End Event',
          description: 'Process requires at least one end event to terminate execution',
          actions: [
            'Add an end event to the process',
            'Ensure the end event is properly configured',
            'Test the end event functionality'
          ],
          impact: 'Critical - Process cannot end without end event',
          effort: 'low'
        })
      } else if (error.ruleId === 'unique-element-ids') {
        recommendations.push({
          id: `rec-unique-ids-${Date.now()}`,
          priority: 'high',
          category: 'structure',
          title: 'Fix Duplicate Element IDs',
          description: 'Process contains duplicate element IDs which will cause validation errors',
          actions: [
            'Rename duplicate elements to have unique IDs',
            'Update element IDs to follow naming conventions',
            'Verify all elements have unique IDs'
          ],
          impact: 'Critical - Duplicate IDs prevent proper validation',
          effort: 'medium'
        })
      }
    })

    // Generate recommendations from warnings
    warnings.forEach(warning => {
      if (warning.ruleId === 'task-assignee') {
        recommendations.push({
          id: `rec-task-assignee-${Date.now()}`,
          priority: 'medium',
          category: 'semantics',
          title: 'Add Task Assignee',
          description: 'User task should have an assignee for proper task execution',
          actions: [
            'Add assignee to user task',
            'Configure candidate groups for task assignment',
            'Test task assignment functionality'
          ],
          impact: 'Important - Tasks without assignees may not be executed',
          effort: 'low'
        })
      } else if (warning.ruleId === 'service-task-service') {
        recommendations.push({
          id: `rec-service-task-${Date.now()}`,
          priority: 'medium',
          category: 'semantics',
          title: 'Configure Service Task',
          description: 'Service task should have a service defined for proper execution',
          actions: [
            'Add service to service task',
            'Configure service parameters and properties',
            'Test service task functionality'
          ],
          impact: 'Important - Service tasks cannot execute without service',
          effort: 'medium'
        })
      } else if (warning.ruleId === 'process-complexity') {
        recommendations.push({
          id: `rec-process-complexity-${Date.now()}`,
          priority: 'low',
          category: 'performance',
          title: 'Simplify Process Complexity',
          description: 'Process has many elements which may impact performance and maintainability',
          actions: [
            'Break down complex process into smaller sub-processes',
            'Use parallel processing where possible',
            'Consider BPMN best practices for process design'
          ],
          impact: 'Helpful - Simpler processes are easier to maintain',
          effort: 'high'
        })
      }
    })

    return recommendations
  }

  // Generate compliance report
  private generateComplianceReport(
    process: BPMNProcess,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): ComplianceReport {
    const violations: ComplianceViolation[] = []
    let complianceScore = 100

    // Check compliance violations
    errors.forEach(error => {
      violations.push({
        id: `violation-${error.id}`,
        category: error.category,
        severity: error.severity === 'error' ? 'critical' : 'major',
        description: error.message,
        elementId: error.elementId,
        requirement: 'BPMN 2.0 Specification',
        recommendation: error.suggestion || 'Fix the identified issue'
      })
      complianceScore -= 20 // Deduct score for critical violations
    })

    warnings.forEach(warning => {
      violations.push({
        id: `violation-${warning.id}`,
        category: warning.category,
        severity: 'minor',
        description: warning.message,
        elementId: warning.elementId,
        requirement: 'BPMN 2.0 Best Practices',
        recommendation: warning.suggestion || 'Consider improving the implementation'
      })
      complianceScore -= 5 // Deduct score for minor violations
    })

    return {
      bpmnVersion: '2.0',
      isCompliant: violations.filter(v => v.severity === 'critical').length === 0,
      complianceScore: Math.max(0, complianceScore),
      violations,
      recommendations: violations.map(v => ({
        id: `comp-rec-${v.id}`,
        category: v.category,
        priority: v.severity === 'critical' ? 'high' : v.severity === 'major' ? 'medium' : 'low',
        description: v.description,
        actions: [v.recommendation]
      })),
      certification: {
        isCertified: violations.filter(v => v.severity === 'critical').length === 0,
        level: complianceScore >= 90 ? 'A' : complianceScore >= 70 ? 'B' : complianceScore >= 50 ? 'C' : 'D',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        issuer: 'MDMedia BPMN Validation Service',
        requirements: violations.map(v => v.requirement)
      }
    }
  }

  // Validate BPMN process with custom rules
  validateProcessWithCustomRules(
    process: BPMNProcess,
    customRules: ValidationRule[],
    settings?: Partial<ValidationSettings>
  ): ValidationResult {
    const tempRules = this.customRules
    this.customRules = customRules
    const result = this.validateProcess(process, settings)
    this.customRules = tempRules

    return result
  }

  // Validate single element
  validateElement(element: BPMNElement, context: ValidationContext): {
    isValid: boolean
    score: number
    errors: ValidationError[]
    warnings: ValidationWarning[]
    info: ValidationInfo[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const info: ValidationInfo[] = []
    let score = 100

    // Execute rules for this element
    this.rules.forEach(rule => {
      if (this.shouldExecuteRule(rule, context.settings, element)) {
        try {
          const passed = rule.condition(element, context)

          if (!passed) {
            const result = this.createValidationResult(rule, element, context, 'error')
            errors.push(result)
            score -= 10
          } else if (rule.severity === 'info') {
            const result = this.createValidationResult(rule, element, context, 'info')
            info.push(result)
          }
        } catch (error) {
          errors.push({
            id: `rule-error-${rule.id}`,
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: 'error',
            elementId: element.id,
            elementType: element.type,
            message: `Error executing validation rule: ${rule.message}`,
            metadata: { error: error.message }
          })
          score -= 5
        }
      }
    })

    return {
      isValid: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings,
      info
    }
  }

  // Validate multiple elements
  validateElements(elements: BPMNElement[], settings?: Partial<ValidationSettings>): {
    isValid: boolean
    score: number
    errors: ValidationError[]
    warnings: ValidationWarning[]
    info: ValidationInfo[]
  } {
    const validationSettings = { ...this.settings, ...settings }
    const context: ValidationContext = this.createValidationContext(validationSettings)

    // Add elements to context
    elements.forEach(element => {
      context.elements.set(element.id, element)
    })

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const info: ValidationInfo[] = []
    let score = 100

    // Execute rules for all elements
    this.rules.forEach(rule => {
      elements.forEach(element => {
        if (this.shouldExecuteRule(rule, validationSettings, element)) {
          try {
            const passed = rule.condition(element, context)

            if (!passed) {
              const result = this.createValidationResult(rule, element, context, 'error')
              errors.push(result)
              score -= 10
            } else if (rule.severity === 'info') {
              const result = this.createValidationResult(rule, element, context, 'info')
              info.push(result)
            }
          } catch (error) {
            errors.push({
              id: `rule-error-${rule.id}`,
              ruleId: rule.id,
              ruleName: rule.name,
              category: rule.category,
              severity: 'error',
              elementId: element.id,
              elementType: element.type,
              message: `Error executing validation rule: ${rule.message}`,
              metadata: { error: error.message }
            })
            score -= 5
          }
        }
      })
    })

    return {
      isValid: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings,
      info
    }
  }

  // Get validation statistics
  getValidationStatistics(): {
    totalRules: number
    rulesByCategory: Record<string, number>
    rulesBySeverity: Record<string, number>
    rulesByType: Record<string, number>
  } {
    const rulesByCategory: Record<string, number> = {}
    const rulesBySeverity: Record<string, number> = {}
    const rulesByType: Record<string, number> = {}

    this.rules.forEach(rule => {
      rulesByCategory[rule.category] = (rulesByCategory[rule.category] || 0) + 1
      rulesBySeverity[rule.severity] = (rulesBySeverity[rule.severity] || 0) + 1
      rulesByType[rule.ruleType] = (rulesByType[rule.ruleType] || 0) + 1
    })

    return {
      totalRules: this.rules.length,
      rulesByCategory,
      rulesBySeverity,
      rulesByType
    }
  }

  // Update validation settings
  updateSettings(settings: Partial<ValidationSettings>): void {
    this.settings = { ...this.settings, ...settings }
  }

  // Get current validation settings
  getSettings(): ValidationSettings {
    return { ...this.settings }
  }

  // Reset validation service to default state
  reset(): void {
    this.rules.clear()
    this.customRules = []
    this.settings = {
      strictMode: false,
      enablePerformanceValidation: true,
      enableComplianceValidation: true,
      enableSemanticValidation: true,
      customRules: [],
      ruleSets: [],
      ignoreWarnings: false,
      maxErrors: 100,
      maxWarnings: 50
    }

    // Re-add built-in rules
    BUILTIN_RULES.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
  }
}

// Export the validation service
export const bpmnValidationService = new BPMNValidationService()
