const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrphanedEncounters() {
  console.log('🔧 Fixing orphaned encounters with PatientID "1"...');

  try {
    // Get all encounters that still have PatientID '1'
    const { data: orphanedEncounters, error: fetchError } = await supabase
      .from('encounters')
      .select('*')
      .eq('extra_data->>PatientID', '1');

    if (fetchError) {
      console.error('Error fetching orphaned encounters:', fetchError);
      return;
    }

    console.log(`Found ${orphanedEncounters?.length || 0} orphaned encounters`);

    if (!orphanedEncounters || orphanedEncounters.length === 0) {
      console.log('✅ No orphaned encounters found.');
      return;
    }

    // Update them to point to Maria Gomez's new ID
    let updated = 0;
    let failed = 0;

    for (const encounter of orphanedEncounters) {
      const updatedExtraData = {
        ...encounter.extra_data,
        PatientID: 'RUGOWDBR4X61'
      };

      const { error: updateError } = await supabase
        .from('encounters')
        .update({ extra_data: updatedExtraData })
        .eq('id', encounter.id);

      if (updateError) {
        console.error(`Failed to update encounter ${encounter.id}:`, updateError);
        failed++;
      } else {
        updated++;
        if (updated % 50 === 0) {
          console.log(`Updated ${updated} encounters...`);
        }
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`✅ Updated: ${updated} encounters`);
    console.log(`❌ Failed: ${failed} encounters`);

    // Verify the fix
    const { data: verification } = await supabase
      .from('encounters')
      .select('id')
      .eq('extra_data->>PatientID', 'RUGOWDBR4X61');

    console.log(`\n🔍 Verification: Maria Gomez now has ${verification?.length || 0} encounters`);

    const { data: stillOrphaned } = await supabase
      .from('encounters')
      .select('id')
      .eq('extra_data->>PatientID', '1');

    console.log(`🔍 Remaining orphaned encounters: ${stillOrphaned?.length || 0}`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixOrphanedEncounters()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 