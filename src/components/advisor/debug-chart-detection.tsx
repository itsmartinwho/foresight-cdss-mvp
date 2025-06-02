"use client";

import React, { useState } from 'react';
import { detectCodeBlocks, detectMedicalChartCode } from './code-detector';

export function DebugChartDetection() {
  const [results, setResults] = useState<string>('');

  const testMarkdown = `To provide a detailed response regarding the evolution of patient Maria Gomez (ID: RUGOWDBR4X61), I would need clinical data such as vitals, lab results, diagnoses, treatments, and clinical notes over time. Since no specific clinical or historical data has been provided yet, I'll create a realistic example dataset to demonstrate:

Evolution chart: showing vitals (e.g., blood pressure, weight) or a lab marker over time that tracks health changes
Table: showing a history of diagnoses and treatments with dates

I will simulate data to illustrate how this can be done.

Example: Simulated Patient Evolution for Maria Gomez
Vitals: Systolic Blood Pressure and Weight over 12 months
Diagnoses and treatments during the same period

Let's proceed with Python code that produces this:

\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from datetime import import datetime, timedelta

# Simulating 12 monthly dates from May 2023 to April 2024
dates = pd.date_range(start='2023-05-01', periods=12, freq='M')

# Simulated vitals for Maria Gomez
np.random.seed(42)
systolic_bp = 120 + np.random.normal(0, 5, 12).cumsum()  # around 120 with some variation
weight = 70 + np.random.normal(0, 0.5, 12).cumsum()      # around 70 kg with slight variation

# Create a DataFrame for vitals
vitals_df = pd.DataFrame({
    'Date': dates,
    'Systolic BP (mm Hg)': systolic_bp,
    'Weight (kg)': weight
})

# Simulated diagnosis and treatment history
history_data = {
    'Date': ['2023-06-15', '2023-09-10', '2024-01-05'],
    'Diagnosis': ['Hypertension Stage 1', 'Weight gain', 'Hypertension controlled'],
}

# Plot Systolic BP
fig, ax1 = plt.subplots(figsize=(10,6))

# Plot Systolic BP
ax1.plot(vitals_df['Date'], vitals_df['Systolic BP (mm Hg)'], color='tab:red', marker='o', label='Systolic BP')
ax1.set_xlabel('Date')
ax1.set_ylabel('Systolic BP (mm Hg)', color='tab:red')
ax1.tick_params(axis='y', labelcolor='tab:red')
ax1.axhline(130, color='tab:red', linestyle='--', linewidth=0.7, label='Hypertension threshold')

# Create a second y-axis to plot weight
ax2 = ax1.twinx()
ax2.plot(vitals_df['Date'], vitals_df['Weight (kg)'], color='tab:blue', marker='s', label='Weight')
ax2.set_ylabel('Weight (kg)', color='tab:blue')
ax2.tick_params(axis='y', labelcolor='tab:blue')

# Title and legends
plt.title('Evolution of Vitals for Maria Gomez (May 2023 - Apr 2024)')
fig.tight_layout()
fig.legend(loc='upper left', bbox_to_anchor=(0.15,0.85))

plt.show()

# Display the history table
history_df_sorted = history_df.sort_values(by='Date')
history_df_sorted.reset_index(drop=True, inplace=True)
history_df_sorted
\`\`\`

Interpretation
The chart shows Maria Gomez's systolic blood pressure trending around 120-130 mm Hg with some fluctuations, hovering near but mostly under the hypertension threshold of 130 mm Hg.
Weight shows minor fluctuations around 70 kg, possibly indicating stable weight with slight variations.
The table lists key diagnoses and treatment steps in her recent history.`;

  const runTest = () => {
    console.log('=== DEBUGGING CHART DETECTION ===');
    console.log('Input markdown length:', testMarkdown.length);
    console.log('Input markdown (first 500 chars):', testMarkdown.substring(0, 500));
    
    // Test detectCodeBlocks directly
    console.log('\n--- Testing detectCodeBlocks ---');
    const allBlocks = detectCodeBlocks(testMarkdown);
    console.log('All detected blocks:', allBlocks);
    
    // Test detectMedicalChartCode
    console.log('\n--- Testing detectMedicalChartCode ---');
    const chartBlocks = detectMedicalChartCode(testMarkdown);
    console.log('Chart blocks:', chartBlocks);
    
    // Display results
    const resultText = `
=== DETECTION RESULTS ===

Input Length: ${testMarkdown.length} characters

All Code Blocks Found: ${allBlocks.length}
${allBlocks.map((block, i) => `
Block ${i}:
- ID: ${block.id}
- Language: ${block.language}
- Is Chart: ${block.isChartCode}
- Is Table: ${block.isTableCode}
- Description: ${block.description || 'None'}
- Code Length: ${block.code.length}
- Code Preview: ${block.code.substring(0, 200)}...
`).join('')}

Chart/Table Blocks Found: ${chartBlocks.length}
${chartBlocks.map((block, i) => `
Chart Block ${i}:
- ID: ${block.id}
- Language: ${block.language}
- Is Chart: ${block.isChartCode}
- Is Table: ${block.isTableCode}
- Code Preview: ${block.code.substring(0, 100)}...
`).join('')}
    `;
    
    setResults(resultText);
  };

  return (
    <div className="p-6 border rounded-lg bg-yellow-50">
      <h3 className="text-lg font-semibold mb-4">Chart Detection Debug Tool</h3>
      
      <button 
        onClick={runTest}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Run Detection Test
      </button>
      
      {results && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Results:</h4>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {results}
          </pre>
        </div>
      )}
      
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">Show Test Markdown</summary>
        <pre className="bg-gray-100 p-4 rounded text-xs mt-2 overflow-auto max-h-48">
          {testMarkdown}
        </pre>
      </details>
    </div>
  );
} 