// Unified Alerts Service
// Replaces and combines the existing alertService and copilotLogic into a single system

import { 
  UnifiedAlert, 
  CreateAlertRequest, 
  UpdateAlertRequest, 
  AlertFilterOptions, 
  AlertQueryResult,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertCategory,
  RealTimeAlertContext,
  PostConsultationAlertContext
} from '@/types/alerts';

import { 
  AIModel, 
  AIProcessingRequest, 
  AIProcessingResponse,
  AIProcessingContext
} from '@/types/ai-models';

import { OpenAIClient, AIModelFactory } from './ai/gpt-models';
import { getRealTimeTemplate } from './ai/prompt-templates';
import { getSupabaseClient } from './supabaseClient';

export class UnifiedAlertsService {
  private realTimeClient: OpenAIClient;
  private postConsultationClient: OpenAIClient;
  private isProcessing: boolean = false;
  private realTimeInterval: NodeJS.Timeout | null = null;
  private supabase = getSupabaseClient();

  constructor() {
    // Initialize AI clients
    this.realTimeClient = new OpenAIClient(
      AIModelFactory.getRecommendedConfigForUseCase('real_time')
    );
    this.postConsultationClient = new OpenAIClient(
      AIModelFactory.getRecommendedConfigForUseCase('post_consultation')
    );
  }

  // ==================== CORE ALERT MANAGEMENT ====================

  async createAlert(request: CreateAlertRequest): Promise<UnifiedAlert | null> {
    try {
      const alertData = {
        patient_id: request.patientId,
        encounter_id: request.encounterId,
        alert_type: request.alertType,
        severity: request.severity,
        category: request.category || AlertCategory.COPILOT,
        title: request.title,
        message: request.message,
        suggestion: request.suggestion,
        confidence_score: request.confidenceScore,
        source_reasoning: request.sourceReasoning,
        processing_model: request.processingModel,
        context_data: request.contextData,
        related_data: request.relatedData,
        navigation_target: request.navigationTarget,
        proposed_edit: request.proposedEdit,
        is_real_time: request.isRealTime || false,
        is_post_consultation: request.isPostConsultation || false,
        expires_at: request.expiresAt,
        tags: request.tags
      };

      const { data, error } = await this.supabase
        .from('alerts')
        .insert(alertData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating alert:', error);
        return null;
      }

      return this.transformDatabaseToAlert(data);
    } catch (error) {
      console.error('Failed to create alert:', error);
      return null;
    }
  }

  async updateAlert(alertId: string, updates: UpdateAlertRequest): Promise<UnifiedAlert | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.acknowledged !== undefined) {
        updateData.acknowledged = updates.acknowledged;
        updateData.acknowledged_at = updates.acknowledged ? new Date().toISOString() : null;
        updateData.acknowledged_by = updates.acknowledgedBy;
      }
      if (updates.actionTaken) updateData.action_taken = updates.actionTaken;
      if (updates.extraData) updateData.extra_data = updates.extraData;

      const { data, error } = await this.supabase
        .from('alerts')
        .update(updateData)
        .eq('id', alertId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating alert:', error);
        return null;
      }

      return this.transformDatabaseToAlert(data);
    } catch (error) {
      console.error('Failed to update alert:', error);
      return null;
    }
  }

  async getAlerts(filters: AlertFilterOptions = {}): Promise<AlertQueryResult> {
    try {
      let query = this.supabase.from('alerts').select('*');

      // Apply filters
      if (filters.patientId) query = query.eq('patient_id', filters.patientId);
      if (filters.encounterId) query = query.eq('encounter_id', filters.encounterId);
      if (filters.alertTypes?.length) query = query.in('alert_type', filters.alertTypes);
      if (filters.severities?.length) query = query.in('severity', filters.severities);
      if (filters.categories?.length) query = query.in('category', filters.categories);
      if (filters.statuses?.length) query = query.in('status', filters.statuses);
      if (filters.isRealTime !== undefined) query = query.eq('is_real_time', filters.isRealTime);
      if (filters.isPostConsultation !== undefined) query = query.eq('is_post_consultation', filters.isPostConsultation);
      if (filters.createdAfter) query = query.gte('created_at', filters.createdAfter);
      if (filters.createdBefore) query = query.lte('created_at', filters.createdBefore);
      
      if (!filters.includeExpired) {
        query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      }

      // Order by severity and creation time
      query = query.order('severity', { ascending: false })
                   .order('created_at', { ascending: false });

      const { data, error } = await supabase.from('alerts').select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching alerts:', error);
        return { alerts: [], totalCount: 0, hasMore: false };
      }

      const alerts = (data || []).map(this.transformDatabaseToAlert);
      
      return {
        alerts,
        totalCount: data?.length || 0,
        hasMore: false // Implement pagination if needed
      };
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return { alerts: [], totalCount: 0, hasMore: false };
    }
  }

  async acceptAlert(alertId: string, userId?: string): Promise<boolean> {
    try {
      const alert = await this.getAlertById(alertId);
      if (!alert) return false;

      // Update alert status
      await this.updateAlert(alertId, {
        status: AlertStatus.ACCEPTED,
        acknowledgedBy: userId,
        actionTaken: 'Alert accepted by user'
      });

      // Handle navigation if specified
      if (alert.navigationTarget) {
        // This would trigger navigation in the UI
        console.log('Navigation target:', alert.navigationTarget);
      }

      return true;
    } catch (error) {
      console.error('Failed to accept alert:', error);
      return false;
    }
  }

  async dismissAlert(alertId: string, userId?: string): Promise<boolean> {
    try {
      return await this.updateAlert(alertId, {
        status: AlertStatus.DISMISSED,
        acknowledgedBy: userId,
        actionTaken: 'Alert dismissed by user'
      }) !== null;
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      return false;
    }
  }

  // ==================== REAL-TIME PROCESSING ====================

  async startRealTimeProcessing(patientId: string, encounterId: string): Promise<void> {
    if (this.realTimeInterval) {
      this.stopRealTimeProcessing();
    }

    this.realTimeInterval = setInterval(async () => {
      await this.processRealTimeAlerts(patientId, encounterId);
    }, 60000); // Every minute

    console.log('Real-time alert processing started for patient:', patientId);
  }

  stopRealTimeProcessing(): void {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
      console.log('Real-time alert processing stopped');
    }
  }

  private async processRealTimeAlerts(patientId: string, encounterId: string): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    try {
      // Get current context
      const context = await this.buildRealTimeContext(patientId, encounterId);
      if (!context) return;

      // Process with AI
      const aiContext = this.buildAIProcessingContext(context);
      const request: AIProcessingRequest = {
        model: AIModel.GPT_4_1_MINI,
        context: aiContext,
        promptTemplate: getRealTimeTemplate(),
        isRealTime: true,
        maxAlerts: 3,
        confidenceThreshold: 0.8
      };

      const response = await this.realTimeClient.processAlerts(request);
      
      if (response.success) {
        // Create alerts from AI response
        for (const aiAlert of response.alerts) {
          const createRequest: CreateAlertRequest = {
            patientId,
            encounterId,
            alertType: aiAlert.type as AlertType,
            severity: aiAlert.severity as AlertSeverity,
            category: AlertCategory.REAL_TIME,
            title: aiAlert.title,
            message: aiAlert.message,
            suggestion: aiAlert.suggestion,
            confidenceScore: aiAlert.confidence,
            sourceReasoning: aiAlert.reasoning,
            processingModel: response.model,
            relatedData: aiAlert.relatedData,
            navigationTarget: aiAlert.navigationTarget,
            proposedEdit: aiAlert.proposedEdit,
            isRealTime: true
          };

          await this.createAlert(createRequest);
        }
      }
    } catch (error) {
      console.error('Real-time processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // ==================== POST-CONSULTATION PROCESSING ====================

  async processPostConsultationAlerts(patientId: string, encounterId: string): Promise<void> {
    try {
      // Get consultation context
      const context = await this.buildPostConsultationContext(patientId, encounterId);
      if (!context) return;

      // Process with comprehensive AI analysis
      const aiContext = this.buildAIProcessingContext(context);
      const request: AIProcessingRequest = {
        model: AIModel.GPT_O3,
        context: aiContext,
        promptTemplate: getRealTimeTemplate(), // Use comprehensive template
        isRealTime: false,
        confidenceThreshold: 0.7
      };

      const response = await this.postConsultationClient.processAlerts(request);
      
      if (response.success) {
        // First, mark relevant real-time alerts as resolved
        await this.refreshRealTimeAlerts(patientId, encounterId, response.alerts);

        // Create new post-consultation alerts
        for (const aiAlert of response.alerts) {
          const createRequest: CreateAlertRequest = {
            patientId,
            encounterId,
            alertType: aiAlert.type as AlertType,
            severity: aiAlert.severity as AlertSeverity,
            category: AlertCategory.POST_CONSULTATION,
            title: aiAlert.title,
            message: aiAlert.message,
            suggestion: aiAlert.suggestion,
            confidenceScore: aiAlert.confidence,
            sourceReasoning: aiAlert.reasoning,
            processingModel: response.model,
            relatedData: aiAlert.relatedData,
            navigationTarget: aiAlert.navigationTarget,
            proposedEdit: aiAlert.proposedEdit,
            isPostConsultation: true
          };

          await this.createAlert(createRequest);
        }
      }
    } catch (error) {
      console.error('Post-consultation processing error:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private async getAlertById(alertId: string): Promise<UnifiedAlert | null> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', alertId)
        .single();

      if (error || !data) return null;
      return this.transformDatabaseToAlert(data);
    } catch (error) {
      console.error('Failed to get alert by ID:', error);
      return null;
    }
  }

  private transformDatabaseToAlert(data: any): UnifiedAlert {
    return {
      id: data.id,
      patientId: data.patient_id,
      encounterId: data.encounter_id,
      alertType: data.alert_type,
      severity: data.severity,
      category: data.category,
      title: data.title,
      message: data.message,
      suggestion: data.suggestion,
      confidenceScore: data.confidence_score,
      sourceReasoning: data.source_reasoning,
      processingModel: data.processing_model,
      contextData: data.context_data,
      status: data.status,
      isRealTime: data.is_real_time,
      isPostConsultation: data.is_post_consultation,
      acknowledged: data.acknowledged,
      acknowledgedAt: data.acknowledged_at,
      acknowledgedBy: data.acknowledged_by,
      dismissedAt: data.dismissed_at,
      dismissedBy: data.dismissed_by,
      acceptedAt: data.accepted_at,
      acceptedBy: data.accepted_by,
      actionTaken: data.action_taken,
      relatedData: data.related_data,
      relatedPatientDataRefs: data.related_patient_data_refs,
      navigationTarget: data.navigation_target,
      proposedEdit: data.proposed_edit,
      legacyAlertData: data.legacy_alert_data,
      migratedFromPatientAlerts: data.migrated_from_patient_alerts,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      expiresAt: data.expires_at,
      tags: data.tags,
      extraData: data.extra_data
    };
  }

  private async buildRealTimeContext(patientId: string, encounterId: string): Promise<RealTimeAlertContext | null> {
    // Implementation would fetch current patient data and transcript
    // This is a simplified version
    return {
      patientId,
      encounterId,
      transcriptSegment: '', // Get latest transcript segment
      fullTranscript: '', // Get full transcript
      patientHistory: {}, // Get patient data
      existingAlerts: [] // Get current alerts
    };
  }

  private async buildPostConsultationContext(patientId: string, encounterId: string): Promise<PostConsultationAlertContext | null> {
    // Implementation would fetch comprehensive consultation data
    return {
      patientId,
      encounterId,
      fullTranscript: '',
      patientHistory: {},
      realTimeAlerts: []
    };
  }

  private buildAIProcessingContext(context: RealTimeAlertContext | PostConsultationAlertContext): AIProcessingContext {
    return {
      patientId: context.patientId,
      encounterId: context.encounterId,
      patientData: {
        demographics: {},
        conditions: [],
        medications: [],
        labResults: [],
        allergies: [],
        vitals: []
      },
      transcript: {
        full: context.fullTranscript,
        segment: 'transcriptSegment' in context ? context.transcriptSegment : undefined
      },
      existingAlerts: context.existingAlerts || []
    };
  }

  private async refreshRealTimeAlerts(patientId: string, encounterId: string, newAlerts: any[]): Promise<void> {
    // Mark real-time alerts as resolved if they've been addressed
    const realTimeAlerts = await this.getAlerts({
      patientId,
      encounterId,
      isRealTime: true,
      statuses: [AlertStatus.ACTIVE]
    });

    for (const alert of realTimeAlerts.alerts) {
      // Logic to determine if alert has been addressed
      // For now, mark all as resolved - this should be more sophisticated
      await this.updateAlert(alert.id, {
        status: AlertStatus.RESOLVED
      });
    }
  }
}

// Singleton instance
export const unifiedAlertsService = new UnifiedAlertsService(); 