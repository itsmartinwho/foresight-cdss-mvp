const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function investigateDuplicateEncounters() {
  console.log('🔍 Investigating duplicate encounters for Maria Gomez and Justin Rodriguez...\n');

  // First, let's find Maria Gomez and Justin Rodriguez
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .or('first_name.eq.Maria,first_name.eq.Justin');

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return;
  }

  console.log('Found patients:');
  patients.forEach(patient => {
    console.log(`- ${patient.first_name} ${patient.last_name}: ${patient.id}`);
  });

  // Find Maria Gomez and Justin Rodriguez specifically
  const maria = patients.find(p => p.first_name === 'Maria' && p.last_name === 'Gomez');
  const justin = patients.find(p => p.first_name === 'Justin' && p.last_name === 'Rodriguez');

  if (!maria) {
    console.log('❌ Maria Gomez not found');
    return;
  }
  if (!justin) {
    console.log('❌ Justin Rodriguez not found');
    return;
  }

  console.log(`\n📊 Analyzing encounters for:`);
  console.log(`- Maria Gomez: ${maria.id}`);
  console.log(`- Justin Rodriguez: ${justin.id}\n`);

  // Analyze Maria's encounters
  await analyzePatientEncounters(maria);
  
  // Analyze Justin's encounters
  await analyzePatientEncounters(justin);
}

async function analyzePatientEncounters(patient) {
  console.log(`\n🔍 Analyzing encounters for ${patient.first_name} ${patient.last_name} (${patient.id}):`);

  // Get all encounters for this patient
  const { data: encounters, error } = await supabase
    .from('encounters')
    .select('id, created_at, updated_at, reason_display_text, status, encounter_type')
    .eq('patient_supabase_id', patient.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching encounters:', error);
    return;
  }

  console.log(`Total encounters: ${encounters.length}`);

  if (encounters.length === 0) {
    return;
  }

  // Group by creation time to find potential duplicates
  const encountersByTime = {};
  const emptyEncounters = [];
  const duplicateGroups = [];

  encounters.forEach(encounter => {
    const timeKey = new Date(encounter.created_at).toISOString().slice(0, 16); // Group by minute
    
    if (!encountersByTime[timeKey]) {
      encountersByTime[timeKey] = [];
    }
    encountersByTime[timeKey].push(encounter);

    // Check if encounter is essentially empty
    if (!encounter.reason_display_text || encounter.reason_display_text.trim() === '') {
      emptyEncounters.push(encounter);
    }
  });

  // Find groups with multiple encounters created at the same time
  Object.entries(encountersByTime).forEach(([time, groupEncounters]) => {
    if (groupEncounters.length > 1) {
      duplicateGroups.push({
        time,
        count: groupEncounters.length,
        encounters: groupEncounters
      });
    }
  });

  console.log(`Empty encounters (no reason): ${emptyEncounters.length}`);
  console.log(`Potential duplicate groups (same creation time): ${duplicateGroups.length}`);

  if (duplicateGroups.length > 0) {
    console.log('\n📅 Duplicate groups by creation time:');
    duplicateGroups.forEach(group => {
      console.log(`  ${group.time}: ${group.count} encounters`);
      group.encounters.forEach(enc => {
        console.log(`    - ${enc.id}: "${enc.reason_display_text || 'EMPTY'}" (${enc.status})`);
      });
    });
  }

  if (emptyEncounters.length > 0) {
    console.log('\n🗑️ Empty encounters:');
    emptyEncounters.slice(0, 10).forEach(enc => { // Show first 10
      console.log(`  - ${enc.id}: created ${enc.created_at}`);
    });
    if (emptyEncounters.length > 10) {
      console.log(`  ... and ${emptyEncounters.length - 10} more`);
    }
  }

  // Show creation time distribution
  const creationDates = encounters.map(e => new Date(e.created_at).toISOString().slice(0, 10));
  const dateGroups = {};
  creationDates.forEach(date => {
    dateGroups[date] = (dateGroups[date] || 0) + 1;
  });

  console.log('\n📊 Encounters by creation date:');
  Object.entries(dateGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count} encounters`);
    });

  return {
    total: encounters.length,
    empty: emptyEncounters.length,
    duplicateGroups: duplicateGroups.length,
    emptyEncounterIds: emptyEncounters.map(e => e.id)
  };
}

// Run the investigation
investigateDuplicateEncounters().catch(console.error); 