'use client';
import React from 'react';
import type { Patient } from "@/lib/types";
import RenderDetailTable from "@/components/ui/RenderDetailTable";

export default function TrialsTab({ patient }: { patient: Patient }) {
  const MOCK_TRIALS_DATA: Record<string, { id: string; title: string; distance: string; fit: number }[]> = {
    "1": [
      { id: "NCT055123", title: "Abatacept vs Placebo in Early RA", distance: "12 mi", fit: 0.82, },
      { id: "NCT061987", title: "JAK Inhibitor Tofacitinib Long-Term Safety", distance: "32 mi", fit: 0.77, },
    ],
  };
  const trialRows = MOCK_TRIALS_DATA[patient.id] || [];

  if (trialRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No clinical trial information available for this patient.</p>
          <p className="text-sm text-muted-foreground/60">Trial recommendations will appear here based on patient diagnosis and treatment history.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <RenderDetailTable 
        title='Clinical Trials' 
        dataArray={trialRows} 
        headers={['ID', 'Title', 'Distance', 'Fit Score']} 
        columnAccessors={['id', 'title', 'distance', 'fit']} 
      />
    </div>
  );
} 