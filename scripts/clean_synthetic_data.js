const fs = require('fs');
const path = require('path');

const SYNTHETIC_DATA_PATH = path.join(__dirname, '../public/data/synthetic-data.json');
const CLEANED_DATA_PATH = path.join(__dirname, '../public/data/synthetic-data-cleaned.json');

function cleanSyntheticData() {
  console.log('Cleaning synthetic data...');
  
  try {
    // Read the raw data
    const rawData = fs.readFileSync(SYNTHETIC_DATA_PATH, 'utf8');
    
    // Fix known malformed JSON issues
    let cleanedData = rawData;
    
    // Fix Issue 1: Malformed patient_id fields with colon instead of comma
    cleanedData = cleanedData.replace(/"patient_id: "/g, '"patient_id": "');
    
    // Fix Issue 2: Remove unwanted id fields from conditions
    cleanedData = cleanedData.replace(/\s*id: "some-uuid-condition-\d+-\d+",\s*/g, '');
    
    // Fix Issue 3: Fix duplicate/malformed encounter_supabase_id field
    cleanedData = cleanedData.replace(/"encounter_supabase_encounter_id: "/g, '"encounter_supabase_id": "');
    
    // Parse to validate JSON
    let jsonData;
    try {
      jsonData = JSON.parse(cleanedData);
    } catch (parseError) {
      console.error('Failed to parse cleaned JSON:', parseError);
      console.error('Attempting line-by-line fixes...');
      
      // If parsing still fails, try more aggressive cleaning
      const lines = cleanedData.split('\n');
      const fixedLines = lines.map(line => {
        // Remove lines with standalone id fields
        if (line.trim().match(/^\s*id:\s*"some-uuid-/)) {
          return ''; // Remove the line
        }
        return line;
      }).filter(line => line !== ''); // Remove empty lines
      
      cleanedData = fixedLines.join('\n');
      jsonData = JSON.parse(cleanedData);
    }
    
    // Additional data cleaning
    if (jsonData.synthetic_data && Array.isArray(jsonData.synthetic_data)) {
      jsonData.synthetic_data.forEach((record, recordIndex) => {
        // Clean conditions
        if (record.generated_conditions && Array.isArray(record.generated_conditions)) {
          record.generated_conditions = record.generated_conditions.map((condition, condIndex) => {
            // Remove any id fields
            delete condition.id;
            
            // Ensure patient_id and encounter_id match the parent record
            condition.patient_id = record.patient_supabase_id;
            condition.encounter_id = record.encounter_supabase_id;
            
            // Fix clinical_status values
            if (condition.clinical_status === 'relapse') {
              // 'relapse' is valid, keep it
            } else if (!['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'].includes(condition.clinical_status)) {
              console.warn(`Invalid clinical_status "${condition.clinical_status}" in record ${recordIndex}, condition ${condIndex}. Setting to 'active'.`);
              condition.clinical_status = 'active';
            }
            
            return condition;
          });
        }
        
        // Clean lab results
        if (record.generated_lab_results && Array.isArray(record.generated_lab_results)) {
          record.generated_lab_results = record.generated_lab_results.map((labResult, labIndex) => {
            // Ensure patient_id and encounter_id match the parent record
            labResult.patient_id = record.patient_supabase_id;
            labResult.encounter_id = record.encounter_supabase_id;
            
            // Ensure value is converted to string for consistency
            if (labResult.value !== null && labResult.value !== undefined) {
              labResult.value = String(labResult.value);
            }
            
            return labResult;
          });
        }
      });
    }
    
    // Write the cleaned data
    fs.writeFileSync(CLEANED_DATA_PATH, JSON.stringify(jsonData, null, 2));
    
    console.log('✅ Synthetic data cleaned successfully!');
    console.log(`Cleaned data saved to: ${CLEANED_DATA_PATH}`);
    
    // Verify the cleaned data
    const verifyData = JSON.parse(fs.readFileSync(CLEANED_DATA_PATH, 'utf8'));
    console.log(`\nVerification: ${verifyData.synthetic_data.length} records found in cleaned data.`);
    
  } catch (error) {
    console.error('Error cleaning synthetic data:', error);
    process.exit(1);
  }
}

// Run the cleaning
cleanSyntheticData(); 