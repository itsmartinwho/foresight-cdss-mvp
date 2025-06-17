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
  AIProcessingContext,
  AIAlertResult
} from '@/types/ai-models';

import { OpenAIClient, AIModelFactory } from './ai/gpt-models';
import { getRealTimeTemplate } from './ai/prompt-templates';
import { getSupabaseClient } from './supabaseClient';
import { supabaseDataService } from '@/lib/supabaseDataService';

export class UnifiedAlertsService {
  private realTimeClient: OpenAIClient | null = null;
  private postConsultationClient: OpenAIClient | null = null;
  private isProcessing: boolean = false;
  private realTimeInterval: NodeJS.Timeout | null = null;
  private supabase = getSupabaseClient();
  
  // Transcript tracking for real-time processing
  private transcriptState: Map<string, {
    lastProcessedLength: number;
    fullTranscript: string;
  }> = new Map();

  // Performance optimization: Caching
  private patientDataCache: Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }> = new Map();
  
  private alertsCache: Map<string, {
    alerts: UnifiedAlert[];
    timestamp: number;
    ttl: number;
  }> = new Map();

  // Performance optimization: Background processing queue
  private processingQueue: Array<{
    id: string;
    type: 'real_time' | 'post_consultation';
    patientId: string;
    encounterId: string;
    priority: number;
    timestamp: number;
  }> = [];
  
  private isBackgroundProcessing: boolean = false;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly PATIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for patient data

  constructor() {
    // AI clients are now lazy-loaded to prevent initialization errors
    // They will be created when needed and API key is available
    
    // Start background processing
    this.startBackgroundProcessing();
  }

  // Lazy initialization of AI clients
  private getRealtimeClient(): OpenAIClient | null {
    if (!this.realTimeClient) {
      try {
        this.realTimeClient = new OpenAIClient(
          AIModelFactory.getRecommendedConfigForUseCase('real_time')
        );
      } catch (error) {
        console.warn('OpenAI real-time client not available:', error);
        return null;
      }
    }
    return this.realTimeClient;
  }

  private getPostConsultationClient(): OpenAIClient | null {
    if (!this.postConsultationClient) {
      try {
        this.postConsultationClient = new OpenAIClient(
          AIModelFactory.getRecommendedConfigForUseCase('post_consultation')
        );
      } catch (error) {
        console.warn('OpenAI post-consultation client not available:', error);
        return null;
      }
    }
    return this.postConsultationClient;
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
      // Create cache key based on filters
      const cacheKey = `alerts_${JSON.stringify(filters)}`;
      
      // Check cache first for simple patient/encounter queries
      if (filters.patientId && filters.encounterId && Object.keys(filters).length <= 2) {
        const cached = this.getCachedAlerts(`${filters.patientId}_${filters.encounterId}`);
        if (cached) {
          return {
            alerts: cached,
            totalCount: cached.length,
            hasMore: false
          };
        }
      }

      let query = this.supabase.from('alerts').select('*', { count: 'exact' });

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

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        return { alerts: [], totalCount: 0, hasMore: false };
      }

      const alerts = (data || []).map(this.transformDatabaseToAlert);
      
      // Cache the result for simple patient/encounter queries
      if (filters.patientId && filters.encounterId && Object.keys(filters).length <= 2) {
        this.setCachedAlerts(`${filters.patientId}_${filters.encounterId}`, alerts);
      }
      
      return {
        alerts,
        totalCount: count || 0,
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

    this.realTimeInterval = setInterval(() => {
      // Queue real-time processing with high priority
      this.queueBackgroundTask('real_time', patientId, encounterId, 10);
    }, 60000); // Queue every minute

    // Process immediately with highest priority
    this.queueBackgroundTask('real_time', patientId, encounterId, 20);

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

      // Only process if there's new transcript content
      if (!context.transcriptSegment || context.transcriptSegment.trim().length < 50) {
        // Not enough new content to process
        return;
      }

      // Check if AI client is available
      const client = this.getRealtimeClient();
      if (!client) {
        console.log('AI processing not available - using mock alerts for development');
        // Fallback to mock alerts only when explicitly enabled via env var
        if (process.env.NEXT_PUBLIC_ENABLE_MOCK_ALERTS === 'true') {
          await this.createMockAlert(patientId, encounterId, 'real_time');
        }
        return;
      }

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

      const response = await client.processAlerts(request);
      
      if (response?.success) {
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

      // Check if AI client is available
      const client = this.getPostConsultationClient();
      if (!client) {
        console.log('AI processing not available - using mock alerts for development');
        // Fallback to mock alerts only when explicitly enabled via env var
        if (process.env.NEXT_PUBLIC_ENABLE_MOCK_ALERTS === 'true') {
          await this.createMockAlert(patientId, encounterId, 'post_consultation');
        }
        return;
      }

      // Process with comprehensive AI analysis
      const aiContext = this.buildAIProcessingContext(context);
      const request: AIProcessingRequest = {
        model: AIModel.GPT_O3,
        context: aiContext,
        promptTemplate: getRealTimeTemplate(), // Use comprehensive template
        isRealTime: false,
        confidenceThreshold: 0.7
      };

      const response = await client.processAlerts(request);
      
      if (response?.success) {
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
      const { data, error } = await this.supabase
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
    try {
      // Get existing alerts for context
      const existingAlerts = await this.getAlerts({
        patientId,
        encounterId,
        statuses: [AlertStatus.ACTIVE]
      });

      // Get real patient data from the database
      const patientData = await this.getCachedPatientData(patientId);
      if (!patientData) {
        console.warn(`UnifiedAlertsService: Patient ${patientId} not found`);
        return null;
      }

      // Get encounter details including transcript
      const encounter = supabaseDataService.getPatientEncounters(patientId)
        .find(enc => enc.id === encounterId || enc.encounterIdentifier === encounterId);
      
      // Build comprehensive patient history
      const patientHistory = {
        demographics: {
          age: patientData.patient.dateOfBirth ? 
            Math.floor((Date.now() - new Date(patientData.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
            null,
          gender: patientData.patient.gender,
          race: patientData.patient.race,
          ethnicity: patientData.patient.ethnicity,
          maritalStatus: patientData.patient.maritalStatus,
          language: patientData.patient.language
        },
        conditions: supabaseDataService.getPatientDiagnoses(patientId),
        medications: encounter?.treatments || [],
        labResults: supabaseDataService.getPatientLabResults(patientId),
        allergies: [], // TODO: Add allergies to patient data model if needed
        vitals: [], // TODO: Add vitals to patient data model if needed
        existingAlerts: patientData.patient.alerts || []
      };
      
      // Get new transcript segment for real-time processing
      const transcriptSegment = this.getNewTranscriptSegment(patientId, encounterId);
      
      return {
        patientId,
        encounterId,
        transcriptSegment,
        fullTranscript: encounter?.transcript || '',
        patientHistory,
        existingAlerts: existingAlerts.alerts
      };
    } catch (error) {
      console.error('Failed to build real-time context:', error);
      return null;
    }
  }

  private async buildPostConsultationContext(patientId: string, encounterId: string): Promise<PostConsultationAlertContext | null> {
    try {
      // Get real-time alerts from this consultation
      const realTimeAlerts = await this.getAlerts({
        patientId,
        encounterId,
        isRealTime: true
      });

      // Get real patient data from the database
      const patientData = await this.getCachedPatientData(patientId);
      if (!patientData) {
        console.warn(`UnifiedAlertsService: Patient ${patientId} not found`);
        return null;
      }

      // Get encounter details including transcript, SOAP note, treatments
      const encounter = supabaseDataService.getPatientEncounters(patientId)
        .find(enc => enc.id === encounterId || enc.encounterIdentifier === encounterId);

      // Get differential diagnoses if available
      const differentialDx = supabaseDataService.getDifferentialDiagnosesForEncounter(patientId, encounterId);
      
      // Build comprehensive patient history
      const patientHistory = {
        demographics: {
          age: patientData.patient.dateOfBirth ? 
            Math.floor((Date.now() - new Date(patientData.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
            null,
          gender: patientData.patient.gender,
          race: patientData.patient.race,
          ethnicity: patientData.patient.ethnicity,
          maritalStatus: patientData.patient.maritalStatus,
          language: patientData.patient.language
        },
        conditions: supabaseDataService.getPatientDiagnoses(patientId),
        medications: encounter?.treatments || [],
        labResults: supabaseDataService.getPatientLabResults(patientId),
        allergies: [], // TODO: Add allergies to patient data model if needed
        vitals: [], // TODO: Add vitals to patient data model if needed
        existingAlerts: patientData.patient.alerts || [],
        consultationOutcome: {
          transcript: encounter?.transcript || '',
          soapNote: encounter?.soapNote || '',
          treatments: encounter?.treatments || [],
                     differentialDiagnoses: differentialDx.map(dx => ({
             diagnosis: dx.diagnosis_name,
             likelihood: dx.likelihood,
             reasoning: dx.key_factors || ''
           }))
        }
      };
      
      return {
        patientId,
        encounterId,
        fullTranscript: encounter?.transcript || '',
        patientHistory,
        realTimeAlerts: realTimeAlerts.alerts
      };
    } catch (error) {
      console.error('Failed to build post-consultation context:', error);
      return null;
    }
  }

  private buildAIProcessingContext(context: RealTimeAlertContext | PostConsultationAlertContext): AIProcessingContext {
    const existingAlerts = 'existingAlerts' in context ? context.existingAlerts : context.realTimeAlerts || [];
    
    return {
      patientId: context.patientId,
      encounterId: context.encounterId,
      patientData: {
        demographics: context.patientHistory.demographics,
        conditions: context.patientHistory.conditions,
        medications: context.patientHistory.medications,
        labResults: context.patientHistory.labResults,
        allergies: context.patientHistory.allergies,
        vitals: context.patientHistory.vitals
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
      }))
    };
  }

  private async refreshRealTimeAlerts(patientId: string, encounterId: string, newAlerts: AIAlertResult[]): Promise<void> {
    try {
      // Mark real-time alerts as resolved if they've been addressed
      const realTimeAlerts = await this.getAlerts({
        patientId,
        encounterId,
        isRealTime: true,
        statuses: [AlertStatus.ACTIVE]
      });

      for (const alert of realTimeAlerts.alerts) {
        // TODO: More sophisticated logic to determine if alert has been addressed
        // For now, mark all as resolved - this should be enhanced with:
        // - Checking if the concern mentioned in the alert was addressed in the consultation
        // - Comparing alert content with new post-consultation alerts
        // - Using AI to determine if the alert is still relevant
        
        await this.updateAlert(alert.id, {
          status: AlertStatus.RESOLVED
        });
      }
    } catch (error) {
      console.error('Failed to refresh real-time alerts:', error);
    }
  }

  // ==================== TRANSCRIPT INTEGRATION ====================

  /**
   * Update transcript for real-time processing
   * This should be called whenever new transcript content is available
   */
  async updateTranscript(patientId: string, encounterId: string, newTranscript: string): Promise<void> {
    const contextKey = `${patientId}_${encounterId}`;
    
    // Update transcript state
    this.transcriptState.set(contextKey, {
      lastProcessedLength: this.transcriptState.get(contextKey)?.lastProcessedLength || 0,
      fullTranscript: newTranscript
    });

    // Update the encounter in the database
    try {
      await supabaseDataService.updateEncounterTranscript(patientId, encounterId, newTranscript);
    } catch (error) {
      console.warn('Failed to update encounter transcript:', error);
    }
  }

  /**
   * Get the new transcript segment that hasn't been processed yet
   */
  private getNewTranscriptSegment(patientId: string, encounterId: string): string {
    const contextKey = `${patientId}_${encounterId}`;
    const state = this.transcriptState.get(contextKey);
    
    if (!state) return '';
    
    const newSegment = state.fullTranscript.substring(state.lastProcessedLength);
    
    // Update processed length
    this.transcriptState.set(contextKey, {
      ...state,
      lastProcessedLength: state.fullTranscript.length
    });
    
    return newSegment;
  }

  /**
   * Reset transcript tracking (call when consultation starts)
   */
  resetTranscriptTracking(patientId: string, encounterId: string): void {
    const contextKey = `${patientId}_${encounterId}`;
    this.transcriptState.set(contextKey, {
      lastProcessedLength: 0,
      fullTranscript: ''
    });
  }

  // ==================== DEVELOPMENT HELPERS ====================

  private async createMockAlert(patientId: string, encounterId: string, type: 'real_time' | 'post_consultation'): Promise<void> {
    const mockAlerts = [
      {
        alertType: AlertType.DRUG_INTERACTION,
        title: 'Potential Drug Interaction',
        message: 'Mock alert: Potential interaction between existing medications detected.',
        severity: AlertSeverity.WARNING
      },
      {
        alertType: AlertType.COMORBIDITY,
        title: 'Comorbidity Assessment',
        message: 'Mock alert: Consider screening for diabetes based on patient history.',
        severity: AlertSeverity.INFO
      },
      {
        alertType: AlertType.DIAGNOSTIC_GAP,
        title: 'Diagnostic Consideration',
        message: 'Mock alert: Additional lab work may be beneficial for complete assessment.',
        severity: AlertSeverity.INFO
      }
    ];

    const randomAlert = mockAlerts[Math.floor(Math.random() * mockAlerts.length)];
    
    const createRequest: CreateAlertRequest = {
      patientId,
      encounterId,
      alertType: randomAlert.alertType,
      severity: randomAlert.severity,
      category: type === 'real_time' ? AlertCategory.REAL_TIME : AlertCategory.POST_CONSULTATION,
      title: randomAlert.title,
      message: randomAlert.message,
      suggestion: 'This is a mock alert for development purposes.',
      confidenceScore: 0.85,
      sourceReasoning: 'Generated for development/testing purposes',
      processingModel: 'mock-ai-model',
      isRealTime: type === 'real_time',
      isPostConsultation: type === 'post_consultation'
    };

    await this.createAlert(createRequest);
  }

  // ==================== PERFORMANCE OPTIMIZATION ====================

  /**
   * Cache patient data to reduce database queries
   */
  private async getCachedPatientData(patientId: string): Promise<any> {
    const cached = this.patientDataCache.get(patientId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    
    // Fetch fresh data
    const patientData = await supabaseDataService.getPatientData(patientId);
    
    // Cache the result
    this.patientDataCache.set(patientId, {
      data: patientData,
      timestamp: now,
      ttl: this.PATIENT_CACHE_TTL
    });
    
    return patientData;
  }

  /**
   * Cache alerts to reduce database queries
   */
  private getCachedAlerts(cacheKey: string): UnifiedAlert[] | null {
    const cached = this.alertsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.alerts;
    }
    
    return null;
  }

  /**
   * Set alerts in cache
   */
  private setCachedAlerts(cacheKey: string, alerts: UnifiedAlert[]): void {
    this.alertsCache.set(cacheKey, {
      alerts,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  }

  /**
   * Clear cache for a specific patient/encounter
   */
  clearCache(patientId: string, encounterId?: string): void {
    // Clear patient data cache
    this.patientDataCache.delete(patientId);
    
    // Clear relevant alerts cache
    if (encounterId) {
      const cacheKey = `${patientId}_${encounterId}`;
      this.alertsCache.delete(cacheKey);
    } else {
      // Clear all alerts cache for the patient
      Array.from(this.alertsCache.keys())
        .filter(key => key.startsWith(`${patientId}_`))
        .forEach(key => this.alertsCache.delete(key));
    }
  }

  /**
   * Add task to background processing queue
   */
  private queueBackgroundTask(
    type: 'real_time' | 'post_consultation',
    patientId: string,
    encounterId: string,
    priority: number = 1
  ): void {
    const taskId = `${type}_${patientId}_${encounterId}_${Date.now()}`;
    
    this.processingQueue.push({
      id: taskId,
      type,
      patientId,
      encounterId,
      priority,
      timestamp: Date.now()
    });
    
    // Sort by priority (higher priority first)
    this.processingQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Background processing loop
   */
  private startBackgroundProcessing(): void {
    setInterval(async () => {
      if (this.isBackgroundProcessing || this.processingQueue.length === 0) {
        return;
      }
      
      this.isBackgroundProcessing = true;
      
      try {
        const task = this.processingQueue.shift();
        if (!task) return;
        
        // Process task based on type
        if (task.type === 'real_time') {
          await this.processRealTimeAlerts(task.patientId, task.encounterId);
        } else if (task.type === 'post_consultation') {
          await this.processPostConsultationAlerts(task.patientId, task.encounterId);
        }
        
        // Clear cache after processing to ensure fresh data next time
        this.clearCache(task.patientId, task.encounterId);
        
      } catch (error) {
        console.error('Background processing error:', error);
      } finally {
        this.isBackgroundProcessing = false;
      }
    }, 2000); // Process every 2 seconds
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    cacheHitRatio: number;
    queueLength: number;
    isProcessing: boolean;
    cachedPatients: number;
    cachedAlerts: number;
  } {
    return {
      cacheHitRatio: 0, // TODO: Implement cache hit tracking
      queueLength: this.processingQueue.length,
      isProcessing: this.isBackgroundProcessing,
      cachedPatients: this.patientDataCache.size,
      cachedAlerts: this.alertsCache.size
    };
  }
}

// Export singleton instance
export const unifiedAlertsService = new UnifiedAlertsService(); 