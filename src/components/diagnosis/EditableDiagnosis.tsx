'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Pencil, Check, X } from '@phosphor-icons/react';

interface EditableDiagnosisProps {
  title: string;
  content: string;
  onSave: (newContent: string) => void;
  isEditable: boolean;
  placeholder?: string;
  className?: string;
  reasoningExplanation?: string;
  onSaveReasoningExplanation?: (newExplanation: string) => void;
}

export default function EditableDiagnosis({
  title,
  content,
  onSave,
  isEditable,
  placeholder = 'Enter diagnosis...',
  className = '',
  reasoningExplanation,
  onSaveReasoningExplanation,
}: EditableDiagnosisProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isEditingReasoning, setIsEditingReasoning] = useState(false);
  const [editReasoning, setEditReasoning] = useState(reasoningExplanation || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reasoningTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  useEffect(() => {
    setEditReasoning(reasoningExplanation || '');
  }, [reasoningExplanation]);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSave = () => {
    onSave(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleEditReasoning = () => {
    setIsEditingReasoning(true);
    setTimeout(() => reasoningTextareaRef.current?.focus(), 0);
  };

  const handleSaveReasoning = () => {
    if (onSaveReasoningExplanation) {
      onSaveReasoningExplanation(editReasoning);
    }
    setIsEditingReasoning(false);
  };

  const handleCancelReasoning = () => {
    setEditReasoning(reasoningExplanation || '');
    setIsEditingReasoning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, saveHandler: () => void, cancelHandler: () => void) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveHandler();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelHandler();
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {isEditable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0"
              title="Edit diagnosis"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main diagnosis content */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] resize-vertical"
              onKeyDown={(e) => handleKeyDown(e, handleSave, handleCancel)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="h-8"
                disabled={!editContent.trim()}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to save, Escape to cancel
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {content ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap">{content}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">{placeholder}</p>
            )}
          </div>
        )}

        {/* Reasoning explanation section */}
        {(reasoningExplanation || onSaveReasoningExplanation) && (
          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Clinical Reasoning</h4>
              {isEditable && !isEditingReasoning && onSaveReasoningExplanation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditReasoning}
                  className="h-6 w-6 p-0"
                  title="Edit reasoning"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {isEditingReasoning ? (
              <div className="space-y-3">
                <Textarea
                  ref={reasoningTextareaRef}
                  value={editReasoning}
                  onChange={(e) => setEditReasoning(e.target.value)}
                  placeholder="Explain the clinical reasoning behind this diagnosis..."
                  className="min-h-[80px] resize-vertical text-sm"
                  onKeyDown={(e) => handleKeyDown(e, handleSaveReasoning, handleCancelReasoning)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelReasoning}
                    className="h-6 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveReasoning}
                    className="h-6 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-foreground">
                {reasoningExplanation ? (
                  <p className="whitespace-pre-wrap">{reasoningExplanation}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No reasoning explanation provided
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 