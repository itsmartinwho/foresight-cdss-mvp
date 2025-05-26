const fs = require('fs');

function extractValidRecords(inputPath, outputPath) {
  console.log(`Extracting valid records from: ${inputPath}`);
  
  try {
    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');
    
    let validRecords = [];
    let currentRecord = null;
    let braceLevel = 0;
    let inRecord = false;
    let recordLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we're starting a new record
      if (line.includes('"patient_supabase_id"') && !inRecord) {
        inRecord = true;
        braceLevel = 0;
        recordLines = [];
      }
      
      if (inRecord) {
        recordLines.push(lines[i]);
        
        // Count braces to track nesting
        for (const char of line) {
          if (char === '{') braceLevel++;
          if (char === '}') braceLevel--;
        }
        
        // If we've closed all braces, we have a complete record
        if (braceLevel === 0 && line.includes('}')) {
          const recordText = recordLines.join('\n');
          
          try {
            // Try to parse this record
            const record = JSON.parse(recordText);
            validRecords.push(record);
            console.log(`✅ Extracted valid record for patient: ${record.patient_supabase_id}`);
          } catch (parseError) {
            console.log(`❌ Skipping malformed record starting at line ${i - recordLines.length + 1}: ${parseError.message}`);
          }
          
          inRecord = false;
          recordLines = [];
        }
      }
    }
    
    // Create the final JSON structure
    const finalData = {
      synthetic_data: validRecords
    };
    
    // Write the extracted valid records
    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
    console.log(`\n✅ Extraction complete!`);
    console.log(`Extracted ${validRecords.length} valid records.`);
    console.log(`Valid data saved to: ${outputPath}`);
    
    return validRecords.length > 0;
    
  } catch (error) {
    console.error('Error extracting valid records:', error.message);
    return false;
  }
}

// Command line usage
if (require.main === module) {
  const inputPath = process.argv[2] || 'public/data/synthetic-data5.json';
  const outputPath = process.argv[3] || 'public/data/synthetic-data5-extracted.json';
  
  const success = extractValidRecords(inputPath, outputPath);
  process.exit(success ? 0 : 1);
}

module.exports = { extractValidRecords }; 