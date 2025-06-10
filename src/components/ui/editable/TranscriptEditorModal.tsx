'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { 
  FloppyDisk, 
  X, 
  ArrowCounterClockwise, 
  ArrowClockwise 
} from '@phosphor-icons/react';
import { 
  createFieldHistory, 
  updateFieldHistory, 
  undoFieldHistory, 
  redoFieldHistory 
} from './EditableSection';

interface TranscriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  onSave: (newTranscript: string) => Promise<void>;
  patientName?: string;
}

export default function TranscriptEditorModal({
  isOpen,
  onClose,
  transcript,
  onSave,
  patientName = 'Patient',
}: TranscriptEditorModalProps) {
  const [history, setHistory] = useState(() => createFieldHistory(transcript));
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update history when transcript prop changes
  useEffect(() => {
    if (isOpen) {
      setHistory(createFieldHistory(transcript));
      setHasChanges(false);
    }
  }, [transcript, isOpen]);

  // Track changes
  useEffect(() => {
    setHasChanges(history.present !== transcript);
  }, [history.present, transcript]);

  const handleContentChange = (newContent: string) => {
    setHistory(currentHistory => updateFieldHistory(currentHistory, newContent));
  };

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    
    try {
      await onSave(history.present);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save transcript:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, onClose, onSave, history.present]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }
    
    setHistory(createFieldHistory(transcript));
    setHasChanges(false);
    onClose();
  }, [hasChanges, transcript, onClose]);

  const handleUndo = () => {
    setHistory(currentHistory => undoFieldHistory(currentHistory));
  };

  const handleRedo = () => {
    setHistory(currentHistory => redoFieldHistory(currentHistory));
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, handleCancel, handleSave]);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Transcript</DialogTitle>
          <DialogDescription>
            Edit the consultation transcript for {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={history.past.length === 0}
                title="Undo (Ctrl+Z)"
                className="h-8 w-8 p-0"
              >
                <ArrowCounterClockwise className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={history.future.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className="h-8 w-8 p-0"
              >
                <ArrowClockwise className="h-3 w-3" />
              </Button>
            </div>

            {/* Status */}
            <div className="text-sm text-muted-foreground">
              {hasChanges ? 'Unsaved changes' : 'No changes'}
            </div>

            {/* Save/Cancel Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="h-8"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FloppyDisk className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0">
            <RichTextEditor
              content={history.present}
              onContentChange={handleContentChange}
              placeholder="Enter the consultation transcript..."
              minHeight="100%"
              showToolbar={true}
              className="h-full"
            />
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Press Ctrl+S or Ctrl+Enter to save, Escape to cancel, Ctrl+Z to undo, Ctrl+Shift+Z to redo
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 