// src/components/copilot/CopilotDisplay.tsx
import React from 'react';
import { CopilotAlert, CopilotAlertSeverity } from '@/types/copilot';
import { UnifiedAlert, AlertSeverity } from '@/types/alerts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Warning as AlertTriangle, Skull, Info, WarningCircle as AlertCircle, X, Check } from '@phosphor-icons/react'; // Icons for severity

interface CopilotDisplayProps {
  alerts?: CopilotAlert[];
  unifiedAlerts?: UnifiedAlert[];
  onAlertAction?: (alertId: string, action: 'accept' | 'dismiss') => void;
  showActions?: boolean;
}

const CopilotDisplay: React.FC<CopilotDisplayProps> = ({ 
  alerts = [], 
  unifiedAlerts = [], 
  onAlertAction, 
  showActions = false 
}) => {
  // Legacy copilot severity icons
  const getLegacySeverityIcon = (severity: CopilotAlertSeverity) => {
    switch (severity) {
      case CopilotAlertSeverity.INFO:
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case CopilotAlertSeverity.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case CopilotAlertSeverity.CRITICAL:
        return <Skull className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  // Unified alert severity icons
  const getUnifiedSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.INFO:
        return <Info className="h-5 w-5 text-blue-500" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case AlertSeverity.CRITICAL:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: CopilotAlertSeverity | AlertSeverity) => {
    switch (severity) {
      case CopilotAlertSeverity.INFO:
      case AlertSeverity.INFO:
        return 'default';
      case CopilotAlertSeverity.WARNING:
      case AlertSeverity.WARNING:
        return 'destructive'; // Or a custom yellow variant if available
      case CopilotAlertSeverity.CRITICAL:
      case AlertSeverity.CRITICAL:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const allAlerts = [...alerts, ...unifiedAlerts];

  if (allAlerts.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Medical Co-pilot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active alerts at the moment. Waiting for consultation data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-xl font-semibold">Co-pilot Alerts</h2>
      
      {/* Legacy alerts */}
      {alerts.map((alert) => (
        <Card key={alert.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-start space-x-3 pb-3">
            <div className="pt-1">
              {getLegacySeverityIcon(alert.severity)}
            </div>
            <div>
              <CardTitle className="text-lg">{alert.type.replace(/_/g, ' ')}</CardTitle>
              <CardDescription>{new Date(alert.timestamp).toLocaleTimeString()}</CardDescription>
            </div>
            <div className="ml-auto flex-shrink-0">
              <Badge variant={getSeverityBadgeVariant(alert.severity)}>{alert.severity}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{alert.message}</p>
            {alert.suggestion && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                <strong>Suggestion:</strong> {alert.suggestion}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Unified alerts */}
      {unifiedAlerts.map((alert) => (
        <Card key={alert.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-start space-x-3 pb-3">
            <div className="pt-1">
              {getUnifiedSeverityIcon(alert.severity)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              <CardDescription>{new Date(alert.createdAt).toLocaleTimeString()}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getSeverityBadgeVariant(alert.severity)}>{alert.severity}</Badge>
              {alert.confidenceScore && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(alert.confidenceScore * 100)}%
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{alert.message}</p>
            {alert.suggestion && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                <strong>Suggestion:</strong> {alert.suggestion}
              </p>
            )}
            {alert.sourceReasoning && (
              <p className="mt-2 text-xs text-muted-foreground">
                <strong>Reasoning:</strong> {alert.sourceReasoning}
              </p>
            )}
            {showActions && onAlertAction && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAlertAction(alert.id, 'accept')}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAlertAction(alert.id, 'dismiss')}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CopilotDisplay;
