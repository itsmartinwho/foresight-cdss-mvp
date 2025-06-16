'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedAlert, AlertSeverity } from '@/types/alerts';
import AlertToast from './AlertToast';

interface RealTimeAlertManagerProps {
  patientId?: string;
  encounterId?: string;
  onAlertAccept?: (alertId: string) => void;
  onAlertDismiss?: (alertId: string) => void;
  onNavigate?: (target: string) => void;
  maxVisibleAlerts?: number;
  defaultToastDuration?: number;
}

interface ActiveToast {
  alert: UnifiedAlert;
  id: string;
  createdAt: number;
}

export const RealTimeAlertManager: React.FC<RealTimeAlertManagerProps> = ({
  patientId,
  encounterId,
  onAlertAccept,
  onAlertDismiss,
  onNavigate,
  maxVisibleAlerts = 3,
  defaultToastDuration = 8000
}) => {
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);
  const [alertQueue, setAlertQueue] = useState<UnifiedAlert[]>([]);

  // Mock function to simulate receiving real-time alerts
  // In production, this would be replaced with WebSocket or polling mechanism
  const simulateRealTimeAlert = useCallback(() => {
    if (!patientId || !encounterId) return;

    // This is a mock alert for demonstration
    const mockAlert: UnifiedAlert = {
      id: `alert_${Date.now()}`,
      patientId,
      encounterId,
      alertType: 'DRUG_INTERACTION' as any,
      severity: AlertSeverity.WARNING,
      category: 'real_time' as any,
      title: 'Potential Drug Interaction',
      message: 'Interaction detected between newly prescribed medication and existing therapy.',
      suggestion: 'Review medication list and consider alternative therapy.',
      confidenceScore: 0.85,
      sourceReasoning: 'AI detected potential interaction based on pharmacological data.',
      processingModel: 'gpt-4.1-mini',
      status: 'active' as any,
      isRealTime: true,
      isPostConsultation: false,
      acknowledged: false,
      migratedFromPatientAlerts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      navigationTarget: '/patients/' + patientId + '/medications'
    };

    addAlert(mockAlert);
  }, [patientId, encounterId]);

  // Add new alert to the system
  const addAlert = useCallback((alert: UnifiedAlert) => {
    const newToast: ActiveToast = {
      alert,
      id: `toast_${alert.id}_${Date.now()}`,
      createdAt: Date.now()
    };

    setActiveToasts(current => {
      const updated = [...current];
      
      // If we're at capacity, queue the alert
      if (updated.length >= maxVisibleAlerts) {
        setAlertQueue(queue => [...queue, alert]);
        return updated;
      }
      
      // Add new toast, prioritizing by severity
      updated.push(newToast);
      return updated.sort((a, b) => {
        // Sort by severity first (Critical > Warning > Info)
        const severityOrder = { 
          [AlertSeverity.CRITICAL]: 3, 
          [AlertSeverity.WARNING]: 2, 
          [AlertSeverity.INFO]: 1 
        };
        
        const severityDiff = severityOrder[b.alert.severity] - severityOrder[a.alert.severity];
        if (severityDiff !== 0) return severityDiff;
        
        // Then by creation time (newer first)
        return b.createdAt - a.createdAt;
      });
    });
  }, [maxVisibleAlerts]);

  // Remove toast and show next queued alert if any
  const removeToast = useCallback((toastId: string) => {
    setActiveToasts(current => {
      const filtered = current.filter(toast => toast.id !== toastId);
      
      // If there are queued alerts and we have space, show the next one
      if (filtered.length < maxVisibleAlerts) {
        setAlertQueue(queue => {
          if (queue.length > 0) {
            const nextAlert = queue[0];
            const remainingQueue = queue.slice(1);
            
            // Add the next queued alert as a toast
            const newToast: ActiveToast = {
              alert: nextAlert,
              id: `toast_${nextAlert.id}_${Date.now()}`,
              createdAt: Date.now()
            };
            
            filtered.push(newToast);
            return remainingQueue;
          }
          return queue;
        });
      }
      
      return filtered;
    });
  }, [maxVisibleAlerts]);

  // Handle alert acceptance
  const handleAlertAccept = useCallback((alertId: string) => {
    const toast = activeToasts.find(t => t.alert.id === alertId);
    if (toast) {
      removeToast(toast.id);
      onAlertAccept?.(alertId);
      
      // Handle navigation if specified
      if (toast.alert.navigationTarget) {
        onNavigate?.(toast.alert.navigationTarget);
      }
    }
  }, [activeToasts, removeToast, onAlertAccept, onNavigate]);

  // Handle alert dismissal
  const handleAlertDismiss = useCallback((alertId: string) => {
    const toast = activeToasts.find(t => t.alert.id === alertId);
    if (toast) {
      removeToast(toast.id);
      onAlertDismiss?.(alertId);
    }
  }, [activeToasts, removeToast, onAlertDismiss]);

  // Handle toast expiration
  const handleToastExpire = useCallback((toastId: string) => {
    removeToast(toastId);
  }, [removeToast]);

  // Demo: Add a mock alert every 30 seconds for testing
  useEffect(() => {
    if (!patientId || !encounterId) return;

    // Uncomment for testing real-time alerts
    // const interval = setInterval(simulateRealTimeAlert, 30000);
    // return () => clearInterval(interval);
  }, [patientId, encounterId, simulateRealTimeAlert]);

  // Calculate positions for stacked toasts
  const getToastPosition = (index: number) => {
    const baseTop = 16; // 1rem in pixels
    const spacing = 120; // Space between toasts
    return baseTop + (index * spacing);
  };

  // Get appropriate duration based on severity
  const getToastDuration = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return defaultToastDuration * 2; // 16 seconds for critical alerts
      case AlertSeverity.WARNING:
        return defaultToastDuration * 1.5; // 12 seconds for warnings
      case AlertSeverity.INFO:
      default:
        return defaultToastDuration; // 8 seconds for info
    }
  };

  return (
    <>
      {/* Active Toast Notifications */}
      {activeToasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${getToastPosition(index)}px`,
            right: '1rem',
            zIndex: 9999 - index, // Ensure proper layering
          }}
        >
          <AlertToast
            alert={toast.alert}
            duration={getToastDuration(toast.alert.severity)}
            onExpire={() => handleToastExpire(toast.id)}
            onAccept={handleAlertAccept}
            onDismiss={handleAlertDismiss}
            onHover={() => {
              // Optional: Pause auto-dismiss for all toasts when one is hovered
            }}
            onLeave={() => {
              // Optional: Resume auto-dismiss
            }}
          />
        </div>
      ))}

      {/* Queue Indicator (optional) */}
      {alertQueue.length > 0 && (
        <div
          className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50"
          style={{ zIndex: 9990 }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {alertQueue.length} more alert{alertQueue.length !== 1 ? 's' : ''} pending
            </span>
          </div>
        </div>
      )}

      {/* Development/Testing Controls (remove in production) */}
      {process.env.NODE_ENV === 'development' && patientId && encounterId && (
        <div className="fixed bottom-4 left-4 bg-gray-100 p-2 rounded border z-50">
          <button
            onClick={simulateRealTimeAlert}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Simulate Alert
          </button>
        </div>
      )}
    </>
  );
};

export default RealTimeAlertManager; 