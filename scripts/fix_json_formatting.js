const fs = require('fs');

function fixJsonFormatting(inputPath, outputPath) {
  console.log(`Fixing JSON formatting in: ${inputPath}`);
  
  try {
    let content = fs.readFileSync(inputPath, 'utf8');
    
    // Fix common JSON formatting issues
    console.log('Applying JSON formatting fixes...');
    
    // Fix missing quotes around property names
    content = content.replace(/(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix missing quotes around verification_status values
    content = content.replace(/"verification_status":\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '"verification_status": "$1"');
    
    // Fix missing quotes around reference_range values
    content = content.replace(/"reference_range":\s*([^",\n\r\}]+)/g, '"reference_range": "$1"');
    
    // Fix duplicate patient_id fields (remove the first one if there are two)
    content = content.replace(/"patient_id":\s*"[^"]*",\s*"patient_id":/g, '"patient_id":');
    
    // Remove any id fields that shouldn't be there
    content = content.replace(/,?\s*"id":\s*"[^"]*"/g, '');
    
    // Clean up any trailing commas before closing braces/brackets
    content = content.replace(/,(\s*[\}\]])/g, '$1');
    
    // Try to parse to validate
    try {
      JSON.parse(content);
      console.log('✅ JSON formatting fixed successfully!');
    } catch (parseError) {
      console.log('⚠️  JSON still has issues after basic fixes, attempting more aggressive fixes...');
      
      // More aggressive fixes for specific patterns
      const lines = content.split('\n');
      const fixedLines = lines.map((line, index) => {
        // Fix lines with missing quotes around property values
        if (line.includes(': ') && !line.includes('": "') && !line.includes('": [') && !line.includes('": {') && !line.includes('": null') && !line.includes('": true') && !line.includes('": false')) {
          // Check if it's a numeric value
          const match = line.match(/^(\s*"[^"]+"):\s*([^",\n\r\}\]]+)(.*)$/);
          if (match) {
            const [, property, value, rest] = match;
            const trimmedValue = value.trim();
            
            // If it's not a number, boolean, null, or already quoted, add quotes
            if (!/^-?\d+(\.\d+)?$/.test(trimmedValue) && 
                trimmedValue !== 'null' && 
                trimmedValue !== 'true' && 
                trimmedValue !== 'false' &&
                !trimmedValue.startsWith('"')) {
              return `${property}: "${trimmedValue}"${rest}`;
            }
          }
        }
        return line;
      });
      
      content = fixedLines.join('\n');
      
      // Try parsing again
      try {
        JSON.parse(content);
        console.log('✅ JSON formatting fixed with aggressive fixes!');
      } catch (finalError) {
        console.error('❌ Could not fix JSON formatting automatically.');
        console.error('Error details:', finalError.message);
        console.error('You may need to manually fix the JSON file.');
        return false;
      }
    }
    
    // Write the fixed content
    fs.writeFileSync(outputPath, content);
    console.log(`Fixed JSON saved to: ${outputPath}`);
    return true;
    
  } catch (error) {
    console.error('Error fixing JSON formatting:', error.message);
    return false;
  }
}

// Command line usage
if (require.main === module) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  
  if (!inputPath || !outputPath) {
    console.error('Usage: node fix_json_formatting.js <input_file> <output_file>');
    process.exit(1);
  }
  
  const success = fixJsonFormatting(inputPath, outputPath);
  process.exit(success ? 0 : 1);
}

module.exports = { fixJsonFormatting }; 