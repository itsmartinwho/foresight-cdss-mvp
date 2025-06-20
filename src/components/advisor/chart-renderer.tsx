"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Play as PlayIcon, Eye as EyeIcon, Download as DownloadIcon } from '@phosphor-icons/react';
import type { PyodideInterface } from '@/types/pyodide';

interface ChartRendererProps {
  pythonCode: string;
  description?: string;
  patientData?: any;
}

export function ChartRenderer({ pythonCode, description, patientData }: ChartRendererProps) {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);

  // Load Pyodide
  useEffect(() => {
    const loadPyodideScript = async () => {
      if (window.loadPyodide) {
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.6/full/pyodide.js';
      script.onerror = (error) => {
        console.error('ChartRenderer: Failed to load Pyodide script:', error);
      };
      document.head.appendChild(script);
    };

    loadPyodideScript();
  }, []);

  const initializePyodide = async () => {
    if (pyodide) return pyodide;
    
    try {
      setLoading(true);
      const pyodideInstance = await window.loadPyodide();
      
      await pyodideInstance.loadPackage(['numpy', 'matplotlib', 'pandas']);
      pyodideInstance.runPython(`
        import matplotlib
        matplotlib.use('Agg')  # Use non-interactive backend
        import matplotlib.pyplot as plt
        import numpy as np
        import pandas as pd
        import io
        import base64
        
        # Configure matplotlib for better charts
        plt.style.use('default')
        plt.rcParams['figure.figsize'] = [10, 6]
        plt.rcParams['figure.dpi'] = 100
        plt.rcParams['font.size'] = 10
      `);
      
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
      
      if (patientData) {
        pyodideInstance.globals.set('patient_data', patientData);
      }
      const wrappedCode = `
${pythonCode}

# Capture the plot as base64 image
try:
    import io
    import base64
    
    # Save the current figure
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
    buffer.seek(0)
    
    # Convert to base64
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    # Clear the buffer and close the plot
    buffer.close()
    plt.close()
    
    # Make the base64 string available
    chart_image = image_base64
    
except Exception as e:
    print(f"Error capturing plot: {e}")
    chart_image = None
`;

      pyodideInstance.runPython(wrappedCode);
      const chartBase64 = pyodideInstance.globals.get('chart_image');
      
      if (chartBase64) {
        const imageUrl = `data:image/png;base64,${chartBase64}`;
        setChartUrl(imageUrl);
        setExecuted(true);
      } else {
        throw new Error('No chart was generated');
      }
      
    } catch (err) {
      setError(`Execution error: ${err}`);
      console.error('Python execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadChart = () => {
    if (!chartUrl) return;
    
    const link = document.createElement('a');
    link.href = chartUrl;
    link.download = 'medical-chart.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewFullScreen = () => {
    if (!chartUrl) return;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>Medical Chart</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f0f0;">
            <img src="${chartUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlayIcon className="w-4 h-4 mr-2" />
          {loading ? 'Generating Chart...' : 'Execute & Render Chart'}
        </Button>
        
        {chartUrl && (
          <>
            <Button variant="outline" onClick={viewFullScreen}>
              <EyeIcon className="w-4 h-4 mr-2" />
              View Full Screen
            </Button>
            <Button variant="outline" onClick={downloadChart}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download PNG
            </Button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Chart Display */}
      {chartUrl && (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <Image
            src={chartUrl}
            alt="Generated medical chart"
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized={true}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            {pyodide ? 'Executing Python code...' : 'Loading Python environment...'}
          </span>
        </div>
      )}

      {/* Success State */}
      {executed && chartUrl && (
        <div className="text-sm text-green-600 mt-2 flex items-center">
          ✓ Chart generated successfully! Use the buttons above to view or download.
        </div>
      )}
    </div>
  );
} 