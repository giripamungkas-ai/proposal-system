import { z } from 'zod'
import OpenAIProvider from './openai-provider'
import GLMProvider from './glm-provider'

// AI Manager Configuration Schema
const AIManagerConfigSchema = z.object({
  providers: z.object({
    openai: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('gpt-4-turbo'),
      maxTokens: z.number().default(4000),
      temperature: z.number().default(0.7),
      weight: z.number().default(0.7)
    }).optional(),
    glm: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('glm-4.6'),
      maxTokens: z.number().default(3500),
      temperature: z.number().default(0.6),
      weight: z.number().default(0.3)
    }).optional()
  }),
  fallbackStrategy: z.enum(['auto', 'openai-first', 'glm-first']).default('auto'),
  loadBalancing: z.enum(['round-robin', 'weighted', 'failover']).default('weighted'),
  autoRetry: z.boolean().default(true),
  maxRetries: z.number().default(2)
})

export type AIManagerConfig = z.infer<typeof AIManagerConfigSchema>

// AI Manager Implementation
export class AIManager {
  private config: AIManagerConfig
  private openAIProvider?: OpenAIProvider
  private glmProvider?: GLMProvider
  private usageStats: Map<string, any> = new Map()

  constructor(config: AIManagerConfig) {
    this.config = AIManagerConfigSchema.parse(config)
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize OpenAI Provider if API key available
    if (this.config.providers.openai?.apiKey) {
      this.openAIProvider = new OpenAIProvider(this.config.providers.openai)
      console.log('🚀 OpenAI Provider initialized')
    } else {
      console.log('⚠️ OpenAI API key not found - OpenAI provider disabled')
    }

    // Initialize GLM Provider if API key available
    if (this.config.providers.glm?.apiKey) {
      this.glmProvider = new GLMProvider(this.config.providers.glm)
      console.log('🧠 GLM-4.6 Provider initialized')
    } else {
      console.log('⚠️ GLM API key not found - GLM provider disabled')
    }

    // Check if at least one provider is available
    if (!this.openAIProvider && !this.glmProvider) {
      throw new Error('❌ No AI provider available - Please provide API keys for OpenAI or GLM-4.6')
    }
  }

  private selectProvider(taskType: 'critical' | 'standard' | 'bulk'): string {
    const providers = []

    if (this.openAIProvider) {
      providers.push({
        name: 'openai',
        weight: taskType === 'critical' ? 0.9 : this.config.providers.openai?.weight || 0.7
      })
    }

    if (this.glmProvider) {
      providers.push({
        name: 'glm',
        weight: taskType === 'bulk' ? 0.8 : this.config.providers.glm?.weight || 0.3
      })
    }

    if (providers.length === 0) {
      throw new Error('No AI providers available')
    }

    // Weighted random selection
    const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0)
    let random = Math.random() * totalWeight
    let cumulativeWeight = 0

    for (const provider of providers) {
      cumulativeWeight += provider.weight
      if (random <= cumulativeWeight) {
        return provider.name
      }
    }

    return providers[providers.length - 1].name // Fallback
  }

  async executeWithFallback<T>(
    taskType: 'critical' | 'standard' | 'bulk',
    primaryProvider: string,
    fallbackProvider: string,
    taskFunction: (provider: string) => Promise<T>
  ): Promise<T> {
    const results: Array<any> = []
    const maxRetries = this.config.maxRetries

    for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
      const provider = attempt === 0 ? primaryProvider : fallbackProvider
      const providerInstance = provider === 'openai' ? this.openAIProvider : this.glmProvider

      if (!providerInstance) {
        continue
      }

      try {
        const result = await taskFunction(provider)

        // Log successful execution
        this.logUsage(provider, taskType, result)

        return {
          success: true,
          data: result,
          provider,
          attempt: attempt + 1
        }
      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1} failed with ${provider}:`, error)
        results.push({ provider, error, attempt: attempt + 1 })

        if (attempt === maxRetries) {
          break
        }
      }
    }

    return {
      success: false,
      error: 'All providers failed',
      results,
      attempts: maxRetries + 1
    }
  }

  async parseRFP(content: string): Promise<ParseRFPResult> {
    const taskType = 'standard'
    const primaryProvider = this.selectProvider(taskType)
    const fallbackProvider = primaryProvider === 'openai' ? 'glm' : 'openai'

    return this.executeWithFallback(
      taskType,
      primaryProvider,
      fallbackProvider,
      async (provider) => {
        const instance = provider === 'openai' ? this.openAIProvider! : this.glmProvider!
        return instance.parseRFP(content)
      }
    )
  }

  async generateProposal(rfpData: any): Promise<GenerateProposalResult> {
    const taskType = 'critical'
    const primaryProvider = this.selectProvider(taskType)
    const fallbackProvider = primaryProvider === 'openai' ? 'glm' : 'openai'

    return this.executeWithFallback(
      taskType,
      primaryProvider,
      fallbackProvider,
      async (provider) => {
        const instance = provider === 'openai' ? this.openAIProvider! : this.glmProvider!
        return instance.generateProposal(rfpData)
      }
    )
  }

  async checkCompliance(proposal: any, rfp: any): Promise<ComplianceResult> {
    const taskType = 'standard'
    const primaryProvider = this.selectProvider(taskType)
    const fallbackProvider = primaryProvider === 'openai' ? 'glm' : 'openai'

    return this.executeWithFallback(
      taskType,
      primaryProvider,
      fallbackProvider,
      async (provider) => {
        const instance = provider === 'openai' ? this.openAIProvider! : this.glmProvider!
        return instance.checkCompliance(proposal, rfp)
      }
    )
  }

  async getUsageStats(): Promise<UsageStats> {
    const stats = {
      totalRequests: this.usageStats.size,
      providers: {},
      taskTypes: {},
      successRate: 0,
      errors: []
    }

    for (const [key, value] of this.usageStats.entries()) {
      const [provider, taskType, success] = key.split(':')

      if (!stats.providers[provider]) {
        stats.providers[provider] = { total: 0, success: 0, errors: 0 }
      }

      if (!stats.taskTypes[taskType]) {
        stats.taskTypes[taskType] = { total: 0, success: 0, errors: 0 }
      }

      stats.providers[provider].total++
      stats.taskTypes[taskType].total++

      if (success === 'true') {
        stats.providers[provider].success++
        stats.taskTypes[taskType].success++
      } else {
        stats.providers[provider].errors++
        stats.taskTypes[taskType].errors++
      }
    }

    const totalSuccess = Object.values(stats.providers).reduce((sum, p) => sum + p.success, 0)
    const totalRequests = Object.values(stats.providers).reduce((sum, p) => sum + p.total, 0)
    stats.successRate = totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0

    return stats
  }

  private logUsage(provider: string, taskType: string, result: any) {
    const key = `${provider}:${taskType}:${result.success ? 'true' : 'false'}`
    this.usageStats.set(key, {
      provider,
      taskType,
      success: result.success,
      timestamp: new Date().toISOString(),
      usage: result.usage || {}
    })
  }

  // Health check method
  async healthCheck(): Promise<HealthCheckResult> {
    const providers = []
    let allHealthy = true

    if (this.openAIProvider) {
      try {
        const result = await this.openAIProvider.generateResponse('Health check')
        providers.push({ name: 'openai', status: 'healthy', lastCheck: new Date() })
      } catch (error) {
        providers.push({ name: 'openai', status: 'unhealthy', error: error.message })
        allHealthy = false
      }
    }

    if (this.glmProvider) {
      try {
        const result = await this.glmProvider.generateResponse('Health check')
        providers.push({ name: 'glm', status: 'healthy', lastCheck: new Date() })
      } catch (error) {
        providers.push({ name: 'glm', status: 'unhealthy', error: error.message })
        allHealthy = false
      }
    }

    return {
      healthy: allHealthy,
      providers,
      config: this.config,
      usageStats: await this.getUsageStats()
    }
  }
}

// Type definitions
interface ParseRFPResult {
  success: boolean
  data?: any
  error?: string
  provider: string
  attempt?: number
}

interface GenerateProposalResult {
  success: boolean
  data?: any
  error?: string
  provider: string
  attempt?: number
}

interface ComplianceResult {
  success: boolean
  data?: any
  error?: string
  provider: string
  attempt?: number
}

interface UsageStats {
  totalRequests: number
  providers: Record<string, { total: number; success: number; errors: number }>
  taskTypes: Record<string, { total: number; success: number; errors: number }>
  successRate: number
  errors: string[]
}

interface HealthCheckResult {
  healthy: boolean
  providers: Array<{
    name: string
    status: 'healthy' | 'unhealthy'
    error?: string
    lastCheck?: Date
  }>
  config: AIManagerConfig
  usageStats: UsageStats
}

export default AIManager
```

### **Step 4: Create Environment Configuration**
