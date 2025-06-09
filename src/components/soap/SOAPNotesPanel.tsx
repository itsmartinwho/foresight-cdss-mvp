'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { SOAPSectionEditor } from './SOAPSectionEditor';
import type { SoapNote } from '@/lib/types';

interface SOAPNotesPanelProps {
  /** SOAP note data to display */
  soapNote?: SoapNote | null;
  /** Whether the panel is in demo mode (read-only) */
  isDemoMode?: boolean;
  /** Whether SOAP notes are currently being generated */
  isGenerating?: boolean;
  /** Whether to show the panel (controls visibility) */
  isVisible?: boolean;
  /** Callback when SOAP note content changes */
  onSoapNoteChange?: (section: keyof SoapNote, content: string) => void;
  /** Custom className for styling */
  className?: string;
}

export function SOAPNotesPanel({
  soapNote,
  isDemoMode = false,
  isGenerating = false,
  isVisible = true,
  onSoapNoteChange,
  className
}: SOAPNotesPanelProps) {
  if (!isVisible) {
    return null;
  }

  const handleSectionChange = (section: keyof SoapNote, content: string) => {
    if (!isDemoMode && onSoapNoteChange) {
      onSoapNoteChange(section, content);
    }
  };

  return (
    <Card className={cn("glass-dense flex flex-col h-full", className)}>
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          SOAP Notes
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Generating notes...</p>
            </div>
          </div>
        ) : soapNote ? (
          <div className="space-y-4">
            <SOAPSectionEditor
              title="Subjective"
              content={soapNote.subjective || ''}
              onChange={(content) => handleSectionChange('subjective', content)}
              placeholder="Patient's narrative and reported symptoms..."
              isReadOnly={isDemoMode}
              sectionKey="S"
            />
            
            <SOAPSectionEditor
              title="Objective"
              content={soapNote.objective || ''}
              onChange={(content) => handleSectionChange('objective', content)}
              placeholder="Clinical findings and measurable data..."
              isReadOnly={isDemoMode}
              sectionKey="O"
            />
            
            <SOAPSectionEditor
              title="Assessment"
              content={soapNote.assessment || ''}
              onChange={(content) => handleSectionChange('assessment', content)}
              placeholder="Differential diagnoses and clinical reasoning..."
              isReadOnly={isDemoMode}
              sectionKey="A"
              syncNote="Synced with Differentials tab"
            />
            
            <SOAPSectionEditor
              title="Plan"
              content={soapNote.plan || ''}
              onChange={(content) => handleSectionChange('plan', content)}
              placeholder="Treatment plan and next steps..."
              isReadOnly={isDemoMode}
              sectionKey="P"
              syncNote="Synced with Treatment tab"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground text-center">
              SOAP notes will appear here once the clinical plan is generated.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 