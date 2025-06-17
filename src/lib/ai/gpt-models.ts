// GPT Models Integration
// Core implementation for integrating with OpenAI GPT models for alert processing

import { 
  AIModel, 
  AIModelConfig, 
  AIProcessingRequest, 
  AIProcessingResponse, 
  AIAPIClient,
  AIProcessingError,
  AI_MODEL_PRESETS
} from '@/types/ai-models';

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

export class OpenAIClient implements AIAPIClient {
  private apiKey: string;
  private config: AIModelConfig;

  constructor(config: AIModelConfig, apiKey?: string) {
    this.config = config;
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 1
        })
      });
      
      return response.status !== 401;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  async getModelStatus(model: AIModel): Promise<'available' | 'unavailable' | 'rate_limited'> {
    try {
      const response = await fetch(`${OPENAI_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Status check' }],
          max_tokens: 1
        })
      });

      if (response.status === 429) return 'rate_limited';
      if (response.status === 404) return 'unavailable';
      if (response.ok) return 'available';
      
      return 'unavailable';
    } catch (error) {
      console.error('Model status check failed:', error);
      return 'unavailable';
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  async processAlerts(request: AIProcessingRequest): Promise<AIProcessingResponse> {
    const startTime = Date.now();
    
    try {
      // Build the prompt
      const prompt = this.buildPrompt(request);
      
      // Validate prompt length
      const estimatedTokens = this.estimateTokens(prompt.systemPrompt + prompt.userPrompt);
      const maxContextTokens = this.getMaxContextTokens(request.model);
      
             if (estimatedTokens > maxContextTokens) {
         throw new Error(`Prompt too large: ${estimatedTokens} tokens (max: ${maxContextTokens})`);
       }

      // Make API request with retries
      const response = await this.makeRequestWithRetry({
        model: request.model,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt }
        ],
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.1,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty
      });

      // Parse the response
      const alerts = this.parseAIResponse(response.choices[0].message.content, request);
      
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        alerts,
        processingTime,
        tokensUsed: {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        },
        model: response.model
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        alerts: [],
        processingTime,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async makeRequestWithRetry(payload: any): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < (this.config.retryAttempts || MAX_RETRIES); attempt++) {
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout || 60000)
        });

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(response.headers.get('retry-after') || '60');
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < (this.config.retryAttempts || MAX_RETRIES) - 1) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private buildPrompt(request: AIProcessingRequest): { systemPrompt: string; userPrompt: string } {
    const { context, promptTemplate, isRealTime } = request;
    
    // Build system prompt
    const systemPrompt = promptTemplate.systemPrompt
      .replace('{ALERT_TYPES}', promptTemplate.alertTypes.join(', '))
      .replace('{CONFIDENCE_THRESHOLD}', (request.confidenceThreshold || 0.7).toString())
      .replace('{IS_REAL_TIME}', isRealTime.toString());

    // Build user prompt with context
    const patientContext = this.formatPatientContext(context);
    const transcriptContext = isRealTime 
      ? context.transcript.segment || context.transcript.full
      : context.transcript.full;
    const existingAlertsContext = this.formatExistingAlerts(context.existingAlerts);
    
    const userPrompt = promptTemplate.userPromptTemplate
      .replace('{PATIENT_CONTEXT}', patientContext)
      .replace('{TRANSCRIPT}', transcriptContext)
      .replace('{EXISTING_ALERTS}', existingAlertsContext)
      .replace('{CONSULTATION_CONTEXT}', this.formatConsultationContext(context.consultationContext));

    return { systemPrompt, userPrompt };
  }

  private formatPatientContext(context: any): string {
    const { patientData } = context;
    
    let patientContext = `Patient Demographics:\n`;
    if (patientData.demographics) {
      patientContext += `- Age: ${patientData.demographics.age || 'Unknown'}\n`;
      patientContext += `- Gender: ${patientData.demographics.gender || 'Unknown'}\n`;
    }

    if (patientData.conditions?.length > 0) {
      patientContext += `\nMedical Conditions:\n`;
      patientData.conditions.forEach((condition: any) => {
        patientContext += `- ${condition.description || condition.name} (${condition.clinical_status || 'active'})\n`;
      });
    }

    if (patientData.medications?.length > 0) {
      patientContext += `\nCurrent Medications:\n`;
      patientData.medications.forEach((med: any) => {
        patientContext += `- ${med.name || med.drug} ${med.dosage ? `(${med.dosage})` : ''}\n`;
      });
    }

    if (patientData.labResults?.length > 0) {
      patientContext += `\nRecent Lab Results:\n`;
      patientData.labResults.forEach((lab: any) => {
        patientContext += `- ${lab.name}: ${lab.value} ${lab.units || ''} (${lab.flag || 'Normal'})\n`;
      });
    }

    if (patientData.allergies?.length > 0) {
      patientContext += `\nAllergies: ${patientData.allergies.join(', ')}\n`;
    }

    return patientContext;
  }

  private formatExistingAlerts(alerts: any[]): string {
    if (!alerts || alerts.length === 0) {
      return 'No existing alerts.';
    }

    let alertsContext = 'Existing Alerts (do not repeat these):\n';
    alerts.forEach(alert => {
      alertsContext += `- ${alert.type}: ${alert.message} (${alert.createdAt})\n`;
    });

    return alertsContext;
  }

  private formatConsultationContext(consultationContext?: any): string {
    if (!consultationContext) {
      return 'No additional consultation context available.';
    }

    let context = '';
    
    if (consultationContext.soapNote) {
      context += `SOAP Note:\n${consultationContext.soapNote}\n\n`;
    }

    if (consultationContext.diagnosticResults) {
      context += `Diagnostic Results:\n${JSON.stringify(consultationContext.diagnosticResults, null, 2)}\n\n`;
    }

    if (consultationContext.treatments?.length > 0) {
      context += `Treatments:\n`;
      consultationContext.treatments.forEach((treatment: any) => {
        context += `- ${treatment.drug || treatment.name}: ${treatment.status || 'prescribed'}\n`;
      });
    }

    return context || 'No additional consultation context available.';
  }

  private parseAIResponse(content: string, request: AIProcessingRequest): any[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      
      if (Array.isArray(parsed)) {
        return parsed.filter(alert => 
          alert.confidence >= (request.confidenceThreshold || 0.7)
        );
      }
      
      if (parsed.alerts && Array.isArray(parsed.alerts)) {
        return parsed.alerts.filter(alert => 
          alert.confidence >= (request.confidenceThreshold || 0.7)
        );
      }

      return [];
    } catch (error) {
      console.log('AI response is not JSON, attempting to extract JSON from text...');
      
      // Try to extract JSON from text response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.alerts && Array.isArray(parsed.alerts)) {
            return parsed.alerts.filter(alert => 
              alert.confidence >= (request.confidenceThreshold || 0.7)
            );
          }
        } catch (nestedError) {
          console.log('Could not extract valid JSON from text response');
        }
      }
      
      // If we get a text response about clinical recommendations, convert to alert
      console.log('Converting text response to alert format...');
      if (content.toLowerCase().includes('methotrexate') || 
          content.toLowerCase().includes('monitoring') ||
          content.toLowerCase().includes('interaction')) {
        return [{
          type: 'MONITORING',
          severity: 'INFO',
          title: 'Clinical Monitoring Recommendation',
          message: content.substring(0, 200) + '...',
          suggestion: 'Review full clinical assessment for detailed recommendations',
          confidence: 0.8,
          reasoning: 'AI provided clinical recommendations in text format'
        }];
      }
      
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content.substring(0, 500) + '...');
      return [];
    }
  }

  private getMaxContextTokens(model: AIModel): number {
    switch (model) {
      case AIModel.GPT_4O_MINI:
        return 128000;
      case AIModel.GPT_4O:
        return 128000;
      case AIModel.GPT_4_TURBO:
        return 128000;
      case AIModel.GPT_3_5_TURBO:
        return 16000;
      default:
        return 4000; // Conservative fallback
    }
  }
}

// Factory for creating AI clients
export class AIModelFactory {
  static createClient(config: AIModelConfig): AIAPIClient {
    return new OpenAIClient(config);
  }

  static getAvailableModels(): AIModel[] {
    return Object.values(AIModel);
  }

  static getModelCapabilities(model: AIModel) {
    switch (model) {
      case AIModel.GPT_4O_MINI:
        return {
          maxContextLength: 128000,
          maxOutputTokens: 16000,
          supportsRealTime: true,
          costPerToken: 0.00000015
        };
      case AIModel.GPT_4O:
        return {
          maxContextLength: 128000,
          maxOutputTokens: 16000,
          supportsRealTime: true,
          costPerToken: 0.000005
        };
      case AIModel.GPT_4_TURBO:
        return {
          maxContextLength: 128000,
          maxOutputTokens: 4000,
          supportsRealTime: true,
          costPerToken: 0.00001
        };
      case AIModel.GPT_3_5_TURBO:
        return {
          maxContextLength: 16000,
          maxOutputTokens: 4000,
          supportsRealTime: true,
          costPerToken: 0.0000015
        };
      default:
        return {
          maxContextLength: 4000,
          maxOutputTokens: 1000,
          supportsRealTime: false,
          costPerToken: 0.00001
        };
    }
  }

  static getRecommendedConfigForUseCase(useCase: 'real_time' | 'post_consultation' | 'fallback'): AIModelConfig {
    switch (useCase) {
      case 'real_time':
        return AI_MODEL_PRESETS.REAL_TIME_FAST;
      case 'post_consultation':
        return AI_MODEL_PRESETS.POST_CONSULTATION_COMPREHENSIVE;
      case 'fallback':
        return AI_MODEL_PRESETS.FALLBACK_RELIABLE;
      default:
        return AI_MODEL_PRESETS.REAL_TIME_FAST;
    }
  }
}

// Utility functions
export function estimateTokenCost(tokens: number, model: AIModel): number {
  const capabilities = AIModelFactory.getModelCapabilities(model);
  return tokens * capabilities.costPerToken;
}

export function selectOptimalModel(context: any, isRealTime: boolean): AIModel {
  const estimatedTokens = new OpenAIClient(AI_MODEL_PRESETS.REAL_TIME_FAST).estimateTokens(
    JSON.stringify(context)
  );

  if (isRealTime) {
    return estimatedTokens < 50000 ? AIModel.GPT_4O_MINI : AIModel.GPT_3_5_TURBO;
  } else {
    return estimatedTokens < 100000 ? AIModel.GPT_4O : AIModel.GPT_4O_MINI;
  }
} 