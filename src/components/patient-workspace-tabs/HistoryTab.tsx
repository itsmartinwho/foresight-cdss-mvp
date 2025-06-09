'use client';
import React from 'react';
import type { Patient, Encounter, Diagnosis, LabResult, EncounterDetailsWrapper } from "@/lib/types";

interface HistoryTabProps {
  patient: Patient | null;
  allEncounters: EncounterDetailsWrapper[] | null;
}

export default function HistoryTab({ patient, allEncounters }: HistoryTabProps) {
  if (!patient) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">No patient data available.</p>
      </div>
    );
  }

  if (!allEncounters || allEncounters.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No historical encounter data to display.</p>
          <p className="text-sm text-muted-foreground/60">Encounter history will appear here once visits are recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-3">Encounter History</h2>
      <div className="space-y-3">
        {allEncounters
          .sort((a, b) => new Date(b.encounter.scheduledStart).getTime() - new Date(a.encounter.scheduledStart).getTime())
          .map(({ encounter, diagnoses, labResults }) => (
            <div 
              key={encounter.id} 
              className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground">
                  {new Date(encounter.scheduledStart).toLocaleDateString()}
                </h3>
                <p className="text-sm text-muted-foreground font-mono">
                  ID: {encounter.encounterIdentifier}
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium">Reason:</span> {encounter.reasonDisplayText || encounter.reasonCode || "General encounter"}
              </p>

              {diagnoses && diagnoses.length > 0 && (
                <div className="glass-dense rounded-md p-3">
                  <p className="text-xs font-semibold text-muted-foreground/80 mb-2">Diagnoses</p>
                  <div className="grid grid-cols-1 gap-3">
                    {diagnoses.map((dx, i) => (
                      <div key={`dx-${dx.code || i}`} className="bg-white/5 border border-white/10 rounded-md p-3 space-y-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground leading-relaxed">
                            {dx.description || "No description available"}
                          </p>
                        </div>
                        
                        {dx.code && (
                          <div className="pt-1 border-t border-border/20">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">ICD:</span>
                              <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                {dx.code}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {encounter.treatments && encounter.treatments.length > 0 && (
                <div className="glass-dense rounded-md p-3 mt-3">
                  <p className="text-xs font-semibold text-muted-foreground/80 mb-2">Treatments</p>
                  <div className="grid grid-cols-1 gap-1">
                    {encounter.treatments.map((treatment, i) => (
                      <div key={i} className="text-sm text-foreground">
                        {treatment.drug || "Unknown medication"}
                        {treatment.status && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({treatment.status})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {labResults && labResults.length > 0 && (
                <div className="glass-dense rounded-md p-3 mt-3">
                  <p className="text-xs font-semibold text-muted-foreground/80 mb-2">Lab Results</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {labResults.slice(0, 4).map((lab, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-foreground">{lab.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {lab.value} {lab.units}
                        </span>
                      </div>
                    ))}
                    {labResults.length > 4 && (
                      <div className="text-xs text-muted-foreground col-span-full">
                        +{labResults.length - 4} more results
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}