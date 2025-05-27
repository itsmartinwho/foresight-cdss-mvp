const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeEncounterQuality() {
  console.log('🔍 Analyzing encounter data quality...\n');
  
  // Get a sample of encounters created today (the regenerated ones)
  const today = new Date().toISOString().split('T')[0];
  const { data: recentEncounters, error } = await supabase
    .from('encounters')
    .select('*')
    .gte('created_at', today + 'T00:00:00')
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Sample of ${recentEncounters.length} recently regenerated encounters:\n`);
  
  recentEncounters.forEach((enc, idx) => {
    console.log(`Encounter ${idx + 1}:`);
    console.log(`  ID: ${enc.encounter_id}`);
    console.log(`  Type: ${enc.encounter_type}`);
    console.log(`  Reason: ${enc.reason_display_text}`);
    console.log(`  Has Transcript: ${enc.transcript ? 'YES (' + enc.transcript.length + ' chars)' : 'NO'}`);
    console.log(`  Has SOAP Note: ${enc.soap_note ? 'YES (' + enc.soap_note.length + ' chars)' : 'NO'}`);
    console.log(`  Has Treatments: ${enc.treatments ? 'YES' : 'NO'}`);
    console.log(`  Has Observations: ${enc.observations && enc.observations.length > 0 ? 'YES (' + enc.observations.length + ' items)' : 'NO'}`);
    
    // Show a snippet of the transcript
    if (enc.transcript) {
      console.log(`  Transcript Preview: "${enc.transcript.substring(0, 100)}..."`);
    }
    console.log('');
  });
  
  // Compare with older encounters
  const { data: olderEncounters, error: oldError } = await supabase
    .from('encounters')
    .select('*')
    .lt('created_at', today + 'T00:00:00')
    .limit(3);
    
  if (!oldError && olderEncounters.length > 0) {
    console.log(`📋 Sample of ${olderEncounters.length} original encounters for comparison:\n`);
    
    olderEncounters.forEach((enc, idx) => {
      console.log(`Original Encounter ${idx + 1}:`);
      console.log(`  ID: ${enc.encounter_id}`);
      console.log(`  Type: ${enc.encounter_type}`);
      console.log(`  Reason: ${enc.reason_display_text}`);
      console.log(`  Has Transcript: ${enc.transcript ? 'YES (' + enc.transcript.length + ' chars)' : 'NO'}`);
      console.log(`  Has SOAP Note: ${enc.soap_note ? 'YES (' + enc.soap_note.length + ' chars)' : 'NO'}`);
      console.log(`  Has Treatments: ${enc.treatments ? 'YES' : 'NO'}`);
      console.log(`  Has Observations: ${enc.observations && enc.observations.length > 0 ? 'YES (' + enc.observations.length + ' items)' : 'NO'}`);
      
      // Show a snippet of the transcript
      if (enc.transcript) {
        console.log(`  Transcript Preview: "${enc.transcript.substring(0, 100)}..."`);
      }
      console.log('');
    });
  }
  
  // Get overall statistics
  const { data: allEncounters } = await supabase
    .from('encounters')
    .select('transcript, soap_note, treatments, observations, created_at');
    
  const recentCount = allEncounters.filter(e => e.created_at >= today + 'T00:00:00').length;
  const oldCount = allEncounters.filter(e => e.created_at < today + 'T00:00:00').length;
  
  const recentWithTranscripts = allEncounters.filter(e => 
    e.created_at >= today + 'T00:00:00' && e.transcript && e.transcript.length > 100
  ).length;
  
  const oldWithTranscripts = allEncounters.filter(e => 
    e.created_at < today + 'T00:00:00' && e.transcript && e.transcript.length > 100
  ).length;
  
  console.log('📈 Overall Quality Statistics:');
  console.log(`  Recent encounters (today): ${recentCount}`);
  console.log(`  Recent with meaningful transcripts: ${recentWithTranscripts} (${Math.round(recentWithTranscripts/recentCount*100)}%)`);
  console.log(`  Original encounters: ${oldCount}`);
  console.log(`  Original with meaningful transcripts: ${oldWithTranscripts} (${Math.round(oldWithTranscripts/oldCount*100)}%)`);
  
  console.log('\n🎯 Quality Assessment:');
  if (recentWithTranscripts / recentCount > 0.8) {
    console.log('✅ GOOD: Regenerated encounters have rich clinical data');
  } else if (recentWithTranscripts / recentCount > 0.5) {
    console.log('⚠️  MODERATE: Some regenerated encounters have clinical data');
  } else {
    console.log('❌ POOR: Most regenerated encounters lack meaningful clinical data');
  }
}

if (require.main === module) {
  analyzeEncounterQuality().catch(console.error);
}

module.exports = { analyzeEncounterQuality }; 