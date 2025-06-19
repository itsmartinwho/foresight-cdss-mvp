import React, { useState } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

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

  // Simple markdown-to-HTML converter
  const renderMarkdown = (text: string) => {
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    return { __html: html };
  };

  const renderRichElements = () => {
    if (!richContent?.rich_elements?.length) {
      console.log('TreatmentRenderer: No rich elements found');
      return null;
    }

    console.log('TreatmentRenderer: Rendering rich elements:', richContent.rich_elements);

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
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={renderMarkdown(richContent?.text_content || content)}
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
  console.log('RichElementRenderer: Rendering element:', element.type, element);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(element.id);
    }
  };

  const renderElement = () => {
    switch (element.type) {
      case 'decision_tree':
        console.log('RichElementRenderer: Rendering decision tree with data:', element.data);
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
            <div className="text-sm font-medium text-gray-700 mb-2">
              {element.data.title || 'Table'}
            </div>
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {element.data.headers?.map((header: string, index: number) => (
                    <th key={index} className="px-4 py-2 border-b border-gray-300 text-left font-medium">
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

export default TreatmentRenderer; 