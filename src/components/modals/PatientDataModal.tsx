'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from '@phosphor-icons/react';
import AllDataViewTab from '@/components/patient-workspace-tabs/AllDataViewTab';
import { supabaseDataService } from '@/lib/supabaseDataService';
import LoadingAnimation from '@/components/LoadingAnimation';
import type { Patient, EncounterDetailsWrapper } from '@/lib/types';

interface PatientDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export default function PatientDataModal({ isOpen, onClose, patient }: PatientDataModalProps) {
  const [detailedPatientData, setDetailedPatientData] = useState<{ patient: Patient; encounters: EncounterDetailsWrapper[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patient) {
      loadPatientData();
    }
  }, [isOpen, patient]);

  const loadPatientData = async () => {
    if (!patient) return;
    
    setIsLoading(true);
    try {
      const detailedData = await supabaseDataService.getPatientData(patient.id);
      setDetailedPatientData(detailedData);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Prepare for Consultation: {patient?.name || `${patient?.firstName} ${patient?.lastName}`.trim()}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-muted transition-all"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingAnimation />
            </div>
          ) : detailedPatientData ? (
            <AllDataViewTab 
              detailedPatientData={detailedPatientData}
              setDetailedPatientData={setDetailedPatientData}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to load patient data</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 