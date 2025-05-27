'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Patient, Encounter } from '@/lib/types';
import { supabaseDataService } from '@/lib/supabaseDataService';
import { useToast } from '@/hooks/use-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

// Styled DatePicker component to match the design
const StyledDatePicker = React.forwardRef<any, any>(({ className, ...props }, ref) => (
  <DatePicker
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
StyledDatePicker.displayName = "StyledDatePicker";

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
  
  // Form state
  const [reason, setReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());
  const [duration, setDuration] = useState<number | null>(30);

  // Ensure we only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const createEncounter = useCallback(async () => {
    if (!patient?.id || isCreating) return;
    
    setIsCreating(true);
    try {
      const newEncounter = await supabaseDataService.createNewEncounter(patient.id, {
        reason: reason || undefined,
        scheduledStart: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        duration: duration || undefined,
      });
      
      setEncounter(newEncounter);
      
      if (onConsultationCreated) {
        onConsultationCreated(newEncounter);
      }
    } catch (error) {
      console.error('Failed to create encounter:', error);
      toast({
        title: "Error",
        description: `Failed to create consultation encounter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsCreating(false);
    }
  }, [patient?.id, isCreating, reason, scheduledDate, duration, onConsultationCreated, onClose, toast]);

  // Reset form when panel opens
  useEffect(() => {
    if (isOpen) {
      setEncounter(null);
      setReason('');
      setScheduledDate(new Date());
      setDuration(30);
    }
  }, [isOpen]);

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

  const handleStart = () => {
    if (!encounter) {
      createEncounter();
    } else {
      // TODO: Start recording/transcription functionality
      console.log('Starting consultation with encounter:', encounter.id);
    }
  };

  const panelContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl relative w-[90%] max-w-lg p-6 max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 hover:bg-destructive/20"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Start New Consultation</h2>
          <p className="text-sm text-muted-foreground">
            {patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.id}
          </p>
        </div>

        {isCreating ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Creating consultation...</p>
            </div>
          </div>
        ) : encounter ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✓ Consultation created successfully
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ID: {encounter.id.split('_').pop()}
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleStart}>
                Start
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Patient Info - Read Only */}
            <div>
              <Label className="text-sm font-semibold">Patient</Label>
              <div className="mt-1 p-3 bg-muted/50 rounded-md border">
                <p className="text-sm font-medium">
                  {patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {patient.dateOfBirth && `DOB: ${format(new Date(patient.dateOfBirth), 'MMM dd, yyyy')}`}
                  {patient.gender && ` • ${patient.gender}`}
                </p>
              </div>
            </div>

            {/* Reason for encounter */}
            <div>
              <Label htmlFor="reason" className="text-sm font-semibold">
                Reason for encounter
              </Label>
              <Textarea 
                id="reason"
                placeholder="E.g., joint pain, generalized inflammation, follow-up visit..."
                className="mt-1 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Date and time */}
            <div>
              <Label className="text-sm font-semibold">Date and time</Label>
              <StyledDatePicker
                placeholderText={format(new Date(), 'MMM dd, yyyy h:mm aa')}
                selected={scheduledDate}
                onChange={(date: Date | null) => setScheduledDate(date)}
                showTimeSelect
                timeInputLabel="Time:"
                dateFormat="MMM dd, yyyy h:mm aa"
                className="mt-1"
                timeIntervals={15}
                popperClassName="z-[60]"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>

            {/* Duration */}
            <div>
              <Label className="text-sm font-semibold">Duration</Label>
              <select
                value={duration || ''}
                onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : null)}
                className={cn(
                  "w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm",
                  !duration ? "text-muted-foreground" : "text-foreground"
                )}
              >
                <option value="" disabled>Select duration</option>
                {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map(minutes => (
                  <option key={minutes} value={minutes}>{minutes} min</option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleStart}>
                Start
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
} 