import React, { useState, useCallback } from 'react';
import { TreatmentRenderer } from '../advisor/streaming-markdown/treatment-renderer';
import { RichContent, RichElement } from '@/lib/types';

interface RichTreatmentEditorProps {
  content: RichContent;
  onSave: (updatedContent: RichContent) => void;
  isDemo?: boolean;
  label?: string;
}

export const RichTreatmentEditor: React.FC<RichTreatmentEditorProps> = ({
  content,
  onSave,
  isDemo = false,
  label = 'Treatment Plan'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleStartEdit = useCallback(() => {
    if (isDemo) return; // No editing in demo mode
    setIsEditing(true);
    setEditedContent(content);
  }, [content, isDemo]);

  const handleSave = useCallback(() => {
    onSave(editedContent);
    setIsEditing(false);
  }, [editedContent, onSave]);

  const handleCancel = useCallback(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content]);

  const handleTextContentChange = useCallback((newTextContent: string) => {
    setEditedContent(prev => ({
      ...prev,
      text_content: newTextContent,
      updated_at: new Date().toISOString()
    }));
  }, []);

  const handleChartDelete = useCallback((chartId: string) => {
    setEditedContent(prev => ({
      ...prev,
      rich_elements: prev.rich_elements.filter(el => el.id !== chartId),
      updated_at: new Date().toISOString()
    }));
  }, []);

  const addRichElement = useCallback((element: Omit<RichElement, 'id' | 'position'>) => {
    const newElement: RichElement = {
      ...element,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: editedContent.rich_elements.length
    };

    setEditedContent(prev => ({
      ...prev,
      rich_elements: [...prev.rich_elements, newElement],
      updated_at: new Date().toISOString()
    }));
  }, [editedContent.rich_elements.length]);

  if (isEditing) {
    return (
      <div className="rich-treatment-editor space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{label} (Editing)</h3>
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

        {/* Text Content Editor */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Text Content
          </label>
          <textarea
            value={editedContent.text_content}
            onChange={(e) => handleTextContentChange(e.target.value)}
            className="w-full h-64 p-3 border border-gray-300 rounded-md resize-vertical font-mono text-sm"
            placeholder="Enter treatment content in markdown format..."
          />
        </div>

        {/* Rich Elements Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Rich Elements ({editedContent.rich_elements.length})
            </label>
            <RichElementControls onAddElement={addRichElement} />
          </div>
          
          <div className="space-y-2">
            {editedContent.rich_elements.map((element, index) => (
              <RichElementEditor
                key={element.id}
                element={element}
                onUpdate={(updatedElement) => {
                  const updatedElements = [...editedContent.rich_elements];
                  updatedElements[index] = updatedElement;
                  setEditedContent(prev => ({
                    ...prev,
                    rich_elements: updatedElements,
                    updated_at: new Date().toISOString()
                  }));
                }}
                onDelete={() => handleChartDelete(element.id)}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Preview</label>
          <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
            <TreatmentRenderer
              content={editedContent.text_content}
              richContent={editedContent}
              editable={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rich-treatment-editor">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{label}</h3>
        {!isDemo && (
          <button
            onClick={handleStartEdit}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
          >
            Edit
          </button>
        )}
      </div>

      <TreatmentRenderer
        content={content.text_content}
        richContent={content}
        editable={!isDemo}
        onChartDelete={handleChartDelete}
        onContentEdit={handleTextContentChange}
      />
    </div>
  );
};

// Controls for adding rich elements
const RichElementControls: React.FC<{
  onAddElement: (element: Omit<RichElement, 'id' | 'position'>) => void;
}> = ({ onAddElement }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addTable = useCallback(() => {
    onAddElement({
      type: 'table',
      data: {
        headers: ['Medication', 'Dosage', 'Frequency'],
        rows: [
          ['Example Drug', '10mg', 'Daily'],
          ['', '', '']
        ]
      },
      editable: true
    });
    setShowAddMenu(false);
  }, [onAddElement]);

  const addChart = useCallback(() => {
    onAddElement({
      type: 'chart',
      data: {
        title: 'Treatment Progress',
        type: 'line',
        data: []
      },
      editable: false
    });
    setShowAddMenu(false);
  }, [onAddElement]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowAddMenu(!showAddMenu)}
        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
      >
        + Add Element
      </button>
      
      {showAddMenu && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <button
            onClick={addTable}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            Add Table
          </button>
          <button
            onClick={addChart}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            Add Chart
          </button>
        </div>
      )}
    </div>
  );
};

// Editor for individual rich elements
const RichElementEditor: React.FC<{
  element: RichElement;
  onUpdate: (element: RichElement) => void;
  onDelete: () => void;
}> = ({ element, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateElementData = useCallback((newData: any) => {
    onUpdate({
      ...element,
      data: newData
    });
  }, [element, onUpdate]);

  return (
    <div className="border border-gray-200 rounded-md p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">{element.type} Element</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3">
          {element.type === 'table' && (
            <TableElementEditor 
              data={element.data}
              onUpdate={updateElementData}
            />
          )}
          {element.type === 'chart' && (
            <ChartElementEditor 
              data={element.data}
              onUpdate={updateElementData}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Table element editor
const TableElementEditor: React.FC<{
  data: any;
  onUpdate: (data: any) => void;
}> = ({ data, onUpdate }) => {
  const addRow = useCallback(() => {
    const newRow = new Array(data.headers.length).fill('');
    onUpdate({
      ...data,
      rows: [...data.rows, newRow]
    });
  }, [data, onUpdate]);

  const updateCell = useCallback((rowIndex: number, cellIndex: number, value: string) => {
    const newRows = [...data.rows];
    newRows[rowIndex][cellIndex] = value;
    onUpdate({
      ...data,
      rows: newRows
    });
  }, [data, onUpdate]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600">Table Editor</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {data.headers.map((header: string, index: number) => (
                <th key={index} className="border border-gray-300 px-2 py-1 bg-gray-50">
                  <input
                    value={header}
                    onChange={(e) => {
                      const newHeaders = [...data.headers];
                      newHeaders[index] = e.target.value;
                      onUpdate({ ...data, headers: newHeaders });
                    }}
                    className="w-full bg-transparent text-center"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: string[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell: string, cellIndex: number) => (
                  <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                      className="w-full bg-transparent"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
      >
        Add Row
      </button>
    </div>
  );
};

// Chart element editor
const ChartElementEditor: React.FC<{
  data: any;
  onUpdate: (data: any) => void;
}> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600">Chart Configuration</div>
      <div className="space-y-2">
        <input
          value={data.title || ''}
          onChange={(e) => onUpdate({ ...data, title: e.target.value })}
          placeholder="Chart title"
          className="w-full p-2 border border-gray-300 rounded text-sm"
        />
        <div className="text-xs text-gray-500">
          Chart data and visualization settings would be configured here.
        </div>
      </div>
    </div>
  );
};

export default RichTreatmentEditor; 