const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target patients to check
const TARGET_PATIENTS = [
  'Bob Jones',
  'James Lee', 
  'Dorothy Robinson',
  'Alice Smith',
  'Maria Gomez'
];

/**
 * Check if an encounter appears to be fake/empty
 * Only considers it fake if it has minimal data beyond patient info
 */
function isLikelyFakeEncounter(encounter) {
  // Check for empty or minimal content in key fields
  const hasTranscript = encounter.transcript && encounter.transcript.trim().length > 0;
  const hasSoapNote = encounter.soap_note && encounter.soap_note.trim().length > 0;
  const hasReasonCode = encounter.reason_code && encounter.reason_code.trim().length > 0;
  const hasReasonDisplay = encounter.reason_display_text && encounter.reason_display_text.trim().length > 0;
  const hasTreatments = encounter.treatments && Array.isArray(encounter.treatments) && encounter.treatments.length > 0;
  const hasObservations = encounter.observations && encounter.observations.length > 0;
  const hasPriorAuth = encounter.prior_auth_justification && encounter.prior_auth_justification.trim().length > 0;
  
  // Count how many meaningful fields are populated
  const meaningfulFields = [
    hasTranscript,
    hasSoapNote, 
    hasReasonCode,
    hasReasonDisplay,
    hasTreatments,
    hasObservations,
    hasPriorAuth
  ].filter(Boolean).length;
  
  // Consider it fake if it has 0 or 1 meaningful fields
  // This is very conservative - real encounters should have multiple fields
  return meaningfulFields <= 1;
}

/**
 * Find patients by name and get their encounters
 */
async function findTargetPatientEncounters() {
  console.log('🔍 Finding encounters for target patients...\n');
  
  const patientEncounters = {};
  
  for (const patientName of TARGET_PATIENTS) {
    const [firstName, lastName] = patientName.split(' ');
    
    // Find patient by name
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id, patient_id, first_name, last_name')
      .eq('first_name', firstName)
      .eq('last_name', lastName);
    
    if (patientError) {
      console.error(`❌ Error finding patient ${patientName}:`, patientError);
      continue;
    }
    
    if (!patients || patients.length === 0) {
      console.log(`⚠️  Patient not found: ${patientName}`);
      continue;
    }
    
    if (patients.length > 1) {
      console.log(`⚠️  Multiple patients found for ${patientName}, skipping for safety`);
      continue;
    }
    
    const patient = patients[0];
    console.log(`✅ Found patient: ${patientName} (ID: ${patient.patient_id})`);
    
    // Get all encounters for this patient
    const { data: encounters, error: encounterError } = await supabase
      .from('encounters')
      .select('*')
      .eq('patient_supabase_id', patient.id)
      .eq('is_deleted', false)
      .order('created_at');
    
    if (encounterError) {
      console.error(`❌ Error fetching encounters for ${patientName}:`, encounterError);
      continue;
    }
    
    console.log(`   📊 Total encounters: ${encounters.length}`);
    
    patientEncounters[patientName] = {
      patient,
      encounters: encounters || []
    };
  }
  
  return patientEncounters;
}

/**
 * Analyze encounters to find fake ones created in quick succession
 */
function analyzeFakeEncounters(patientEncounters) {
  console.log('\n🔍 Analyzing encounters for fake data patterns...\n');
  
  const fakeEncounterGroups = [];
  
  Object.entries(patientEncounters).forEach(([patientName, data]) => {
    const { patient, encounters } = data;
    
    if (encounters.length === 0) {
      console.log(`   ${patientName}: No encounters`);
      return;
    }
    
    console.log(`\n📋 Analyzing ${patientName} (${encounters.length} encounters):`);
    
    // First, identify likely fake encounters
    const fakeEncounters = encounters.filter(isLikelyFakeEncounter);
    const realEncounters = encounters.filter(enc => !isLikelyFakeEncounter(enc));
    
    console.log(`   🎭 Likely fake encounters: ${fakeEncounters.length}`);
    console.log(`   ✅ Likely real encounters: ${realEncounters.length}`);
    
    if (fakeEncounters.length === 0) {
      console.log(`   ✅ No fake encounters detected for ${patientName}`);
      return;
    }
    
    // Group fake encounters by creation time (within 5 seconds of each other)
    fakeEncounters.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    let currentGroup = [fakeEncounters[0]];
    const groups = [];
    
    for (let i = 1; i < fakeEncounters.length; i++) {
      const current = fakeEncounters[i];
      const previous = fakeEncounters[i - 1];
      
      const timeDiff = new Date(current.created_at) - new Date(previous.created_at);
      const timeDiffSeconds = timeDiff / 1000;
      
      // Group encounters created within 5 seconds of each other
      if (timeDiffSeconds <= 5) {
        currentGroup.push(current);
      } else {
        if (currentGroup.length > 1) {
          groups.push([...currentGroup]);
        }
        currentGroup = [current];
      }
    }
    
    // Don't forget the last group
    if (currentGroup.length > 1) {
      groups.push([...currentGroup]);
    }
    
    // Report findings
    groups.forEach((group, idx) => {
      const timeSpan = new Date(group[group.length - 1].created_at) - new Date(group[0].created_at);
      console.log(`   📦 Group ${idx + 1}: ${group.length} fake encounters created within ${timeSpan/1000}s`);
      console.log(`      Created: ${group[0].created_at} to ${group[group.length - 1].created_at}`);
      
      fakeEncounterGroups.push({
        patientName,
        patient,
        encounters: group,
        timeSpan: timeSpan / 1000
      });
    });
    
    // Also check for isolated fake encounters (single fakes not in groups)
    const isolatedFakes = fakeEncounters.filter(fake => {
      return !groups.some(group => group.some(enc => enc.id === fake.id));
    });
    
    if (isolatedFakes.length > 0) {
      console.log(`   ⚠️  ${isolatedFakes.length} isolated fake encounters (not in quick succession groups)`);
      console.log(`      These will NOT be deleted for safety`);
    }
  });
  
  return fakeEncounterGroups;
}

/**
 * Delete fake encounter groups
 */
async function deleteFakeEncounters(fakeGroups, dryRun = true) {
  if (fakeGroups.length === 0) {
    console.log('\n✅ No fake encounter groups found to delete!');
    return 0;
  }
  
  console.log(`\n${dryRun ? '🧪 DRY RUN:' : '🗑️  EXECUTING:'} Deleting fake encounter groups...\n`);
  
  let totalToDelete = 0;
  const encountersToDelete = [];
  
  fakeGroups.forEach((group, idx) => {
    console.log(`Group ${idx + 1} (${group.patientName}):`);
    console.log(`   Encounters: ${group.encounters.length}`);
    console.log(`   Time span: ${group.timeSpan}s`);
    console.log(`   Will delete: ${group.encounters.length} encounters`);
    
    encountersToDelete.push(...group.encounters);
    totalToDelete += group.encounters.length;
  });
  
  console.log(`\n📊 Total encounters to delete: ${totalToDelete}`);
  
  if (dryRun) {
    console.log('\n📋 Encounters that would be deleted:');
    encountersToDelete.slice(0, 10).forEach((enc, idx) => {
      console.log(`   ${idx + 1}. ID: ${enc.encounter_id} | Created: ${enc.created_at}`);
      console.log(`      Reason: ${enc.reason_display_text || 'None'}`);
      console.log(`      Transcript: ${enc.transcript ? 'Yes' : 'No'}`);
      console.log(`      SOAP: ${enc.soap_note ? 'Yes' : 'No'}`);
    });
    if (encountersToDelete.length > 10) {
      console.log(`   ... and ${encountersToDelete.length - 10} more`);
    }
    return totalToDelete;
  }
  
  // Actually delete the encounters
  console.log('\n🗑️  Deleting fake encounters...');
  
  const idsToDelete = encountersToDelete.map(enc => enc.id);
  
  const { data, error } = await supabase
    .from('encounters')
    .delete()
    .in('id', idsToDelete)
    .select();
  
  if (error) {
    console.error('❌ Error deleting encounters:', error);
    return 0;
  }
  
  console.log(`✅ Successfully deleted ${data.length} fake encounters`);
  return data.length;
}

async function main() {
  console.log('🧹 Fake Consultation Cleanup Tool\n');
  console.log('Target patients:', TARGET_PATIENTS.join(', '));
  console.log('\nThis tool will:');
  console.log('1. Find encounters for the specified patients');
  console.log('2. Identify encounters with empty/minimal data');
  console.log('3. Group fake encounters created within 5 seconds of each other');
  console.log('4. Delete only grouped fake encounters (very conservative)\n');
  
  try {
    // Find patient encounters
    const patientEncounters = await findTargetPatientEncounters();
    
    if (Object.keys(patientEncounters).length === 0) {
      console.log('❌ No target patients found in database');
      return;
    }
    
    // Analyze for fake encounters
    const fakeGroups = analyzeFakeEncounters(patientEncounters);
    
    if (fakeGroups.length === 0) {
      console.log('\n🎉 No fake encounter groups found! All encounters appear legitimate.');
      return;
    }
    
    const isExecute = process.argv.includes('--execute');
    
    if (!isExecute) {
      console.log('\n🧪 Running in DRY RUN mode...\n');
      await deleteFakeEncounters(fakeGroups, true);
      console.log('\n' + '='.repeat(60));
      console.log('To actually delete these fake encounters, run:');
      console.log('node scripts/synthetic-data/cleanup-fake-consultations.js --execute');
      console.log('='.repeat(60));
    } else {
      console.log('\n🚀 EXECUTING cleanup...\n');
      const deleted = await deleteFakeEncounters(fakeGroups, false);
      
      if (deleted > 0) {
        console.log('\n✅ Cleanup completed successfully!');
        console.log('🔄 You may want to run this again to check for any remaining issues.');
      }
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findTargetPatientEncounters, analyzeFakeEncounters, deleteFakeEncounters }; 