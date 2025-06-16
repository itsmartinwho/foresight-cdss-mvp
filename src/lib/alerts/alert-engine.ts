// Main Alert Processing Engine
// Orchestrates the unified alert system for real-time and post-consultation analysis

import { 
  UnifiedAlert, 
  CreateAlertRequest, 
  AlertType, 
  AlertSeverity, 
  AlertStatus,
  AlertCategory,
  RealTimeAlertContext,
  PostConsultationAlertContext,
  AlertProcessor,
  AlertDeduplicator
} from '@/types/alerts';

import { 
  AIModel, 
  AIProcessingRequest, 
  AIProcessingResponse,
  AIProcessingContext 
} from '@/types/ai-models';

import { OpenAIClient } from '../ai/gpt-models';
import { getRealTimeTemplate } from '../ai/prompt-templates';
import { UnifiedAlertsService } from '../unifiedAlertsService';

export class AlertEngine {
  private alertsService: UnifiedAlertsService;
  private realTimeClient: OpenAIClient | null = null;
  private postConsultationClient: OpenAIClient | null = null;
  private deduplicator: AlertDeduplicator;

  constructor() {
    this.alertsService = new UnifiedAlertsService();
    this.deduplicator = this.createDeduplicator();
    
    // Initialize AI clients with lazy loading
    this.initializeAIClients();
  }

  private async initializeAIClients(): Promise<void> {
    try {
      // Real-time client for minute-by-minute processing
      this.realTimeClient = new OpenAIClient({
        model: AIModel.GPT_4_1_MINI,
        maxTokens: 1500,
        temperature: 0.1,
        retryAttempts: 2,
        timeout: 15000, // 15 seconds for real-time
      });

      // Post-consultation client for comprehensive analysis
      this.postConsultationClient = new OpenAIClient({
        model: AIModel.GPT_O3,
        maxTokens: 3000,
        temperature: 0.05,
        retryAttempts: 3,
        timeout: 60000, // 60 seconds for thorough analysis
      });
    } catch (error) {
      console.warn('AI clients not available:', error);
      // Continue in mock mode for development
    }
  }

  // ==================== REAL-TIME PROCESSING ====================

  async processRealTimeAlerts(
    patientId: string, 
    encounterId: string, 
    transcriptSegment: string,
    fullTranscript?: string
  ): Promise<UnifiedAlert[]> {
    try {
      // Build processing context
      const context = await this.buildRealTimeContext(
        patientId, 
        encounterId, 
        transcriptSegment,
        fullTranscript
      );

      if (!context) {
        console.warn('Could not build real-time context');
        return [];
      }

      // Process alerts
      const alertRequests = await this.processWithAI(context, true);
      
      // Deduplicate and create alerts
      const newAlerts: UnifiedAlert[] = [];
      for (const request of alertRequests) {
        if (!this.deduplicator(request, context.existingAlerts)) {
          continue; // Skip duplicate
        }

        const alert = await this.alertsService.createAlert({
          ...request,
          isRealTime: true,
          category: AlertCategory.REAL_TIME
        });

        if (alert) {
          newAlerts.push(alert);
        }
      }

      return newAlerts;
    } catch (error) {
      console.error('Real-time alert processing failed:', error);
      return [];
    }
  }

  // ==================== POST-CONSULTATION PROCESSING ====================

  async processPostConsultationAlerts(
    patientId: string, 
    encounterId: string
  ): Promise<UnifiedAlert[]> {
    try {
      // Build comprehensive context
      const context = await this.buildPostConsultationContext(patientId, encounterId);
      
      if (!context) {
        console.warn('Could not build post-consultation context');
        return [];
      }

      // Process with comprehensive AI analysis
      const alertRequests = await this.processWithAI(context, false);
      
      // Create new alerts and refresh existing ones
      const newAlerts: UnifiedAlert[] = [];
      
      // First, mark old real-time alerts as resolved/outdated
      await this.refreshExistingAlerts(patientId, encounterId, context.realTimeAlerts);

      // Create new comprehensive alerts
      for (const request of alertRequests) {
        const alert = await this.alertsService.createAlert({
          ...request,
          isPostConsultation: true,
          category: AlertCategory.POST_CONSULTATION
        });

        if (alert) {
          newAlerts.push(alert);
        }
      }

      return newAlerts;
    } catch (error) {
      console.error('Post-consultation alert processing failed:', error);
      return [];
    }
  }

  // ==================== AI PROCESSING ====================

  private async processWithAI(
    context: RealTimeAlertContext | PostConsultationAlertContext, 
    isRealTime: boolean
  ): Promise<CreateAlertRequest[]> {
    const client = isRealTime ? this.realTimeClient : this.postConsultationClient;
    
    if (!client) {
      // Fallback to mock alerts for development
      return this.generateMockAlerts(context, isRealTime);
    }

    try {
      const aiContext = this.buildAIProcessingContext(context);
      const request: AIProcessingRequest = {
        model: isRealTime ? AIModel.GPT_4_1_MINI : AIModel.GPT_O3,
        context: aiContext,
        promptTemplate: getRealTimeTemplate(),
        isRealTime,
        maxAlerts: isRealTime ? 3 : 10,
        confidenceThreshold: isRealTime ? 0.8 : 0.7
      };

      const response = await client.processAlerts(request);
      
      if (response.success) {
        return response.alerts.map(aiAlert => ({
          patientId: context.patientId,
          encounterId: context.encounterId,
          alertType: aiAlert.type as AlertType,
          severity: aiAlert.severity as AlertSeverity,
          title: aiAlert.title,
          message: aiAlert.message,
          suggestion: aiAlert.suggestion,
          confidenceScore: aiAlert.confidence,
          sourceReasoning: aiAlert.reasoning,
          processingModel: response.model,
          relatedData: aiAlert.relatedData,
          navigationTarget: aiAlert.navigationTarget,
          proposedEdit: aiAlert.proposedEdit
        }));
      }

      return [];
    } catch (error) {
      console.error('AI processing failed:', error);
      return this.generateMockAlerts(context, isRealTime);
    }
  }

  // ==================== CONTEXT BUILDING ====================

  private async buildRealTimeContext(
    patientId: string, 
    encounterId: string,
    transcriptSegment: string,
    fullTranscript?: string
  ): Promise<RealTimeAlertContext | null> {
    try {
      // Get existing alerts
      const existingAlerts = await this.alertsService.getAlerts({
        patientId,
        encounterId,
        statuses: [AlertStatus.ACTIVE]
      });

      // Get patient history (simplified for now)
      const patientHistory = await this.getPatientHistory(patientId);

      return {
        patientId,
        encounterId,
        transcriptSegment,
        fullTranscript: fullTranscript || transcriptSegment,
        patientHistory,
        existingAlerts: existingAlerts.alerts
      };
    } catch (error) {
      console.error('Failed to build real-time context:', error);
      return null;
    }
  }

  private async buildPostConsultationContext(
    patientId: string, 
    encounterId: string
  ): Promise<PostConsultationAlertContext | null> {
    try {
      // Get real-time alerts from this consultation
      const realTimeAlerts = await this.alertsService.getAlerts({
        patientId,
        encounterId,
        isRealTime: true
      });

      // Get patient history
      const patientHistory = await this.getPatientHistory(patientId);

      // Get consultation data (simplified for now)
      const consultationData = await this.getConsultationData(encounterId);

      return {
        patientId,
        encounterId,
        fullTranscript: consultationData?.transcript || '',
        soapNote: consultationData?.soapNote,
        patientHistory,
        realTimeAlerts: realTimeAlerts.alerts,
        diagnosticResults: consultationData?.diagnosticResults,
        treatments: consultationData?.treatments
      };
    } catch (error) {
      console.error('Failed to build post-consultation context:', error);
      return null;
    }
  }

  private buildAIProcessingContext(
    context: RealTimeAlertContext | PostConsultationAlertContext
  ): AIProcessingContext {
    const existingAlerts = 'existingAlerts' in context 
      ? context.existingAlerts 
      : context.realTimeAlerts || [];
    
    return {
      patientId: context.patientId,
      encounterId: context.encounterId,
      patientData: {
        demographics: context.patientHistory?.demographics || {},
        conditions: context.patientHistory?.conditions || [],
        medications: context.patientHistory?.medications || [],
        labResults: context.patientHistory?.labResults || [],
        allergies: context.patientHistory?.allergies || [],
        vitals: context.patientHistory?.vitals || []
      },
      transcript: {
        full: context.fullTranscript,
        segment: 'transcriptSegment' in context ? context.transcriptSegment : undefined
      },
      existingAlerts: existingAlerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        message: alert.message,
        createdAt: alert.createdAt
      })),
      consultationContext: 'soapNote' in context ? {
        soapNote: context.soapNote,
        diagnosticResults: context.diagnosticResults,
        treatments: Array.isArray(context.treatments) ? context.treatments : []
      } : undefined
    };
  }

  // ==================== HELPER METHODS ====================

  private async getPatientHistory(patientId: string): Promise<Record<string, any>> {
    // TODO: Integrate with patient data service
    // For now, return mock data structure
    return {
      demographics: { age: 45, gender: 'M' },
      conditions: [],
      medications: [],
      labResults: [],
      allergies: [],
      vitals: []
    };
  }

  private async getConsultationData(encounterId: string): Promise<Record<string, any> | null> {
    // TODO: Integrate with consultation service
    // For now, return mock data structure
    return {
      transcript: '',
      soapNote: '',
      diagnosticResults: {},
      treatments: []
    };
  }

  private async refreshExistingAlerts(
    patientId: string, 
    encounterId: string, 
    realTimeAlerts: UnifiedAlert[]
  ): Promise<void> {
    // Mark real-time alerts as resolved since we're doing comprehensive analysis
    for (const alert of realTimeAlerts) {
      if (alert.status === AlertStatus.ACTIVE) {
        await this.alertsService.updateAlert(alert.id, {
          status: AlertStatus.RESOLVED
        });
      }
    }
  }

  private createDeduplicator(): AlertDeduplicator {
    return (newAlert: CreateAlertRequest, existingAlerts: UnifiedAlert[]): boolean => {
      // Check for exact duplicates by message similarity
      const threshold = 0.8;
      
      for (const existing of existingAlerts) {
        if (existing.alertType === newAlert.alertType) {
          // Simple similarity check - in production, use more sophisticated comparison
          const similarity = this.calculateSimilarity(existing.message, newAlert.message);
          if (similarity > threshold) {
            return false; // Skip duplicate
          }
        }
      }
      
      return true; // Not a duplicate
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for demonstration
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private generateMockAlerts(
    context: RealTimeAlertContext | PostConsultationAlertContext,
    isRealTime: boolean
  ): CreateAlertRequest[] {
    // Generate mock alerts for development/testing
    const alerts: CreateAlertRequest[] = [];

    if (isRealTime) {
      alerts.push({
        patientId: context.patientId,
        encounterId: context.encounterId,
        alertType: AlertType.DRUG_INTERACTION,
        severity: AlertSeverity.WARNING,
        title: 'Mock Real-time Alert',
        message: 'This is a simulated real-time alert for development purposes.',
        suggestion: 'This alert is generated for testing the real-time system.',
        confidenceScore: 0.85,
        sourceReasoning: 'Mock alert for development',
        processingModel: 'mock-model'
      });
    } else {
      alerts.push({
        patientId: context.patientId,
        encounterId: context.encounterId,
        alertType: AlertType.COMORBIDITY,
        severity: AlertSeverity.INFO,
        title: 'Mock Post-consultation Alert',
        message: 'This is a simulated post-consultation alert for development purposes.',
        suggestion: 'This alert is generated for testing the comprehensive analysis system.',
        confidenceScore: 0.75,
        sourceReasoning: 'Mock alert for development',
        processingModel: 'mock-model'
      });
    }

    return alerts;
  }
}

// Export singleton instance
export const alertEngine = new AlertEngine();
export default alertEngine; 