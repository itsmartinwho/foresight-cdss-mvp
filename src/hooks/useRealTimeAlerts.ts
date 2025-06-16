// Real-time Alert Hook
// React hook for managing real-time alert subscriptions during consultations

import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedAlert } from '@/types/alerts';

export interface UseRealTimeAlertsOptions {
  enabled: boolean;
  patientId?: string;
  encounterId?: string;
  onAlert?: (alert: UnifiedAlert) => void;
  onError?: (error: Error) => void;
  maxToasts?: number;
}

export interface RealTimeAlertsState {
  alerts: UnifiedAlert[];
  isProcessing: boolean;
  isSessionActive: boolean;
  sessionStarted: boolean;
  error: string | null;
  stats: {
    activeSessions: number;
    isProcessing: boolean;
  } | null;
}

export function useRealTimeAlerts(options: UseRealTimeAlertsOptions) {
  const {
    enabled = false,
    patientId,
    encounterId,
    onAlert,
    onError,
    maxToasts = 3
  } = options;

  const [state, setState] = useState<RealTimeAlertsState>({
    alerts: [],
    isProcessing: false,
    isSessionActive: false,
    sessionStarted: false,
    error: null,
    stats: null
  });

  const sessionStartedRef = useRef(false);
  const alertsRef = useRef<UnifiedAlert[]>([]);

  // Update refs when state changes
  useEffect(() => {
    alertsRef.current = state.alerts;
  }, [state.alerts]);

  // Start real-time session
  const startSession = useCallback(async () => {
    if (!patientId || !encounterId || sessionStartedRef.current) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const response = await fetch('/api/alerts/real-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          encounterId,
          action: 'start_session'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const result = await response.json();
      
      sessionStartedRef.current = true;
      setState(prev => ({
        ...prev,
        isSessionActive: true,
        sessionStarted: true,
        isProcessing: false,
        stats: result.stats
      }));

      console.log('Real-time alert session started:', result.sessionKey);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({ 
        ...prev, 
        error: err.message, 
        isProcessing: false 
      }));
      onError?.(err);
    }
  }, [patientId, encounterId, onError]);

  // End real-time session
  const endSession = useCallback(async () => {
    if (!patientId || !encounterId || !sessionStartedRef.current) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      const response = await fetch('/api/alerts/real-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          encounterId,
          action: 'end_session'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }

      const result = await response.json();
      
      sessionStartedRef.current = false;
      setState(prev => ({
        ...prev,
        isSessionActive: false,
        sessionStarted: false,
        isProcessing: false,
        alerts: [], // Clear alerts when session ends
        stats: result.stats
      }));

      console.log('Real-time alert session ended');

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({ 
        ...prev, 
        error: err.message, 
        isProcessing: false 
      }));
      onError?.(err);
    }
  }, [patientId, encounterId, onError]);

  // Update transcript
  const updateTranscript = useCallback(async (transcript: string) => {
    if (!patientId || !encounterId || !sessionStartedRef.current) {
      return;
    }

    try {
      const response = await fetch('/api/alerts/real-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          encounterId,
          action: 'update_transcript',
          fullTranscript: transcript
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update transcript: ${response.statusText}`);
      }

      // Don't need to process the response for transcript updates
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({ ...prev, error: err.message }));
      onError?.(err);
    }
  }, [patientId, encounterId, onError]);

  // Force process session (for testing/manual triggers)
  const forceProcess = useCallback(async () => {
    if (!patientId || !encounterId) {
      return [];
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const response = await fetch(
        `/api/alerts/real-time?patientId=${patientId}&encounterId=${encounterId}&action=force_process`
      );

      if (!response.ok) {
        throw new Error(`Failed to force process: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.alerts.length > 0) {
        const newAlerts = result.alerts;
        
        setState(prev => {
          const updatedAlerts = [...prev.alerts, ...newAlerts].slice(-maxToasts);
          return {
            ...prev,
            alerts: updatedAlerts,
            isProcessing: false
          };
        });

        // Trigger callbacks for new alerts
        newAlerts.forEach((alert: UnifiedAlert) => onAlert?.(alert));
        
        return newAlerts;
      }

      setState(prev => ({ ...prev, isProcessing: false }));
      return [];

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({ 
        ...prev, 
        error: err.message, 
        isProcessing: false 
      }));
      onError?.(err);
      return [];
    }
  }, [patientId, encounterId, onAlert, onError, maxToasts]);

  // Get session status
  const getStatus = useCallback(async () => {
    if (!patientId || !encounterId) {
      return null;
    }

    try {
      const response = await fetch(
        `/api/alerts/real-time?patientId=${patientId}&encounterId=${encounterId}&action=status`
      );

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        isSessionActive: result.sessionActive,
        stats: result.processingStats
      }));

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({ ...prev, error: err.message }));
      onError?.(err);
      return null;
    }
  }, [patientId, encounterId, onError]);

  // Remove alert from display
  const removeAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(alert => alert.id !== alertId)
    }));
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, alerts: [] }));
  }, []);

  // Note: Manual session management is preferred over auto-start/stop
  // to avoid infinite loop issues with dependencies. Sessions should be
  // explicitly started/stopped by the consuming component.

  return {
    ...state,
    startSession,
    endSession,
    updateTranscript,
    forceProcess,
    getStatus,
    removeAlert,
    clearAlerts
  };
} 