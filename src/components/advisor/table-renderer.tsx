"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayIcon, DownloadIcon } from 'lucide-react';
import type { PyodideInterface } from '@/types/pyodide';

interface TableRendererProps {
  pythonCode: string;
  description?: string;
  patientData?: any;
}

export function TableRenderer({ pythonCode, description, patientData }: TableRendererProps) {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);

  const initializePyodide = async () => {
    if (pyodide) return pyodide;
    
    try {
      setLoading(true);
      const pyodideInstance = await window.loadPyodide();
      
      // Load required packages
      await pyodideInstance.loadPackage(['pandas', 'numpy']);
      
      setPyodide(pyodideInstance);
      return pyodideInstance;
    } catch (err) {
      setError(`Failed to initialize Pyodide: ${err}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeCode = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const pyodideInstance = await initializePyodide();
      
      // Inject patient data if available
      if (patientData) {
        pyodideInstance.globals.set('patient_data', patientData);
      }
      
      // Prepare the code with table capture
      const wrappedCode = `
import pandas as pd
import numpy as np

${pythonCode}

# Capture the table data
try:
    # Look for common dataframe variable names
    table_vars = ['df', 'data', 'table', 'result', 'results']
    captured_table = None
    
    for var_name in table_vars:
        if var_name in locals() and isinstance(locals()[var_name], pd.DataFrame):
            captured_table = locals()[var_name].to_dict('records')
            break
    
    # If no standard variable found, check for any DataFrame in locals
    if captured_table is None:
        for name, obj in locals().items():
            if isinstance(obj, pd.DataFrame) and not name.startswith('_'):
                captured_table = obj.to_dict('records')
                break
    
    # Make the table data available
    table_data = captured_table
    
except Exception as e:
    print(f"Error capturing table: {e}")
    table_data = None
`;

      // Execute the code
      pyodideInstance.runPython(wrappedCode);
      
      // Get the table data
      const tableResult = pyodideInstance.globals.get('table_data');
      
      if (tableResult) {
        setTableData(tableResult);
        setExecuted(true);
      } else {
        throw new Error('No table was generated');
      }
      
    } catch (err) {
      setError(`Execution error: ${err}`);
      console.error('Python execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!tableData) return;
    
    // Convert table data to CSV
    const headers = Object.keys(tableData[0]);
    const csvContent = [
      headers.join(','),
      ...tableData.map((row: any) => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medical-table.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-900 dark:to-green-950">
      {description && (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      )}
      
      {/* Python Code Display */}
      <div className="bg-slate-900 text-green-400 p-3 rounded-md mb-4 overflow-x-auto">
        <pre className="text-xs font-mono whitespace-pre-wrap">{pythonCode}</pre>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Button 
          onClick={executeCode} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          <PlayIcon className="w-4 h-4 mr-2" />
          {loading ? 'Generating Table...' : 'Execute & Generate Table'}
        </Button>
        
        {tableData && (
          <Button variant="outline" onClick={downloadCSV}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table Display */}
      {tableData && (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {Object.keys(tableData[0]).map((header) => (
                    <th key={header} className="px-4 py-2 text-left font-medium text-gray-900">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row: any, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.keys(tableData[0]).map((header) => (
                      <td key={header} className="px-4 py-2 text-gray-700">
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            {pyodide ? 'Executing Python code...' : 'Loading Python environment...'}
          </span>
        </div>
      )}

      {/* Success State */}
      {executed && tableData && (
        <div className="text-sm text-green-600 mt-2 flex items-center">
          ✓ Table generated successfully! {tableData.length} rows displayed.
        </div>
      )}
    </div>
  );
} 