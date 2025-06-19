import React, { useRef, useEffect, useState } from 'react';
import { parser, parser_write, parser_end, default_renderer, Token } from './smd.js';
import { DecisionTreeRenderer } from '../../ui/decision-tree-renderer';
import { RichContent, RichElement } from '@/lib/types';

interface TreatmentRendererProps {
  content: string;
  richContent?: RichContent;
  isStreaming?: boolean;
  onChartDelete?: (chartId: string) => void;
  onContentEdit?: (newContent: string) => void;
  editable?: boolean;
}

export const TreatmentRenderer: React.FC<TreatmentRendererProps> = ({
  content,
  richContent,
  isStreaming = false,
  onChartDelete,
  onContentEdit,
  editable = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<any>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  // Initialize parser with custom renderer for treatment content
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = createTreatmentRenderer(containerRef.current);
    parserRef.current = parser(renderer);

    return () => {
      if (parserRef.current) {
        parser_end(parserRef.current);
      }
    };
  }, []);

  // Stream content if streaming mode is enabled
  useEffect(() => {
    if (!isStreaming || !parserRef.current) return;

    const contentToStream = richContent?.text_content || content;
    let index = 0;

    const streamInterval = setInterval(() => {
      if (index >= contentToStream.length) {
        clearInterval(streamInterval);
        parser_end(parserRef.current);
        return;
      }

      const chunk = contentToStream.slice(index, index + 5); // Stream 5 chars at a time
      parser_write(parserRef.current, chunk);
      index += 5;
      setStreamedContent(contentToStream.slice(0, index));
    }, 50);

    return () => clearInterval(streamInterval);
  }, [content, richContent, isStreaming]);

  // Render static content if not streaming
  useEffect(() => {
    if (isStreaming || !parserRef.current) return;

    const contentToRender = richContent?.text_content || content;
    parser_write(parserRef.current, contentToRender);
    parser_end(parserRef.current);
  }, [content, richContent, isStreaming]);

  const handleEdit = () => {
    if (!editable) return;
    setIsEditing(true);
    setEditContent(richContent?.text_content || content);
  };

  const handleSave = () => {
    if (onContentEdit) {
      onContentEdit(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(richContent?.text_content || content);
    setIsEditing(false);
  };

  const renderRichElements = () => {
    if (!richContent?.rich_elements?.length) return null;

    return (
      <div className="mt-4 space-y-4">
        {richContent.rich_elements.map((element) => (
          <RichElementRenderer
            key={element.id}
            element={element}
            onDelete={onChartDelete}
            editable={editable}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="treatment-renderer">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-64 p-3 border border-gray-300 rounded-md resize-vertical font-mono text-sm"
            placeholder="Edit treatment content..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div 
            ref={containerRef} 
            className="prose prose-sm max-w-none"
          />
          {editable && (
            <button
              onClick={handleEdit}
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Render rich elements (decision trees, charts, etc.) */}
      {renderRichElements()}
    </div>
  );
};

// Component to render individual rich elements
const RichElementRenderer: React.FC<{
  element: RichElement;
  onDelete?: (id: string) => void;
  editable?: boolean;
}> = ({ element, onDelete, editable = true }) => {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(element.id);
    }
  };

  const renderElement = () => {
    switch (element.type) {
      case 'decision_tree':
        return (
          <DecisionTreeRenderer 
            tree={element.data}
            editable={element.editable !== false}
          />
        );
      
      case 'chart':
        return (
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-2">Chart: {element.data.title || 'Untitled'}</div>
            {/* Chart rendering would go here - could be Chart.js, D3, etc. */}
            <div className="h-64 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
              Chart Placeholder
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {element.data.headers?.map((header: string, index: number) => (
                    <th key={index} className="px-4 py-2 border-b border-gray-300 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {element.data.rows?.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2 border-b border-gray-200">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return (
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
            <div className="text-yellow-800">Unknown element type: {element.type}</div>
          </div>
        );
    }
  };

  return (
    <div className="relative group">
      {renderElement()}
      
      {/* Delete button for non-editable elements (like charts) */}
      {editable && !element.editable && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded text-xs"
          title="Delete this element"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// Custom renderer factory for treatment content
function createTreatmentRenderer(container: HTMLElement) {
  const renderer = default_renderer(container);
  
  // Extend the default renderer with treatment-specific enhancements
  const originalAddToken = renderer.add_token;
  renderer.add_token = (data: any, type: any) => {
    // Handle custom treatment tokens if needed
    return originalAddToken(data, type);
  };

  const originalAddText = renderer.add_text;
  renderer.add_text = (data: any, text: string) => {
    // Process treatment-specific text patterns
    const processedText = processTreatmentText(text);
    return originalAddText(data, processedText);
  };

  return renderer;
}

// Process treatment text for special patterns
function processTreatmentText(text: string): string {
  // Convert medication patterns to more readable format
  text = text.replace(/(\d+\s*mg|\d+\s*mcg|\d+\s*units)/gi, '<strong>$1</strong>');
  
  // Highlight dosage frequencies
  text = text.replace(/\b(daily|twice daily|BID|TID|QID|as needed|PRN)\b/gi, '<em>$1</em>');
  
  return text;
}

export default TreatmentRenderer; 