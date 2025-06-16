// AI Model Integration Types
// Defines types for integrating with OpenAI models for alert processing

export enum AIModel {
  GPT_4_1_MINI = 'gpt-4.1-mini',
  GPT_O3 = 'o3',
  GPT_4O_MINI = 'gpt-4o-mini', // Fallback option
  GPT_4O = 'gpt-4o' // Another fallback option
}

export interface AIModelConfig {
  model: AIModel;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
}

export interface AIModelResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  alertTypes: string[];
  systemPrompt: string;
  userPromptTemplate: string;
  fewShotExamples?: AIFewShotExample[];
  requiredContext: string[];
  outputFormat: 'json' | 'text';
  confidenceThreshold: number;
}

export interface AIFewShotExample {
  input: {
    patientContext: string;
    transcriptSegment: string;
    existingAlerts?: string[];
  };
  output: {
    alerts: Array<{
      type: string;
      severity: string;
      title: string;
      message: string;
      suggestion?: string;
      confidence: number;
      reasoning: string;
    }>;
  };
}

export interface AIProcessingContext {
  patientId: string;
  encounterId?: string;
  patientData: {
    demographics: Record<string, any>;
    conditions: Record<string, any>[];
    medications: Record<string, any>[];
    labResults: Record<string, any>[];
    allergies?: string[];
    vitals?: Record<string, any>[];
  };
  transcript: {
    full: string;
    segment?: string;
    lastProcessedIndex?: number;
  };
  existingAlerts: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  consultationContext?: {
    soapNote?: string;
    diagnosticResults?: Record<string, any>;
    treatments?: Record<string, any>[];
  };
}

export interface AIAlertResult {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  suggestion?: string;
  confidence: number;
  reasoning: string;
  relatedData?: Record<string, any>;
  navigationTarget?: string;
  proposedEdit?: Record<string, any>;
}

export interface AIProcessingRequest {
  model: AIModel;
  context: AIProcessingContext;
  promptTemplate: AIPromptTemplate;
  isRealTime: boolean;
  maxAlerts?: number;
  confidenceThreshold?: number;
}

export interface AIProcessingResponse {
  success: boolean;
  alerts: AIAlertResult[];
  processingTime: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  error?: string;
}

// Real-time specific configurations
export interface RealTimeAIConfig extends AIModelConfig {
  model: AIModel.GPT_4_1_MINI;
  processingInterval: number; // in seconds (60 for minute-by-minute)
  maxContextTokens: number;
  priorityThreshold: number; // Confidence threshold for immediate alerts
}

// Post-consultation specific configurations
export interface PostConsultationAIConfig extends AIModelConfig {
  model: AIModel.GPT_O3;
  comprehensiveAnalysis: boolean;
  includeRealTimeAlerts: boolean;
  alertRefreshLogic: boolean;
}

// Error handling types
export interface AIProcessingError {
  code: 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'MODEL_ERROR' | 'CONTEXT_TOO_LARGE';
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
  details?: Record<string, any>;
}

// Monitoring and metrics
export interface AIModelMetrics {
  modelName: string;
  requestCount: number;
  successRate: number;
  averageResponseTime: number;
  averageTokensUsed: number;
  errorRate: number;
  lastUpdated: string;
}

export interface AIAlertQualityMetrics {
  totalAlertsGenerated: number;
  alertsAccepted: number;
  alertsDismissed: number;
  averageConfidenceScore: number;
  alertTypeDistribution: Record<string, number>;
  userFeedbackScore?: number;
}

// Prompt engineering utilities
export interface PromptContext {
  patientSummary: string;
  currentMedications: string;
  recentLabResults: string;
  medicalHistory: string;
  transcriptSegment: string;
  existingAlerts: string;
  consultationReason?: string;
}

export interface PromptBuilder {
  buildSystemPrompt(alertTypes: string[]): string;
  buildUserPrompt(context: PromptContext): string;
  formatFewShotExamples(examples: AIFewShotExample[]): string;
  validatePromptLength(prompt: string, maxTokens: number): boolean;
}

// Model configuration presets
export const AI_MODEL_PRESETS: Record<string, AIModelConfig> = {
  REAL_TIME_FAST: {
    model: AIModel.GPT_4_1_MINI,
    maxTokens: 1000,
    temperature: 0.1,
    timeout: 30000,
    retryAttempts: 2
  },
  POST_CONSULTATION_COMPREHENSIVE: {
    model: AIModel.GPT_O3,
    maxTokens: 4000,
    temperature: 0.2,
    timeout: 120000,
    retryAttempts: 3
  },
  FALLBACK_RELIABLE: {
    model: AIModel.GPT_4O_MINI,
    maxTokens: 2000,
    temperature: 0.1,
    timeout: 45000,
    retryAttempts: 3
  }
};

// API client interfaces
export interface AIAPIClient {
  processAlerts(request: AIProcessingRequest): Promise<AIProcessingResponse>;
  validateApiKey(): Promise<boolean>;
  getModelStatus(model: AIModel): Promise<'available' | 'unavailable' | 'rate_limited'>;
  estimateTokens(text: string): number;
}

export interface AIModelFactory {
  createClient(config: AIModelConfig): AIAPIClient;
  getAvailableModels(): AIModel[];
  getModelCapabilities(model: AIModel): {
    maxContextLength: number;
    maxOutputTokens: number;
    supportsRealTime: boolean;
    costPerToken: number;
  };
} 