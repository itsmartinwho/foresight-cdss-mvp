export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  isChartCode: boolean;
  isTableCode: boolean;
  description?: string;
}

/**
 * Detects and extracts code blocks from markdown text
 */
export function detectCodeBlocks(text: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = [];
  
  // Updated regex to be more flexible with newlines and language specification
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    // Skip empty code blocks
    if (!code) continue;
    
    const isChartCode = detectChartGenerationCode(code, language);
    const isTableCode = detectTableGenerationCode(code, language);
    
    console.log(`Detected code block ${blockIndex}:`, {
      language,
      isChartCode,
      isTableCode,
      codePreview: code.substring(0, 100) + (code.length > 100 ? '...' : '')
    });
    
    // Extract description from surrounding text
    const description = extractCodeDescription(text, match.index);
    
    codeBlocks.push({
      id: `code-block-${blockIndex}`,
      language,
      code,
      isChartCode,
      isTableCode,
      description
    });
    
    blockIndex++;
  }
  
  console.log(`Total code blocks detected: ${codeBlocks.length}`);
  return codeBlocks;
}

/**
 * Detects if code is likely to generate charts/visualizations
 */
function detectChartGenerationCode(code: string, language: string): boolean {
  if (language !== 'python' && language !== 'py') {
    return false;
  }
  
  // Keywords that indicate chart generation
  const chartKeywords = [
    'plt.', 'matplotlib', 'seaborn', 'plotly',
    'plt.plot', 'plt.bar', 'plt.hist', 'plt.scatter',
    'plt.pie', 'plt.line', 'plt.area', 'plt.box',
    'plt.figure', 'plt.subplot', 'plt.xlabel', 'plt.ylabel',
    'plt.title', 'plt.legend', 'plt.grid', 'plt.tick',
    'sns.', 'px.', 'go.', 'fig.show', 'plt.show',
    'savefig', 'to_plot', 'chart', 'graph',
    'visualization', 'plot', '.plot('
  ];
  
  // Medical chart specific patterns
  const medicalChartKeywords = [
    'vital', 'blood pressure', 'heart rate', 
    'temperature', 'labs', 'medication',
    'trend', 'timeline', 'patient data',
    'clinical', 'diagnosis', 'symptoms',
    'severity', 'visit', 'date'
  ];
  
  const codeLines = code.toLowerCase().split('\n');
  const fullCodeLower = code.toLowerCase();
  
  // Check for chart generation keywords
  const hasChartKeywords = chartKeywords.some(keyword => 
    fullCodeLower.includes(keyword.toLowerCase())
  );
  
  // Check for medical context
  const hasMedicalContext = medicalChartKeywords.some(keyword => 
    fullCodeLower.includes(keyword.toLowerCase())
  );
  
  // Check for data manipulation that typically precedes charts
  const hasDataManipulation = (
    fullCodeLower.includes('pandas') || 
    fullCodeLower.includes('pd.') ||
    fullCodeLower.includes('dataframe') ||
    fullCodeLower.includes('groupby') ||
    fullCodeLower.includes('aggregate') ||
    fullCodeLower.includes('pivot')
  );
  
  // If it's a longer code block with data manipulation, likely a chart
  const isLongDataCode = hasDataManipulation && codeLines.length > 3;
  
  // Be more aggressive - if it looks like it might generate a chart, include it
  const result = hasChartKeywords || (hasMedicalContext && hasDataManipulation) || isLongDataCode;
  
  console.log(`Chart detection for code block:`, {
    hasChartKeywords,
    hasMedicalContext,
    hasDataManipulation,
    isLongDataCode,
    result,
    codeSnippet: code.substring(0, 200)
  });
  
  return result;
}

/**
 * Detects if code is likely to generate tables/DataFrames
 */
function detectTableGenerationCode(code: string, language: string): boolean {
  if (language !== 'python' && language !== 'py') {
    return false;
  }
  
  // Keywords that indicate table generation
  const tableKeywords = [
    'pd.dataframe', 'pandas.dataframe', 'dataframe', 'df',
    'to_csv', 'to_excel', 'table', 'pivot_table',
    'groupby', 'aggregate', 'summary', 'describe',
    'crosstab', 'value_counts', 'tabulate',
    'head()', 'tail()', 'info()', 'columns'
  ];
  
  const fullCodeLower = code.toLowerCase();
  
  // Check for table generation keywords
  const hasTableKeywords = tableKeywords.some(keyword => 
    fullCodeLower.includes(keyword.toLowerCase())
  );
  
  // Look for DataFrame assignment patterns
  const hasDataFrameAssignment = /(?:df|data|table|result)\s*=.*dataframe/i.test(code);
  
  // Check if it creates structured data but doesn't seem to be for charts
  const hasStructuredData = (
    fullCodeLower.includes('dataframe') || 
    fullCodeLower.includes('pd.') ||
    fullCodeLower.includes('data =') ||
    fullCodeLower.includes('table =')
  ) && !fullCodeLower.includes('plt.');
  
  const result = hasTableKeywords || hasDataFrameAssignment || hasStructuredData;
  
  console.log(`Table detection for code block:`, {
    hasTableKeywords,
    hasDataFrameAssignment,
    hasStructuredData,
    result
  });
  
  return result;
}

/**
 * Extracts description/context for a code block from surrounding text
 */
function extractCodeDescription(fullText: string, codeBlockIndex: number): string | undefined {
  // Look for text before the code block (within 200 characters)
  const beforeText = fullText.substring(Math.max(0, codeBlockIndex - 200), codeBlockIndex);
  
  // Extract the last sentence or paragraph before the code block
  const sentences = beforeText.split(/[.!?]\s+/);
  const lastSentence = sentences[sentences.length - 1];
  
  // If the last sentence mentions charts, graphs, or visualization, use it
  if (lastSentence && (
    lastSentence.toLowerCase().includes('chart') ||
    lastSentence.toLowerCase().includes('graph') ||
    lastSentence.toLowerCase().includes('visualiz') ||
    lastSentence.toLowerCase().includes('plot') ||
    lastSentence.toLowerCase().includes('trend') ||
    lastSentence.toLowerCase().includes('data')
  )) {
    return lastSentence.trim();
  }
  
  return undefined;
}

/**
 * Specifically detects medical chart generation code
 */
export function detectMedicalChartCode(text: string): CodeBlock[] {
  const allCodeBlocks = detectCodeBlocks(text);
  return allCodeBlocks.filter(block => block.isChartCode || block.isTableCode);
}

/**
 * Prepares Python code for execution by ensuring proper imports and structure
 */
export function preparePythonCodeForExecution(code: string): string {
  // Check if code already has necessary imports
  const hasMatplotlib = code.includes('import matplotlib') || code.includes('from matplotlib');
  const hasPandas = code.includes('import pandas') || code.includes('from pandas');
  const hasNumpy = code.includes('import numpy') || code.includes('from numpy');
  
  let preparedCode = '';
  
  // Add missing imports
  if (!hasMatplotlib) {
    preparedCode += 'import matplotlib.pyplot as plt\nimport matplotlib\nmatplotlib.use("Agg")\n';
  }
  if (!hasPandas) {
    preparedCode += 'import pandas as pd\n';
  }
  if (!hasNumpy) {
    preparedCode += 'import numpy as np\n';
  }
  
  // Add the original code
  preparedCode += '\n' + code;
  
  // Ensure plt.show() is replaced with plt.savefig() for web execution
  preparedCode = preparedCode.replace(/plt\.show\(\)/g, 'plt.savefig("chart.png", dpi=150, bbox_inches="tight")');
  
  return preparedCode;
} 