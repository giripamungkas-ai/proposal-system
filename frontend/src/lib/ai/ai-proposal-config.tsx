import { z } from 'zod'

// Proposal-Specific AI Configuration Schema
export const ProposalAIConfigSchema = z.object({
  // Provider Configuration
  providers: z.object({
    openai: z.object({
      apiKey: z.string().min(1, 'OpenAI API key is required'),
      keyName: z.string().default('proposalOpenAI'),
      model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']).default('gpt-4-turbo'),
      maxTokens: z.number().min(1000).max(4000).default(4000),
      temperature: z.number().min(0).max(2).default(0.7),
      topP: z.number().min(0).max(1).default(1),
      frequencyPenalty: z.number().min(-2).max(2).default(0),
      presencePenalty: z.number().min(-2).max(2).default(0),
      weight: z.number().min(0).max(1).default(0.8) // Higher weight for proposal tasks
    }),
    glm: z.object({
      apiKey: z.string().min(1, 'GLM API key is required'),
      keyName: z.string().default('proposal'),
      model: z.enum(['glm-4', 'glm-4-6', 'glm-3-turbo']).default('glm-4-6'),
      maxTokens: z.number().min(500).max(3500).default(3500),
      temperature: z.number().min(0).max(2).default(0.6),
      topP: z.number().min(0).max(1).default(0.8),
      weight: z.number().min(0).max(1).default(0.2) // Lower weight for proposal tasks
    })
  }),

  // Task-Specific Configuration
  tasks: z.object({
    parseRFP: z.object({
      primaryProvider: z.enum(['openai', 'glm', 'auto']).default('openai'),
      fallbackProvider: z.enum(['openai', 'glm']).default('glm'),
      temperature: z.number().default(0.3), // Lower temperature for structured data extraction
      maxTokens: z.number().default(2000), // Lower tokens for parsing
      retryAttempts: z.number().default(3)
    }),

    generateProposal: z.object({
      primaryProvider: z.enum(['openai', 'glm', 'auto']).default('openai'),
      fallbackProvider: z.enum(['openai', 'glm']).default('glm'),
      temperature: z.number().default(0.7), // Balanced temperature for creative writing
      maxTokens: z.number().default(3500), // Higher tokens for comprehensive proposals
      systemPrompt: z.string().default(`You are a professional proposal writer for MDMEDIA Strategic Proposal Management System.
        Generate clear, structured, and persuasive proposals with:
        - Professional business language (Indonesian + English)
        - Clear executive summaries
        - Detailed technical specifications
        - Comprehensive timeline and budget breakdowns
        - Risk assessment and mitigation strategies
        Ensure all proposals follow MDMEDIA branding guidelines and industry best practices.`),
      retryAttempts: z.number().default(5) // More retries for critical proposal generation
    }),

    checkCompliance: z.object({
      primaryProvider: z.enum(['openai', 'glm', 'auto']).default('openai'),
      fallbackProvider: z.enum(['openai', 'glm']).default('glm'),
      temperature: z.number().default(0.2), // Low temperature for compliance checking
      maxTokens: z.number().default(2500),
      systemPrompt: z.string().default(`You are a compliance expert for MDMEDIA Strategic Proposal Management System.
        Compare proposals against RFP requirements and provide:
        - Detailed compliance score (0-100)
        - Matched requirements analysis
        - Missing requirements identification
        - Actionable recommendations
        - Risk assessment
        Use structured, analytical language with specific metrics and evidence.`),
      retryAttempts: z.number().default(3)
    }),

    generateWeeklyReport: z.object({
      primaryProvider: z.enum(['openai', 'glm', 'auto']).default('openai'),
      fallbackProvider: z.enum(['openai', 'glm']).default('glm'),
      temperature: z.number().default(0.4),
      maxTokens: z.number().default(3000),
      systemPrompt: z.string().default(`You are a business intelligence analyst for MDMEDIA Strategic Proposal Management System.
        Generate comprehensive weekly performance reports including:
        - Executive summary dashboard metrics
        - Proposal pipeline statistics
        - Team performance analytics
        - Conversion rates and trends
        - Risk indicators and recommendations
        Use clear, data-driven insights with visualizations in mind.`),
      retryAttempts: z.number().default(2)
    })
  }),

  // Fallback Strategy
  fallback: z.object({
    strategy: z.enum(['immediate', 'wait', 'exponential']).default('immediate'),
    maxRetries: z.number().default(3),
    backoffDelay: z.number().default(1000), // milliseconds
    circuitBreaker: z.object({
      threshold: z.number().default(5), // Failures before circuit breaker
      timeout: z.number().default(60000), // milliseconds before opening circuit
      resetTimeout: z.number().default(300000) // milliseconds before reset
    })
  }),

  // Quality Assurance
  quality: z.object({
    minConfidence: z.number().default(0.8), // Minimum confidence score to accept result
    maxTokens: z.number().default(4000), // Maximum tokens allowed per request
    responseTimeout: z.number().default(30000), // Maximum response time in milliseconds
    validation: z.object({
      strictJSON: z.boolean().default(true), // Require valid JSON responses
      minLength: z.number().default(100), // Minimum response length
      maxLength: z.number().default(10000) // Maximum response length
    })
  }),

  // Monitoring and Logging
  monitoring: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    logRequests: z.boolean().default(true),
    logResponses: z.boolean().default(true),
    logApiKeyNames: z.boolean().default(true),
    metrics: z.object({
      trackLatency: z.boolean().default(true),
      trackTokens: z.boolean().default(true),
      trackProviderUsage: z.boolean().default(true),
      trackSuccessRate: z.boolean().default(true)
    })
  }),

  // Integration Settings
  integration: z.object({
    database: z.object({
      saveResults: z.boolean().default(true),
      saveMetadata: z.boolean().default(true),
      saveUsageStats: z.boolean().default(true),
      retentionDays: z.number().default(90) // Days to keep logs
    }),
    notifications: z.object({
      onSuccess: z.boolean().default(true),
      onFailure: z.boolean().default(true),
      webhookUrl: z.string().optional(), // Webhook for notifications
      emailAlerts: z.boolean().default(false)
    })
  })
})

export type ProposalAIConfig = z.infer<typeof ProposalAIConfigSchema>

// Default Configuration
export const DEFAULT_PROPOSAL_AI_CONFIG: ProposalAIConfig = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      keyName: process.env.OPENAI_KEY_NAME || 'proposalOpenAI',
      model: 'gpt-4-turbo',
      maxTokens: 4000,
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      weight: 0.8
    },
    glm: {
      apiKey: process.env.GLM_API_KEY || '',
      keyName: process.env.GLM_KEY_NAME || 'proposal',
      model: 'glm-4-6',
      maxTokens: 3500,
      temperature: 0.6,
      topP: 0.8,
      weight: 0.2
    }
  },

  tasks: {
    parseRFP: {
      primaryProvider: 'openai',
      fallbackProvider: 'glm',
      temperature: 0.3,
      maxTokens: 2000,
      retryAttempts: 3
    },

    generateProposal: {
      primaryProvider: 'openai',
      fallbackProvider: 'glm',
      temperature: 0.7,
      maxTokens: 3500,
      systemPrompt: `You are a professional proposal writer for MDMEDIA Strategic Proposal Management System.
        Generate clear, structured, and persuasive proposals with:
        - Professional business language (Indonesian + English)
        - Clear executive summaries
        - Detailed technical specifications
        - Comprehensive timeline and budget breakdowns
        - Risk assessment and mitigation strategies
        Ensure all proposals follow MDMMEDIA branding guidelines and industry best practices.`,
      retryAttempts: 5
    },

    checkCompliance: {
      primaryProvider: 'openai',
      fallbackProvider: 'glm',
      temperature: 0.2,
      maxTokens: 2500,
      systemPrompt: `You are a compliance expert for MDMEDIA Strategic Proposal Management System.
        Compare proposals against RFP requirements and provide:
        - Detailed compliance score (0-100)
        - Matched requirements analysis
        - Missing requirements identification
        - Actionable recommendations
        - Risk assessment
        Use structured, analytical language with specific metrics and evidence.`,
      retryAttempts: 3
    },

    generateWeeklyReport: {
      primaryProvider: 'openai',
      fallbackProvider: 'glm',
      temperature: 0.4,
      maxTokens: 3000,
      systemPrompt: `You are a business intelligence analyst for MDMEDIA Strategic Proposal Management System.
        Generate comprehensive weekly performance reports including:
        - Executive summary dashboard metrics
        - Proposal pipeline statistics
        - Team performance analytics
        - Conversion rates and trends
        - Risk indicators and recommendations
        Use clear, data-driven insights with visualizations in mind.`,
      retryAttempts: 2
    }
  },

  fallback: {
    strategy: 'immediate',
    maxRetries: 3,
    backoffDelay: 1000,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
      resetTimeout: 300000
    }
  },

  quality: {
    minConfidence: 0.8,
    maxTokens: 4000,
    responseTimeout: 30000,
    validation: {
      strictJSON: true,
      minLength: 100,
      maxLength: 10000
    }
  },

  monitoring: {
    logLevel: 'info',
    logRequests: true,
    logResponses: true,
    logApiKeyNames: true,
    metrics: {
      trackLatency: true,
      trackTokens: true,
      trackProviderUsage: true,
      trackSuccessRate: true
    }
  },

  integration: {
    database: {
      saveResults: true,
      saveMetadata: true,
      saveUsageStats: true,
      retentionDays: 90
    },
    notifications: {
      onSuccess: true,
      onFailure: true,
      emailAlerts: false
    }
  }
}

// Configuration Validation
export function validateProposalAIConfig(config: ProposalAIConfig): boolean {
  try {
    ProposalAIConfigSchema.parse(config)
    return true
  } catch (error) {
    console.error('Invalid AI configuration:', error)
    return false
  }
}

// Configuration Loader
export function loadProposalAIConfig(): ProposalAIConfig {
  return DEFAULT_PROPOSAL_AI_CONFIG
}

// Configuration Validator
export class ProposalAIConfigValidator {
  static validate(config: ProposalAIConfig): { valid: boolean; errors: string[] } {
    try {
      ProposalAIConfigSchema.parse(config)
      return { valid: true, errors: [] }
    } catch (error) {
      return {
        valid: false,
        errors: error instanceof Error ? [error.message] : ['Invalid configuration']
      }
    }
  }

  static validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      errors.push('OpenAI API key is required')
    }

    // Check GLM configuration
    if (!process.env.GLM_API_KEY) {
      errors.push('GLM API key is required')
    }

    // Check required environment variables
    const requiredVars = [
      'OPENAI_KEY_NAME',
      'GLM_KEY_NAME',
      'AI_PRIMARY_PROVIDER',
      'AI_FALLBACK_PROVIDER'
    ]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Environment variable ${varName} is required`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Configuration Builder
export class ProposalAIConfigBuilder {
  private config: Partial<ProposalAIConfig> = {}

  static create(): ProposalAIConfigBuilder {
    return new ProposalAIConfigBuilder()
  }

  setOpenAI(apiKey: string, options?: Partial<ProposalAIConfig['providers']['openai']>): ProposalAIConfigBuilder {
    this.config.providers = {
      ...this.config.providers,
      openai: {
        ...this.config.providers?.openai,
        apiKey,
        ...options
      }
    }
    return this
  }

  setGLM(apiKey: string, options?: Partial<ProposalAIConfig['providers']['glm']>): ProposalAIConfigBuilder {
    this.config.providers = {
      ...this.config.providers,
      glm: {
        ...this.config.providers?.glm,
        apiKey,
        ...options
      }
    }
    return this
  }

  setTasks(tasks: Partial<ProposalAIConfig['tasks']>): ProposalAIConfigBuilder {
    this.config.tasks = {
      ...this.config.tasks,
      ...tasks
    }
    return this
  }

  setFallback(fallback: Partial<ProposalAIConfig['fallback']>): ProposalAIConfigBuilder {
    this.config.fallback = {
      ...this.config.fallback,
      ...fallback
    }
    return this
  }

  setQuality(quality: Partial<ProposalAIConfig['quality']>): ProposalAIConfigBuilder {
    this.config.quality = {
      ...this.config.quality,
      ...quality
    }
    return this
  }

  setMonitoring(monitoring: Partial<ProposalAIConfig['monitoring']>): ProposalAIConfigBuilder {
    this.config.monitoring = {
      ...this.config.monitoring,
      ...monitoring
    }
    return this
  }

  setIntegration(integration: Partial<ProposalAIConfig['integration']>): ProposalAIConfigBuilder {
    this.config.integration = {
      ...this.config.integration,
      ...integration
    }
    return this
  }

  build(): ProposalAIConfig {
    // Merge with defaults
    const finalConfig = {
      ...DEFAULT_PROPOSAL_AI_CONFIG,
      ...this.config
    }

    // Validate final configuration
    const validation = ProposalAIConfigValidator.validate(finalConfig)
    if (!validation.valid) {
      throw new Error(`Invalid AI configuration: ${validation.errors.join(', ')}`)
    }

    return finalConfig as ProposalAIConfig
  }
}

// Export singleton instance
export const proposalAIConfig = loadProposalAIConfig()

// Type exports
export type { ProposalAIConfigSchema, ProposalAIConfig, ProposalAIConfigBuilder, ProposalAIConfigValidator }
```

## 🚀 **Step 3: Test API Key Health Check**
