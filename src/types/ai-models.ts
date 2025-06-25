// AI Model Integration Types
// Defines types for integrating with OpenAI models for alert processing

export enum AIModelType {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_1_MINI = 'gpt-4.1-mini-2025-04-14',
  O3 = 'o3-2025-04-16',
  O4_MINI = 'o4-mini-2025-04-16'
}

export interface AIModelConfig {
  name: string;
  displayName: string;
  maxTokens: number;
  costPer1000Tokens: number;
  capabilities: AIModelCapability[];
  description: string;
}

export enum AIModelCapability {
  TEXT_GENERATION = 'text_generation',
  REASONING = 'reasoning',
  CODE_GENERATION = 'code_generation',
  MULTIMODAL = 'multimodal',
  FUNCTION_CALLING = 'function_calling'
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
  model: AIModelType;
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
  model: AIModelType.GPT_4O_MINI;
  processingInterval: number; // in seconds (60 for minute-by-minute)
  maxContextTokens: number;
  priorityThreshold: number; // Confidence threshold for immediate alerts
}

// Post-consultation specific configurations
export interface PostConsultationAIConfig extends AIModelConfig {
  model: AIModelType.O3;
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
export const AI_MODEL_CONFIGS: Record<AIModelType, AIModelConfig> = {
  [AIModelType.GPT_4O]: {
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 128000,
    costPer1000Tokens: 2.5,
    capabilities: [
      AIModelCapability.TEXT_GENERATION,
      AIModelCapability.MULTIMODAL,
      AIModelCapability.FUNCTION_CALLING,
      AIModelCapability.CODE_GENERATION
    ],
    description: 'Advanced multimodal model with enhanced reasoning'
  },
  [AIModelType.GPT_4O_MINI]: {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    maxTokens: 128000,
    costPer1000Tokens: 0.15,
    capabilities: [
      AIModelCapability.TEXT_GENERATION,
      AIModelCapability.CODE_GENERATION,
      AIModelCapability.MULTIMODAL,
      AIModelCapability.FUNCTION_CALLING
    ],
    description: 'Fast and cost-effective model for general tasks'
  },
  [AIModelType.O3]: {
    name: 'o3-2025-04-16',
    displayName: 'o3',
    maxTokens: 200000,
    costPer1000Tokens: 8.0,
    capabilities: [
      AIModelCapability.TEXT_GENERATION,
      AIModelCapability.REASONING,
      AIModelCapability.CODE_GENERATION
    ],
    description: 'Advanced reasoning model for complex problem-solving - ideal for think mode'
  },
  [AIModelType.O4_MINI]: {
    name: 'o4-mini-2025-04-16',
    displayName: 'o4-mini',
    maxTokens: 200000,
    costPer1000Tokens: 1.155,
    capabilities: [
      AIModelCapability.TEXT_GENERATION,
      AIModelCapability.REASONING,
      AIModelCapability.CODE_GENERATION
    ],
    description: 'Advanced reasoning model designed for efficient reasoning tasks'
  },
  [AIModelType.GPT_4_1_MINI]: {
    name: 'gpt-4.1-mini-2025-04-14',
    displayName: 'GPT-4.1 Mini',
    maxTokens: 128000,
    costPer1000Tokens: 0.2,
    capabilities: [
      AIModelCapability.TEXT_GENERATION,
      AIModelCapability.CODE_GENERATION,
      AIModelCapability.MULTIMODAL,
      AIModelCapability.FUNCTION_CALLING
    ],
    description: 'GPT-4.1 Mini model for fast and high-quality responses'
  }
};

// Default model selections for different use cases
export const AI_MODEL_PRESETS = {
  FAST_RESPONSE: AIModelType.GPT_4O_MINI, // Real-time alerts
  BALANCED: AIModelType.GPT_4O,
  REASONING: AIModelType.GPT_4O, // Post-consultation analysis - using GPT-4o since o1 doesn't support code interpreter
  COST_EFFECTIVE: AIModelType.GPT_4O_MINI,
  ADVANCED_REASONING: AIModelType.GPT_4O // Using GPT-4o since o1 doesn't support Assistants API with code interpreter
};

export type AIModel = keyof typeof AI_MODEL_CONFIGS;

// API client interfaces
export interface AIAPIClient {
  processAlerts(request: AIProcessingRequest): Promise<AIProcessingResponse>;
  validateApiKey(): Promise<boolean>;
  getModelStatus(model: AIModelType): Promise<'available' | 'unavailable' | 'rate_limited'>;
  estimateTokens(text: string): number;
}

export interface AIModelFactory {
  createClient(config: AIModelConfig): AIAPIClient;
  getAvailableModels(): AIModelType[];
  getModelCapabilities(model: AIModelType): {
    maxContextLength: number;
    maxOutputTokens: number;
    supportsRealTime: boolean;
    costPerToken: number;
  };
} 