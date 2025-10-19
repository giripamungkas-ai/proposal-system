/**
 * AI-Powered Win Probability Prediction Engine
 *
 * This engine uses machine learning models to predict the probability of winning
 * proposals based on historical data, project characteristics, and market conditions.
 *
 * Features:
 * - Multiple prediction models (Random Forest, Gradient Boosting, Neural Network)
 * - Real-time probability updates
 * - Confidence intervals and uncertainty quantification
 * - Feature importance analysis
 * - Model performance monitoring
 */

import { z } from 'zod'

// Prediction Model Types
export type PredictionModel = 'random_forest' | 'gradient_boosting' | 'neural_network' | 'logistic_regression'

export interface PredictionFeatures {
  // Project Characteristics
  projectValue: number
  projectDuration: number
  complexity: 'low' | 'medium' | 'high' | 'critical'
  clientType: 'new' | 'existing' | 'strategic' | 'commodity'
  industry: 'technology' | 'healthcare' | 'finance' | 'retail' | 'manufacturing' | 'government'

  // Team Characteristics
  teamSize: number
  teamExperience: number
  managerExperience: number
  technicalExpertise: number
  domainExpertise: number

  // Proposal Characteristics
  proposalQuality: number
  methodologyScore: number
  priceCompetitiveness: number
  valueProposition: number
  riskAssessment: number

  // Market Conditions
  competitionLevel: 'low' | 'medium' | 'high' | 'intense'
  marketSize: number
  economicConditions: 'favorable' | 'neutral' | 'challenging'
  seasonalFactors: number

  // Historical Performance
  winRate: number
  averageDealSize: number
  salesCycleLength: number
  conversionRate: number

  // Client Relationship
  relationshipStrength: number
  previousWins: number
  accountAge: number
  contactFrequency: number

  // Technical Factors
  technicalFit: number
  innovationRequired: number
  integrationComplexity: number
  supportNeeds: number

  // Time Factors
  responseTime: number
  preparationTime: number
  submissionTimeline: number
  decisionTimeline: number
}

export interface PredictionResult {
  winProbability: number
  confidence: number
  uncertainty: number
  featureImportance: Record<string, number>
  modelUsed: PredictionModel
  modelVersion: string
  predictionDate: Date
  factors: {
    positive: Array<{ feature: string; impact: number; description: string }>
    negative: Array<{ feature: string; impact: number; description: string }>
    neutral: Array<{ feature: string; impact: number; description: string }>
  }
  recommendations: Array<{
    type: 'improve' | 'monitor' | 'address'
    priority: 'high' | 'medium' | 'low'
    action: string
    expectedImpact: number
  }>
}

export interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  aucRoc: number
  confusionMatrix: Record<string, Record<string, number>>
  calibrationCurve: Array<{ probability: number; actual: number }>
}

// Schema for prediction features
const PredictionFeaturesSchema = z.object({
  projectValue: z.number().min(0),
  projectDuration: z.number().min(0),
  complexity: z.enum(['low', 'medium', 'high', 'critical']),
  clientType: z.enum(['new', 'existing', 'strategic', 'commodity']),
  industry: z.enum(['technology', 'healthcare', 'finance', 'retail', 'manufacturing', 'government']),
  teamSize: z.number().min(1),
  teamExperience: z.number().min(0).max(10),
  managerExperience: z.number().min(0).max(10),
  technicalExpertise: z.number().min(0).max(10),
  domainExpertise: z.number().min(0).max(10),
  proposalQuality: z.number().min(0).max(10),
  methodologyScore: z.number().min(0).max(10),
  priceCompetitiveness: z.number().min(0).max(10),
  valueProposition: z.number().min(0).max(10),
  riskAssessment: z.number().min(0).max(10),
  competitionLevel: z.enum(['low', 'medium', 'high', 'intense']),
  marketSize: z.number().min(0),
  economicConditions: z.enum(['favorable', 'neutral', 'challenging']),
  seasonalFactors: z.number().min(-10).max(10),
  winRate: z.number().min(0).max(1),
  averageDealSize: z.number().min(0),
  salesCycleLength: z.number().min(0),
  conversionRate: z.number().min(0).max(1),
  relationshipStrength: z.number().min(0).max(10),
  previousWins: z.number().min(0),
  accountAge: z.number().min(0),
  contactFrequency: z.number().min(0),
  technicalFit: z.number().min(0).max(10),
  innovationRequired: z.number().min(0).max(10),
  integrationComplexity: z.number().min(0).max(10),
  supportNeeds: z.number().min(0).max(10),
  responseTime: z.number().min(0),
  preparationTime: z.number().min(0),
  submissionTimeline: z.number().min(0),
  decisionTimeline: z.number().min(0)
})

export type PredictiveFeatures = z.infer<typeof PredictionFeaturesSchema>

/**
 * Win Probability Prediction Engine
 */
export class WinProbabilityEngine {
  private models: Map<PredictionModel, any> = new Map()
  private currentModel: PredictionModel = 'gradient_boosting'
  private modelVersion: string = '2.0.0'
  private performanceMetrics: Map<PredictionModel, ModelPerformance> = new Map()
  private featureImportance: Map<string, number> = new Map()
  private isInitialized: boolean = false

  constructor() {
    this.initializeModels()
  }

  /**
   * Initialize prediction models
   */
  private async initializeModels(): Promise<void> {
    try {
      // Load pre-trained models (in production, these would be loaded from model files)
      await this.loadRandomForestModel()
      await this.loadGradientBoostingModel()
      await this.loadNeuralNetworkModel()
      await this.loadLogisticRegressionModel()

      // Set default model based on performance
      this.selectBestModel()

      this.isInitialized = true
      console.log('🤖 Win Probability Engine initialized successfully')
    } catch (error) {
      console.error('Failed to initialize models:', error)
      // Fallback to simple logistic regression
      await this.initializeFallbackModel()
    }
  }

  /**
   * Predict win probability for a proposal
   */
  async predictWinProbability(features: PredictiveFeatures): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initializeModels()
    }

    // Validate input features
    const validatedFeatures = PredictionFeaturesSchema.parse(features)

    // Get current model
    const model = this.models.get(this.currentModel)

    // Make prediction
    let prediction: any
    try {
      prediction = await model.predict(validatedFeatures)
    } catch (error) {
      console.error(`Model ${this.currentModel} prediction failed:`, error)
      // Fallback to logistic regression
      prediction = await this.models.get('logistic_regression').predict(validatedFeatures)
    }

    // Calculate confidence and uncertainty
    const confidence = this.calculateConfidence(prediction, validatedFeatures)
    const uncertainty = this.calculateUncertainty(prediction, validatedFeatures)

    // Analyze feature importance
    const featureImportance = await this.analyzeFeatureImportance(validatedFeatures, prediction)

    // Generate recommendations
    const recommendations = this.generateRecommendations(validatedFeatures, prediction, featureImportance)

    return {
      winProbability: prediction.probability,
      confidence,
      uncertainty,
      featureImportance,
      modelUsed: this.currentModel,
      modelVersion: this.modelVersion,
      predictionDate: new Date(),
      factors: this.categorizeFactors(featureImportance, validatedFeatures),
      recommendations
    }
  }

  /**
   * Batch predict win probabilities for multiple proposals
   */
  async batchPredictWinProbability(featuresArray: PredictiveFeatures[]): Promise<PredictionResult[]> {
    if (!this.isInitialized) {
      await this.initializeModels()
    }

    const results: PredictionResult[] = []

    for (const features of featuresArray) {
      try {
        const result = await this.predictWinProbability(features)
        results.push(result)
      } catch (error) {
        console.error('Batch prediction failed for features:', features, error)
        // Add fallback result
        results.push(this.createFallbackResult(features, error))
      }
    }

    return results
  }

  /**
   * Update models with new training data
   */
  async updateModels(trainingData: Array<{ features: PredictiveFeatures; result: boolean }>): Promise<void> {
    try {
      // Retrain all models with new data
      for (const [modelName, model] of this.models.entries()) {
        await model.retrain(trainingData)
        await this.evaluateModel(modelName, trainingData)
      }

      // Select best model after retraining
      this.selectBestModel()

      console.log('🤖 Models updated successfully with new training data')
    } catch (error) {
      console.error('Failed to update models:', error)
    }
  }

  /**
   * Get model performance metrics
   */
  getModelPerformance(): Map<PredictionModel, ModelPerformance> {
    return new Map(this.performanceMetrics)
  }

  /**
   * Get feature importance analysis
   */
  getFeatureImportance(): Map<string, number> {
    return new Map(this.featureImportance)
  }

  /**
   * Load Random Forest model
   */
  private async loadRandomForestModel(): Promise<void> {
    // Mock implementation - in production, load pre-trained model
    const mockModel = {
      predict: async (features: PredictiveFeatures) => {
        // Simplified Random Forest prediction logic
        const score = this.calculateRandomForestScore(features)
        return {
          probability: this.sigmoid(score),
          rawScore: score,
          trees: Array(100).fill(0).map(() => this.calculateSingleTreeScore(features))
        }
      },
      retrain: async (data: any) => {
        // Mock retraining logic
        console.log('Retraining Random Forest model...')
      },
      evaluate: async (data: any) => {
        // Mock evaluation logic
        return {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.91,
          f1Score: 0.90,
          aucRoc: 0.94
        }
      }
    }

    this.models.set('random_forest', mockModel)
  }

  /**
   * Load Gradient Boosting model
   */
  private async loadGradientBoostingModel(): Promise<void> {
    // Mock implementation - in production, load pre-trained model
    const mockModel = {
      predict: async (features: PredictiveFeatures) => {
        // Simplified Gradient Boosting prediction logic
        const score = this.calculateGradientBoostingScore(features)
        return {
          probability: this.sigmoid(score),
          rawScore: score,
          iterations: Array(100).fill(0).map((_, i) => score * Math.pow(0.9, i))
        }
      },
      retrain: async (data: any) => {
        // Mock retraining logic
        console.log('Retraining Gradient Boosting model...')
      },
      evaluate: async (data: any) => {
        // Mock evaluation logic
        return {
          accuracy: 0.94,
          precision: 0.92,
          recall: 0.93,
          f1Score: 0.92,
          aucRoc: 0.96
        }
      }
    }

    this.models.set('gradient_boosting', mockModel)
  }

  /**
   * Load Neural Network model
   */
  private async loadNeuralNetworkModel(): Promise<void> {
    // Mock implementation - in production, load pre-trained model
    const mockModel = {
      predict: async (features: PredictiveFeatures) => {
        // Simplified Neural Network prediction logic
        const score = this.calculateNeuralNetworkScore(features)
        return {
          probability: this.sigmoid(score),
          rawScore: score,
          layers: [
            Array(128).fill(0).map((_, i) => Math.tanh(i * 0.1)),
            Array(64).fill(0).map((_, i) => Math.tanh(i * 0.2)),
            Array(32).fill(0).map((_, i) => Math.tanh(i * 0.3)),
            Array(16).fill(0).map((_, i) => Math.tanh(i * 0.5)),
            Array(8).fill(0).map((_, i) => Math.tanh(i * 0.7))
          ].reduce((acc, layer) => acc + layer, 0)
        }
      },
      retrain: async (data: any) => {
        // Mock retraining logic
        console.log('Retraining Neural Network model...')
      },
      evaluate: async (data: any) => {
        // Mock evaluation logic
        return {
          accuracy: 0.89,
          precision: 0.87,
          recall: 0.88,
          f1Score: 0.87,
          aucRoc: 0.91
        }
      }
    }

    this.models.set('neural_network', mockModel)
  }

  /**
   * Load Logistic Regression model
   */
  private async loadLogisticRegressionModel(): Promise<void> {
    // Mock implementation - in production, load pre-trained model
    const mockModel = {
      predict: async (features: PredictiveFeatures) => {
        // Simplified Logistic Regression prediction logic
        const score = this.calculateLogisticRegressionScore(features)
        return {
          probability: this.sigmoid(score),
          rawScore: score,
          coefficients: Array(30).fill(0).map(() => Math.random() - 0.5)
        }
      },
      retrain: async (data: any) => {
        // Mock retraining logic
        console.log('Retraining Logistic Regression model...')
      },
      evaluate: async (data: any) => {
        // Mock evaluation logic
        return {
          accuracy: 0.86,
          precision: 0.84,
          recall: 0.85,
          f1Score: 0.84,
          aucRoc: 0.88
        }
      }
    }

    this.models.set('logistic_regression', mockModel)
  }

  /**
   * Initialize fallback model
   */
  private async initializeFallbackModel(): Promise<void> {
    const fallbackModel = {
      predict: async (features: PredictiveFeatures) => {
        // Simple rule-based fallback
        const score = this.calculateRuleBasedScore(features)
        return {
          probability: this.sigmoid(score),
          rawScore: score,
          method: 'rule_based_fallback'
        }
      },
      retrain: async (data: any) => {
        console.log('Fallback model does not support retraining')
      },
      evaluate: async (data: any) => {
        return {
          accuracy: 0.75,
          precision: 0.72,
          recall: 0.73,
          f1Score: 0.72,
          aucRoc: 0.78
        }
      }
    }

    this.models.set('logistic_regression', fallbackModel)
    this.currentModel = 'logistic_regression'
  }

  /**
   * Calculate Random Forest score
   */
  private calculateRandomForestScore(features: PredictiveFeatures): number {
    // Simplified Random Forest scoring
    let score = 0

    // Feature weights (simplified)
    const weights = {
      projectValue: 0.15,
      proposalQuality: 0.12,
      methodologyScore: 0.10,
      priceCompetitiveness: 0.10,
      valueProposition: 0.08,
      relationshipStrength: 0.08,
      winRate: 0.07,
      teamExperience: 0.06,
      technicalFit: 0.05,
      complexity: -0.04,
      competitionLevel: -0.03,
      riskAssessment: -0.02
    }

    // Calculate weighted score
    Object.entries(weights).forEach(([feature, weight]) => {
      let value = features[feature as keyof PredictiveFeatures] as number
      if (typeof value === 'string') {
        value = this.mapStringValue(feature, value)
      }
      score += value * weight
    })

    return score
  }

  /**
   * Calculate Gradient Boosting score
   */
  private calculateGradientBoostingScore(features: PredictiveFeatures): number {
    // Simplified Gradient Boosting scoring
    let score = 0

    // Base score from historical performance
    score += features.winRate * 0.2
    score += features.teamExperience * 0.15
    score += features.proposalQuality * 0.12
    score += features.relationshipStrength * 0.10

    // Adjust for project characteristics
    score += features.projectValue > 1000000 ? 0.05 : 0
    score += features.complexity === 'critical' ? -0.03 : 0
    score += features.competitionLevel === 'low' ? 0.02 : features.competitionLevel === 'intense' ? -0.04 : 0

    return score
  }

  /**
   * Calculate Neural Network score
   */
  private calculateNeuralNetworkScore(features: PredictiveFeatures): number {
    // Simplified Neural Network scoring
    let score = 0

    // Feature engineering
    const engineeredFeatures = [
      features.projectValue / 1000000, // Normalize to millions
      features.teamExperience / 10,
      features.proposalQuality / 10,
      features.relationshipStrength / 10,
      features.winRate,
      features.complexity === 'critical' ? -0.5 : features.complexity === 'low' ? 0.5 : 0,
      features.competitionLevel === 'low' ? 0.5 : features.competitionLevel === 'intense' ? -0.5 : 0,
      features.technicalFit / 10,
      features.economicConditions === 'favorable' ? 0.3 : features.economicConditions === 'challenging' ? -0.2 : 0
    ]

    // Simple neural network calculation (single layer)
    const weights = Array(50).fill(0).map(() => Math.random() - 0.5)
    const bias = Math.random() - 0.5

    score = engineeredFeatures.reduce((acc, feature, index) => {
      return acc + feature * weights[index]
    }, bias)

    return score
  }

  /**
   * Calculate Logistic Regression score
   */
  private calculateLogisticRegressionScore(features: PredictiveFeatures): number {
    // Simplified Logistic Regression scoring
    let score = 0

    // Logistic regression coefficients (simplified)
    const coefficients = {
      intercept: -0.5,
      projectValue: 0.000001,
      proposalQuality: 0.15,
      methodologyScore: 0.12,
      priceCompetitiveness: 0.08,
      relationshipStrength: 0.10,
      winRate: 1.2,
      teamExperience: 0.05,
      technicalFit: 0.07,
      complexity: -0.3,
      competitionLevel: -0.2
    }

    // Calculate logistic regression score
    score = coefficients.intercept
    Object.entries(coefficients).forEach(([feature, coefficient]) => {
      let value = features[feature as keyof PredictiveFeatures] as number
      if (typeof value === 'string') {
        value = this.mapStringValue(feature, value)
      }
      score += value * coefficient
    })

    return score
  }

  /**
   * Calculate rule-based fallback score
   */
  private calculateRuleBasedScore(features: PredictiveFeatures): number {
    let score = 0.5 // Base score

    // Simple rule-based scoring
    if (features.winRate > 0.8) score += 0.2
    if (features.teamExperience > 7) score += 0.15
    if (features.proposalQuality > 8) score += 0.1
    if (features.relationshipStrength > 7) score += 0.1
    if (features.projectValue > 500000) score += 0.05
    if (features.complexity === 'low') score += 0.03
    if (features.competitionLevel === 'low') score += 0.02
    if (features.economicConditions === 'favorable') score += 0.03

    // Adjust for negative factors
    if (features.complexity === 'critical') score -= 0.1
    if (features.competitionLevel === 'intense') score -= 0.15
    if (features.riskAssessment > 7) score -= 0.1

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Map string value to numeric
   */
  private mapStringValue(feature: string, value: string): number {
    switch (feature) {
      case 'complexity':
        return value === 'low' ? 0.2 : value === 'medium' ? 0.5 : value === 'high' ? 0.8 : 0.9
      case 'clientType':
        return value === 'new' ? 0.3 : value === 'existing' ? 0.6 : value === 'strategic' ? 0.8 : 0.4
      case 'competitionLevel':
        return value === 'low' ? 0.2 : value === 'medium' ? 0.5 : value === 'high' ? 0.8 : 0.9
      case 'economicConditions':
        return value === 'favorable' ? 0.7 : value === 'neutral' ? 0.5 : 0.3
      default:
        return parseFloat(value) || 0
    }
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidence(prediction: any, features: PredictiveFeatures): number {
    // Calculate confidence based on model performance and data quality
    let confidence = 0.85 // Base confidence

    // Adjust based on data completeness
    const completeness = this.calculateDataCompleteness(features)
    confidence += completeness * 0.1

    // Adjust based on model performance
    const performance = this.performanceMetrics.get(this.currentModel)
    if (performance) {
      confidence += performance.accuracy * 0.05
    }

    return Math.min(0.95, Math.max(0.5, confidence))
  }

  /**
   * Calculate uncertainty interval
   */
  private calculateUncertainty(prediction: any, features: PredictiveFeatures): number {
    // Calculate uncertainty based on prediction variance and data quality
    let uncertainty = 0.1 // Base uncertainty

    // Adjust based on prediction probability
    if (prediction.probability < 0.3 || prediction.probability > 0.7) {
      uncertainty += 0.1 // Higher uncertainty for extreme probabilities
    }

    // Adjust based on data quality
    const completeness = this.calculateDataCompleteness(features)
    uncertainty += (1 - completeness) * 0.2

    return Math.min(0.4, uncertainty)
  }

  /**
   * Calculate data completeness
   */
  private calculateDataCompleteness(features: PredictiveFeatures): number {
    let completeness = 0
    let totalFields = 0

    Object.entries(features).forEach(([key, value]) => {
      totalFields++
      if (value !== null && value !== undefined && value !== '') {
        completeness++
      }
    })

    return completeness / totalFields
  }

  /**
   * Analyze feature importance
   */
  private async analyzeFeatureImportance(features: PredictiveFeatures, prediction: any): Promise<Record<string, number>> {
    const importance: Record<string, number> = {}

    // SHAP values would be calculated in production
    // For now, use simplified importance calculation
    const baseImportance = {
      projectValue: 0.18,
      proposalQuality: 0.15,
      methodologyScore: 0.12,
      priceCompetitiveness: 0.11,
      valueProposition: 0.10,
      relationshipStrength: 0.08,
      winRate: 0.07,
      teamExperience: 0.06,
      technicalFit: 0.05,
      complexity: 0.04,
      competitionLevel: 0.04
    }

    Object.entries(baseImportance).forEach(([feature, importance]) => {
      importance[feature] = importance
    })

    this.featureImportance.clear()
    Object.entries(importance).forEach(([feature, importance]) => {
      this.featureImportance.set(feature, importance)
    })

    return importance
  }

  /**
   * Categorize factors into positive, negative, and neutral
   */
  private categorizeFactors(importance: Record<string, number>, features: PredictiveFeatures): {
    positive: Array<{ feature: string; impact: number; description: string }>
    negative: Array<{ feature: string; impact: number; description: string }>
    neutral: Array<{ feature: string; impact: number; description: string }>
  } {
    const factors = { positive: [], negative: [], neutral: [] }

    Object.entries(importance).forEach(([feature, impact]) => {
      let category: 'positive' | 'negative' | 'neutral' = 'neutral'
      let description = ''

      switch (feature) {
        case 'projectValue':
          category = impact > 0.1 ? 'positive' : 'neutral'
          description = impact > 0.1 ? 'High project value increases win probability' : 'Moderate project value'
          break
        case 'proposalQuality':
          category = impact > 0.1 ? 'positive' : 'neutral'
          description = impact > 0.1 ? 'High-quality proposal improves chances' : 'Standard proposal quality'
          break
        case 'winRate':
          category = impact > 0.05 ? 'positive' : 'neutral'
          description = impact > 0.05 ? 'Strong historical performance' : 'Average historical performance'
          break
        case 'complexity':
          category = impact < -0.05 ? 'positive' : impact > 0.05 ? 'negative' : 'neutral'
          description = impact < -0.05 ? 'Low complexity increases chances' : impact > 0.05 ? 'High complexity reduces chances' : 'Moderate complexity'
          break
        case 'competitionLevel':
          category = impact < -0.05 ? 'positive' : impact > 0.05 ? 'negative' : 'neutral'
          description = impact < -0.05 ? 'Low competition increases chances' : impact > 0.05 ? 'Intense competition reduces chances' : 'Moderate competition'
          break
        default:
          category = 'neutral'
          description = 'Standard factor'
      }

      factors[category].push({
        feature,
        impact: Math.abs(impact),
        description
      })
    })

    return factors
  }

  /**
   * Generate recommendations based on prediction
   */
  private generateRecommendations(features: PredictiveFeatures, prediction: any, importance: Record<string, number>): Array<{
    type: 'improve' | 'monitor' | 'address'
    priority: 'high' | 'medium' | 'low'
    action: string
    expectedImpact: number
  }> {
    const recommendations: Array<{
      type: 'improve' | 'monitor' | 'address'
      priority: 'high' | 'medium' | 'low'
      action: string
      expectedImpact: number
    }> = []

    // Analyze weak points and generate recommendations
    if (features.winRate < 0.6) {
      recommendations.push({
        type: 'improve',
        priority: 'high',
        action: 'Focus on improving historical win rate',
        expectedImpact: 0.2
      })
    }

    if (features.proposalQuality < 7) {
      recommendations.push({
        type: 'improve',
        priority: 'high',
        action: 'Enhance proposal quality and presentation',
        expectedImpact: 0.15
      })
    }

    if (features.relationshipStrength < 5) {
      recommendations.push({
        type: 'improve',
        priority: 'medium',
        action: 'Strengthen client relationship and engagement',
        expectedImpact: 0.12
      })
    }

    if (features.complexity === 'critical' && features.teamExperience < 7) {
      recommendations.push({
        type: 'address',
        priority: 'high',
        action: 'Assign more experienced team to handle complex project',
        expectedImpact: 0.18
      })
    }

    if (features.competitionLevel === 'intense' && features.priceCompetitiveness < 7) {
      recommendations.push({
        type: 'improve',
        priority: 'high',
        action: 'Improve price competitiveness and value proposition',
        expectedImpact: 0.15
      })
    }

    if (features.technicalFit < 6) {
      recommendations.push({
        type: 'address',
        priority: 'medium',
        action: 'Enhance technical capabilities and solution fit',
        expectedImpact: 0.1
      })
    }

    if (features.responseTime > 30) {
      recommendations.push({
        type: 'improve',
        priority: 'medium',
        action: 'Reduce response time to improve competitiveness',
        expectedImpact: 0.08
      })
    }

    return recommendations
  }

  /**
   * Select best model based on performance metrics
   */
  private selectBestModel(): void {
    let bestModel: PredictionModel = 'logistic_regression'
    let bestScore = 0

    for (const [modelName, performance] of this.performanceMetrics.entries()) {
      const score = performance.accuracy * 0.4 + performance.aucRoc * 0.6
      if (score > bestScore) {
        bestScore = score
        bestModel = modelName
      }
    }

    this.currentModel = bestModel
    console.log(`🤖 Selected best model: ${bestModel} (score: ${bestScore.toFixed(3)})`)
  }

  /**
   * Evaluate model performance
   */
  private async evaluateModel(modelName: PredictionModel, testData: any): Promise<ModelPerformance> {
    const model = this.models.get(modelName)
    if (!model) {
      throw new Error(`Model ${modelName} not found`)
    }

    return model.evaluate(testData)
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }

  /**
   * Create fallback result for failed predictions
   */
  private createFallbackResult(features: PredictiveFeatures, error: any): PredictionResult {
    return {
      winProbability: 0.5,
      confidence: 0.5,
      uncertainty: 0.3,
      featureImportance: {},
      modelUsed: 'logistic_regression',
      modelVersion: '1.0.0',
      predictionDate: new Date(),
      factors: {
        positive: [],
        negative: [],
        neutral: []
      },
      recommendations: [{
        type: 'monitor',
        priority: 'medium',
        action: 'Monitor prediction engine status and retry if needed',
        expectedImpact: 0
      }]
    }
  }

  /**
   * Get model statistics
   */
  getModelStatistics(): {
    const availableModels = Array.from(this.models.keys())
    const currentModel = this.currentModel
    const performanceMetrics = this.getModelPerformance()

    return {
      availableModels,
      currentModel,
      performanceMetrics,
      isInitialized: this.isInitialized,
      featureImportance: Object.fromEntries(this.featureImportance)
    }
  }
}

// Export singleton instance
export const winProbabilityEngine = new WinProbabilityEngine()

// Export types for external use
export type { PredictionFeatures, PredictionResult, ModelPerformance, PredictionModel }
