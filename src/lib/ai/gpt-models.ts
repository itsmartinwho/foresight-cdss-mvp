// OpenAI GPT Model Configurations for Clinical Alerts System
import { AIModelType, AIModelConfig, AI_MODEL_CONFIGS, AIModelCapability } from '@/types/ai-models';

// Export the correct model identifiers
export const GPT_4O_MINI = AIModelType.GPT_4O_MINI;
export const GPT_4O = AIModelType.GPT_4O;
export const GPT_4_TURBO = AIModelType.GPT_4_TURBO;
export const GPT_3_5_TURBO = AIModelType.GPT_3_5_TURBO;
export const O4_MINI = AIModelType.O4_MINI;
export const GPT_4_1_MINI = AIModelType.GPT_4_1_MINI;
export const O3_MINI = AIModelType.O3_MINI;

// Default model for real-time alerts processing - using gpt-4.1-mini for speed and efficiency
export const DEFAULT_REALTIME_MODEL = GPT_4_1_MINI;

// Default model for post-consultation alerts processing - using o4-mini for reasoning capabilities
export const DEFAULT_POST_CONSULTATION_MODEL = O4_MINI;

// Fallback model for when primary models are unavailable
export const FALLBACK_ALERTS_MODEL = GPT_4O_MINI;

// Model selection based on use case
export const getModelForUseCase = (useCase: 'real-time' | 'post-consultation' | 'demo'): AIModelType => {
  switch (useCase) {
    case 'real-time':
      return DEFAULT_REALTIME_MODEL; // gpt-4.1-mini-2025-04-14 for fast response
    case 'post-consultation':
      return DEFAULT_POST_CONSULTATION_MODEL; // o4-mini-2025-04-16 for reasoning
    case 'demo':
      return GPT_4O_MINI; // Cost-effective for demos
    default:
      return FALLBACK_ALERTS_MODEL;
  }
};

// Get model configuration
export const getModelConfig = (modelType: AIModelType): AIModelConfig => {
  return AI_MODEL_CONFIGS[modelType];
};

// Check if model supports specific capabilities
export const modelSupportsCapability = (
  modelType: AIModelType, 
  capability: AIModelCapability
): boolean => {
  const config = getModelConfig(modelType);
  return config.capabilities.includes(capability);
};

// Get optimal model for clinical alerts based on content complexity
export const getOptimalAlertsModel = (
  contentLength: number,
  requiresReasoning: boolean = false,
  isRealTime: boolean = false
): AIModelType => {
  if (isRealTime) {
    // For real-time processing, prioritize speed
    return DEFAULT_REALTIME_MODEL;
  }
  
  if (requiresReasoning || contentLength > 5000) {
    // For complex analysis, use reasoning model
    return DEFAULT_POST_CONSULTATION_MODEL;
  }
  
  // For simple analysis, use fast model
  return DEFAULT_REALTIME_MODEL;
};

// Check if model is a reasoning model
export const isReasoningModel = (model: AIModelType): boolean => {
  return modelSupportsCapability(model, AIModelCapability.REASONING);
};

// Check if model supports multimodal input
export const isMultimodalModel = (model: AIModelType): boolean => {
  return modelSupportsCapability(model, AIModelCapability.MULTIMODAL);
};

// Get model cost per 1000 tokens
export const getModelCost = (model: AIModelType): number => {
  const config = getModelConfig(model);
  return config.costPer1000Tokens;
};

// Validate if a model name is supported
export const validateModelName = (modelName: string): boolean => {
  return Object.values(AIModelType).includes(modelName as AIModelType);
};

// Available models list for validation
export const AVAILABLE_MODELS = Object.values(AIModelType);

// Model recommendations for different scenarios
export const MODEL_RECOMMENDATIONS = {
  REAL_TIME_ALERTS: DEFAULT_REALTIME_MODEL,
  POST_CONSULTATION_ANALYSIS: DEFAULT_POST_CONSULTATION_MODEL,
  COST_OPTIMIZATION: GPT_3_5_TURBO,
  ADVANCED_REASONING: O3_MINI,
  MULTIMODAL_ANALYSIS: GPT_4O,
  FALLBACK: FALLBACK_ALERTS_MODEL
} as const;

export type AvailableModel = typeof AVAILABLE_MODELS[number]; 