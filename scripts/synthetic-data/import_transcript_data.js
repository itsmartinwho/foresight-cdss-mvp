const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

class TranscriptImportTracker {
  constructor() {
    this.totalUpdates = 0;
    this.successfulUpdates = 0;
    this.failedUpdates = 0;
    this.errors = [];
  }

  logError(encounterID, error) {
    this.failedUpdates++;
    this.errors.push({ encounterID, error: error.message });
    console.error(`❌ Failed to update encounter ${encounterID}: ${error.message}`);
  }

  logSuccess(encounterID) {
    this.successfulUpdates++;
    console.log(`✅ Successfully updated encounter ${encounterID}`);
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TRANSCRIPT IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Updates Attempted: ${this.totalUpdates}`);
    console.log(`Successful Updates: ${this.successfulUpdates}`);
    console.log(`Failed Updates: ${this.failedUpdates}`);
    console.log(`Success Rate: ${((this.successfulUpdates / this.totalUpdates) * 100).toFixed(1)}%`);
    
    if (this.errors.length > 0) {
      console.log('\nERRORS:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. Encounter ${error.encounterID}: ${error.error}`);
      });
    }
    console.log('='.repeat(60));
  }
}

async function importTranscriptData(inputPath, dryRun = false) {
  console.log(`${dryRun ? 'DRY RUN: ' : ''}Importing transcript data from: ${inputPath}`);
  
  const tracker = new TranscriptImportTracker();
  
  try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(rawData);
    
    if (!data.synthetic_transcript_updates) {
      throw new Error('Expected synthetic_transcript_updates field not found');
    }
    
    tracker.totalUpdates = data.synthetic_transcript_updates.length;
    console.log(`Found ${tracker.totalUpdates} transcript updates to import`);
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No actual database changes will be made');
    }
    
    // Process each transcript update
    for (let i = 0; i < data.synthetic_transcript_updates.length; i++) {
      const update = data.synthetic_transcript_updates[i];
      const encounterID = update.encounter_supabase_id;
      
      console.log(`\nProcessing ${i + 1}/${tracker.totalUpdates}: ${encounterID}`);
      
      try {
        // Validate encounter exists
        const { data: existingEncounter, error: fetchError } = await supabase
          .from('encounters')
          .select('id')
          .eq('id', encounterID)
          .single();
        
        if (fetchError || !existingEncounter) {
          throw new Error(`Encounter ${encounterID} not found in database`);
        }
        
        if (dryRun) {
          console.log(`✓ Would update encounter ${encounterID} with new transcript and fields`);
          tracker.logSuccess(encounterID);
          continue;
        }
        
        // Prepare update object
        const updateFields = {};
        
        // Add transcript if present
        if (update.new_transcript) {
          updateFields.transcript = update.new_transcript;
        }
        
        // Add other field updates if present
        if (update.other_field_updates) {
          if (update.other_field_updates.reason_code) {
            updateFields.reason_code = update.other_field_updates.reason_code;
          }
          if (update.other_field_updates.reason_display_text) {
            updateFields.reason_display_text = update.other_field_updates.reason_display_text;
          }
          if (update.other_field_updates.soap_note) {
            updateFields.soap_note = update.other_field_updates.soap_note;
          }
          if (update.other_field_updates.observations) {
            // Convert observations to array if it's a string
            if (typeof update.other_field_updates.observations === 'string') {
              updateFields.observations = update.other_field_updates.observations
                .split(/\.\s+/)
                .filter(obs => obs.trim().length > 0)
                .map(obs => obs.trim() + (obs.endsWith('.') ? '' : '.'));
            } else {
              updateFields.observations = update.other_field_updates.observations;
            }
          }
        }
        
        // Update the encounter
        const { error: updateError } = await supabase
          .from('encounters')
          .update(updateFields)
          .eq('id', encounterID);
        
        if (updateError) {
          throw updateError;
        }
        
        tracker.logSuccess(encounterID);
        
      } catch (error) {
        tracker.logError(encounterID, error);
      }
    }
    
    tracker.printSummary();
    return tracker.failedUpdates === 0;
    
  } catch (error) {
    console.error('Error importing transcript data:', error.message);
    return false;
  }
}

// Command line usage
if (require.main === module) {
  const inputPath = process.argv[2];
  const dryRunFlag = process.argv[3];
  
  if (!inputPath) {
    console.error('Usage: node import_transcript_data.js <input_file> [--dry-run]');
    process.exit(1);
  }
  
  const dryRun = dryRunFlag === '--dry-run';
  
  importTranscriptData(inputPath, dryRun)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importTranscriptData }; 