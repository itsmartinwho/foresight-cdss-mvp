// src/app/copilot/page.tsx
'use client'; // Required for useState and event handlers

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CopilotDisplay from '@/components/copilot/CopilotDisplay';
import { RealTimeAlertManager } from '@/components/alerts/RealTimeAlertManager';
import { AlertDashboard } from '@/components/alerts/AlertDashboard';
import { CopilotAlert } from '@/types/copilot';
import { UnifiedAlert, AlertFilterOptions, AlertStatus } from '@/types/alerts';
import { mockPatientData, mockDrugInteractions, mockLabRequirements } from '@/data/mockCopilotData';
import { checkForDrugInteractions, checkForMissingLabs } from '@/lib/copilotLogic';
import { unifiedAlertsService } from '@/lib/unifiedAlertsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For selecting context
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RefreshCw, Brain, History } from 'lucide-react';

const CopilotPage = () => {
  // Legacy state for backward compatibility
  const [legacyAlerts, setLegacyAlerts] = useState<CopilotAlert[]>([]);
  const [newDrug, setNewDrug] = useState<string>('');
  const [consultationContext, setConsultationContext] = useState<string>('');
  
  // New unified alerts state
  const [unifiedAlerts, setUnifiedAlerts] = useState<UnifiedAlert[]>([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState<boolean>(false);
  const [currentPatientId] = useState<string>('patient-123'); // Mock patient ID
  const [currentEncounterId] = useState<string>(`encounter-${Date.now()}`); // Mock encounter ID
  const [activeTab, setActiveTab] = useState<string>('legacy');
  
  const router = useRouter();

  const loadUnifiedAlerts = useCallback(async () => {
    try {
      const result = await unifiedAlertsService.getAlerts({
        patientId: currentPatientId,
        encounterId: currentEncounterId,
        statuses: [AlertStatus.ACTIVE, AlertStatus.ACCEPTED]
      });
      setUnifiedAlerts(result.alerts);
    } catch (error) {
      console.error('Failed to load unified alerts:', error);
    }
  }, [currentPatientId, currentEncounterId]);

  // Load unified alerts on component mount
  useEffect(() => {
    loadUnifiedAlerts();
  }, [loadUnifiedAlerts]);

  // Handle real-time processing toggle
  const handleToggleRealTime = useCallback(async () => {
    if (isRealTimeActive) {
      unifiedAlertsService.stopRealTimeProcessing();
      setIsRealTimeActive(false);
    } else {
      await unifiedAlertsService.startRealTimeProcessing(currentPatientId, currentEncounterId);
      setIsRealTimeActive(true);
    }
  }, [isRealTimeActive, currentPatientId, currentEncounterId]);

  // Handle post-consultation processing
  const handlePostConsultationProcessing = useCallback(async () => {
    try {
      await unifiedAlertsService.processPostConsultationAlerts(currentPatientId, currentEncounterId);
      await loadUnifiedAlerts(); // Refresh alerts after processing
    } catch (error) {
      console.error('Failed to process post-consultation alerts:', error);
    }
  }, [currentPatientId, currentEncounterId, loadUnifiedAlerts]);

  // Legacy handlers for backward compatibility
  const handleCheckDrugInteractions = () => {
    if (!newDrug.trim()) return;
    
    const interactionAlerts = checkForDrugInteractions(
      mockPatientData.currentMedications,
      newDrug,
      mockDrugInteractions
    );
    setLegacyAlerts(prevAlerts => [
      ...interactionAlerts, 
      ...prevAlerts.filter(a => a.type !== 'DRUG_INTERACTION' || a.relatedData?.drug2 !== newDrug)
    ]);
  };

  const handleCheckMissingLabs = () => {
    if (!consultationContext.trim()) return;
    
    const missingLabAlerts = checkForMissingLabs(
      mockPatientData.labResults,
      consultationContext,
      mockLabRequirements
    );
    setLegacyAlerts(prevAlerts => [
      ...missingLabAlerts, 
      ...prevAlerts.filter(a => a.type !== 'MISSING_LAB_RESULT')
    ]);
  };

  const handleClearLegacyAlerts = () => {
    setLegacyAlerts([]);
  };

  // Handle unified alert actions
  const handleAlertAccept = useCallback(async (alertId: string) => {
    try {
      await unifiedAlertsService.acceptAlert(alertId);
      await loadUnifiedAlerts();
    } catch (error) {
      console.error('Failed to accept alert:', error);
    }
  }, [loadUnifiedAlerts]);

  const handleAlertDismiss = useCallback(async (alertId: string) => {
    try {
      await unifiedAlertsService.dismissAlert(alertId);
      await loadUnifiedAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  }, [loadUnifiedAlerts]);

  const handleNavigate = useCallback((target: string) => {
    router.push(target);
  }, [router]);

  // Get real-time and post-consultation alerts
  const realTimeAlerts = unifiedAlerts.filter(alert => alert.isRealTime && !alert.isPostConsultation);
  const postConsultationAlerts = unifiedAlerts.filter(alert => alert.isPostConsultation);

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Tool C: Enhanced Medical Co-pilot</h1>
        <p className="text-muted-foreground">
          Real-time AI-powered assistance with comprehensive alert management
        </p>
      </header>

      {/* Real-time Status and Controls */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Co-pilot Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isRealTimeActive ? "default" : "secondary"}>
                {isRealTimeActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                onClick={handleToggleRealTime}
                variant={isRealTimeActive ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-2"
              >
                {isRealTimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isRealTimeActive ? "Stop" : "Start"} Real-time
              </Button>
              <Button
                onClick={handlePostConsultationProcessing}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Post-consultation Analysis
              </Button>
              <Button
                onClick={loadUnifiedAlerts}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Patient:</strong> {mockPatientData.name} (ID: {currentPatientId})
            </div>
            <div>
              <strong>Encounter:</strong> {currentEncounterId.slice(-8)}
            </div>
            <div>
              <strong>Active Alerts:</strong> {unifiedAlerts.filter(a => a.status === 'active').length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Data Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-md font-semibold mb-2">Current Medications:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {mockPatientData.currentMedications.map(med => (
                    <li key={med.id}>{med.name} ({med.dosage})</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">Recent Labs:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {mockPatientData.labResults.map(lab => (
                    <li key={lab.id} className={lab.status === 'abnormal' ? 'text-red-600' : ''}>
                      {lab.name}: {lab.value} {lab.unit} ({lab.status})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">Conditions:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {mockPatientData.conditions.map(condition => (
                    <li key={condition.id}>{condition.name}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="legacy">Legacy System</TabsTrigger>
              <TabsTrigger value="unified">Unified Alerts</TabsTrigger>
              <TabsTrigger value="dashboard">Alert Dashboard</TabsTrigger>
            </TabsList>

            {/* Legacy System Tab */}
            <TabsContent value="legacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Legacy Co-pilot Checks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drug Interaction Check */}
                  <div className="space-y-2 p-3 border rounded">
                    <label htmlFor="newDrugInput" className="block text-sm font-medium">
                      Check New Drug Interaction:
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        id="newDrugInput"
                        type="text"
                        value={newDrug}
                        onChange={(e) => setNewDrug(e.target.value)}
                        placeholder="Enter new drug name (e.g., Warfarin)"
                        className="flex-grow"
                      />
                      <Button onClick={handleCheckDrugInteractions}>Check Interactions</Button>
                    </div>
                  </div>

                  {/* Missing Labs Check */}
                  <div className="space-y-2 p-3 border rounded">
                    <label htmlFor="consultContextSelect" className="block text-sm font-medium">
                      Check Missing Labs for Context:
                    </label>
                    <div className="flex space-x-2">
                      <Select value={consultationContext} onValueChange={setConsultationContext}>
                        <SelectTrigger id="consultContextSelect" className="flex-grow">
                          <SelectValue placeholder="Select consultation context" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fatigue">Fatigue/General Checkup</SelectItem>
                          <SelectItem value="diabetes_management">Diabetes Management</SelectItem>
                          <SelectItem value="hypertension_check">Hypertension Check</SelectItem>
                          <SelectItem value="acute_infection">Acute Infection</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleCheckMissingLabs}>Check Missing Labs</Button>
                    </div>
                  </div>

                  <Button onClick={handleClearLegacyAlerts} variant="outline" size="sm">
                    Clear All Legacy Alerts
                  </Button>
                </CardContent>
              </Card>

              {/* Legacy Alerts Display */}
              <CopilotDisplay alerts={legacyAlerts} />
            </TabsContent>

            {/* Unified Alerts Tab */}
            <TabsContent value="unified" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Real-time Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Real-time Alerts ({realTimeAlerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {realTimeAlerts.length > 0 ? (
                      <div className="space-y-2">
                        {realTimeAlerts.slice(0, 5).map(alert => (
                          <div key={alert.id} className="p-2 border rounded text-sm">
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-muted-foreground">{alert.message}</div>
                            <Badge variant="secondary" className="mt-1">
                              {alert.severity}
                            </Badge>
                          </div>
                        ))}
                        {realTimeAlerts.length > 5 && (
                          <div className="text-sm text-muted-foreground">
                            +{realTimeAlerts.length - 5} more alerts
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No real-time alerts. {isRealTimeActive ? 'Monitoring...' : 'Start real-time monitoring to see alerts.'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Post-consultation Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Post-consultation Alerts ({postConsultationAlerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {postConsultationAlerts.length > 0 ? (
                      <div className="space-y-2">
                        {postConsultationAlerts.slice(0, 5).map(alert => (
                          <div key={alert.id} className="p-2 border rounded text-sm">
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-muted-foreground">{alert.message}</div>
                            <Badge variant="secondary" className="mt-1">
                              {alert.severity}
                            </Badge>
                          </div>
                        ))}
                        {postConsultationAlerts.length > 5 && (
                          <div className="text-sm text-muted-foreground">
                            +{postConsultationAlerts.length - 5} more alerts
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No post-consultation alerts. Run post-consultation analysis to generate comprehensive alerts.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Alert Dashboard Tab */}
            <TabsContent value="dashboard">
              <AlertDashboard
                patientId={currentPatientId}
                encounterId={currentEncounterId}
                initialAlerts={unifiedAlerts}
                onAlertAccept={handleAlertAccept}
                onAlertDismiss={handleAlertDismiss}
                onNavigate={handleNavigate}
                onRefresh={loadUnifiedAlerts}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Real-time Toast Notifications */}
      <RealTimeAlertManager
        patientId={currentPatientId}
        encounterId={currentEncounterId}
        onAlertAccept={handleAlertAccept}
        onAlertDismiss={handleAlertDismiss}
        onNavigate={handleNavigate}
        maxVisibleAlerts={3}
        defaultToastDuration={8000}
      />
    </div>
  );
};

export default CopilotPage;
