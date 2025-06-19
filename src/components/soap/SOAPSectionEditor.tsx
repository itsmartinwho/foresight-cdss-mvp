'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PencilSimple, Check, X, ArrowsClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SOAPSectionEditorProps {
  /** Section title (e.g., "Subjective") */
  title: string;
  /** Section key for display (e.g., "S") */
  sectionKey: string;
  /** Current content of the section */
  content: string;
  /** Placeholder text when content is empty */
  placeholder?: string;
  /** Whether the section is read-only */
  isReadOnly?: boolean;
  /** Callback when content changes */
  onChange?: (content: string) => void;
  /** Optional note about synchronization */
  syncNote?: string;
  /** Custom className */
  className?: string;
}

export function SOAPSectionEditor({
  title,
  sectionKey,
  content,
  placeholder,
  isReadOnly = false,
  onChange,
  syncNote,
  className
}: SOAPSectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edit content when prop content changes (for sync)
  useEffect(() => {
    if (!isEditing) {
      setEditContent(content);
    }
  }, [content, isEditing]);

  const handleEdit = () => {
    if (isReadOnly) return;
    setIsEditing(true);
    setEditContent(content);
    // Focus textarea after state update
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  const handleSave = () => {
    if (onChange) {
      onChange(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Card className={cn("border border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg font-medium text-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {sectionKey}
            </span>
            {title}
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-1">
              {syncNote && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowsClockwise className="h-3 w-3" />
                  {syncNote}
                </span>
              )}
              {isEditing ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleSave}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleCancel}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleEdit}
                >
                  <PencilSimple className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[100px] resize-none focus:ring-1 focus:ring-primary"
            rows={4}
          />
        ) : (
          <div
            className={cn(
              "min-h-[100px] p-3 rounded-md text-sm whitespace-pre-wrap",
              isReadOnly 
                ? "bg-muted/30 text-foreground" 
                :             "bg-muted/20 hover:bg-muted/30 cursor-pointer border border-transparent hover:border-border/50 transition-colors",
              !content && "text-base text-muted-foreground/70"
            )}
            onClick={!isReadOnly ? handleEdit : undefined}
          >
            {content || placeholder}
          </div>
        )}
        
        {isEditing && (
          <div className="mt-2 text-xs text-muted-foreground">
            Press Cmd+Enter to save, Esc to cancel
          </div>
        )}
      </CardContent>
    </Card>
  );
} 