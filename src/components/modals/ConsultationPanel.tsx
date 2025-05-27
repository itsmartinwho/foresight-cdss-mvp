'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from '@phosphor-icons/react';
import { format } from 'date-fns';
import type { Patient, Encounter } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';

interface ConsultationPanelProps {
  /** Controls open state from parent */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Patient to create consultation for */
  patient: Patient;
  /** Callback when consultation is successfully created */
  onConsultationCreated?: (encounter: Encounter) => void;
}

export default function ConsultationPanel({
  isOpen,
  onClose,
  patient,
  onConsultationCreated
}: ConsultationPanelProps) {
  const { toast } = useToast();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCreating) return;
    
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: '', // Will be filled from transcript later
        scheduledStart: new Date().toISOString(),
      });
      
      setEncounter(newEncounter);
      
      if (onConsultationCreated) {
        onConsultationCreated(newEncounter);
      }
    } catch (error) {
      console.error('Failed to create encounter:', error);
      toast({
        title: "Error",
        description: "Failed to create consultation encounter.",
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsCreating(false);
    }
  }, [patient?.id, isCreating, onConsultationCreated, onClose, toast]);

  // Create encounter immediately when panel opens
  useEffect(() => {
    if (isOpen && !encounter && !isCreating) {
      createEncounter();
    }
  }, [isOpen, encounter, isCreating, createEncounter]);

  const handleClose = useCallback(() => {
    // TODO: In Phase 5, this will save data before closing
    setEncounter(null);
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Don't render anything if not mounted (SSR safety) or not open
  if (!mounted || !isOpen) return null;

  const panelContent = (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-xl relative w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-hidden">
        {/* Header with patient context and close button */}
        <div className="absolute top-4 right-6 text-sm text-foreground/70">
          {patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.id} – {format(new Date(), 'PPP')}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-3 right-3 h-8 w-8"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Main content area */}
        <div className="pt-8">
          {isCreating ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Creating consultation...</p>
              </div>
            </div>
          ) : encounter ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">New Consultation</h2>
                <p className="text-sm text-muted-foreground">
                  Consultation ID: {encounter.id}
                </p>
              </div>
              
              {/* TODO: This will be replaced with transcript/editor and tabs in future phases */}
              <div className="border border-border rounded-lg p-4 min-h-[300px] bg-background/50">
                <p className="text-sm text-muted-foreground">
                  Consultation content will appear here...
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>
                  Close
                </Button>
                <Button variant="default">
                  Start Recording
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Failed to create consultation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
} 