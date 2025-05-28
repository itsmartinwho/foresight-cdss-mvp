#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// ENCOUNTER QUALITY ANALYSIS
// =============================================================================

/**
 * Determines if an encounter appears to be fake/empty based on content analysis
 */
function isLikelyFakeEncounter(encounter) {
  const hasTranscript = encounter.transcript && encounter.transcript.trim().length > 100;
  const hasSoapNote = encounter.soap_note && encounter.soap_note.trim().length > 50;
  const hasReasonCode = encounter.reason_code && encounter.reason_code.trim().length > 0;
  const hasReasonDisplay = encounter.reason_display_text && encounter.reason_display_text.trim().length > 0;
  const hasTreatments = encounter.treatments && Array.isArray(encounter.treatments) && encounter.treatments.length > 0;
  const hasObservations = encounter.observations && encounter.observations.length > 0;
  const hasPriorAuth = encounter.prior_auth_justification && encounter.prior_auth_justification.trim().length > 0;
  
  // Count meaningful fields - very conservative approach
  const meaningfulFields = [
    hasTranscript,
    hasSoapNote, 
    hasReasonCode,
    hasReasonDisplay,
    hasTreatments,
    hasObservations,
    hasPriorAuth
  ].filter(Boolean).length;
  
  return meaningfulFields <= 1;
}

/**
 * Analyze encounter data quality and provide comprehensive statistics
 */
async function analyzeEncounterQuality(options = {}) {
  const { timeWindow = null, limit = 1000 } = options;
  
  console.log('🔍 Analyzing encounter data quality...\n');
  
  let query = supabase.from('encounters').select('*').eq('is_deleted', false);
  
  if (timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
    query = query.gte('created_at', cutoffTime);
  }
  
  const { data: encounters, error } = await query.limit(limit);
  
  if (error) {
    console.error('❌ Error analyzing encounters:', error);
    return null;
  }
  
  const fakeEncounters = encounters.filter(isLikelyFakeEncounter);
  const realEncounters = encounters.filter(enc => !isLikelyFakeEncounter(enc));
  
  // Group fake encounters by time proximity
  const fakeGroups = groupEncountersByTime(fakeEncounters, 5000); // 5 second grouping
  
  console.log('📊 Quality Analysis Results:');
  console.log(`  Total encounters analyzed: ${encounters.length}`);
  console.log(`  Likely fake encounters: ${fakeEncounters.length} (${Math.round(fakeEncounters.length/encounters.length*100)}%)`);
  console.log(`  Likely real encounters: ${realEncounters.length} (${Math.round(realEncounters.length/encounters.length*100)}%)`);
  console.log(`  Fake encounter groups: ${fakeGroups.length}`);
  
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
    
    // Show grouping info
    console.log('\n🔗 Fake encounter groupings:');
    fakeGroups.slice(0, 3).forEach((group, index) => {
      console.log(`   Group ${index + 1}: ${group.encounters.length} encounters within ${group.timeSpan}ms`);
    });
  }
  
  return {
    total: encounters.length,
    fake: fakeEncounters.length,
    real: realEncounters.length,
    fakePercentage: Math.round(fakeEncounters.length/encounters.length*100),
    fakeGroups: fakeGroups
  };
}

/**
 * Group encounters by time proximity to identify bulk creation patterns
 */
function groupEncountersByTime(encounters, groupingWindow = 5000) {
  const sortedEncounters = [...encounters].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );
  
  const groups = [];
  let currentGroup = [];
  let lastTime = null;
  
  for (const encounter of sortedEncounters) {
    const currentTime = new Date(encounter.created_at).getTime();
    
    if (lastTime === null || currentTime - lastTime <= groupingWindow) {
      currentGroup.push(encounter);
    } else {
      if (currentGroup.length > 1) {
        groups.push({
          encounters: currentGroup,
          timeSpan: new Date(currentGroup[currentGroup.length - 1].created_at).getTime() - 
                   new Date(currentGroup[0].created_at).getTime(),
          startTime: currentGroup[0].created_at,
          endTime: currentGroup[currentGroup.length - 1].created_at
        });
      }
      currentGroup = [encounter];
    }
    
    lastTime = currentTime;
  }
  
  // Don't forget the last group
  if (currentGroup.length > 1) {
    groups.push({
      encounters: currentGroup,
      timeSpan: new Date(currentGroup[currentGroup.length - 1].created_at).getTime() - 
               new Date(currentGroup[0].created_at).getTime(),
      startTime: currentGroup[0].created_at,
      endTime: currentGroup[currentGroup.length - 1].created_at
    });
  }
  
  return groups.sort((a, b) => b.encounters.length - a.encounters.length);
}

// =============================================================================
// PATIENT AND ENCOUNTER INVESTIGATION
// =============================================================================

/**
 * Find patients by name and analyze their encounters
 */
async function investigatePatients(patientNames = []) {
  console.log('🔍 Investigating patient encounters...\n');
  
  const results = {};
  
  for (const patientName of patientNames) {
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
      console.log(`⚠️  Multiple patients found for ${patientName}, using first match`);
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
    
    const fakeEncounters = encounters.filter(isLikelyFakeEncounter);
    const realEncounters = encounters.filter(enc => !isLikelyFakeEncounter(enc));
    
    console.log(`   📊 Total encounters: ${encounters.length}`);
    console.log(`   🎭 Fake encounters: ${fakeEncounters.length}`);
    console.log(`   ✅ Real encounters: ${realEncounters.length}`);
    
    results[patientName] = {
      patient,
      encounters: encounters || [],
      fakeEncounters,
      realEncounters,
      stats: {
        total: encounters.length,
        fake: fakeEncounters.length,
        real: realEncounters.length
      }
    };
  }
  
  return results;
}

/**
 * Investigate specific encounter and related data
 */
async function investigateEncounter(encounterId) {
  console.log(`🔍 Investigating encounter: ${encounterId}\n`);
  
  try {
    // Get encounter details
    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .select('*')
      .eq('id', encounterId)
      .single();
    
    if (encounterError || !encounter) {
      console.error('❌ Encounter not found:', encounterError);
      return null;
    }
    
    console.log('📋 Encounter Details:');
    console.log(`   ID: ${encounter.id}`);
    console.log(`   Patient ID: ${encounter.patient_supabase_id}`);
    console.log(`   Created: ${encounter.created_at}`);
    console.log(`   Reason: ${encounter.reason_display_text || 'None'}`);
    console.log(`   Is Fake: ${isLikelyFakeEncounter(encounter) ? 'YES' : 'NO'}`);
    
    // Get related conditions
    const { data: conditions, error: condError } = await supabase
      .from('conditions')
      .select('*')
      .eq('encounter_id', encounterId);
    
    console.log(`\n🏥 Related Conditions: ${conditions?.length || 0}`);
    if (conditions && conditions.length > 0) {
      conditions.slice(0, 3).forEach((cond, i) => {
        console.log(`   ${i + 1}. ${cond.description} (${cond.code})`);
      });
    }
    
    // Get related lab results
    const { data: labResults, error: labError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('encounter_id', encounterId);
    
    console.log(`\n🧪 Related Lab Results: ${labResults?.length || 0}`);
    if (labResults && labResults.length > 0) {
      labResults.slice(0, 3).forEach((lab, i) => {
        console.log(`   ${i + 1}. ${lab.name}: ${lab.value} ${lab.units || ''}`);
      });
    }
    
    return {
      encounter,
      conditions: conditions || [],
      labResults: labResults || [],
      isFake: isLikelyFakeEncounter(encounter)
    };
    
  } catch (error) {
    console.error('❌ Error investigating encounter:', error);
    return null;
  }
}

// =============================================================================
// DATA CLEANUP OPERATIONS
// =============================================================================

/**
 * Find encounters matching cleanup criteria
 */
async function findCleanupCandidates(strategy) {
  console.log(`🔍 Finding cleanup candidates using strategy: ${strategy.name}...\n`);
  
  let query = supabase
    .from('encounters')
    .select('*')
    .eq('is_deleted', false);
  
  if (strategy.timeWindow) {
    const cutoffTime = new Date(Date.now() - strategy.timeWindow).toISOString();
    query = query.gte('created_at', cutoffTime);
  }
  
  const { data: encounters, error } = await query.limit(1000);
  
  if (error) {
    console.error('❌ Error finding encounters:', error);
    return [];
  }
  
  const fakeEncounters = encounters.filter(isLikelyFakeEncounter);
  const fakeGroups = groupEncountersByTime(fakeEncounters, strategy.groupingWindow);
  
  console.log(`📊 Found ${fakeEncounters.length} fake encounters in ${fakeGroups.length} groups`);
  
  return fakeGroups;
}

/**
 * Delete fake encounters and their related data
 */
async function deleteFakeEncounters(fakeGroups, options = {}) {
  const { dryRun = true, deleteRelatedData = true } = options;
  
  console.log(`\n${dryRun ? '🔍 DRY RUN: ' : '🗑️  '}Deleting fake encounters...\n`);
  
  let totalDeleted = 0;
  let totalConditionsDeleted = 0;
  let totalLabResultsDeleted = 0;
  
  for (const group of fakeGroups) {
    console.log(`\n📦 Processing group: ${group.encounters.length} encounters (${group.startTime} to ${group.endTime})`);
    
    for (const encounter of group.encounters) {
      const encounterId = encounter.id;
      
      if (dryRun) {
        console.log(`🔍 DRY RUN: Would delete encounter ${encounterId}`);
        totalDeleted++;
        continue;
      }
      
      try {
        // Delete related data first if requested
        if (deleteRelatedData) {
          // Delete conditions
          const { error: condError } = await supabase
            .from('conditions')
            .delete()
            .eq('encounter_id', encounterId);
          
          if (condError) {
            console.warn(`⚠️  Warning: Could not delete conditions for encounter ${encounterId}:`, condError);
          } else {
            totalConditionsDeleted++;
          }
          
          // Delete lab results
          const { error: labError } = await supabase
            .from('lab_results')
            .delete()
            .eq('encounter_id', encounterId);
          
          if (labError) {
            console.warn(`⚠️  Warning: Could not delete lab results for encounter ${encounterId}:`, labError);
          } else {
            totalLabResultsDeleted++;
          }
        }
        
        // Mark encounter as deleted (soft delete)
        const { error: encounterError } = await supabase
          .from('encounters')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', encounterId);
        
        if (encounterError) {
          console.error(`❌ Failed to delete encounter ${encounterId}:`, encounterError);
        } else {
          console.log(`✅ Deleted encounter ${encounterId}`);
          totalDeleted++;
        }
        
      } catch (error) {
        console.error(`❌ Error deleting encounter ${encounterId}:`, error);
      }
    }
  }
  
  console.log('\n=== Cleanup Summary ===');
  console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${totalDeleted} encounters`);
  if (deleteRelatedData) {
    console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${totalConditionsDeleted} related conditions`);
    console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${totalLabResultsDeleted} related lab results`);
  }
  
  return {
    encountersDeleted: totalDeleted,
    conditionsDeleted: totalConditionsDeleted,
    labResultsDeleted: totalLabResultsDeleted
  };
}

/**
 * Fix orphaned data records
 */
async function fixOrphanedData(options = {}) {
  const { dryRun = true } = options;
  
  console.log(`\n${dryRun ? '🔍 DRY RUN: ' : '🔧 '}Fixing orphaned data...\n`);
  
  let fixedConditions = 0;
  let fixedLabResults = 0;
  
  // Find conditions with null patient_id
  const { data: orphanedConditions, error: condError } = await supabase
    .from('conditions')
    .select('id, encounter_id, patient_id')
    .is('patient_id', null)
    .not('encounter_id', 'is', null);
  
  if (condError) {
    console.error('❌ Error finding orphaned conditions:', condError);
  } else if (orphanedConditions.length > 0) {
    console.log(`🔍 Found ${orphanedConditions.length} orphaned conditions`);
    
    for (const condition of orphanedConditions) {
      // Get patient_id from encounter
      const { data: encounter, error: encError } = await supabase
        .from('encounters')
        .select('patient_supabase_id')
        .eq('id', condition.encounter_id)
        .single();
      
      if (encounter && encounter.patient_supabase_id) {
        if (dryRun) {
          console.log(`🔍 DRY RUN: Would fix condition ${condition.id} with patient ${encounter.patient_supabase_id}`);
          fixedConditions++;
        } else {
          const { error: updateError } = await supabase
            .from('conditions')
            .update({ patient_id: encounter.patient_supabase_id })
            .eq('id', condition.id);
          
          if (updateError) {
            console.error(`❌ Failed to fix condition ${condition.id}:`, updateError);
          } else {
            console.log(`✅ Fixed condition ${condition.id}`);
            fixedConditions++;
          }
        }
      }
    }
  }
  
  // Similar process for lab results
  const { data: orphanedLabResults, error: labError } = await supabase
    .from('lab_results')
    .select('id, encounter_id, patient_id')
    .is('patient_id', null)
    .not('encounter_id', 'is', null);
  
  if (labError) {
    console.error('❌ Error finding orphaned lab results:', labError);
  } else if (orphanedLabResults.length > 0) {
    console.log(`🔍 Found ${orphanedLabResults.length} orphaned lab results`);
    
    for (const labResult of orphanedLabResults) {
      const { data: encounter, error: encError } = await supabase
        .from('encounters')
        .select('patient_supabase_id')
        .eq('id', labResult.encounter_id)
        .single();
      
      if (encounter && encounter.patient_supabase_id) {
        if (dryRun) {
          console.log(`🔍 DRY RUN: Would fix lab result ${labResult.id} with patient ${encounter.patient_supabase_id}`);
          fixedLabResults++;
        } else {
          const { error: updateError } = await supabase
            .from('lab_results')
            .update({ patient_id: encounter.patient_supabase_id })
            .eq('id', labResult.id);
          
          if (updateError) {
            console.error(`❌ Failed to fix lab result ${labResult.id}:`, updateError);
          } else {
            console.log(`✅ Fixed lab result ${labResult.id}`);
            fixedLabResults++;
          }
        }
      }
    }
  }
  
  console.log('\n=== Fix Summary ===');
  console.log(`${dryRun ? 'Would fix' : 'Fixed'} ${fixedConditions} orphaned conditions`);
  console.log(`${dryRun ? 'Would fix' : 'Fixed'} ${fixedLabResults} orphaned lab results`);
  
  return {
    conditionsFixed: fixedConditions,
    labResultsFixed: fixedLabResults
  };
}

// =============================================================================
// CLEANUP STRATEGIES
// =============================================================================

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

// Default target patients for investigation
const TARGET_PATIENTS = [
  'Bob Jones',
  'James Lee', 
  'Dorothy Robinson',
  'Alice Smith',
  'Maria Gomez',
  'Justin Rodriguez'
];

// =============================================================================
// CLI INTERFACE
// =============================================================================

function showHelp() {
  console.log(`
🛠️  Data Utilities

USAGE:
  node data-utilities.js <command> [options]

COMMANDS:
  analyze [--time-window <ms>]       Analyze encounter data quality
  investigate-patients [names...]    Investigate specific patients  
  investigate-encounter <id>         Investigate specific encounter
  cleanup --strategy <name>          Clean up fake encounters
  fix-orphans                        Fix orphaned data records

CLEANUP STRATEGIES:
  VERY_RECENT     - Last 10 minutes, 1 second grouping
  RECENT          - Last 6 hours, 10 second grouping  
  CONSERVATIVE    - Last 24 hours, 5 second grouping
  TARGETED        - All time, 5 second grouping

OPTIONS:
  --dry-run                Show what would be done without making changes
  --execute                Actually perform destructive operations
  --strategy <name>        Cleanup strategy to use
  --time-window <ms>       Time window in milliseconds
  --delete-related         Delete related conditions and lab results

EXAMPLES:
  # Analyze recent encounter quality  
  node data-utilities.js analyze --time-window 86400000
  
  # Investigate specific patients
  node data-utilities.js investigate-patients "Bob Jones" "Alice Smith"
  
  # Investigate specific encounter
  node data-utilities.js investigate-encounter 12345678-1234-1234-1234-123456789012
  
  # Dry run cleanup with conservative strategy
  node data-utilities.js cleanup --strategy CONSERVATIVE --dry-run
  
  # Execute cleanup (be careful!)
  node data-utilities.js cleanup --strategy RECENT --execute --delete-related
  
  # Fix orphaned data
  node data-utilities.js fix-orphans --dry-run

For more information, see the documentation in /docs/
  `);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const command = args[0];
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const deleteRelated = args.includes('--delete-related');
  
  // Parse strategy
  let strategy = null;
  const strategyIndex = args.indexOf('--strategy');
  if (strategyIndex !== -1 && args[strategyIndex + 1]) {
    const strategyName = args[strategyIndex + 1];
    strategy = CLEANUP_STRATEGIES[strategyName];
    if (!strategy) {
      console.error(`❌ Unknown strategy: ${strategyName}`);
      console.error(`Available strategies: ${Object.keys(CLEANUP_STRATEGIES).join(', ')}`);
      process.exit(1);
    }
  }
  
  // Parse time window
  let timeWindow = null;
  const timeIndex = args.indexOf('--time-window');
  if (timeIndex !== -1 && args[timeIndex + 1]) {
    timeWindow = parseInt(args[timeIndex + 1]);
    if (isNaN(timeWindow)) {
      console.error('❌ Invalid time window value');
      process.exit(1);
    }
  }
  
  try {
    switch (command) {
      case 'analyze': {
        await analyzeEncounterQuality({ timeWindow });
        break;
      }
      
      case 'investigate-patients': {
        const patientNames = args.slice(1).filter(arg => !arg.startsWith('--'));
        const names = patientNames.length > 0 ? patientNames : TARGET_PATIENTS;
        await investigatePatients(names);
        break;
      }
      
      case 'investigate-encounter': {
        const encounterId = args[1];
        if (!encounterId) {
          console.error('❌ Encounter ID required');
          process.exit(1);
        }
        await investigateEncounter(encounterId);
        break;
      }
      
      case 'cleanup': {
        if (!strategy) {
          console.error('❌ Strategy required for cleanup command');
          console.error(`Available strategies: ${Object.keys(CLEANUP_STRATEGIES).join(', ')}`);
          process.exit(1);
        }
        
        if (!dryRun && !execute) {
          console.error('❌ Must specify either --dry-run or --execute for cleanup');
          process.exit(1);
        }
        
        console.log(`🧹 Using cleanup strategy: ${strategy.name}`);
        console.log(`📝 Description: ${strategy.description}`);
        
        const fakeGroups = await findCleanupCandidates(strategy);
        
        if (fakeGroups.length === 0) {
          console.log('✅ No fake encounters found to clean up');
          break;
        }
        
        const result = await deleteFakeEncounters(fakeGroups, { 
          dryRun: !execute, 
          deleteRelatedData: deleteRelated 
        });
        
        if (execute) {
          console.log('\n✅ Cleanup completed successfully');
        } else {
          console.log('\n🔍 Dry run completed. Use --execute to perform actual cleanup');
        }
        break;
      }
      
      case 'fix-orphans': {
        const result = await fixOrphanedData({ dryRun: !execute });
        
        if (execute) {
          console.log('\n✅ Orphan fix completed successfully');
        } else {
          console.log('\n🔍 Dry run completed. Use --execute to perform actual fixes');
        }
        break;
      }
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeEncounterQuality,
  investigatePatients,
  investigateEncounter,
  findCleanupCandidates,
  deleteFakeEncounters,
  fixOrphanedData,
  isLikelyFakeEncounter,
  groupEncountersByTime,
  CLEANUP_STRATEGIES,
  TARGET_PATIENTS
}; 