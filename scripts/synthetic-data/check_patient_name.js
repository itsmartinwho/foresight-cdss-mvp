const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkPatient() {
  const { data, error } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .eq('id', '22a93ea2-1eab-49a0-8c55-00bdb3e5e492')
    .single();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Patient:', data);
  }
}

checkPatient(); 