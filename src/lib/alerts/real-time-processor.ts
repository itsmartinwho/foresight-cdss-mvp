// Real-time Alert Processor
// Handles minute-by-minute transcript analysis during active consultations

import { 
  UnifiedAlert, 
  RealTimeAlertContext,
  AlertType,
  AlertSeverity 
} from '@/types/alerts';

import { alertEngine } from './alert-engine';
import { UnifiedAlertsService } from '../unifiedAlertsService';

export interface RealTimeProcessorConfig {
  intervalMs: number; // Processing interval (default: 60000ms = 1 minute)
  maxAlertsPerCycle: number; // Maximum alerts per processing cycle
  confidenceThreshold: number; // Minimum confidence for real-time alerts
  batchSize: number; // Transcript segment size for processing
}

export interface ConsultationSession {
  patientId: string;
  encounterId: string;
  isActive: boolean;
  startTime: Date;
  lastProcessedIndex: number;
  currentTranscript: string;
  accumulatedAlerts: UnifiedAlert[];
}

export class RealTimeProcessor {
  private config: RealTimeProcessorConfig;
  private activeSessions: Map<string, ConsultationSession> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private alertsService: UnifiedAlertsService;
  private onAlertCallback?: (alert: UnifiedAlert) => void;

  constructor(config: Partial<RealTimeProcessorConfig> = {}) {
    this.config = {
      intervalMs: config.intervalMs || 10000, // Process every 10 seconds for more responsive alerts (was 60000)
      maxAlertsPerCycle: config.maxAlertsPerCycle || 3,
      confidenceThreshold: config.confidenceThreshold || 0.8,
      batchSize: config.batchSize || 200 // Reduced batch size for more frequent processing (was 500)
    };

    this.alertsService = new UnifiedAlertsService();
  }

  // ==================== SESSION MANAGEMENT ====================

  startSession(patientId: string, encounterId: string): void {
    const sessionKey = `${patientId}:${encounterId}`;
    
    if (this.activeSessions.has(sessionKey)) {
      console.warn(`Session already active for ${sessionKey}`);
      return;
    }

    const session: ConsultationSession = {
      patientId,
      encounterId,
      isActive: true,
      startTime: new Date(),
      lastProcessedIndex: 0,
      currentTranscript: '',
      accumulatedAlerts: []
    };

    this.activeSessions.set(sessionKey, session);
    console.log(`Started real-time processing session: ${sessionKey}`);

    // Initialize transcript tracking in the unified alerts service
    this.alertsService.resetTranscriptTracking(patientId, encounterId);

    // Start processing if this is the first session
    if (this.activeSessions.size === 1) {
      this.startProcessing();
    }
  }

  endSession(patientId: string, encounterId: string): void {
    const sessionKey = `${patientId}:${encounterId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session) {
      console.warn(`No active session found for ${sessionKey}`);
      return;
    }

    session.isActive = false;
    this.activeSessions.delete(sessionKey);
    console.log(`Ended real-time processing session: ${sessionKey}`);

    // Stop processing if no active sessions remain
    if (this.activeSessions.size === 0) {
      this.stopProcessing();
    }
  }

  async updateTranscript(patientId: string, encounterId: string, transcript: string): Promise<void> {
    const sessionKey = `${patientId}:${encounterId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session || !session.isActive) {
      console.warn(`No active session found for transcript update: ${sessionKey}`);
      return;
    }

    session.currentTranscript = transcript;
    
    // Update transcript in the unified alerts service
    await this.alertsService.updateTranscript(patientId, encounterId, transcript);
  }

  // ==================== PROCESSING CONTROL ====================

  private startProcessing(): void {
    if (this.processingInterval) {
      return; // Already running
    }

    console.log('Starting real-time alert processing...');
    this.processingInterval = setInterval(() => {
      this.processAllSessions();
    }, this.config.intervalMs);

    // Process immediately for the first cycle
    this.processAllSessions();
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped real-time alert processing');
    }
  }

  private async processAllSessions(): Promise<void> {
    const sessions = Array.from(this.activeSessions.values()).filter(s => s.isActive);
    
    if (sessions.length === 0) {
      return;
    }

    console.log(`Processing ${sessions.length} active consultation sessions`);

    // Process sessions in parallel for efficiency
    await Promise.allSettled(
      sessions.map(session => this.processSession(session))
    );
  }

  // ==================== INDIVIDUAL SESSION PROCESSING ====================

  private async processSession(session: ConsultationSession): Promise<void> {
    try {
      // Check if there's new transcript content to process
      const newContent = this.getNewTranscriptContent(session);
      
      if (!newContent || newContent.trim().length < 20) {
        // Not enough new content to warrant processing (reduced from 50 to 20 characters)
        return;
      }

      console.log(`[RealTimeProcessor] Processing new content for ${session.patientId}:${session.encounterId}`, {
        newContentLength: newContent.length,
        newContentPreview: newContent.substring(0, 100) + '...'
      });

      console.log(`Processing new content for session ${session.patientId}:${session.encounterId}`);

      // Process the new transcript segment
      const newAlerts = await alertEngine.processRealTimeAlerts(
        session.patientId,
        session.encounterId,
        newContent,
        session.currentTranscript
      );

      // Update session state
      session.lastProcessedIndex = session.currentTranscript.length;
      session.accumulatedAlerts.push(...newAlerts);

      // Trigger callbacks for new alerts
      newAlerts.forEach(alert => {
        this.onAlertCallback?.(alert);
      });

      // Limit accumulated alerts to prevent memory issues
      if (session.accumulatedAlerts.length > 50) {
        session.accumulatedAlerts = session.accumulatedAlerts.slice(-30);
      }

    } catch (error) {
      console.error(`Error processing session ${session.patientId}:${session.encounterId}:`, error);
    }
  }

  private getNewTranscriptContent(session: ConsultationSession): string {
    const transcript = session.currentTranscript || '';
    
    if (transcript.length <= session.lastProcessedIndex) {
      return ''; // No new content
    }

    // Get new content since last processing
    const newContent = transcript.substring(session.lastProcessedIndex);
    
    // If new content is too long, take the last batch size
    if (newContent.length > this.config.batchSize * 2) {
      return newContent.substring(newContent.length - this.config.batchSize);
    }

    return newContent;
  }

  // ==================== UTILITY METHODS ====================

  setAlertCallback(callback: (alert: UnifiedAlert) => void): void {
    this.onAlertCallback = callback;
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  getSessionInfo(patientId: string, encounterId: string): ConsultationSession | null {
    const sessionKey = `${patientId}:${encounterId}`;
    return this.activeSessions.get(sessionKey) || null;
  }

  // Force process a specific session (for testing/manual triggers)
  async forceProcessSession(patientId: string, encounterId: string): Promise<UnifiedAlert[]> {
    const sessionKey = `${patientId}:${encounterId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session) {
      throw new Error(`No active session found: ${sessionKey}`);
    }

    await this.processSession(session);
    return session.accumulatedAlerts.slice(-this.config.maxAlertsPerCycle);
  }

  // Get processing statistics
  getStats(): {
    activeSessions: number;
    isProcessing: boolean;
    config: RealTimeProcessorConfig;
  } {
    return {
      activeSessions: this.activeSessions.size,
      isProcessing: !!this.processingInterval,
      config: this.config
    };
  }

  // ==================== DEVELOPMENT/TESTING METHODS ====================

  // Simulate transcript updates for testing
  simulateTranscriptUpdate(
    patientId: string, 
    encounterId: string, 
    additionalContent: string
  ): void {
    const sessionKey = `${patientId}:${encounterId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session) {
      console.warn(`No session found for simulation: ${sessionKey}`);
      return;
    }

    session.currentTranscript += ' ' + additionalContent;
    console.log(`Simulated transcript update for ${sessionKey}`);
  }

  // Create mock session for testing
  createMockSession(patientId: string, encounterId: string, mockTranscript: string): void {
    this.startSession(patientId, encounterId);
    this.updateTranscript(patientId, encounterId, mockTranscript);
  }

  // Clean up all sessions (for testing)
  cleanup(): void {
    this.stopProcessing();
    this.activeSessions.clear();
    console.log('Real-time processor cleaned up');
  }
}

// Export singleton instance
export const realTimeProcessor = new RealTimeProcessor();
export default realTimeProcessor; 