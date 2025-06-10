// src/components/copilot/CopilotDisplay.tsx
import React from 'react';
import { CopilotAlert, CopilotAlertSeverity } from '@/types/copilot';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle, Skull } from 'lucide-react'; // Icons for severity

interface CopilotDisplayProps {
  alerts: CopilotAlert[];
}

const CopilotDisplay: React.FC<CopilotDisplayProps> = ({ alerts }) => {
  const getSeverityIcon = (severity: CopilotAlertSeverity) => {
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

  const getSeverityBadgeVariant = (severity: CopilotAlertSeverity) => {
    switch (severity) {
      case CopilotAlertSeverity.INFO:
        return 'default';
      case CopilotAlertSeverity.WARNING:
        return 'destructive'; // Or a custom yellow variant if available
      case CopilotAlertSeverity.CRITICAL:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!alerts || alerts.length === 0) {
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
      {alerts.map((alert) => (
        <Card key={alert.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-start space-x-3 pb-3">
            <div className="pt-1">
              {getSeverityIcon(alert.severity)}
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
            {/* Future: Could render alert.relatedData here in a structured way */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CopilotDisplay;
