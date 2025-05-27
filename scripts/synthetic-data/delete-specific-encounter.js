const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ENCOUNTER_ID_TO_DELETE = '634e3d18-a158-43c9-b493-7fc4187f9514'; // The empty encounter

async function deleteEncounter() {
  console.log(`🗑️ Attempting to delete encounter with ID: ${ENCOUNTER_ID_TO_DELETE}`);

  const { data, error } = await supabase
    .from('encounters')
    .delete()
    .eq('id', ENCOUNTER_ID_TO_DELETE)
    .select();

  if (error) {
    console.error('❌ Error deleting encounter:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Successfully deleted encounter: ${data[0].id}`);
  } else {
    console.log(`⚠️ Encounter with ID ${ENCOUNTER_ID_TO_DELETE} not found or already deleted.`);
  }
}

if (require.main === module) {
  deleteEncounter().catch(console.error);
} 