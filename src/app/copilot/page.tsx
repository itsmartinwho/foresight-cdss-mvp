// src/app/copilot/page.tsx
'use client'; // Required for useState and event handlers

import React, { useState } from 'react';
import CopilotDisplay from '@/components/copilot/CopilotDisplay';
import { CopilotAlert } from '@/types/copilot';
import { mockPatientData, mockDrugInteractions, mockLabRequirements } from '@/data/mockCopilotData';
import { checkForDrugInteractions, checkForMissingLabs } from '@/lib/copilotLogic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For selecting context


const CopilotPage = () => {
  const [alerts, setAlerts] = useState<CopilotAlert[]>([]);
  const [newDrug, setNewDrug] = useState<string>('');
  const [consultationContext, setConsultationContext] = useState<string>('');

  const handleCheckDrugInteractions = () => {
    if (!newDrug.trim()) {
      // Potentially add a user notification here if newDrug is empty
      return;
    }
    const interactionAlerts = checkForDrugInteractions(
      mockPatientData.currentMedications,
      newDrug,
      mockDrugInteractions
    );
    setAlerts(prevAlerts => [...interactionAlerts, ...prevAlerts.filter(a => a.type !== 'DRUG_INTERACTION' || a.relatedData?.drug2 !== newDrug)]);
    // Simple way to avoid duplicate interaction alerts for the same new drug, could be more sophisticated
  };

  const handleCheckMissingLabs = () => {
    if (!consultationContext.trim()) {
        // Potentially add a user notification here if context is empty
        return;
    }
    const missingLabAlerts = checkForMissingLabs(
      mockPatientData.labResults,
      consultationContext,
      mockLabRequirements
    );
    // Add new missing lab alerts, removing old ones of the same type to avoid duplicates if context is re-checked
    setAlerts(prevAlerts => [...missingLabAlerts, ...prevAlerts.filter(a => a.type !== 'MISSING_LAB_RESULT')]);
  };

  const handleClearAlerts = () => {
    setAlerts([]);
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Tool C: Medical Co-pilot</h1>
        <p className="text-muted-foreground">Real-time assistance during consultations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 space-y-4 p-4 border rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Patient Snapshot</h2>
          <p className="text-sm"><strong>Patient:</strong> {mockPatientData.name}</p>
          <div>
            <h3 className="text-md font-semibold">Current Medications:</h3>
            <ul className="list-disc list-inside text-sm">
              {mockPatientData.currentMedications.map(med => <li key={med.id}>{med.name} ({med.dosage})</li>)}
            </ul>
          </div>
           <div>
            <h3 className="text-md font-semibold">Recent Labs:</h3>
            <ul className="list-disc list-inside text-sm">
              {mockPatientData.labResults.map(lab => <li key={lab.id}>{lab.name}: {lab.value} {lab.unit} ({lab.status})</li>)}
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4 p-4 border rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Trigger Co-pilot Checks</h2>

          {/* Drug Interaction Check */}
          <div className="space-y-2 p-3 border rounded">
            <label htmlFor="newDrugInput" className="block text-sm font-medium">Check New Drug Interaction:</label>
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
            <label htmlFor="consultContextSelect" className="block text-sm font-medium">Check Missing Labs for Context:</label>
             <div className="flex space-x-2">
              <Select value={consultationContext} onValueChange={setConsultationContext}>
                <SelectTrigger id="consultContextSelect" className="flex-grow">
                  <SelectValue placeholder="Select consultation context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fatigue">Fatigue/General Checkup</SelectItem>
                  <SelectItem value="diabetes_management">Diabetes Management</SelectItem>
                  <SelectItem value="hypertension_check">Hypertension Check</SelectItem>
                  <SelectItem value="acute_infection">Acute Infection</SelectItem> {/* Example, not in mockLabRequirements yet */}
                </SelectContent>
              </Select>
              <Button onClick={handleCheckMissingLabs}>Check Missing Labs</Button>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleClearAlerts} variant="outline" size="sm">Clear All Alerts</Button>
          </div>
        </div>
      </div>

      <CopilotDisplay alerts={alerts} />
    </div>
  );
};

export default CopilotPage;
