import { AIManager } from './ai-manager'
import type { AIManagerConfig } from './ai-manager'

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GLM_API_KEY = process.env.GLM_API_KEY || ''

// AI Manager Configuration
const AI_CONFIG: AIManagerConfig = {
  providers: {
    openai: OPENAI_API_KEY ? {
      apiKey: OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      weight: parseFloat(process.env.AI_OPENAI_WEIGHT || '0.7')
    } : undefined,
    glm: GLM_API_KEY ? {
      apiKey: GLM_API_KEY,
      model: process.env.GLM_MODEL || 'glm-4.6',
      maxTokens: parseInt(process.env.GLM_MAX_TOKENS || '3500'),
      temperature: parseFloat(process.env.GLM_TEMPERATURE || '0.6'),
      weight: parseFloat(process.env.AI_GLM_WEIGHT || '0.3')
    } : undefined
  },
  fallbackStrategy: (process.env.AI_FALLBACK_STRATEGY as any) || 'auto',
  loadBalancing: (process.env.AI_LOAD_BALANCING as any) || 'weighted',
  autoRetry: process.env.AI_AUTO_RETRY === 'true',
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2')
}

// Global AI Manager Instance
let aiManager: AIManager | null = null

// Initialize AI Manager
export function initializeAIManager(): AIManager {
  if (!aiManager) {
    aiManager = new AIManager(AI_CONFIG)
    console.log('🤖 AI Manager initialized with configuration:', {
      hasOpenAI: !!OPENAI_API_KEY,
      hasGLM: !!GLM_API_KEY,
      primaryProvider: process.env.AI_PRIMARY_PROVIDER,
      fallbackProvider: process.env.AI_FALLBACK_PROVIDER
    })
  }
  return aiManager
}

// Get AI Manager Instance
export function getAIManager(): AIManager {
  if (!aiManager) {
    return initializeAIManager()
  }
  return aiManager
}

// AI Service Class
export class AIService {
  private manager: AIManager

  constructor() {
    this.manager = getAIManager()
  }

  // Parse RFP
  async parseRFP(content: string) {
    console.log('🔍 Parsing RFP content...')

    try {
      const result = await this.manager.parseRFP(content)

      if (result.success) {
        console.log(`✅ RFP parsed successfully using ${result.provider}`)
        return result
      } else {
        console.error(`❌ Failed to parse RFP: ${result.error}`)
        return result
      }
    } catch (error) {
      console.error('💥 Error in parseRFP:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'unknown'
      }
    }
  }

  // Generate Proposal
  async generateProposal(rfpData: any) {
    console.log('📝 Generating proposal from RFP data...')

    try {
      const result = await this.manager.generateProposal(rfpData)

      if (result.success) {
        console.log(`✅ Proposal generated successfully using ${result.provider}`)
        return result
      } else {
        console.error(`❌ Failed to generate proposal: ${result.error}`)
        return result
      }
    } catch (error) {
      console.error('💥 Error in generateProposal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'unknown'
      }
    }
  }

  // Check Compliance
  async checkCompliance(proposal: any, rfp: any) {
    console.log('🔍 Checking proposal compliance...')

    try {
      const result = await this.manager.checkCompliance(proposal, rfp)

      if (result.success) {
        console.log(`✅ Compliance check completed using ${result.provider}`)
        return result
      } else {
        console.error(`❌ Failed to check compliance: ${result.error}`)
        return result
      }
    } catch (error) {
      console.error('💥 Error in checkCompliance:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'unknown'
      }
    }
  }

  // Health Check
  async healthCheck() {
    console.log('🏥 Performing AI health check...')

    try {
      const result = await this.manager.healthCheck()
      console.log('✅ AI health check completed')
      return result
    } catch (error) {
      console.error('💥 Error in healthCheck:', error)
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        providers: []
      }
    }
  }

  // Get Usage Statistics
  async getUsageStats() {
    try {
      const result = await this.manager.getUsageStats()
      return result
    } catch (error) {
      console.error('💥 Error in getUsageStats:', error)
      return {
        totalRequests: 0,
        providers: {},
        taskTypes: {},
        successRate: 0,
        errors: ['Failed to get stats']
      }
    }
  }

  // Batch Process Multiple RFPs
  async batchParseRFPs(contents: string[]): Promise<Array<any>> {
    console.log(`📊 Batch parsing ${contents.length} RFPs...`)

    const results = []

    for (let i = 0; i < contents.length; i++) {
      console.log(`Processing RFP ${i + 1}/${contents.length}...`)

      try {
        const result = await this.parseRFP(contents[i])
        results.push({
          index: i,
          ...result
        })

        // Add small delay to avoid rate limiting
        if (i < contents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'unknown'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`✅ Batch parsing completed: ${successCount}/${contents.length} successful`)

    return results
  }

  // AI Provider Status
  getProviderStatus() {
    return {
      openai: {
        available: !!OPENAI_API_KEY,
        configured: !!OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo'
      },
      glm: {
        available: !!GLM_API_KEY,
        configured: !!GLM_API_KEY,
        model: process.env.GLM_MODEL || 'glm-4.6'
      },
      primary: process.env.AI_PRIMARY_PROVIDER || 'openai',
      fallback: process.env.AI_FALLBACK_PROVIDER || 'glm',
      strategy: process.env.AI_FALLBACK_STRATEGY || 'auto'
    }
  }
}

// Export singleton instance
export const aiService = new AIService()

// Export types for external use
export type { AIManagerConfig }
export type { ParseRFPResult, GenerateProposalResult, ComplianceResult } from './ai-manager'
