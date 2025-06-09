'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import EditableSection, { 
  createFieldHistory, 
  updateFieldHistory, 
  undoFieldHistory, 
  redoFieldHistory 
} from './EditableSection';

interface EditableTextFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  maxLength?: number;
  validation?: (value: string) => string | null; // Returns error message or null
}

export default function EditableTextField({
  value,
  onSave,
  placeholder = 'Enter text...',
  multiline = false,
  required = false,
  disabled = false,
  className = '',
  displayClassName = '',
  inputClassName = '',
  maxLength,
  validation,
}: EditableTextFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState(() => createFieldHistory(value));
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update history when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setHistory(createFieldHistory(value));
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const input = inputRef.current;
      if (input.setSelectionRange) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    const currentValue = history.present.trim();
    
    // Validate required field
    if (required && !currentValue) {
      setError('This field is required');
      return;
    }

    // Custom validation
    if (validation) {
      const validationError = validation(currentValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(currentValue);
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setHistory(createFieldHistory(value));
    setIsEditing(false);
    setError(null);
  };

  const handleChange = (newValue: string) => {
    setHistory(currentHistory => updateFieldHistory(currentHistory, newValue));
    setError(null);
  };

  const handleUndo = () => {
    setHistory(currentHistory => undoFieldHistory(currentHistory));
  };

  const handleRedo = () => {
    setHistory(currentHistory => redoFieldHistory(currentHistory));
  };

  const displayValue = value || placeholder;
  const hasValue = Boolean(value);
  const hasUnsavedChanges = history.present !== value;

  return (
    <EditableSection
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={history.past.length > 0}
      canRedo={history.future.length > 0}
      isSaving={isSaving}
      disabled={disabled}
      className={className}
      hasUnsavedChanges={hasUnsavedChanges}
      onRequestClose={handleCancel}
    >
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={history.present}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              className={inputClassName}
              maxLength={maxLength}
              rows={3}
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={history.present}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              className={inputClassName}
              maxLength={maxLength}
            />
          )}
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          {maxLength && (
            <p className="text-xs text-muted-foreground">
              {history.present.length}/{maxLength} characters
            </p>
          )}
        </div>
      ) : (
        <div className={`${displayClassName} ${!hasValue ? 'text-muted-foreground italic' : ''}`}>
          {displayValue}
        </div>
      )}
    </EditableSection>
  );
} 