'use client';

import React from 'react';
import { UnifiedAlert, AlertType, AlertSeverity } from '@/types/alerts';
import { 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  Pill, 
  FlaskConical, 
  Brain, 
  HelpCircle, 
  Stethoscope,
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  User
} from 'lucide-react';

interface AlertListProps {
  alerts: UnifiedAlert[];
  onAccept?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onNavigate?: (target: string) => void;
  showFilters?: boolean;
  compact?: boolean;
}

export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onAccept,
  onDismiss,
  onNavigate,
  showFilters = true,
  compact = false
}) => {
  // Get icon for alert type
  const getAlertTypeIcon = (type: AlertType) => {
    switch (type) {
      case AlertType.DRUG_INTERACTION:
        return Pill;
      case AlertType.MISSING_LAB_RESULT:
        return FlaskConical;
      case AlertType.COMORBIDITY:
      case AlertType.COMORBIDITY_REMINDER:
        return Activity;
      case AlertType.ASSESSMENT_QUESTION:
        return HelpCircle;
      case AlertType.DIAGNOSTIC_GAP:
        return Brain;
      case AlertType.COMPLEX_CONDITION:
        return Stethoscope;
      default:
        return Info;
    }
  };

  // Get severity styling
  const getSeverityConfig = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return {
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          badgeColor: 'bg-red-100 text-red-800',
          borderAccent: 'border-l-red-500'
        };
      case AlertSeverity.WARNING:
        return {
          bgColor: 'bg-amber-50 border-amber-200',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-900',
          badgeColor: 'bg-amber-100 text-amber-800',
          borderAccent: 'border-l-amber-500'
        };
      case AlertSeverity.INFO:
      default:
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          badgeColor: 'bg-blue-100 text-blue-800',
          borderAccent: 'border-l-blue-500'
        };
    }
  };

  // Format alert type for display
  const formatAlertType = (type: AlertType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Group alerts by category for better organization
  const groupedAlerts = alerts.reduce((groups, alert) => {
    const category = alert.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(alert);
    return groups;
  }, {} as Record<string, UnifiedAlert[]>);

  const handleAccept = (alert: UnifiedAlert) => {
    onAccept?.(alert.id);
    if (alert.navigationTarget) {
      onNavigate?.(alert.navigationTarget);
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Alerts</h3>
        <p className="mt-1 text-sm text-gray-500">
          All alerts have been reviewed or no alerts have been generated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedAlerts).map(([category, categoryAlerts]) => (
        <div key={category} className="space-y-3">
          {/* Category Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {categoryAlerts[0]?.alertType ? formatAlertType(categoryAlerts[0].alertType) : 'General'}
            </h3>
            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {categoryAlerts.length} alert{categoryAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Alerts in Category */}
          <div className="space-y-2">
            {categoryAlerts.map((alert) => {
              const severityConfig = getSeverityConfig(alert.severity);
              const TypeIcon = getAlertTypeIcon(alert.alertType);

              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border ${severityConfig.bgColor} ${severityConfig.borderAccent} border-l-4 p-4 transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Alert Type Icon */}
                    <div className="flex-shrink-0">
                      <TypeIcon className={`h-5 w-5 ${severityConfig.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Title and Badges */}
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`text-sm font-semibold ${severityConfig.titleColor}`}>
                              {alert.title}
                            </h4>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${severityConfig.badgeColor}`}>
                              {alert.severity}
                            </span>
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {formatAlertType(alert.alertType)}
                            </span>
                          </div>

                          {/* Message */}
                          <p className="text-sm text-gray-700 mb-2">
                            {alert.message}
                          </p>

                          {/* Suggestion */}
                          {alert.suggestion && (
                            <div className="mb-3 p-2 bg-white bg-opacity-50 rounded border">
                              <p className="text-xs font-medium text-gray-900 mb-1">
                                Recommended Action:
                              </p>
                              <p className="text-xs text-gray-700">
                                {alert.suggestion}
                              </p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(alert.createdAt).toLocaleString()}</span>
                            </div>
                            {alert.confidenceScore && (
                              <span>Confidence: {Math.round(alert.confidenceScore * 100)}%</span>
                            )}
                            {alert.processingModel && (
                              <span>AI Model: {alert.processingModel}</span>
                            )}
                            {alert.isRealTime && (
                              <span className="text-orange-600 font-medium">Real-time</span>
                            )}
                            {alert.isPostConsultation && (
                              <span className="text-purple-600 font-medium">Post-consultation</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => handleAccept(alert)}
                          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                            alert.severity === AlertSeverity.CRITICAL
                              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                              : alert.severity === AlertSeverity.WARNING
                              ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept & Navigate
                          {alert.navigationTarget && (
                            <ExternalLink className="h-3 w-3 ml-1" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => onDismiss?.(alert.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Dismiss
                        </button>

                        {/* View Details Button (if needed) */}
                        {alert.sourceReasoning && (
                          <button
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                            title="View AI reasoning"
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertList; 