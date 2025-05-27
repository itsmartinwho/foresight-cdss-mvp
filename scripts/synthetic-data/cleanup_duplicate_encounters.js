const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanupDuplicateEncounters() {
  console.log('🧹 Starting cleanup of duplicate encounters...\n');

  // Find Maria Gomez and Justin Rodriguez
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .or('first_name.eq.Maria,first_name.eq.Justin');

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return;
  }

  const maria = patients.find(p => p.first_name === 'Maria' && p.last_name === 'Gomez');
  const justin = patients.find(p => p.first_name === 'Justin' && p.last_name === 'Rodriguez');

  if (!maria || !justin) {
    console.log('❌ Could not find both patients');
    return;
  }

  console.log(`Found patients:`);
  console.log(`- Maria Gomez: ${maria.id}`);
  console.log(`- Justin Rodriguez: ${justin.id}\n`);

  // Clean up each patient's encounters
  await cleanupPatientEncounters(maria);
  await cleanupPatientEncounters(justin);

  console.log('\n✅ Cleanup completed!');
}

async function cleanupPatientEncounters(patient) {
  console.log(`\n🔍 Cleaning up encounters for ${patient.first_name} ${patient.last_name}:`);

  // Get all encounters for this patient
  const { data: encounters, error } = await supabase
    .from('encounters')
    .select('id, created_at, reason_display_text, transcript, soap_note')
    .eq('patient_supabase_id', patient.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching encounters:', error);
    return;
  }

  console.log(`Total encounters before cleanup: ${encounters.length}`);

  // Identify encounters to delete (empty ones)
  const encountersToDelete = encounters.filter(encounter => {
    // Consider an encounter empty if it has no reason_display_text AND no transcript AND no soap_note
    const hasReason = encounter.reason_display_text && encounter.reason_display_text.trim() !== '';
    const hasTranscript = encounter.transcript && encounter.transcript.trim() !== '';
    const hasSoapNote = encounter.soap_note && encounter.soap_note.trim() !== '';
    
    return !hasReason && !hasTranscript && !hasSoapNote;
  });

  const encountersToKeep = encounters.filter(encounter => {
    const hasReason = encounter.reason_display_text && encounter.reason_display_text.trim() !== '';
    const hasTranscript = encounter.transcript && encounter.transcript.trim() !== '';
    const hasSoapNote = encounter.soap_note && encounter.soap_note.trim() !== '';
    
    return hasReason || hasTranscript || hasSoapNote;
  });

  console.log(`Empty encounters to delete: ${encountersToDelete.length}`);
  console.log(`Legitimate encounters to keep: ${encountersToKeep.length}`);

  if (encountersToKeep.length > 0) {
    console.log('\n📋 Encounters being kept:');
    encountersToKeep.forEach((enc, index) => {
      const reason = enc.reason_display_text || 'No reason';
      const hasTranscript = enc.transcript ? ' [has transcript]' : '';
      const hasSoapNote = enc.soap_note ? ' [has SOAP note]' : '';
      console.log(`  ${index + 1}. ${reason}${hasTranscript}${hasSoapNote}`);
    });
  }

  if (encountersToDelete.length === 0) {
    console.log('✅ No empty encounters to delete');
    return;
  }

  // Ask for confirmation before deleting
  console.log(`\n⚠️  About to delete ${encountersToDelete.length} empty encounters for ${patient.first_name} ${patient.last_name}`);
  console.log('This action cannot be undone.');
  
  // For safety, let's do a dry run first
  console.log('\n🔍 DRY RUN - showing first 5 encounters that would be deleted:');
  encountersToDelete.slice(0, 5).forEach(enc => {
    console.log(`  - ${enc.id}: created ${enc.created_at}`);
  });

  // Performing the actual deletion
  console.log('\n🗑️  Performing deletion...');
  
  // Delete in batches to avoid overwhelming the database
  const batchSize = 50;
  let deletedCount = 0;
  
  for (let i = 0; i < encountersToDelete.length; i += batchSize) {
    const batch = encountersToDelete.slice(i, i + batchSize);
    const ids = batch.map(enc => enc.id);
    
    const { error: deleteError } = await supabase
      .from('encounters')
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      console.error(`Error deleting batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
      break;
    }
    
    deletedCount += batch.length;
    console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} encounters (total: ${deletedCount})`);
  }
  
  console.log(`✅ Successfully deleted ${deletedCount} empty encounters for ${patient.first_name} ${patient.last_name}`);

  return {
    total: encounters.length,
    toDelete: encountersToDelete.length,
    toKeep: encountersToKeep.length,
    deleteIds: encountersToDelete.map(e => e.id)
  };
}

// Run the cleanup
cleanupDuplicateEncounters().catch(console.error); 