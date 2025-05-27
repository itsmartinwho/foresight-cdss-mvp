const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicateEncounters() {
  console.log('🔍 Analyzing encounters for duplicates...\n');

  // Get all encounters ordered by patient and creation time
  const { data: encounters, error } = await supabase
    .from('encounters')
    .select('*')
    .order('patient_supabase_id, created_at');

  if (error) {
    console.error('Error fetching encounters:', error);
    return;
  }

  console.log(`📊 Total encounters found: ${encounters.length}\n`);

  // Group encounters by patient
  const patientGroups = {};
  encounters.forEach(encounter => {
    if (!patientGroups[encounter.patient_supabase_id]) {
      patientGroups[encounter.patient_supabase_id] = [];
    }
    patientGroups[encounter.patient_supabase_id].push(encounter);
  });

  const duplicateGroups = [];
  let totalDuplicates = 0;

  // Find duplicates within each patient group
  Object.entries(patientGroups).forEach(([patientId, patientEncounters]) => {
    if (patientEncounters.length <= 1) return;

    // Sort by creation time
    patientEncounters.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Find groups of encounters created within 30 seconds of each other
    const groups = [];
    let currentGroup = [patientEncounters[0]];

    for (let i = 1; i < patientEncounters.length; i++) {
      const current = patientEncounters[i];
      const previous = patientEncounters[i - 1];
      
      const timeDiff = new Date(current.created_at) - new Date(previous.created_at);
      const timeDiffSeconds = timeDiff / 1000;

      // If created within 30 seconds, consider it part of the same group
      if (timeDiffSeconds <= 30) {
        currentGroup.push(current);
      } else {
        // If current group has duplicates, save it
        if (currentGroup.length > 1) {
          groups.push([...currentGroup]);
        }
        currentGroup = [current];
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 1) {
      groups.push(currentGroup);
    }

    // Add groups with duplicates
    groups.forEach(group => {
      if (group.length > 1) {
        duplicateGroups.push({
          patientId,
          encounters: group,
          duplicateCount: group.length - 1 // Keep one, delete the rest
        });
        totalDuplicates += group.length - 1;
      }
    });
  });

  console.log(`🔍 Found ${duplicateGroups.length} groups of duplicate encounters`);
  console.log(`🗑️  Total duplicates to remove: ${totalDuplicates}\n`);

  // Display details of duplicate groups
  duplicateGroups.forEach((group, index) => {
    console.log(`Group ${index + 1} - Patient ID: ${group.patientId}`);
    console.log(`  Encounters: ${group.encounters.length} (keeping 1, removing ${group.duplicateCount})`);
    
    group.encounters.forEach((encounter, i) => {
      const status = i === 0 ? '✅ KEEP' : '❌ DELETE';
      console.log(`    ${status} - ID: ${encounter.id} | Created: ${encounter.created_at} | Reason: "${encounter.reason || 'empty'}"`);
    });
    console.log('');
  });

  return duplicateGroups;
}

async function cleanupDuplicates(duplicateGroups, dryRun = true) {
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No actual deletions will be performed\n');
  } else {
    console.log('🚨 LIVE MODE - Performing actual deletions\n');
  }

  let totalDeleted = 0;

  for (const group of duplicateGroups) {
    // Keep the first encounter (oldest), delete the rest
    const toDelete = group.encounters.slice(1);
    
    console.log(`Processing patient ${group.patientId}:`);
    console.log(`  Keeping encounter: ${group.encounters[0].id}`);
    console.log(`  Deleting ${toDelete.length} duplicates...`);

    if (!dryRun) {
      for (const encounter of toDelete) {
        const { error } = await supabase
          .from('encounters')
          .delete()
          .eq('id', encounter.id);

        if (error) {
          console.error(`  ❌ Error deleting encounter ${encounter.id}:`, error);
        } else {
          console.log(`  ✅ Deleted encounter ${encounter.id}`);
          totalDeleted++;
        }
      }
    } else {
      totalDeleted += toDelete.length;
      toDelete.forEach(encounter => {
        console.log(`  🧪 Would delete encounter ${encounter.id}`);
      });
    }
    console.log('');
  }

  console.log(`${dryRun ? '🧪 Would delete' : '✅ Deleted'} ${totalDeleted} duplicate encounters`);
  
  return totalDeleted;
}

async function main() {
  console.log('🧹 Duplicate Encounter Cleanup Tool\n');
  console.log('This tool will find and remove duplicate encounters created within 30 seconds of each other.\n');

  try {
    // Find duplicates
    const duplicateGroups = await findDuplicateEncounters();

    if (duplicateGroups.length === 0) {
      console.log('✨ No duplicate encounters found! Database is clean.');
      return;
    }

    // Run dry run first
    console.log('=' .repeat(60));
    console.log('DRY RUN RESULTS');
    console.log('=' .repeat(60));
    await cleanupDuplicates(duplicateGroups, true);

    // Ask for confirmation (in a real scenario, you'd use readline)
    console.log('\n' + '=' .repeat(60));
    console.log('To perform the actual cleanup, run this script with --execute flag');
    console.log('Example: node scripts/cleanup-duplicate-encounters.js --execute');
    console.log('=' .repeat(60));

    // Check if --execute flag is provided
    if (process.argv.includes('--execute')) {
      console.log('\n🚨 EXECUTING CLEANUP...\n');
      await cleanupDuplicates(duplicateGroups, false);
      console.log('\n✅ Cleanup completed successfully!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findDuplicateEncounters, cleanupDuplicates }; 