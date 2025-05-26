const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRealTranscripts() {
  try {
    console.log('Looking for encounters with substantial transcript content...\n');
    
    // Get encounters with transcript data longer than 10 characters (to filter out just <br> tags)
    const { data: encounters, error } = await supabase
      .from('encounters')
      .select('id, encounter_id, patient_supabase_id, transcript, scheduled_start_datetime, reason_display_text')
      .not('transcript', 'is', null)
      .neq('transcript', '');
    
    if (error) {
      console.error('Error fetching encounters:', error);
      return;
    }
    
    // Filter for substantial content
    const substantialTranscripts = encounters.filter(enc => 
      enc.transcript && enc.transcript.length > 10 && !enc.transcript.trim().startsWith('<br>')
    );
    
    console.log(`Total encounters with transcript field: ${encounters.length}`);
    console.log(`Encounters with substantial transcript content: ${substantialTranscripts.length}`);
    
    if (substantialTranscripts.length > 0) {
      console.log('\nEncounters with real transcript content:');
      substantialTranscripts.slice(0, 5).forEach((encounter, index) => {
        console.log(`\n${index + 1}. Encounter ID: ${encounter.encounter_id}`);
        console.log(`   Supabase ID: ${encounter.id}`);
        console.log(`   Patient UUID: ${encounter.patient_supabase_id}`);
        console.log(`   Date: ${encounter.scheduled_start_datetime}`);
        console.log(`   Reason: ${encounter.reason_display_text || 'N/A'}`);
        console.log(`   Transcript length: ${encounter.transcript.length} characters`);
        console.log(`   Transcript preview: ${encounter.transcript.substring(0, 200)}...`);
      });
    } else {
      console.log('\nNo encounters found with substantial transcript content.');
      console.log('Checking what the transcript data actually contains...');
      
      // Show a sample of what's in the transcript field
      const sampleTranscripts = encounters.slice(0, 10);
      sampleTranscripts.forEach((enc, i) => {
        console.log(`\n${i + 1}. Encounter ${enc.encounter_id}:`);
        console.log(`   Transcript: "${enc.transcript}"`);
        console.log(`   Length: ${enc.transcript?.length || 0}`);
      });
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

findRealTranscripts(); 