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
  
  console.log('detectCodeBlocks: Input text length:', text.length);
  console.log('detectCodeBlocks: First 500 chars of text:', text.substring(0, 500));
  
  // Updated regex to be more flexible with newlines and language specification
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;
  
  // Also try a simpler pattern that matches the exact format from screenshots
  const simpleCodeBlockRegex = /```python([\s\S]*?)```/g;
  
  console.log('detectCodeBlocks: Testing with aggressive regex...');
  
  // Try both patterns
  const regexesToTry = [
    { name: 'flexible', regex: codeBlockRegex },
    { name: 'simple-python', regex: simpleCodeBlockRegex }
  ];
  
  for (const { name, regex } of regexesToTry) {
    console.log(`detectCodeBlocks: Trying ${name} regex...`);
    regex.lastIndex = 0; // Reset regex
    
    while ((match = regex.exec(text)) !== null) {
      console.log(`detectCodeBlocks: Found match with ${name} regex:`, match);
      
      let language, code;
      if (name === 'simple-python') {
        language = 'python';
        code = match[1].trim();
      } else {
        language = match[1] || 'text';
        code = match[2].trim();
      }
      
      // Skip empty code blocks
      if (!code) {
        console.log('detectCodeBlocks: Skipping empty code block');
        continue;
      }
      
      const isChartCode = detectChartGenerationCode(code, language);
      const isTableCode = detectTableGenerationCode(code, language);
      
      console.log(`detectCodeBlocks: Block ${blockIndex}:`, {
        language,
        isChartCode,
        isTableCode,
        codeLength: code.length,
        codePreview: code.substring(0, 100)
      });
      
      // Extract description from surrounding text
      const description = extractCodeDescription(text, match.index || 0);
      
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
  }
  
  console.log('detectCodeBlocks: Total blocks found:', codeBlocks.length);
  return codeBlocks;
}

/**
 * Detects if code is likely to generate charts/visualizations
 */
function detectChartGenerationCode(code: string, language: string): boolean {
  if (language !== 'python' && language !== 'py') {
    return false;
  }
  
  // Make detection case-insensitive
  const codeLines = code.toLowerCase().split('\n');
  const fullCode = code.toLowerCase();
  
  // Primary chart keywords - if any of these are found, it's definitely a chart
  const primaryChartKeywords = [
    'plt.', 'matplotlib', 'plt.show()', 'plt.plot', 'plt.bar', 'plt.scatter',
    'plt.hist', 'plt.pie', 'plt.figure', 'plt.subplot', '.plot(',
    'seaborn', 'sns.', 'plotly', 'px.', 'go.'
  ];
  
  // Secondary indicators - medical/data analysis context
  const medicalChartKeywords = [
    'vital signs', 'blood pressure', 'heart rate', 'temperature',
    'symptom', 'treatment', 'medication', 'diagnosis', 'patient',
    'clinical', 'medical', 'health', 'lab result', 'test result'
  ];
  
  // Data visualization indicators
  const dataVizKeywords = [
    'chart', 'graph', 'plot', 'visualization', 'trend', 'analysis',
    'xlabel', 'ylabel', 'title', 'legend', 'grid', 'figure',
    'marker', 'line', 'bar', 'scatter'
  ];
  
  // Check for primary chart keywords (definitive)
  const hasPrimaryKeywords = primaryChartKeywords.some(keyword => 
    fullCode.includes(keyword.toLowerCase())
  );
  
  if (hasPrimaryKeywords) {
    console.log('Chart detection: Found primary chart keyword');
    return true;
  }
  
  // Check for combination of medical + data viz keywords
  const hasMedicalContext = medicalChartKeywords.some(keyword => 
    fullCode.includes(keyword.toLowerCase())
  );
  const hasDataVizContext = dataVizKeywords.some(keyword => 
    fullCode.includes(keyword.toLowerCase())
  );
  
  if (hasMedicalContext && hasDataVizContext) {
    console.log('Chart detection: Found medical + data viz context');
    return true;
  }
  
  // Check for pandas + matplotlib imports combination
  const hasMatplotlib = fullCode.includes('matplotlib') || fullCode.includes('plt');
  const hasPandas = fullCode.includes('pandas') || fullCode.includes('pd.');
  
  if (hasMatplotlib && hasPandas) {
    console.log('Chart detection: Found matplotlib + pandas combination');
    return true;
  }
  
  return false;
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