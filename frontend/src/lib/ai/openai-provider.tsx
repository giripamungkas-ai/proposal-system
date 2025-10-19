import { z } from 'zod'

// OpenAI Configuration Schema
const OpenAIConfigSchema = z.object({
  apiKey: z.string().min(1, 'OpenAI API key is required'),
  baseURL: z.string().url().default('https://api.openai.com/v1'),
  model: z.string().default('gpt-4-turbo'),
  maxTokens: z.number().default(4000),
  temperature: z.number().default(0.7),
  topP: z.number().default(1),
  frequencyPenalty: z.number().default(0),
  presencePenalty: z.number().default(0)
})

export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>

// OpenAI Provider Implementation
export class OpenAIProvider {
  private config: OpenAIConfig

  constructor(config: OpenAIConfig) {
    this.config = OpenAIConfigSchema.parse(config)
  }

  async generateResponse(prompt: string, options?: Partial<OpenAIConfig>) {
    const mergedConfig = { ...this.config, ...options }

    try {
      const response = await fetch(`${mergedConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mergedConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: mergedConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional proposal assistant for MDMEDIA Strategic Proposal Management System. Provide clear, structured, and actionable responses with excellent business writing skills.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: mergedConfig.maxTokens,
          temperature: mergedConfig.temperature,
          top_p: mergedConfig.topP,
          frequency_penalty: mergedConfig.frequencyPenalty,
          presence_penalty: mergedConfig.presencePenalty,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        model: data.model,
        provider: 'openai'
      }
    } catch (error) {
      console.error('OpenAI Provider Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'openai'
      }
    }
  }

  async parseRFP(content: string): Promise<ParseRFPResult> {
    const prompt = `
    Parse the following RFP content and extract structured information in JSON format:

    ${content}

    Extract and return:
    {
      "client": "Client company name",
      "projectTitle": "Project title",
      "budget": "Budget amount (number)",
      "deadline": "Deadline date",
      "requirements": ["Requirement 1", "Requirement 2"],
      "scope": ["Scope item 1", "Scope item 2"],
      "timeline": [{"phase": "Phase 1", "duration": "X days"}]
    }

    Focus on accuracy and completeness. Provide detailed structured data.
    `

    const response = await this.generateResponse(prompt)

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        provider: 'openai'
      }
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return {
          success: true,
          data: JSON.parse(jsonMatch[0]),
          confidence: 0.95,
          provider: 'openai'
        }
      }
    } catch (parseError) {
      console.error('Failed to parse JSON from OpenAI response:', parseError)
    }

    return {
      success: false,
      error: 'Failed to parse structured data',
      provider: 'openai'
    }
  }

  async generateProposal(rfpData: any): Promise<GenerateProposalResult> {
    const prompt = `
    Generate a comprehensive proposal based on this RFP data:

    ${JSON.stringify(rfpData, null, 2)}

    Create a proposal with the following structure:
    {
      "title": "Proposal Title",
      "executiveSummary": "Brief executive summary",
      "technicalApproach": "Technical implementation approach",
      "timeline": "Implementation timeline",
      "budgetBreakdown": "Budget breakdown",
      "teamComposition": "Team structure",
      "risks": "Risk assessment and mitigation"
    }

    Style: Professional, clear, and actionable.
    Language: Indonesian with English technical terms where appropriate.
    Include specific details and actionable recommendations.
    `

    const response = await this.generateResponse(prompt)

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        provider: 'openai'
      }
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return {
          success: true,
          data: JSON.parse(jsonMatch[0]),
          wordCount: response.content.length,
          provider: 'openai'
        }
      }
    } catch (parseError) {
      console.error('Failed to parse JSON from OpenAI proposal response:', parseError)
    }

    return {
      success: false,
      error: 'Failed to parse proposal data',
      provider: 'openai'
    }
  }

  async checkCompliance(proposal: any, rfp: any): Promise<ComplianceResult> {
    const prompt = `
    Compare this proposal against the original RFP requirements:

    Proposal Data:
    ${JSON.stringify(proposal, null, 2)}

    RFP Data:
    ${JSON.stringify(rfp, null, 2)}

    Analyze and return:
    {
      "complianceScore": 0.95,
      "matchedRequirements": ["Requirement 1", "Requirement 2"],
      "missingRequirements": ["Missing requirement 1"],
      "recommendations": ["Recommendation 1", "Recommendation 2"],
      "overallStatus": "COMPLIANT",
      "issues": ["Issue 1", "Issue 2"]
    }

    Compliance score: 0.0-1.0
    Overall status: COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT
    Be thorough and provide actionable insights.
    `

    const response = await this.generateResponse(prompt)

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        provider: 'openai'
      }
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return {
          success: true,
          data: JSON.parse(jsonMatch[0]),
          provider: 'openai'
        }
      }
    } catch (parseError) {
      console.error('Failed to parse JSON from OpenAI compliance response:', parseError)
    }

    return {
      success: false,
      error: 'Failed to parse compliance data',
      provider: 'openai'
    }
  }
}

// Type definitions
interface ParseRFPResult {
  success: boolean
  data?: {
    client: string
    projectTitle: string
    budget: number
    deadline: string
    requirements: string[]
    scope: string[]
    timeline: Array<{ phase: string; duration: string }>
  }
  confidence?: number
  error?: string
  provider: string
}

interface GenerateProposalResult {
  success: boolean
  data?: {
    title: string
    executiveSummary: string
    technicalApproach: string
    timeline: string
    budgetBreakdown: string
    teamComposition: string
    risks: string
  }
  wordCount?: number
  error?: string
  provider: string
}

interface ComplianceResult {
  success: boolean
  data?: {
    complianceScore: number
    matchedRequirements: string[]
    missingRequirements: string[]
    recommendations: string[]
    overallStatus: string
    issues: string[]
  }
  error?: string
  provider: string
}

export default OpenAIProvider
```

### **Step 3: Create AI Manager with Auto-Fallback**
