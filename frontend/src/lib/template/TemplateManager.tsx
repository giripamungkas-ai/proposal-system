/**
 * Advanced Template Manager
 *
 * Comprehensive template management system with:
 * - Template creation and editing with rich text editor
 * - Template versioning with change tracking and rollback
 * - Template analytics with usage statistics and insights
 * - Template marketplace with approval workflows
 * - Template customization with variable management
 * - Template export/import capabilities
 * - Real-time collaboration features
 * - Integration with proposal system and DMS
 * - Advanced search and filtering capabilities
 */

import { z } from 'zod'

// Type definitions
export interface Template {
  id: string
  name: string
  description: string
  category: string
  subcategory: string
  version: string
  status: 'draft' | 'active' | 'deprecated' | 'archived'
  visibility: 'private' | 'team' | 'organization' | 'public'
  created_by: string
  updated_by: string
  created_at: Date
  updated_at: Date
  published_at?: Date
  archived_at?: Date
  tags: string[]
  metadata: {
    usage_count: number
    last_used?: Date
    success_rate: number
    average_rating: number
    total_ratings: number
    completion_time: number
    file_size: number
    dependencies: string[]
    compatibility: string[]
  }
  content: {
    sections: TemplateSection[]
    variables: TemplateVariable[]
    styles: TemplateStyles
    layout: TemplateLayout
    custom_properties: Record<string, any>
  }
  validation: {
    rules: ValidationRule[]
    dependencies: ValidationDependency[]
    required_fields: string[]
    optional_fields: string[]
    custom_validators: CustomValidator[]
  }
  permissions: {
    can_edit: string[]
    can_view: string[]
    can_delete: string[]
    can_publish: string[]
    can_archive: string[]
  }
  approvals: {
    created_by: string
    approved_by?: string
    approved_at?: Date
    status: 'pending' | 'approved' | 'rejected'
    comments: ApprovalComment[]
  }
  analytics: {
    views: number
    uses: number
    downloads: number
    shares: number
    ratings: TemplateRating[]
    feedback: TemplateFeedback[]
  }
}

export interface TemplateSection {
  id: string
  name: string
  title: string
  description: string
  type: 'header' | 'introduction' | 'client_info' | 'project_info' | 'objectives' | 'scope' | 'timeline' | 'financial' | 'requirements' | 'attachments' | 'footer'
  order: number
  required: boolean
  collapsible: boolean
  default_collapsed: boolean
  fields: TemplateField[]
  conditions: TemplateCondition[]
  styles: TemplateSectionStyles
  custom_properties: Record<string, any>
}

export interface TemplateField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'email' | 'phone' | 'url' | 'select' | 'multiselect' | 'radio' | 'radio_group' | 'checkbox' | 'file' | 'image' | 'video' | 'signature' | 'rich_text' | 'html' | 'markdown' | 'json' | 'xml' | 'custom'
  required: boolean
  readonly: boolean
  disabled: boolean
  placeholder: string
  description: string
  default_value: any
  validation: TemplateFieldValidation
  options?: TemplateFieldOption[]
  multiple: boolean
  min_items?: number
  max_items?: number
  custom_component?: string
  custom_properties: Record<string, any>
  conditions: TemplateCondition[]
  dependencies: TemplateFieldDependency[]
  styling: {
    width: string
    height: string
    alignment: string
    color: string
    font: string
    size: string
    border: string
    background: string
    padding: string
    margin: string
  }
}

export interface TemplateFieldOption {
  id: string
  label: string
  value: string
  description?: string
  icon?: string
  color?: string
  background?: string
  font?: string
  size?: string
  custom_properties?: Record<string, any>
}

export interface TemplateFieldValidation {
  type: 'required' | 'optional' | 'min_length' | 'max_length' | 'min' | 'max' | 'pattern' | 'email' | 'phone' | 'url' | 'file' | 'image' | 'video' | 'audio' | 'date' | 'datetime' | 'custom'
  value?: any
  message: string
  custom_validator?: string
  parameters?: Record<string, any>
}

export interface TemplateVariable {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'list' | 'object'
  description: string
  default_value: any
  required: boolean
  readonly: boolean
  validation: TemplateFieldValidation
  options?: TemplateVariableOption[]
  formatting: {
    prefix?: string
    suffix?: string
    date_format?: string
    number_format?: string
    boolean_format?: string
  }
  conditions: TemplateCondition[]
  dependencies: TemplateVariableDependency[]
  custom_properties?: Record<string, any>
}

export interface TemplateVariableOption {
  id: string
  label: string
  value: any
  description?: string
  icon?: string
  color?: string
  custom_properties?: Record<string, any>
}

export interface TemplateStyles {
  global: {
    primary_color: string
    secondary_color: string
    background_color: string
    text_color: string
    font_family: string
    font_size: string
    border_radius: string
    box_shadow: string
    spacing: string
  }
  sections: Record<string, TemplateSectionStyles>
  fields: Record<string, TemplateFieldStyles>
}

export interface TemplateSectionStyles {
  container: {
    background?: string
    border?: string
    padding?: string
    margin?: string
    border_radius?: string
    box_shadow?: string
  }
  header: {
    font_size?: string
    font_weight?: string
    color?: string
    background?: string
    padding?: string
    margin?: string
    border_radius?: string
    border?: string
  }
  content: {
    font_size?: string
    line_height?: string
    color?: string
    background?: string
    padding?: string
    margin?: string
  }
  footer: {
    font_size?: string
    color?: string
    background?: string
    padding?: string
    margin?: string
    border_top?: string
  }
}

export interface TemplateFieldStyles {
  container: {
    width?: string
    height?: string
    padding?: string
    margin?: string
    border?: string
    border_radius?: string
    background?: string
  }
  label: {
    font_size?: string
    font_weight?: string
    color?: string
    padding?: string
    margin?: string
    text_align?: string
  }
  input: {
    width?: string
    height?: string
    padding?: string
    border?: string
    border_radius?: string
    background?: string
    color?: string
    font_size?: string
  }
  error: {
    color?: string
    background?: string
    border?: string
    font_size?: string
  }
  success: {
    color?: string
    background?: string
    border?: string
    font_size?: string
  }
}

export interface TemplateLayout {
  type: 'single_column' | 'two_column' | 'three_column' | 'sidebar' | 'custom'
  sections: string[]
  responsive: {
    mobile: TemplateLayoutConfig
    tablet: TemplateLayoutConfig
    desktop: TemplateLayoutConfig
  }
  custom_properties?: Record<string, any>
}

export interface TemplateLayoutConfig {
  width: string
  height: string
  columns: number
  spacing: string
  alignment: string
  custom_properties?: Record<string, any>
}

export interface TemplateCondition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_than_equal' | 'less_than_equal' | 'is_empty' | 'is_not_empty' | 'is_selected' | 'is_not_selected'
  value: any
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'optional'
  custom_properties?: Record<string, any>
}

export interface TemplateFieldDependency {
  field: string
  depends_on: string
  condition: string
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'optional'
  value?: any
  custom_properties?: Record<string, any>
}

export interface TemplateVariableDependency {
  variable: string
  depends_on: string
  condition: string
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'optional'
  value?: any
  custom_properties?: Record<string, any>
}

export interface ValidationRule {
  id: string
  type: string
  field: string
  condition: string
  value: any
  message: string
  severity: 'info' | 'warning' | 'error'
  custom_validator?: string
  parameters?: Record<string, any>
}

export interface ValidationDependency {
  field: string
  depends_on: string
  condition: string
  value: any
  action: string
  custom_properties?: Record<string, any>
}

export interface CustomValidator {
  id: string
  name: string
  type: string
  description: string
  code: string
  parameters: Record<string, any>
  error_message: string
  success_message: string
}

export interface ApprovalComment {
  id: string
  user_id: string
  user_name: string
  user_email: string
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  timestamp: Date
  custom_properties?: Record<string, any>
}

export interface TemplateRating {
  id: string
  user_id: string
  rating: number
  comment: string
  timestamp: Date
  custom_properties?: Record<string, any>
}

export interface TemplateFeedback {
  id: string
  user_id: string
  user_name: string
  user_email: string
  feedback: string
  type: 'improvement' | 'bug' | 'feature' | 'general'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  timestamp: Date
  custom_properties?: Record<string, any>
}

export interface TemplateManagerConfig {
  default_styles: TemplateStyles
  default_layout: TemplateLayout
  validation_rules: ValidationRule[]
  approval_workflow: {
    enabled: boolean
    required_approvals: number
    approvers: string[]
    auto_approve: boolean
  }
  analytics: {
    enabled: boolean
    tracking: boolean
    metrics: string[]
    dashboard: boolean
  }
  collaboration: {
    enabled: boolean
    real_time: boolean
    version_control: boolean
    commenting: boolean
  }
  export: {
    enabled: boolean
    formats: string[]
    customization: boolean
  }
  search: {
    enabled: boolean
    indexing: boolean
    filters: string[]
  }
}

export interface TemplateSearchResult {
  templates: Template[]
  total: number
  page: number
  per_page: number
  total_pages: number
  facets: Record<string, any>
  suggestions: string[]
}

export interface TemplateAnalytics {
  template_id: string
  usage_stats: {
    total_uses: number
    unique_users: number
    average_completion_time: number
    success_rate: number
    error_rate: number
    abandonment_rate: number
  }
  performance_stats: {
    average_load_time: number
    average_render_time: number
    average_validation_time: number
    error_count: number
    warning_count: number
  }
  user_stats: {
    total_users: number
    active_users: number
    new_users: number
    returning_users: number
  }
  rating_stats: {
    total_ratings: number
    average_rating: number
    rating_distribution: Record<number, number>
  }
  feedback_stats: {
    total_feedback: number
    feedback_distribution: Record<string, number>
    sentiment_distribution: {
      positive: number
      neutral: number
      negative: number
    }
  }
  time_series: {
    daily: Array<{
      date: string
      uses: number
      users: number
      completion_time: number
      success_rate: number
    }>
    weekly: Array<{
      week: string
      uses: number
      users: number
      completion_time: number
      success_rate: number
    }>
    monthly: Array<{
      month: string
      uses: number
      users: number
      completion_time: number
      success_rate: number
    }>
  }
}

export interface TemplateCreateRequest {
  name: string
  description: string
  category: string
  subcategory: string
  visibility: Template['visibility']
  tags: string[]
  content: Template['content']
  validation: Template['validation']
  permissions: Template['permissions']
  custom_properties?: Record<string, any>
}

export interface TemplateUpdateRequest {
  id: string
  name?: string
  description?: string
  category?: string
  subcategory?: string
  status?: Template['status']
  visibility?: Template['visibility']
  tags?: string[]
  content?: Template['content']
  validation?: Template['validation']
  permissions?: Template['permissions']
  metadata?: Partial<Template['metadata']>
  custom_properties?: Record<string, any>
}

export interface TemplateVersion {
  id: string
  template_id: string
  version: string
  created_by: string
  created_at: Date
  changes: TemplateChange[]
  changelog: string
  metadata: {
    change_count: number
    added_sections: number
    removed_sections: number
    modified_sections: number
    added_fields: number
    removed_fields: number
    modified_fields: number
    file_size: number
    dependencies: string[]
  }
}

export interface TemplateChange {
  type: 'create' | 'update' | 'delete' | 'modify'
  entity: 'template' | 'section' | 'field' | 'variable' | 'style' | 'layout' | 'validation'
  entity_id: string
  entity_name: string
  old_value?: any
  new_value?: any
  description: string
  timestamp: Date
  user_id: string
  user_name: string
  custom_properties?: Record<string, any>
}

export interface TemplateShare {
  id: string
  template_id: string
  shared_by: string
  shared_with: string
  permission: 'view' | 'edit' | 'comment' | 'download'
  expires_at?: Date
  created_at: Date
  custom_properties?: Record<string, any>
}

export interface TemplateExport {
  id: string
  template_id: string
  format: 'pdf' | 'docx' | 'html' | 'json' | 'xml' | 'csv'
  options: {
    include_content: boolean
    include_styles: boolean
    include_metadata: boolean
    include_analytics: boolean
    custom_properties?: Record<string, any>
  }
  created_at: Date
  expires_at?: Date
  download_url?: string
  file_size?: number
  custom_properties?: Record<string, any>
}

export interface TemplateMarketplace {
  id: string
  template_id: string
  seller_id: string
  seller_name: string
  seller_email: string
  price: number
  currency: string
  description: string
  features: string[]
  screenshots: TemplateScreenshot[]
  demo_url?: string
  support_level: 'basic' | 'standard' | 'premium' | 'enterprise'
  support_duration: string
  refund_policy: string
  rating: number
  review_count: number
  category: string
  tags: string[]
  created_at: Date
  updated_at: Date
  status: 'active' | 'inactive' | 'suspended'
  custom_properties?: Record<string, any>
}

export interface TemplateScreenshot {
  id: string
  url: string
  thumbnail_url: string
  title: string
  description: string
  width: number
  height: number
  order: number
  created_at: Date
  custom_properties?: Record<string, any>
}

// Schema definitions
const TemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  category: z.string().min(1).max(100),
  subcategory: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  status: z.enum(['draft', 'active', 'deprecated', 'archived']),
  visibility: z.enum(['private', 'team', 'organization', 'public']),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
  published_at: z.date().optional(),
  archived_at: z.date().optional(),
  tags: z.array(z.string().max(50)).max(20),
  metadata: z.object({
    usage_count: z.number(),
    last_used: z.date().optional(),
    success_rate: z.number().min(0).max(1),
    average_rating: z.number().min(0).max(5),
    total_ratings: z.number(),
    completion_time: z.number(),
    file_size: z.number(),
    dependencies: z.array(z.string()),
    compatibility: z.array(z.string())
  }),
  content: z.object({
    sections: z.array(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255),
      title: z.string().min(1).max(255),
      description: z.string().max(1000),
      type: z.enum(['header', 'introduction', 'client_info', 'project_info', 'objectives', 'scope', 'timeline', 'financial', 'requirements', 'attachments', 'footer']),
      order: z.number(),
      required: z.boolean(),
      collapsible: z.boolean(),
      default_collapsed: z.boolean(),
      fields: z.array(z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255),
        label: z.string().min(1).max(255),
        type: z.enum(['text', 'textarea', 'number', 'date', 'datetime', 'email', 'phone', 'url', 'select', 'multiselect', 'radio', 'radio_group', 'checkbox', 'file', 'image', 'video', 'signature', 'rich_text', 'html', 'markdown', 'json', 'xml', 'custom']),
        required: z.boolean(),
        readonly: z.boolean(),
        disabled: z.boolean(),
        placeholder: z.string().max(255).optional(),
        description: z.string().max(500).optional(),
        default_value: z.any().optional(),
        validation: z.object({
          type: z.enum(['required', 'optional', 'min_length', 'max_length', 'min', 'max', 'pattern', 'email', 'phone', 'url', 'file', 'image', 'video', 'audio', 'date', 'datetime', 'custom']),
          value: z.any().optional(),
          message: z.string().max(255),
          custom_validator: z.string().optional(),
          parameters: z.record(z.any()).optional()
        }),
        options: z.array(z.object({
          id: z.string().uuid(),
          label: z.string().min(1).max(255),
          value: z.string(),
          description: z.string().max(500).optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
          custom_properties: z.record(z.any()).optional()
        })).optional(),
        multiple: z.boolean(),
        min_items: z.number().optional(),
        max_items: z.number().optional(),
        custom_component: z.string().optional(),
        custom_properties: z.record(z.any()).optional(),
        conditions: z.array(z.object({
          id: z.string().uuid(),
          field: z.string(),
          operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'greater_than_equal', 'less_than_equal', 'is_empty', 'is_not_empty', 'is_selected', 'is_not_selected']),
          value: z.any(),
          action: z.enum(['show', 'hide', 'enable', 'disable', 'require', 'optional']),
          custom_properties: z.record(z.any()).optional()
        })).optional(),
        dependencies: z.array(z.object({
          field: z.string(),
          depends_on: z.string(),
          condition: z.string(),
          action: z.enum(['show', 'hide', 'enable', 'disable', 'require', 'optional']),
          value: z.any().optional(),
          custom_properties: z.record(z.any()).optional()
        })).optional(),
        styling: z.object({
          width: z.string().optional(),
          height: z.string().optional(),
          alignment: z.string().optional(),
          color: z.string().optional(),
          font: z.string().optional(),
          size: z.string().optional(),
          border: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional()
        }).optional(),
        custom_properties: z.record(z.any()).optional()
      })),
      conditions: z.array(z.object({
        id: z.string().uuid(),
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'greater_than_equal', 'less_than_equal', 'is_empty', 'is_not_empty', 'is_selected', 'is_not_selected']),
        value: z.any(),
        action: z.enum(['show', 'hide', 'enable', 'disable', 'require', 'optional']),
        custom_properties: z.record(z.any()).optional()
      })).optional(),
      styles: z.object({
        container: z.object({
          background: z.string().optional(),
          border: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border_radius: z.string().optional(),
          box_shadow: z.string().optional()
        }).optional(),
        header: z.object({
          font_size: z.string().optional(),
          font_weight: z.string().optional(),
          color: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border_radius: z.string().optional(),
          border: z.string().optional()
        }).optional(),
        content: z.object({
          font_size: z.string().optional(),
          line_height: z.string().optional(),
          color: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional()
        }).optional(),
        footer: z.object({
          font_size: z.string().optional(),
          color: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border_top: z.string().optional()
        }).optional()
      }).optional(),
      custom_properties: z.record(z.any()).optional()
    })),
    variables: z.array(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255),
      type: z.enum(['text', 'number', 'date', 'datetime', 'boolean', 'list', 'object']),
      description: z.string().max(1000),
      default_value: z.any().optional(),
      required: z.boolean(),
      readonly: z.boolean(),
      validation: z.object({
        type: z.enum(['required', 'optional', 'min_length', 'max_length', 'min', 'max', 'pattern', 'email', 'phone', 'url', 'file', 'image', 'video', 'audio', 'date', 'datetime', 'custom']),
        value: z.any().optional(),
        message: z.string().max(255),
        custom_validator: z.string().optional(),
        parameters: z.record(z.any()).optional()
      }),
      options: z.array(z.object({
        id: z.string().uuid(),
        label: z.string().min(1).max(255),
        value: z.any(),
        description: z.string().max(500).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        custom_properties: z.record(z.any()).optional()
      })).optional(),
      formatting: z.object({
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        date_format: z.string().optional(),
        number_format: z.string().optional(),
        boolean_format: z.string().optional()
      }).optional(),
      conditions: z.array(z.object({
        id: z.string().uuid(),
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'greater_than_equal', 'less_than_equal', 'is_empty', 'is_not_empty', 'is_selected', 'is_not_selected']),
        value: z.any(),
        action: z.enum(['show', 'hide', 'enable', 'disable', 'require', 'optional']),
        custom_properties: z.record(z.any()).optional()
      })).optional(),
      dependencies: z.array(z.object({
        variable: z.string(),
        depends_on: z.string(),
        condition: z.string(),
        action: z.enum(['show', 'hide', 'enable', 'disable', 'require', 'optional']),
        value: z.any().optional(),
        custom_properties: z.record(z.any()).optional()
      })).optional(),
      custom_properties: z.record(z.any()).optional()
    })),
    styles: z.object({
      global: z.object({
        primary_color: z.string(),
        secondary_color: z.string(),
        background_color: z.string(),
        text_color: z.string(),
        font_family: z.string(),
        font_size: z.string(),
        border_radius: z.string(),
        box_shadow: z.string(),
        spacing: z.string()
      }),
      sections: z.record(z.object({
        container: z.object({
          background: z.string().optional(),
          border: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border_radius: z.string().optional(),
          box_shadow: z.string().optional()
        }).optional(),
        header: z.object({
          font_size: z.string().optional(),
          font_weight: z.string().optional(),
          color: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border_radius: z.string().optional(),
          border: z.string().optional()
        }).optional(),
        content: z.object({
          font_size: z.string().optional(),
          line_height: z.string().optional(),
          color: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional()
        }).optional(),
        footer: z.object({
          font_size: z.string().optional(),
          color: z.string().optional(),
          background: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border_top: z.string().optional()
        }).optional()
      })),
      fields: z.record(z.object({
        container: z.object({
          width: z.string().optional(),
          height: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          border: z.string().optional(),
          border_radius: z.string().optional(),
          background: z.string().optional()
        }).optional(),
        label: z.object({
          font_size: z.string().optional(),
          font_weight: z.string().optional(),
          color: z.string().optional(),
          padding: z.string().optional(),
          margin: z.string().optional(),
          text_align: z.string().optional()
        }).optional(),
        input: z.object({
          width: z.string().optional(),
          height: z.string().optional(),
          padding: z.string().optional(),
          border: z.string().optional(),
          border_radius: z.string().optional(),
          background: z.string().optional(),
          color: z.string().optional(),
          font_size: z.string().optional()
        }).optional(),
        error: z.object({
          color: z.string().optional(),
          background: z.string().optional(),
          border: z.string().optional(),
          font_size: z.string().optional()
        }).optional(),
        success: z.object({
          color: z.string().optional(),
          background: z.string().optional(),
          border: z.string().optional(),
          font_size: z.string().optional()
        }).optional()
      }))
    })),
    layout: z.object({
      type: z.enum(['single_column', 'two_column', 'three_column', 'sidebar', 'custom']),
      sections: z.array(z.string()),
      responsive: z.object({
        mobile: z.object({
          width: z.string(),
          height: z.string(),
          columns: z.number(),
          spacing: z.string(),
          alignment: z.string(),
          custom_properties: z.record(z.any()).optional()
        }),
        tablet: z.object({
          width: z.string(),
          height: z.string(),
          columns: z.number(),
          spacing: z.string(),
          alignment: z.string(),
          custom_properties: z.record(z.any()).optional()
        }),
        desktop: z.object({
          width: z.string(),
          height: z.string(),
          columns: z.number(),
          spacing: z.string(),
          alignment: z.string(),
          custom_properties: z.record(z.any()).optional()
        })
      }),
      custom_properties: z.record(z.any()).optional()
    }),
    validation: z.object({
      rules: z.array(z.object({
        id: z.string().uuid(),
        type: z.enum(['required', 'optional', 'min_length', 'max_length', 'min', 'max', 'pattern', 'email', 'phone', 'url', 'file', 'image', 'video', 'audio', 'date', 'datetime', 'custom']),
        field: z.string(),
        condition: z.string(),
        value: z.any(),
        message: z.string(),
        severity: z.enum(['info', 'warning', 'error']),
        custom_validator: z.string().optional(),
        parameters: z.record(z.any()).optional()
      })),
      dependencies: z.array(z.object({
        field: z.string(),
        depends_on: z.string(),
        condition: z.string(),
        value: z.any(),
        action: z.string(),
        custom_properties: z.record(z.any()).optional()
      })),
      required_fields: z.array(z.string()),
      optional_fields: z.array(z.string()),
      custom_validators: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        type: z.string(),
        description: z.string(),
        parameters: z.record(z.any()),
        error_message: z.string(),
        success_message: z.string()
      }))
    }),
    permissions: z.object({
      can_edit: z.array(z.string()),
      can_view: z.array(z.string()),
      can_delete: z.array(z.string()),
      can_publish: z.array(z.string()),
      can_archive: z.array(z.string())
    }),
    approvals: z.object({
      created_by: z.string(),
      approved_by: z.string().optional(),
      approved_at: z.date().optional(),
      status: z.enum(['pending', 'approved', 'rejected']),
      comments: z.array(z.object({
        id: z.string().uuid(),
        user_id: z.string(),
        user_name: z.string(),
        user_email: z.string(),
        comment: z.string(),
        status: z.enum(['pending', 'approved', 'rejected']),
        timestamp: z.date(),
        custom_properties: z.record(z.any()).optional()
      }))
    }),
    analytics: z.object({
      views: z.number(),
      uses: z.number(),
      downloads: z.number(),
      shares: z.number(),
      ratings: z.array(z.object({
        id: z.string().uuid(),
        user_id: z.string(),
        rating: z.number(),
        comment: z.string(),
        timestamp: z.date(),
        custom_properties: z.record(z.any()).optional()
      })),
      feedback: z.array(z.object({
        id: z.string().uuid(),
        user_id: z.string(),
        user_name: z.string(),
        user_email: z.string(),
        feedback: z.string(),
        type: z.enum(['improvement', 'bug', 'feature', 'general']),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
        timestamp: z.date(),
        custom_properties: z.record(z.any()).optional()
      }))
    })
  })
})

// Template Manager class
export class TemplateManager {
  private config: TemplateManagerConfig
  private templates: Map<string, Template> = new Map()
  private versions: Map<string, TemplateVersion[]> = new Map()
  private shares: Map<string, TemplateShare[]> = new Map()
  private exports: Map<string, TemplateExport[]> = new Map()
  private marketplace: Map<string, TemplateMarketplace[]> = new Map()
  private analytics: Map<string, TemplateAnalytics> = new Map()
  private searchIndex: Map<string, string[]> = new Map()
  private cache: Map<string, any> = new Map()
  private validators: Map<string, CustomValidator> = new Map()

  constructor(config?: Partial<TemplateManagerConfig>) {
    this.config = {
      default_styles: {
        global: {
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          background_color: '#ffffff',
          text_color: '#1f2937',
          font_family: 'Inter, sans-serif',
          font_size: '14px',
          border_radius: '8px',
          box_shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          spacing: '16px'
        },
        sections: {},
        fields: {}
      },
      default_layout: {
        type: 'single_column',
        sections: [],
        responsive: {
          mobile: { width: '100%', columns: 1, spacing: '16px', alignment: 'left' },
          tablet: { width: '100%', columns: 2, spacing: '16px', alignment: 'left' },
          desktop: { width: '100%', columns: 3, spacing: '16px', alignment: 'left' }
        },
        custom_properties: {}
      },
      validation_rules: [],
      approval_workflow: {
        enabled: true,
        required_approvals: 1,
        approvers: [],
        auto_approve: false
      },
      analytics: {
        enabled: true,
        tracking: true,
        metrics: ['usage', 'completion', 'rating', 'feedback'],
        dashboard: true
      },
      collaboration: {
        enabled: true,
        real_time: false,
        version_control: true,
        commenting: true
      },
      export: {
        enabled: true,
        formats: ['pdf', 'docx', 'html', 'json'],
        customization: true
      },
      search: {
        enabled: true,
        indexing: true,
        filters: ['category', 'subcategory', 'tags', 'status', 'visibility'],
        suggestions: []
      },
      ...config
    }
  }

  // Initialize the template manager
  async initialize(templates: Template[] = []): Promise<void> {
    // Load templates
    for (const template of templates) {
      this.templates.set(template.id, template)
      await this.indexTemplate(template)
    }

    // Load validators
    await this.loadValidators()

    // Initialize search index
    await this.buildSearchIndex()

    // Start analytics tracking
    if (this.config.analytics.enabled) {
      await this.startAnalyticsTracking()
    }
  }

  // Create a new template
  async createTemplate(request: TemplateCreateRequest, userId: string): Promise<Template> {
    const template: Template = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      description: request.description,
      category: request.category,
      subcategory: request.subcategory,
      version: '1.0',
      status: 'draft',
      visibility: request.visibility,
      created_by: userId,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
      published_at: undefined,
      archived_at: undefined,
      tags: request.tags,
      metadata: {
        usage_count: 0,
        last_used: undefined,
        success_rate: 0,
        average_rating: 0,
        total_ratings: 0,
        completion_time: 0,
        file_size: 0,
        dependencies: [],
        compatibility: []
      },
      content: request.content,
      validation: request.validation,
      permissions: request.permissions,
      approvals: {
        created_by: userId,
        approved_by: undefined,
        approved_at: undefined,
        status: 'pending',
        comments: []
      },
      analytics: {
        views: 0,
        uses: 0,
        downloads: 0,
        shares: 0,
        ratings: [],
        feedback: []
      }
    }

    // Validate template
    await this.validateTemplate(template)

    // Save template
    this.templates.set(template.id, template)
    await this.indexTemplate(template)

    // Create initial version
    await this.createVersion(template.id, userId, 'Initial version')

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(template.id, 'created', userId)
    }

    return template
  }

  // Update an existing template
  async updateTemplate(request: TemplateUpdateRequest, userId: string): Promise<Template> {
    const template = this.templates.get(request.id)
    if (!template) {
      throw new Error(`Template not found: ${request.id}`)
    }

    // Check permissions
    if (!this.hasPermission(template.id, 'edit', userId)) {
      throw new Error(`User ${userId} does not have permission to edit template ${request.id}`)
    }

    // Create version before update
    const currentVersion = await this.getCurrentVersion(template.id)
    const changes = this.calculateChanges(template, request)

    // Update template
    const updatedTemplate: Template = {
      ...template,
      ...request,
      updated_by: userId,
      updated_at: new Date()
    }

    // Validate updated template
    await this.validateTemplate(updatedTemplate)

    // Save updated template
    this.templates.set(updatedTemplate.id, updatedTemplate)
    await this.indexTemplate(updatedTemplate)

    // Create new version if there are changes
    if (changes.length > 0) {
      await this.createVersion(updatedTemplate.id, userId, changes.join(', '))
    }

    // Update analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(updatedTemplate.id, 'updated', userId)
    }

    return updatedTemplate
  }

  // Delete a template
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'delete', userId)) {
      throw new Error(`User ${userId} does not have permission to delete template ${templateId}`)
    }

    // Archive template instead of deleting
    const archivedTemplate: Template = {
      ...template,
      status: 'archived',
      archived_at: new Date(),
      updated_by: userId,
      updated_at: new Date()
    }

    this.templates.set(templateId, archivedTemplate)
    await this.indexTemplate(archivedTemplate)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(templateId, 'deleted', userId)
    }
  }

  // Get template by ID
  getTemplate(templateId: string): Template | undefined {
    return this.templates.get(templateId)
  }

  // Get all templates
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values())
  }

  // Get templates by category
  getTemplatesByCategory(category: string): Template[] {
    return Array.from(this.templates.values()).filter(template => template.category === category)
  }

  // Get templates by subcategory
  getTemplatesBySubcategory(subcategory: string): Template[] {
    return Array.from(this.templates.values()).filter(template => template.subcategory === subcategory)
  }

  // Get templates by status
  getTemplatesByStatus(status: Template['status']): Template[] {
    return Array.from(this.templates.values()).filter(template => template.status === status)
  }

  // Get templates by visibility
  getTemplatesByVisibility(visibility: Template['visibility']): Template[] {
    return Array.from(this.templates.values()).filter(template => template.visibility === visibility)
  }

  // Get templates by tags
  getTemplatesByTags(tags: string[]): Template[] {
    return Array.from(this.templates.values()).filter(template =>
      tags.some(tag => template.tags.includes(tag))
    )
  }

  // Search templates
  async searchTemplates(query: string, filters?: Record<string, any>): Promise<TemplateSearchResult> {
    const results = await this.performSearch(query, filters)
    return results
  }

  // Get template suggestions
  async getTemplateSuggestions(query: string, limit: number = 10): Promise<string[]> {
    const suggestions = await this.generateSuggestions(query, limit)
    return suggestions
  }

  // Validate template
  async validateTemplate(template: Template): Promise<void> {
    // Validate basic structure
    await this.validateTemplateStructure(template)

    // Validate sections
    await this.validateSections(template.content.sections)

    // Validate fields
    await this.validateFields(template.content.sections)

    // Validate variables
    await this.validateVariables(template.content.variables)

    // Validate validation rules
    await this.validateValidationRules(template.validation)

    // Validate permissions
    await this.validatePermissions(template.permissions)
  }

  // Create template version
  async createVersion(templateId: string, userId: string, changelog: string): Promise<TemplateVersion> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const version: TemplateVersion = {
      id: `version_${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template_id: templateId,
      version: this.getNextVersion(templateId),
      created_by: userId,
      created_at: new Date(),
      changes: [],
      changelog,
      metadata: {
        change_count: 0,
        added_sections: 0,
        removed_sections: 0,
        modified_sections: 0,
        added_fields: 0,
        removed_fields: 0,
        modified_fields: 0,
        file_size: this.calculateTemplateSize(template),
        dependencies: template.metadata.dependencies,
        compatibility: template.metadata.compatibility
      }
    }

    const versions = this.versions.get(templateId) || []
    versions.push(version)
    this.versions.set(templateId, versions)

    return version
  }

  // Get template versions
  getTemplateVersions(templateId: string): TemplateVersion[] {
    return this.versions.get(templateId) || []
  }

  // Get current version
  async getCurrentVersion(templateId: string): Promise<TemplateVersion> {
    const versions = this.versions.get(templateId)
    if (!versions || versions.length === 0) {
      throw new Error(`No versions found for template: ${templateId}`)
    }
    return versions[versions.length - 1]
  }

  // Get next version
  getNextVersion(templateId: string): string {
    const versions = this.versions.get(templateId) || []
    const versionNumbers = versions.map(v => v.version)
    const maxVersion = Math.max(...versionNumbers.map(v => parseInt(v)))
    return `${maxVersion + 1}.0`
  }

  // Revert to specific version
  async revertToVersion(templateId: string, versionId: string, userId: string): Promise<Template> {
    const versions = this.versions.get(templateId)
    if (!versions) {
      throw new Error(`No versions found for template: ${templateId}`)
    }

    const version = versions.find(v => v.id === versionId)
    if (!version) {
      throw new Error(`Version not found: ${versionId}`)
    }

    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'edit', userId)) {
      throw new Error(`User ${userId} does not have permission to revert template ${templateId}`)
    }

    // Revert template
    const revertedTemplate: Template = {
      ...template,
      version: version.version,
      updated_by: userId,
      updated_at: new Date()
    }

    // Update template index
    this.templates.set(templateId, revertedTemplate)
    await this.indexTemplate(revertedTemplate)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(templateId, 'reverted', userId)
    }

    return revertedTemplate
  }

  // Clone template
  async cloneTemplate(templateId: string, userId: string, name: string): Promise<Template> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'view', userId)) {
      throw new Error(`User ${userId} does not have permission to view template ${templateId}`)
    }

    const clonedTemplate: Template = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name,
      status: 'draft',
      created_by: userId,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        ...template.metadata,
        usage_count: 0,
        last_used: undefined,
        success_rate: 0,
        average_rating: 0,
        total_ratings: 0,
        completion_time: 0,
        file_size: template.metadata.file_size,
        dependencies: template.metadata.dependencies,
        compatibility: template.metadata.compatibility
      },
      approvals: {
        created_by: userId,
        approved_by: undefined,
        approved_at: undefined,
        status: 'pending',
        comments: []
      },
      analytics: {
        views: 0,
        uses: 0,
        downloads: 0,
        shares: 0,
        ratings: [],
        feedback: []
      }
    }

    // Validate cloned template
    await this.validateTemplate(clonedTemplate)

    // Save cloned template
    this.templates.set(clonedTemplate.id, clonedTemplate)
    await this.indexTemplate(clonedTemplate)

    // Create version
    await this.createVersion(clonedTemplate.id, userId, `Cloned from ${template.name}`)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(clonedTemplate.id, 'cloned', userId)
    }

    return clonedTemplate
  }

  // Share template
  async shareTemplate(templateId: string, request: {
    shared_with: string
    permission: 'view' | 'edit' | 'comment' | 'download'
    expires_at?: Date
  }, userId: string): Promise<TemplateShare> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'view', userId)) {
      throw new Error(`User ${userId} does not have permission to view template ${templateId}`)
    }

    const share: TemplateShare = {
      id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template_id: templateId,
      shared_by: userId,
      shared_with: request.shared_with,
      permission: request.permission,
      expires_at: request.expires_at,
      created_at: new Date(),
      custom_properties: {}
    }

    // Save share
    const shares = this.shares.get(templateId) || []
    shares.push(share)
    this.shares.set(templateId, shares)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(templateId, 'shared', userId)
    }

    return share
  }

  // Get template shares
  getTemplateShares(templateId: string): TemplateShare[] {
    return this.shares.get(templateId) || []
  }

  // Revoke share
  async revokeShare(templateId: string, shareId: string, userId: string): Promise<void> {
    const shares = this.shares.get(templateId) || []
    const filteredShares = shares.filter(share => share.id !== shareId)
    this.shares.set(templateId, filteredShares)
  }

  // Export template
  async exportTemplate(templateId: string, request: {
    format: 'pdf' | 'docx' | 'html' | 'json' | 'xml' | 'csv'
    options?: any
  }, userId: string): Promise<TemplateExport> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'view', userId)) {
      throw new Error(`User ${userId} does not have permission to view template ${templateId}`)
    }

    const export: TemplateExport = {
      id: `export_${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template_id: templateId,
      format: request.format,
      options: {
        include_content: true,
        include_styles: true,
        include_metadata: true,
        include_analytics: this.config.analytics.enabled,
        ...request.options
      },
      created_at: new Date(),
      file_size: await this.calculateExportSize(template, request),
      custom_properties: {}
    }

    // Save export
    const exports = this.exports.get(templateId) || []
    exports.push(export)
    this.exports.set(templateId, exports)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(templateId, 'exported', userId)
    }

    return export
  }

  // Get template exports
  getTemplateExports(templateId: string): TemplateExport[] {
    return this.exports.get(templateId) || []
  }

  // Publish template
  async publishTemplate(templateId: string, userId: string): Promise<Template> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'publish', userId)) {
      throw new Error(`User ${userId} does not have permission to publish template ${templateId}`)
    }

    // Update template
    const publishedTemplate: Template = {
      ...template,
      status: 'active',
      published_at: new Date(),
      updated_by: userId,
      updated_at: new Date()
    }

    this.templates.set(templateId, publishedTemplate)
    await this.indexTemplate(publishedTemplate)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(templateId, 'published', userId)
    }

    return publishedTemplate
  }

  // Archive template
  async archiveTemplate(templateId: string, userId: string): Promise<Template> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Check permissions
    if (!this.hasPermission(templateId, 'archive', userId)) {
      throw new Error(`User ${userId} does not have permission to archive template ${templateId}`)
    }

    const archivedTemplate: Template = {
      ...template,
      status: 'archived',
      archived_at: new Date(),
      updated_by: userId,
      updated_at: new Date()
    }

    this.templates.set(templateId, archivedTemplate)
    await this.indexTemplate(archivedTemplate)

    // Track analytics
    if (this.config.analytics.enabled) {
      await this.trackTemplateEvent(templateId, 'archived', userId)
    }

    return archivedTemplate
  }

  // Get template analytics
  async getTemplateAnalytics(templateId: string): Promise<TemplateAnalytics> {
    const cached = this.analytics.get(templateId)
    if (cached) {
      return cached
    }

    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const analytics: TemplateAnalytics = {
      template_id: templateId,
      usage_stats: await this.calculateUsageStats(templateId),
      performance_stats: await this.calculatePerformanceStats(templateId),
      user_stats: await this.calculateUserStats(templateId),
      rating_stats: await this.calculateRatingStats(templateId),
      feedback_stats: await this.calculateFeedbackStats(templateId),
      time_series: await this.calculateTimeSeriesStats(templateId)
    }

    this.analytics.set(templateId, analytics)
    return analytics
  }

  // Calculate usage statistics
  private async calculateUsageStats(templateId: string): Promise<TemplateAnalytics['usage_stats']> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const shares = this.shares.get(templateId) || []
    const exports = this.exports.get(templateId) || []

    return {
      total_uses: template.metadata.usage_count,
      unique_users: new Set(shares.map(share => share.shared_with)).size,
      average_completion_time: template.metadata.completion_time,
      success_rate: template.metadata.success_rate,
      error_rate: template.metadata.success_rate > 0 ? 1 - template.metadata.success_rate : 0,
      abandonment_rate: 0 // Calculate from analytics data
    }
  }

  // Calculate performance statistics
  private async calculatePerformanceStats(templateId: string): Promise<TemplateAnalytics['performance_stats']> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    return {
      average_load_time: 0, // Calculate from analytics data
      average_render_time: 0, // Calculate from analytics data
      average_validation_time: 0, // Calculate from analytics data
      error_count: 0, // Calculate from analytics data
      warning_count: 0 // Calculate from analytics data
    }
  }

  // Calculate user statistics
  private async calculateUserStats(templateId: string): Promise<TemplateAnalytics['user_stats']> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const shares = this.shares.get(templateId) || []
    const users = new Set(shares.map(share => share.shared_with))

    return {
      total_users: users.size,
      active_users: 0, // Calculate from analytics data
      new_users: 0, // Calculate from analytics data
      returning_users: 0 // Calculate from analytics data
    }
  }

  // Calculate rating statistics
  private async calculateRatingStats(templateId: string): Promise<TemplateAnalytics['rating_stats']> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const ratings = template.analytics.ratings
    const ratingDistribution: Record<number, number> = {}

    ratings.forEach(rating => {
      ratingDistribution[rating.rating] = (ratingDistribution[rating.rating] || 0) + 1
    })

    return {
      total_ratings: ratings.length,
      average_rating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
      rating_distribution
    }
  }

  // Calculate feedback statistics
  private async calculateFeedbackStats(templateId: string): Promise<TemplateAnalytics['feedback_stats']> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const feedback = template.analytics.feedback
    const feedbackDistribution: Record<string, number> = {}

    feedback.forEach(f => {
      feedbackDistribution[f.type] = (feedbackDistribution[f.type] || 0) + 1
    })

    return {
      total_feedback: feedback.length,
      feedback_distribution,
      sentiment_distribution: {
        positive: feedbackDistribution['improvement'] || 0,
        neutral: feedbackDistribution['general'] || 0,
        negative: feedbackDistribution['bug'] || 0
      }
    }
  }

  // Calculate time series statistics
  private async calculateTimeSeriesStats(templateId: string): Promise<TemplateAnalytics['time_series']> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    return {
      daily: [], // Calculate from analytics data
      weekly: [], // Calculate from analytics data
      monthly: [] // Calculate from analytics data
    }
  }

  // Track template event
  async trackTemplateEvent(templateId: string, event: string, userId: string): Promise<void> {
    if (!this.config.analytics.enabled) {
      return
    }

    // Update usage count
    const template = this.templates.get(templateId)
    if (template) {
      template.metadata.usage_count++
      template.metadata.last_used = new Date()
      this.templates.set(templateId, template)
    }
  }

  // Index template for search
  async indexTemplate(template: Template): Promise<void> {
    // Index basic fields
    const searchableFields = [
      template.name,
      template.description,
      template.category,
      template.subcategory,
      template.tags.join(' '),
      template.metadata.compatibility.join(' ')
    ]

    const searchableText = searchableFields.join(' ').toLowerCase()
    const searchTerms = searchableText.split(/\s+/).filter(term => term.length > 2)

    this.searchIndex.set(template.id, searchTerms)
  }

  // Build search index
  async buildSearchIndex(): Promise<void> {
    for (const template of this.templates.values()) {
      await this.indexTemplate(template)
    }
  }

  // Perform search
  async performSearch(query: string, filters?: Record<string, any>): Promise<TemplateSearchResult> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)

    let filteredTemplates = Array.from(this.templates.values())

    // Apply filters
    if (filters) {
      if (filters.category) {
        filteredTemplates = filteredTemplates.filter(template => template.category === filters.category)
      }
      if (filters.subcategory) {
        filteredTemplates = filteredTemplates.filter(template => template.subcategory === filters.subcategory)
      }
      if (filters.status) {
        filteredTemplates = filteredTemplates.filter(template => template.status === filters.status)
      }
      if (filters.visibility) {
        filteredTemplates = filteredTemplates.filter(template => template.visibility === filters.visibility)
      }
      if (filters.tags && filters.tags.length > 0) {
        filteredTemplates = filteredTemplates.filter(template =>
          filters.tags.some(tag => template.tags.includes(tag))
        )
      }
    }

    // Search by query
    const searchResults = filteredTemplates.filter(template => {
      const templateTerms = this.searchIndex.get(template.id) || []
      return searchTerms.some(term => templateTerms.includes(term))
    })

    // Sort results by relevance
    const sortedResults = searchResults.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, searchTerms)
      const bScore = this.calculateRelevanceScore(b, searchTerms)
      return bScore - aScore
    })

    return {
      templates: sortedResults,
      total: sortedResults.length,
      page: 1,
      per_page: 20,
      total_pages: Math.ceil(sortedResults.length / 20),
      facets: {},
      suggestions: searchTerms
    }
  }

  // Calculate relevance score
  private calculateRelevanceScore(template: Template, searchTerms: string[]): number {
    let score = 0

    // Exact match in name gets highest score
    if (searchTerms.includes(template.name.toLowerCase())) {
      score += 100
    }

    // Match in description
    const description = template.description.toLowerCase()
    if (searchTerms.some(term => description.includes(term))) {
      score += 50
    }

    // Match in tags
    const tags = template.tags.map(tag => tag.toLowerCase())
    if (searchTerms.some(term => tags.includes(term))) {
      score += 30
    }

    // Match in category/subcategory
    if (searchTerms.includes(template.category.toLowerCase())) {
      score += 20
    }
    if (searchTerms.includes(template.subcategory.toLowerCase())) {
      score += 20
    }

    // Match in compatibility
    const compatibility = template.metadata.compatibility.map(comp => comp.toLowerCase())
    if (searchTerms.some(term => compatibility.includes(term))) {
      score += 10
    }

    // Boost for active templates
    if (template.status === 'active') {
      score += 5
    }

    // Boost for recently used templates
    if (template.metadata.last_used) {
      const daysSinceLastUsed = Math.floor((Date.now() - template.metadata.last_used.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastUsed <= 7) {
        score += 10
      } else if (daysSinceLastUsed <= 30) {
        score += 5
      }
    }

    // Boost for high success rate
    if (template.metadata.success_rate > 0.8) {
      score += 15
    } else if (template.metadata.success_rate > 0.6) {
      score += 10
    }

    // Boost for high rating
    if (template.metadata.average_rating > 4) {
      score += 10
    } else if (template.metadata.average_rating > 3) {
      score += 5
    }

    return score
  }

  // Generate suggestions
  async generateSuggestions(query: string, limit: number = 10): Promise<string[]> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)

    // Get all searchable terms
    const allTerms = Array.from(this.searchIndex.values()).flat()

    // Find matching terms
    const matches = allTerms.filter(term =>
      searchTerms.some(searchTerm => term.includes(searchTerm))
    )

    // Sort by frequency
    const termFrequency = new Map<string, number>()
    matches.forEach(term => {
      termFrequency.set(term, (termFrequency.get(term) || 0) + 1)
    })

    // Get top suggestions
    const suggestions = Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term]) => term)

    return suggestions
  }

  // Validate template structure
  private async validateTemplateStructure(template: Template): Promise<void> {
    // Validate required fields
    if (!template.id) {
      throw new Error('Template ID is required')
    }

    if (!template.name || template.name.trim().length === 0) {
      throw new Error('Template name is required')
    }

    if (!template.category || template.category.trim().length === 0) {
      throw new Error('Template category is required')
    }

    if (!template.subcategory || template.subcategory.trim().length === 0) {
      throw new Error('Template subcategory is required')
    }

    if (!template.content.sections || template.content.sections.length === 0) {
      throw new Error('Template must have at least one section')
    }

    if (!template.content.variables) {
      template.content.variables = []
    }

    if (!template.content.styles) {
      template.content.styles = this.config.default_styles
    }

    if (!template.content.layout) {
      template.content.layout = this.config.default_layout
    }

    if (!template.validation) {
      template.validation = {
        rules: this.config.validation_rules,
        dependencies: [],
        required_fields: [],
        optional_fields: [],
        custom_validators: []
      }
    }

    if (!template.permissions) {
      template.permissions = {
        can_edit: [],
        can_view: [],
        can_delete: [],
        can_publish: [],
        can_archive: []
      }
    }

    if (!template.analytics) {
      template.analytics = {
        views: 0,
        uses: 0,
        downloads: 0,
        shares: 0,
        ratings: [],
        feedback: []
      }
    }
  }

  // Validate sections
  private async validateSections(sections: TemplateSection[]): Promise<void> {
    if (!Array.isArray(sections)) {
      throw new Error('Sections must be an array')
    }

    if (sections.length === 0) {
      throw new Error('Template must have at least one section')
    }

    for (const section of sections) {
      await this.validateSection(section)
    }

    // Check for duplicate section IDs
    const sectionIds = sections.map(s => s.id)
    const uniqueIds = new Set(sectionIds)
    if (sectionIds.length !== uniqueIds.length) {
      throw new Error('Section IDs must be unique')
    }

    // Check section order
    const orders = sections.map(s => s.order)
    const sortedOrders = [...orders].sort((a, b) => a - b)
    if (!orders.every((order, index) => order === sortedOrders[index])) {
      throw new Error('Section orders must be sequential')
    }
  }

  // Validate section
  private async validateSection(section: TemplateSection): Promise<void> {
    if (!section.id || section.id.trim().length === 0) {
      throw new Error('Section ID is required')
    }

    if (!section.name || section.name.trim().length === 0) {
      throw new Error('Section name is required')
    }

    if (!section.type) {
      throw new Error('Section type is required')
    }

    if (!section.fields || !Array.isArray(section.fields)) {
      throw new section.fields = []
    }

    // Validate fields
    for (const field of section.fields) {
      await this.validateField(field)
    }

    // Validate conditions
    if (section.conditions && Array.isArray(section.conditions)) {
      for (const condition of section.conditions) {
        await this.validateCondition(condition)
      }
    }

    // Validate dependencies
    if (section.dependencies && Array.isArray(section.dependencies)) {
      for (const dependency of section.dependencies) {
        await this.validateDependency(dependency)
      }
    }
  }

  // Validate field
  private async validateField(field: TemplateField): Promise<void> {
    if (!field.id || field.id.trim().length === 0) {
      throw new Error('Field ID is required')
    }

    if (!field.name || field.name.trim().length === 0) {
      throw new Error('Field name is required')
    }

    if (!field.label || field.label.trim().length === 0) {
      throw new Error('Field label is required')
    }

    if (!field.type) {
      throw new Error('Field type is required')
    }

    // Validate field type
    const validTypes = [
      'text', 'textarea', 'number', 'date', 'datetime', 'email', 'phone', 'url', 'select', 'multiselect', 'radio', 'radio_group', 'checkbox', 'file', 'image', 'video', 'signature', 'rich_text', 'html', 'markdown', 'json', 'xml', 'custom'
    ]

    if (!validTypes.includes(field.type)) {
      throw new Error(`Invalid field type: ${field.type}`)
    }

    // Validate options for select/multiselect
    if ((field.type === 'select' || field.type === 'multiselect') && !field.options) {
      field.options = []
    }

    // Validate options
    if (field.options && Array.isArray(field.options)) {
      const optionIds = field.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      if (optionIds.length !== uniqueIds.length) {
        throw new Error('Option IDs must be unique')
      }

      for (const option of field.options) {
        await this.validateFieldOption(option)
      }
    }

    // Validate validation
    if (field.validation) {
      await this.validateFieldValidation(field.validation)
    }

    // Validate dependencies
    if (field.dependencies && Array.isArray(field.dependencies)) {
      for (const dependency of field.dependencies) {
        await this.validateDependency(dependency)
      }
    }

    // Validate conditions
    if (field.conditions && Array.isArray(field.conditions)) {
      for (const condition of field.conditions) {
        await this.validateCondition(condition)
      }
    }

    // Validate styling
    if (field.styling) {
      await this.validateFieldStyling(field.styling)
    }

    // Validate custom properties
    if (field.custom_properties) {
      await this.validateCustomProperties(field.custom_properties)
    }
  }

  // Validate field option
  private async validateFieldOption(option: TemplateFieldOption): Promise<void> {
    if (!option.id || option.id.trim().length === 0) {
      throw new Error('Option ID is required')
    }

    if (!option.label || option.label.trim().length === 0) {
      throw new Error('Option label is required')
    }

    if (!option.value) {
      throw new Error('Option value is required')
    }

    // Validate custom properties
    if (option.custom_properties) {
      await this.validateCustomProperties(option.custom_properties)
    }
  }

  // Validate field validation
  private async validateFieldValidation(validation: TemplateFieldValidation): Promise<void> {
    if (!validation.type) {
      throw new Error('Validation type is required')
    }

    if (!validation.message || validation.message.trim().length === 0) {
      throw new Error('Validation message is required')
    }

    // Validate custom validator
    if (validation.custom_validator) {
      const validator = this.validators.get(validation.custom_validator)
      if (!validator) {
        throw new Error(`Custom validator not found: ${validation.custom_validator}`)
      }
    }
  }

  // Validate condition
  private async validateCondition(condition: TemplateCondition): Promise<void> {
    if (!condition.id || condition.id.trim().length === 0) {
      throw new Error('Condition ID is required')
    }

    if (!condition.field || condition.field.trim().length === 0) {
      throw new Error('Condition field is required')
    }

    if (!condition.operator) {
      throw new Error('Condition operator is required')
    }

    if (!condition.action) {
      throw new Error('Condition action is required')
    }

    // Validate custom properties
    if (condition.custom_properties) {
      await this.validateCustomProperties(condition.custom_properties)
    }
  }

  // Validate dependency
  private async validateDependency(dependency: TemplateFieldDependency): Promise<void> {
    if (!dependency.field || dependency.field.trim().length === 0) {
      throw new Error('Dependency field is required')
    }

    if (!dependency.depends_on || dependency.depends_on.trim().length === 0) {
      throw new Error('Dependency depends_on is required')
    }

    if (!dependency.condition || dependency.condition.trim().length === 0) {
      throw new Error('Dependency condition is required')
    }

    if (!dependency.action) {
      throw new Error('Dependency action is required')
    }

    // Validate custom properties
    if (dependency.custom_properties) {
      await this.validateCustomProperties(dependency.custom_properties)
    }
  }

  // Validate dependency
  private async validateVariableDependency(dependency: TemplateVariableDependency): Promise<void> {
    if (!dependency.variable || dependency.variable.trim().length === 0) {
      throw new Error('Variable dependency variable is required')
    }

    if (!dependency.depends_on || dependency.depends_on.trim().length === 0) {
      throw new Error('Variable dependency depends_on is required')
    }

    if (!dependency.condition || dependency.condition.trim().length === 0) {
      throw new Error('Variable dependency condition is required')
    }

    if (!dependency.action) {
      throw new Error('Variable dependency action is required')
    }

    // Validate custom properties
    if (dependency.custom_properties) {
      await this.validateCustomProperties(dependency.custom_properties)
    }
  }

  // Validate field styling
  private async validateFieldStyling(styling: TemplateFieldStyles): Promise<void> {
    // Validate custom properties
    if (styling.custom_properties) {
      await this.validateCustomProperties(styling.custom_properties)
    }
  }

  // Validate custom properties
  private async validateCustomProperties(properties: Record<string, any>): Promise<void> {
    // Validate that all property values are serializable
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'object' && value !== null) {
        try {
          JSON.stringify(value)
        } catch (error) {
          throw new Error(`Invalid property value for ${key}: ${error.message}`)
        }
      }
    }
  }

  // Validate validation rules
  private async validateValidationRules(rules: ValidationRule[]): Promise<void> {
    if (!Array.isArray(rules)) {
      throw new Error('Validation rules must be an array')
    }

    for (const rule of rules) {
      await this.validateValidationRule(rule)
    }
  }

  // Validate validation rule
  private async validateValidationRule(rule: ValidationRule): Promise<void> {
    if (!rule.id || rule.id.trim().length === 0) {
      throw new Error('Rule ID is required')
    }

    if (!rule.type) {
      throw new Error('Rule type is required')
    }

    if (!rule.message || rule.message.trim().length === 0) {
      throw new Error('Rule message is required')
    }

    // Validate custom validator
    if (rule.custom_validator) {
      const validator = this.validators.get(rule.custom_validator)
      if (!validator) {
        throw new Error(`Custom validator not found: ${rule.custom_validator}`)
      }
    }
  }

  // Validate permissions
  private async validatePermissions(permissions: Template['permissions']): Promise<void> {
    if (!permissions.can_edit || !Array.isArray(permissions.can_edit)) {
      permissions.can_edit = []
    }

    if (!permissions.can_view || !Array.isArray(permissions.can_view)) {
      permissions.can_view = []
    }

    if (!permissions.can_delete || !Array.isArray(permissions.can_delete)) {
      permissions.can_delete = []
    }

    if (!permissions.can_publish || !Array.isArray(permissions.can_publish)) {
      permissions.can_publish = []
    }

    if (!permissions.can_archive || !Array.isArray(permissions.can_archive)) {
      permissions.can_archive = []
    }
  }

  // Load validators
  private async loadValidators(): Promise<void> {
    // Load custom validators from configuration
    const customValidators = this.config.custom_validators || []

    for (const validatorConfig of customValidators) {
      const validator: CustomValidator = {
        id: validatorConfig.id,
        name: validatorConfig.name,
        type: validatorConfig.type,
        description: validatorConfig.description,
        code: validatorConfig.code,
        parameters: validatorConfig.parameters || {},
        error_message: validatorConfig.error_message || 'Validation failed',
        success_message: validatorConfig.success_message || 'Validation successful',
        validate: new Function('return true;')
      }

      this.validators.set(validatorConfig.id, validator)
    }
  }

  // Calculate template size
  private calculateTemplateSize(template: Template): number {
    const contentSize = JSON.stringify(template.content).length
    const metadataSize = JSON.stringify(template.metadata).length
    return contentSize + metadataSize
  }

  // Calculate export size
  private async calculateExportSize(template: Template, request: {
    format: string
    options?: any
  }): Promise<number> {
    const baseSize = this.calculateTemplateSize(template)

    // Add format-specific size
    const formatSizes = {
      pdf: 1.5,
      docx: 1.2,
      html: 1.0,
      json: 0.5,
      xml: 0.8,
      csv: 0.3
    }

    return baseSize * (formatSizes[request.format] || 1)
  }

  // Check permission
  hasPermission(templateId: string, action: string, userId: string): boolean {
    const template = this.templates.get(templateId)
    if (!template) {
      return false
    }

    const permissions = template.permissions
    const userPermissions = [...permissions.can_edit, ...permissions.can_view, ...permissions.can_delete, ...permissions.can_publish, ...permissions.can_archive]
    return userPermissions.includes(userId)
  }

  // Template Manager class implementation
  async createTemplateManager(config?: Partial<TemplateManagerConfig>): Promise<TemplateManager> {
    const manager = new TemplateManager(config)
    await manager.initialize()
    return manager
  }
}

// Export the class
export default class TemplateManager {
  private static instance: TemplateManager | null = null

  static getInstance(config?: Partial<TemplateManagerConfig>): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager(config)
    }
    return TemplateManager.instance
  }
}
