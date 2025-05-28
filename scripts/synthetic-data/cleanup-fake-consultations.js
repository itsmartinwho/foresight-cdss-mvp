const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target patients to check (can be extended)
const TARGET_PATIENTS = [
  'Bob Jones',
  'James Lee', 
  'Dorothy Robinson',
  'Alice Smith',
  'Maria Gomez',
  'Justin Rodriguez'
];

// Cleanup strategies with different criteria
const CLEANUP_STRATEGIES = {
  VERY_RECENT: {
    name: 'Very Recent Duplicates',
    timeWindow: 10 * 60 * 1000, // 10 minutes
    groupingWindow: 1000, // 1 second
    description: 'Extremely recent duplicates (last 10 minutes, within 1 second)'
  },
  RECENT: {
    name: 'Recent Testing Artifacts',
    timeWindow: 6 * 60 * 60 * 1000, // 6 hours
    groupingWindow: 10 * 1000, // 10 seconds
    description: 'Recent testing artifacts (last 6 hours, within 10 seconds)'
  },
  CONSERVATIVE: {
    name: 'Conservative Cleanup',
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    groupingWindow: 5 * 1000, // 5 seconds
    description: 'Conservative cleanup (last 24 hours, within 5 seconds)'
  },
  TARGETED: {
    name: 'Targeted Patient Cleanup',
    timeWindow: null, // All time
    groupingWindow: 5 * 1000, // 5 seconds
    description: 'All-time cleanup for specific target patients'
  }
};

/**
 * Check if an encounter appears to be fake/empty
 * Only considers it fake if it has minimal data beyond patient info
 */
function isLikelyFakeEncounter(encounter) {
  // Check for empty or minimal content in key fields
  const hasTranscript = encounter.transcript && encounter.transcript.trim().length > 100;
  const hasSoapNote = encounter.soap_note && encounter.soap_note.trim().length > 50;
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
 * Analyze encounter quality and provide statistics
 */
async function analyzeEncounterQuality(timeWindow = null) {
  console.log('🔍 Analyzing encounter data quality...\n');
  
  let query = supabase.from('encounters').select('*');
  
  if (timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
    query = query.gte('created_at', cutoffTime);
  }
  
  const { data: encounters, error } = await query.limit(1000);
  
  if (error) {
    console.error('Error analyzing encounters:', error);
    return null;
  }
  
  const fakeEncounters = encounters.filter(isLikelyFakeEncounter);
  const realEncounters = encounters.filter(enc => !isLikelyFakeEncounter(enc));
  
  console.log('📊 Quality Analysis Results:');
  console.log(`  Total encounters analyzed: ${encounters.length}`);
  console.log(`  Likely fake encounters: ${fakeEncounters.length} (${Math.round(fakeEncounters.length/encounters.length*100)}%)`);
  console.log(`  Likely real encounters: ${realEncounters.length} (${Math.round(realEncounters.length/encounters.length*100)}%)`);
  
  // Show sample of each type
  if (realEncounters.length > 0) {
    console.log('\n✅ Sample real encounter:');
    const sample = realEncounters[0];
    console.log(`   Reason: ${sample.reason_display_text || 'None'}`);
    console.log(`   Has Transcript: ${sample.transcript ? 'YES (' + sample.transcript.length + ' chars)' : 'NO'}`);
    console.log(`   Has SOAP: ${sample.soap_note ? 'YES (' + sample.soap_note.length + ' chars)' : 'NO'}`);
  }
  
  if (fakeEncounters.length > 0) {
    console.log('\n🎭 Sample fake encounter:');
    const sample = fakeEncounters[0];
    console.log(`   Reason: ${sample.reason_display_text || 'None'}`);
    console.log(`   Has Transcript: ${sample.transcript ? 'YES (' + sample.transcript.length + ' chars)' : 'NO'}`);
    console.log(`   Has SOAP: ${sample.soap_note ? 'YES (' + sample.soap_note.length + ' chars)' : 'NO'}`);
  }
  
  return {
    total: encounters.length,
    fake: fakeEncounters.length,
    real: realEncounters.length,
    fakePercentage: Math.round(fakeEncounters.length/encounters.length*100)
  };
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
 * Find encounters based on strategy criteria
 */
async function findEncountersByStrategy(strategy) {
  console.log(`🔍 Finding encounters using strategy: ${strategy.name}...\n`);
  
  let query = supabase
    .from('encounters')
    .select('*')
    .eq('is_deleted', false)
    .order('patient_supabase_id, created_at');
  
  if (strategy.timeWindow) {
    const cutoffTime = new Date(Date.now() - strategy.timeWindow).toISOString();
    query = query.gte('created_at', cutoffTime);
  }
  
  const { data: encounters, error } = await query;
  
  if (error) {
    console.error('Error fetching encounters:', error);
    return {};
  }
  
  console.log(`📊 Encounters found: ${encounters.length}`);
  
  // Group by patient
  const patientGroups = {};
  encounters.forEach(encounter => {
    if (!patientGroups[encounter.patient_supabase_id]) {
      patientGroups[encounter.patient_supabase_id] = [];
    }
    patientGroups[encounter.patient_supabase_id].push(encounter);
  });
  
  console.log(`👥 Patients with encounters: ${Object.keys(patientGroups).length}`);
  
  return patientGroups;
}

/**
 * Analyze encounters to find fake ones created in quick succession
 */
function analyzeFakeEncounters(patientEncounters, strategy) {
  console.log(`\n🔍 Analyzing encounters for fake data patterns using ${strategy.name}...\n`);
  
  const fakeEncounterGroups = [];
  
  Object.entries(patientEncounters).forEach(([patientKey, encounters]) => {
    // Handle both formats: named patients and ID-based groups
    const patientName = typeof encounters === 'object' && encounters.patient 
      ? patientKey 
      : `Patient-${patientKey}`;
    const encounterList = Array.isArray(encounters) ? encounters : encounters.encounters;
    
    if (encounterList.length === 0) {
      console.log(`   ${patientName}: No encounters`);
      return;
    }
    
    console.log(`\n📋 Analyzing ${patientName} (${encounterList.length} encounters):`);
    
    // First, identify likely fake encounters
    const fakeEncounters = encounterList.filter(isLikelyFakeEncounter);
    const realEncounters = encounterList.filter(enc => !isLikelyFakeEncounter(enc));
    
    console.log(`   🎭 Likely fake encounters: ${fakeEncounters.length}`);
    console.log(`   ✅ Likely real encounters: ${realEncounters.length}`);
    
    if (fakeEncounters.length === 0) {
      console.log(`   ✅ No fake encounters detected for ${patientName}`);
      return;
    }
    
    // Group fake encounters by creation time
    fakeEncounters.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    let currentGroup = [fakeEncounters[0]];
    const groups = [];
    
    for (let i = 1; i < fakeEncounters.length; i++) {
      const current = fakeEncounters[i];
      const previous = fakeEncounters[i - 1];
      
      const timeDiff = new Date(current.created_at) - new Date(previous.created_at);
      
      // Group encounters created within the strategy's grouping window
      if (timeDiff <= strategy.groupingWindow) {
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
        patient: typeof encounters === 'object' && encounters.patient ? encounters.patient : null,
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
 * Delete fake encounter groups with batch processing
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
  
  // Actually delete the encounters in batches
  console.log('\n🗑️  Deleting fake encounters in batches...');
  
  const idsToDelete = encountersToDelete.map(enc => enc.id);
  const batchSize = 50;
  let deletedCount = 0;
  
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('encounters')
      .delete()
      .in('id', batch)
      .select();
    
    if (error) {
      console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error);
      break;
    }
    
    deletedCount += data.length;
    console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${data.length} encounters (total: ${deletedCount})`);
  }
  
  console.log(`✅ Successfully deleted ${deletedCount} fake encounters`);
  return deletedCount;
}

/**
 * Get patient names for better reporting
 */
async function enrichWithPatientNames(fakeGroups) {
  const patientIds = [...new Set(fakeGroups.map(g => g.encounters[0].patient_supabase_id))];
  
  if (patientIds.length === 0) return fakeGroups;
  
  const { data: patients } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .in('id', patientIds);

  const patientMap = {};
  patients?.forEach(p => {
    patientMap[p.id] = `${p.first_name} ${p.last_name}`;
  });

  return fakeGroups.map(group => ({
    ...group,
    patientName: patientMap[group.encounters[0].patient_supabase_id] || group.patientName
  }));
}

async function main() {
  console.log('🧹 Comprehensive Fake Consultation Cleanup Tool\n');
  
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const strategyName = args.find(arg => arg.startsWith('--strategy='))?.split('=')[1] || 'CONSERVATIVE';
  const analyzeOnly = args.includes('--analyze-only');
  
  const strategy = CLEANUP_STRATEGIES[strategyName];
  if (!strategy) {
    console.error(`❌ Unknown strategy: ${strategyName}`);
    console.log('Available strategies:', Object.keys(CLEANUP_STRATEGIES).join(', '));
    return;
  }
  
  console.log(`📋 Using strategy: ${strategy.name}`);
  console.log(`📝 Description: ${strategy.description}`);
  console.log(`⏰ Time window: ${strategy.timeWindow ? Math.round(strategy.timeWindow / (60 * 60 * 1000)) + ' hours' : 'All time'}`);
  console.log(`🕐 Grouping window: ${strategy.groupingWindow / 1000} seconds\n`);
  
  if (analyzeOnly) {
    console.log('🔬 Analysis-only mode enabled\n');
  }
  
  try {
    // First, analyze overall encounter quality
    await analyzeEncounterQuality(strategy.timeWindow);
    
    if (analyzeOnly) {
      console.log('\n✅ Analysis completed!');
      return;
    }
    
    let patientEncounters;
    let fakeGroups;
    
    if (strategyName === 'TARGETED') {
      // Use targeted patient approach
      console.log('\nTarget patients:', TARGET_PATIENTS.join(', '));
      patientEncounters = await findTargetPatientEncounters();
      
      if (Object.keys(patientEncounters).length === 0) {
        console.log('❌ No target patients found in database');
        return;
      }
      
      fakeGroups = analyzeFakeEncounters(patientEncounters, strategy);
    } else {
      // Use time-based approach
      const encounters = await findEncountersByStrategy(strategy);
      fakeGroups = analyzeFakeEncounters(encounters, strategy);
      fakeGroups = await enrichWithPatientNames(fakeGroups);
    }
    
    if (fakeGroups.length === 0) {
      console.log('\n🎉 No fake encounter groups found! All encounters appear legitimate.');
      return;
    }
    
    if (!isExecute) {
      console.log('\n🧪 Running in DRY RUN mode...\n');
      await deleteFakeEncounters(fakeGroups, true);
      console.log('\n' + '='.repeat(60));
      console.log('To actually delete these fake encounters, run:');
      console.log(`node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=${strategyName} --execute`);
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

function showHelp() {
  console.log('🧹 Comprehensive Fake Consultation Cleanup Tool\n');
  console.log('Usage: node scripts/synthetic-data/cleanup-fake-consultations.js [options]\n');
  console.log('Options:');
  console.log('  --strategy=STRATEGY  Cleanup strategy to use (default: CONSERVATIVE)');
  console.log('  --execute            Actually perform the cleanup (default: dry run)');
  console.log('  --analyze-only       Only analyze encounter quality, don\'t clean up');
  console.log('  --help               Show this help message\n');
  console.log('Available strategies:');
  Object.entries(CLEANUP_STRATEGIES).forEach(([key, strategy]) => {
    console.log(`  ${key.padEnd(12)} - ${strategy.description}`);
  });
  console.log('\nExamples:');
  console.log('  # Analyze encounter quality only');
  console.log('  node scripts/synthetic-data/cleanup-fake-consultations.js --analyze-only');
  console.log('');
  console.log('  # Dry run with conservative strategy');
  console.log('  node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=CONSERVATIVE');
  console.log('');
  console.log('  # Execute very recent cleanup');
  console.log('  node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=VERY_RECENT --execute');
}

if (require.main === module) {
  if (process.argv.includes('--help')) {
    showHelp();
  } else {
    main();
  }
}

module.exports = { 
  findTargetPatientEncounters, 
  analyzeFakeEncounters, 
  deleteFakeEncounters,
  analyzeEncounterQuality,
  isLikelyFakeEncounter,
  CLEANUP_STRATEGIES
}; 