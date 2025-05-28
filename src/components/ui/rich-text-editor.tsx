'use client';

import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Typography from '@tiptap/extension-typography';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Separator } from './separator';
import { 
  TextB as Bold,
  TextItalic as Italic,
  ListBullets,
  ListNumbers,
  ArrowCounterClockwise as Undo,
  ArrowClockwise as Redo
} from '@phosphor-icons/react';

interface RichTextEditorProps {
  content?: string;
  onContentChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showToolbar?: boolean;
  minHeight?: string;
}

export interface RichTextEditorRef {
  editor: Editor | null;
  focus: () => void;
  getContent: () => string;
  setContent: (content: string) => void;
  insertText: (text: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ 
    content = '', 
    onContentChange, 
    placeholder = 'Start typing...', 
    className,
    disabled = false,
    showToolbar = true,
    minHeight = '200px'
  }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        Focus.configure({
          className: 'focus:ring-1 focus:ring-ring',
          mode: 'all',
        }),
        Typography,
      ],
      content,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        onContentChange?.(html);
      },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none',
            'prose-headings:font-medium prose-headings:text-foreground',
            'prose-p:text-foreground prose-p:leading-relaxed',
            'prose-strong:text-foreground prose-strong:font-semibold',
            'prose-em:text-foreground prose-em:italic',
            'prose-ul:text-foreground prose-ol:text-foreground',
            'prose-li:text-foreground'
          ),
        },
      },
    });

    useImperativeHandle(ref, () => ({
      editor,
      focus: () => editor?.commands.focus(),
      getContent: () => editor?.getHTML() || '',
      setContent: (content: string) => editor?.commands.setContent(content),
      insertText: (text: string) => {
        if (editor) {
          editor.commands.insertContent(text);
        }
      },
    }));

    if (!editor) {
      return null;
    }

    const ToolbarButton = ({ 
      onClick, 
      isActive, 
      children, 
      title 
    }: { 
      onClick: () => void; 
      isActive?: boolean; 
      children: React.ReactNode; 
      title: string; 
    }) => (
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        onClick={onClick}
        title={title}
        type="button"
        className="h-8 w-8 p-0"
      >
        {children}
      </Button>
    );

    return (
      <div className={cn('border border-input rounded-md overflow-hidden', className)}>
        {showToolbar && !disabled && (
          <div className="border-b border-border p-2 flex items-center gap-1 bg-muted/20">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <ListBullets className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListNumbers className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>
        )}
        
        <EditorContent 
          editor={editor} 
          className={cn(
            'p-3 bg-background',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{ minHeight }}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor }; 