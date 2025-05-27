const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findVeryRecentDuplicates() {
  console.log('🔍 Finding very recent duplicates (last 10 minutes only)...\n');

  // Only look at encounters created in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - (10 * 60 * 1000)).toISOString();
  
  const { data: recentEncounters, error } = await supabase
    .from('encounters')
    .select('*')
    .gte('created_at', tenMinutesAgo)
    .order('patient_supabase_id, created_at');

  if (error) {
    console.error('Error fetching recent encounters:', error);
    return [];
  }

  console.log(`📊 Encounters created in last 10 minutes: ${recentEncounters.length}`);

  if (recentEncounters.length === 0) {
    console.log('✅ No recent encounters found!');
    return [];
  }

  // Group by patient
  const patientGroups = {};
  recentEncounters.forEach(encounter => {
    if (!patientGroups[encounter.patient_supabase_id]) {
      patientGroups[encounter.patient_supabase_id] = [];
    }
    patientGroups[encounter.patient_supabase_id].push(encounter);
  });

  console.log(`👥 Patients with recent encounters: ${Object.keys(patientGroups).length}\n`);

  const duplicateGroups = [];

  // Find duplicates within each patient group (created within 1 second)
  Object.entries(patientGroups).forEach(([patientId, encounters]) => {
    if (encounters.length <= 1) return;

    encounters.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let currentGroup = [encounters[0]];

    for (let i = 1; i < encounters.length; i++) {
      const current = encounters[i];
      const previous = encounters[i - 1];
      
      const timeDiff = new Date(current.created_at) - new Date(previous.created_at);
      const timeDiffMs = timeDiff;

      // EXTREMELY conservative: only within 1 second (1000ms)
      if (timeDiffMs <= 1000) {
        currentGroup.push(current);
      } else {
        if (currentGroup.length > 1) {
          duplicateGroups.push({
            patientId,
            encounters: [...currentGroup],
            timeDiffMs
          });
        }
        currentGroup = [current];
      }
    }

    if (currentGroup.length > 1) {
      duplicateGroups.push({
        patientId,
        encounters: [...currentGroup],
        timeDiffMs: 0
      });
    }
  });

  console.log(`🎯 Found ${duplicateGroups.length} groups of very recent duplicates\n`);

  // Get patient names for better visibility
  const patientIds = [...new Set(duplicateGroups.map(g => g.patientId))];
  const { data: patients } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .in('id', patientIds);

  const patientMap = {};
  patients?.forEach(p => {
    patientMap[p.id] = `${p.first_name} ${p.last_name}`;
  });

  duplicateGroups.forEach((group, idx) => {
    const patientName = patientMap[group.patientId] || 'Unknown';
    console.log(`Group ${idx + 1}: ${patientName}`);
    console.log(`  Patient ID: ${group.patientId}`);
    console.log(`  Encounters: ${group.encounters.length}`);
    console.log(`  Created at:`);
    group.encounters.forEach(enc => {
      console.log(`    - ${enc.created_at} (${enc.encounter_id || 'No ID'})`);
    });
    console.log(`  Will keep: 1 (oldest)`);
    console.log(`  Will delete: ${group.encounters.length - 1}\n`);
  });

  return duplicateGroups;
}

async function cleanupVeryRecentDuplicates(duplicateGroups, dryRun = true) {
  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates to clean up!');
    return 0;
  }

  console.log(`${dryRun ? '🧪 DRY RUN:' : '🗑️  EXECUTING:'} Cleaning up very recent duplicates...\n`);

  let totalToDelete = 0;
  const encountersToDelete = [];

  duplicateGroups.forEach(group => {
    // Keep the first (oldest) encounter, delete the rest
    const toDelete = group.encounters.slice(1);
    encountersToDelete.push(...toDelete);
    totalToDelete += toDelete.length;
  });

  console.log(`📊 Total encounters to delete: ${totalToDelete}`);

  if (dryRun) {
    console.log('\n📋 Encounters that would be deleted:');
    encountersToDelete.forEach((enc, idx) => {
      console.log(`   ${idx + 1}. ID: ${enc.id}`);
      console.log(`      Created: ${enc.created_at}`);
      console.log(`      Encounter ID: ${enc.encounter_id || 'None'}`);
      console.log(`      Reason: ${enc.reason_display_text || 'No reason'}\n`);
    });
    return totalToDelete;
  }

  // Actually delete the encounters
  console.log('🗑️  Deleting duplicate encounters...');
  
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

  console.log(`✅ Successfully deleted ${data.length} duplicate encounters`);
  return data.length;
}

async function main() {
  console.log('🧹 Very Recent Duplicate Cleanup (Last 10 minutes only)\n');
  console.log('This tool only removes duplicates created within milliseconds of each other.\n');

  try {
    const duplicateGroups = await findVeryRecentDuplicates();
    
    if (duplicateGroups.length === 0) {
      console.log('🎉 No very recent duplicates found!');
      return;
    }

    const isExecute = process.argv.includes('--execute');
    
    if (!isExecute) {
      console.log('🧪 Running in DRY RUN mode...\n');
      await cleanupVeryRecentDuplicates(duplicateGroups, true);
      console.log('\n' + '='.repeat(60));
      console.log('To actually delete these recent duplicates, run:');
      console.log('node scripts/synthetic-data/cleanup-very-recent-duplicates.js --execute');
      console.log('='.repeat(60));
    } else {
      console.log('🚀 EXECUTING cleanup...\n');
      const deleted = await cleanupVeryRecentDuplicates(duplicateGroups, false);
      
      if (deleted > 0) {
        console.log('\n✅ Cleanup completed successfully!');
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

module.exports = { findVeryRecentDuplicates, cleanupVeryRecentDuplicates }; 