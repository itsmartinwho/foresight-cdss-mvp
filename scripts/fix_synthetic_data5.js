const fs = require('fs');

function fixSyntheticData5() {
  console.log('Fixing specific issues in synthetic-data5.json...');
  
  try {
    let content = fs.readFileSync('public/data/synthetic-data5.json', 'utf8');
    
    // Fix specific issues found in the file
    console.log('Applying targeted fixes...');
    
    // Fix missing quote after verification_status on line 72
    content = content.replace('"verification_status: "confirmed"', '"verification_status": "confirmed"');
    
    // Fix missing quote after reference_range
    content = content.replace(/"reference_range: /g, '"reference_range": ');
    
    // Remove duplicate patient_id fields
    content = content.replace(/"patient_id": "a4e39d6d-30cb-427d-a98a-37f47f6e00e9",\s*"patient_id": "6cff4900-bda0-42a0-9f4f-5c4109b4f9f1"/g, '"patient_id": "6cff4900-bda0-42a0-9f4f-5c4109b4f9f1"');
    
    // Remove all id fields that shouldn't be there
    content = content.replace(/,?\s*"id": "[^"]*"/g, '');
    
    // Clean up any trailing commas before closing braces/brackets
    content = content.replace(/,(\s*[\}\]])/g, '$1');
    
    // Try to parse to validate
    try {
      const parsed = JSON.parse(content);
      console.log('✅ JSON formatting fixed successfully!');
      
      // Write the fixed content
      fs.writeFileSync('public/data/synthetic-data5-fixed.json', content);
      console.log('Fixed JSON saved to: public/data/synthetic-data5-fixed.json');
      
      console.log(`Found ${parsed.synthetic_data.length} records in fixed data.`);
      return true;
      
    } catch (parseError) {
      console.error('❌ JSON still has issues after fixes.');
      console.error('Error details:', parseError.message);
      
      // Try to identify the specific line with the issue
      const lines = content.split('\n');
      const errorMatch = parseError.message.match(/position (\d+)/);
      if (errorMatch) {
        const position = parseInt(errorMatch[1]);
        let currentPos = 0;
        for (let i = 0; i < lines.length; i++) {
          currentPos += lines[i].length + 1; // +1 for newline
          if (currentPos >= position) {
            console.error(`Issue around line ${i + 1}: ${lines[i]}`);
            break;
          }
        }
      }
      return false;
    }
    
  } catch (error) {
    console.error('Error fixing JSON formatting:', error.message);
    return false;
  }
}

// Run the fix
const success = fixSyntheticData5();
process.exit(success ? 0 : 1); 