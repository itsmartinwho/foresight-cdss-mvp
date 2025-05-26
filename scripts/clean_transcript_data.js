const fs = require('fs');

function cleanTranscriptData(inputPath, outputPath) {
  console.log(`Cleaning transcript data from: ${inputPath}`);
  
  try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(rawData);
    
    if (!data.synthetic_transcript_updates) {
      throw new Error('Expected synthetic_transcript_updates field not found');
    }
    
    console.log(`Found ${data.synthetic_transcript_updates.length} transcript updates to clean`);
    
    // Clean each transcript update
    data.synthetic_transcript_updates.forEach((update, index) => {
      console.log(`Processing transcript update ${index + 1}/${data.synthetic_transcript_updates.length}`);
      
      // Ensure encounter_supabase_id is valid
      if (!update.encounter_supabase_id || typeof update.encounter_supabase_id !== 'string') {
        console.warn(`Warning: Invalid encounter_supabase_id in update ${index + 1}`);
      }
      
      // Clean transcript text
      if (update.new_transcript) {
        update.new_transcript = update.new_transcript.trim();
      }
      
      // Clean other_field_updates if present
      if (update.other_field_updates) {
        // Clean reason_code
        if (update.other_field_updates.reason_code) {
          update.other_field_updates.reason_code = update.other_field_updates.reason_code.trim();
        }
        
        // Clean reason_display_text
        if (update.other_field_updates.reason_display_text) {
          update.other_field_updates.reason_display_text = update.other_field_updates.reason_display_text.trim();
        }
        
        // Clean soap_note
        if (update.other_field_updates.soap_note) {
          update.other_field_updates.soap_note = update.other_field_updates.soap_note.trim();
        }
        
        // Clean observations
        if (update.other_field_updates.observations) {
          update.other_field_updates.observations = update.other_field_updates.observations.trim();
        }
      }
    });
    
    // Write cleaned data
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Transcript data cleaned successfully!`);
    console.log(`Cleaned data saved to: ${outputPath}`);
    console.log(`Total transcript updates processed: ${data.synthetic_transcript_updates.length}`);
    
    return true;
    
  } catch (error) {
    console.error('Error cleaning transcript data:', error.message);
    return false;
  }
}

// Command line usage
if (require.main === module) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  
  if (!inputPath || !outputPath) {
    console.error('Usage: node clean_transcript_data.js <input_file> <output_file>');
    process.exit(1);
  }
  
  const success = cleanTranscriptData(inputPath, outputPath);
  process.exit(success ? 0 : 1);
}

module.exports = { cleanTranscriptData }; 