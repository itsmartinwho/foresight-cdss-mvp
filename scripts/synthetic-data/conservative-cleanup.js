const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRecentDuplicates() {
  console.log('🔍 Finding recent duplicates from infinite loop testing...\n');

  // Only look at encounters created in the last 6 hours
  const sixHoursAgo = new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString();
  
  const { data: recentEncounters, error } = await supabase
    .from('encounters')
    .select('*')
    .gte('created_at', sixHoursAgo)
    .order('patient_supabase_id, created_at');

  if (error) {
    console.error('Error fetching recent encounters:', error);
    return [];
  }

  console.log(`📊 Recent encounters (last 6 hours): ${recentEncounters.length}`);

  if (recentEncounters.length === 0) {
    console.log('✅ No recent encounters found - nothing to clean up!');
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

  const duplicateGroups = [];

  // Find duplicates within each patient group (created within 10 seconds)
  Object.entries(patientGroups).forEach(([patientId, encounters]) => {
    if (encounters.length <= 1) return;

    encounters.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let currentGroup = [encounters[0]];

    for (let i = 1; i < encounters.length; i++) {
      const current = encounters[i];
      const previous = encounters[i - 1];
      
      const timeDiff = new Date(current.created_at) - new Date(previous.created_at);
      const timeDiffSeconds = timeDiff / 1000;

      // Much more conservative: only 10 seconds instead of 30
      if (timeDiffSeconds <= 10) {
        currentGroup.push(current);
      } else {
        if (currentGroup.length > 1) {
          duplicateGroups.push({
            patientId,
            encounters: [...currentGroup],
            timeDiff: timeDiffSeconds
          });
        }
        currentGroup = [current];
      }
    }

    if (currentGroup.length > 1) {
      duplicateGroups.push({
        patientId,
        encounters: [...currentGroup],
        timeDiff: 0
      });
    }
  });

  console.log(`🎯 Found ${duplicateGroups.length} groups of recent duplicates\n`);

  duplicateGroups.forEach((group, idx) => {
    console.log(`Group ${idx + 1}:`);
    console.log(`  Patient ID: ${group.patientId}`);
    console.log(`  Encounters: ${group.encounters.length}`);
    console.log(`  Created between: ${group.encounters[0].created_at} - ${group.encounters[group.encounters.length - 1].created_at}`);
    console.log(`  Will keep: 1 (oldest)`);
    console.log(`  Will delete: ${group.encounters.length - 1}\n`);
  });

  return duplicateGroups;
}

async function cleanupRecentDuplicates(duplicateGroups, dryRun = true) {
  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates to clean up!');
    return 0;
  }

  console.log(`${dryRun ? '🧪 DRY RUN:' : '🗑️  EXECUTING:'} Cleaning up recent duplicates...\n`);

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
    encountersToDelete.slice(0, 10).forEach((enc, idx) => {
      console.log(`   ${idx + 1}. ID: ${enc.id} | Created: ${enc.created_at} | Reason: ${enc.reason_display_text || 'No reason'}`);
    });
    if (encountersToDelete.length > 10) {
      console.log(`   ... and ${encountersToDelete.length - 10} more`);
    }
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
  console.log('🧹 Conservative Recent Duplicate Cleanup\n');
  console.log('This tool only removes duplicates created in the last 6 hours (from recent testing).\n');

  try {
    const duplicateGroups = await findRecentDuplicates();
    
    if (duplicateGroups.length === 0) {
      console.log('🎉 No recent duplicates found! Database is clean.');
      return;
    }

    const isExecute = process.argv.includes('--execute');
    
    if (!isExecute) {
      console.log('🧪 Running in DRY RUN mode...\n');
      await cleanupRecentDuplicates(duplicateGroups, true);
      console.log('\n' + '='.repeat(60));
      console.log('To actually delete these recent duplicates, run:');
      console.log('node scripts/synthetic-data/conservative-cleanup.js --execute');
      console.log('='.repeat(60));
    } else {
      console.log('🚀 EXECUTING cleanup...\n');
      const deleted = await cleanupRecentDuplicates(duplicateGroups, false);
      
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

module.exports = { findRecentDuplicates, cleanupRecentDuplicates }; 