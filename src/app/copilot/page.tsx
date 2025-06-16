// src/app/copilot/page.tsx
'use client'; // Required for useState and event handlers

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Bot,
  TestTube,
  Stethoscope,
  CheckCircle
} from 'lucide-react';

// Legacy copilot components
import { checkForDrugInteractions, checkForMissingLabs } from '@/lib/copilotLogic';
import { CopilotAlert } from '@/types/copilot';
import { mockPatientData, mockDrugInteractions, mockLabRequirements } from '@/data/mockCopilotData';

// New unified components
import RealTimeAlertManager from '@/components/alerts/RealTimeAlertManager';
import AlertDashboard from '@/components/alerts/AlertDashboard';
import { UnifiedAlertsService } from '@/lib/unifiedAlertsService';
import { UnifiedAlert } from '@/types/alerts';

export default function CopilotPage() {
  // Legacy state for backward compatibility
  const [legacyAlerts, setLegacyAlerts] = useState<CopilotAlert[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);

  // New unified system state
  const [isInConsultation, setIsInConsultation] = useState(false);
  const [consultationId, setConsultationId] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('test-patient-123');
  const [alertHistory, setAlertHistory] = useState<UnifiedAlert[]>([]);
  const [alertsService] = useState(() => new UnifiedAlertsService());

  // Auto-start real-time processing when consultation begins
  useEffect(() => {
    if (isInConsultation && consultationId) {
      console.log('Auto-starting real-time processing for consultation:', consultationId);
      // Real-time processing will automatically start via RealTimeAlertManager
    }
  }, [isInConsultation, consultationId]);

  const startConsultation = () => {
    const newConsultationId = `consultation-${Date.now()}`;
    setConsultationId(newConsultationId);
    setIsInConsultation(true);
    console.log('Starting consultation:', newConsultationId);
  };

  const endConsultation = async () => {
    if (!consultationId) return;
    
    console.log('Ending consultation:', consultationId);
    
    // Trigger post-consultation analysis
    try {
      await alertsService.processPostConsultationAlerts(patientId, consultationId);
      console.log('Post-consultation analysis completed');
    } catch (error) {
      console.error('Error in post-consultation analysis:', error);
    }
    
    setIsInConsultation(false);
    // Keep consultationId for viewing results
  };

  const simulateTranscriptUpdate = () => {
    // This would be called when transcript is updated in real system
    console.log('Transcript updated - real-time processing will trigger automatically');
  };

  const handleNewAlert = (alert: UnifiedAlert) => {
    console.log('New real-time alert received:', alert.title);
    setAlertHistory(prev => [alert, ...prev]);
  };

  const handleAlertAction = (alertId: string, action: string) => {
    console.log(`Alert ${alertId} ${action}`);
    // Update alert status in database
    if (action === 'dismiss') {
      alertsService.dismissAlert(alertId);
    } else if (action === 'accept') {
      alertsService.acceptAlert(alertId);
    }
  };

  // Legacy copilot functionality for testing
  const handleCheckDrugInteractions = () => {
    setLegacyLoading(true);
    try {
      const alerts = checkForDrugInteractions(
        mockPatientData.currentMedications,
        'Warfarin', // Test drug
        mockDrugInteractions
      );
      setLegacyAlerts(alerts);
    } catch (error) {
      console.error('Drug interaction check failed:', error);
    } finally {
      setLegacyLoading(false);
    }
  };

  const handleCheckLabResults = () => {
    setLegacyLoading(true);
    try {
      const alerts = checkForMissingLabs(
        mockPatientData.labResults,
        'fatigue', // Test consultation context
        mockLabRequirements
      );
      setLegacyAlerts(alerts);
    } catch (error) {
      console.error('Lab results check failed:', error);
    } finally {
      setLegacyLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Bot className="h-8 w-8 text-blue-600" />
          Medical Co-pilot Testing Environment
        </h1>
        <p className="text-gray-600">
          Real-time AI-powered medical assistance during consultations
        </p>
      </div>

      {/* Consultation Control */}
      <Card className="border-2 border-dashed border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Consultation Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${isInConsultation ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium">
                  Status: {isInConsultation ? 'In Consultation' : 'Not Started'}
                </span>
              </div>
              {consultationId && (
                <p className="text-sm text-gray-500">ID: {consultationId}</p>
              )}
              <p className="text-sm text-gray-500">Patient: {patientId}</p>
            </div>
            
            <div className="flex gap-2">
              {!isInConsultation ? (
                <Button onClick={startConsultation} className="bg-green-600 hover:bg-green-700">
                  Start Consultation
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={simulateTranscriptUpdate}
                    className="text-xs"
                  >
                    <TestTube className="h-3 w-3 mr-1" />
                    Simulate Transcript Update
                  </Button>
                  <Button 
                    onClick={endConsultation}
                    variant="destructive"
                  >
                    End Consultation
                  </Button>
                </>
              )}
            </div>
          </div>

          {isInConsultation && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Real-time alerts active - Processing every minute automatically
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Systems */}
      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Real-time Alerts
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Alert Dashboard
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Legacy System
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Alert History
          </TabsTrigger>
        </TabsList>

        {/* Real-time Alerts Tab */}
        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Real-time Alert System
              </CardTitle>
              <p className="text-sm text-gray-600">
                {isInConsultation 
                  ? 'Active during consultation - Processing transcript changes automatically'
                  : 'Start a consultation to enable real-time alerts'
                }
              </p>
            </CardHeader>
            <CardContent>
              <RealTimeAlertManager
                isActive={isInConsultation}
                consultationId={consultationId || undefined}
                onAlert={handleNewAlert}
                maxToasts={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <AlertDashboard
            patientId={patientId}
            consultationId={consultationId || undefined}
            onAlertAction={handleAlertAction}
          />
        </TabsContent>

        {/* Legacy System Tab */}
        <TabsContent value="legacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Legacy Copilot System
              </CardTitle>
              <p className="text-sm text-gray-600">
                Original copilot functionality for testing and comparison
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={handleCheckDrugInteractions}
                  disabled={legacyLoading}
                  variant="outline"
                >
                  Check Drug Interactions
                </Button>
                <Button 
                  onClick={handleCheckLabResults}
                  disabled={legacyLoading}
                  variant="outline"
                >
                  Check Lab Results
                </Button>
              </div>

              {legacyAlerts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Legacy Alerts:</h3>
                  {legacyAlerts.map((alert, index) => (
                    <div 
                      key={index}
                      className="p-3 border rounded-md bg-amber-50 border-amber-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-amber-900">{alert.type}</h4>
                          <p className="text-sm text-amber-800">{alert.message}</p>
                          {alert.suggestion && (
                            <p className="text-xs text-amber-700 mt-1">
                              <strong>Suggestion:</strong> {alert.suggestion}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-500" />
                Alert History ({alertHistory.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Real-time alerts received during this session
              </p>
            </CardHeader>
            <CardContent>
              {alertHistory.length > 0 ? (
                <div className="space-y-2">
                  {alertHistory.map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-3 border rounded-md bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{alert.title}</h4>
                          <p className="text-sm text-gray-700">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No alerts received yet</p>
                  <p className="text-sm">Start a consultation to see real-time alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
