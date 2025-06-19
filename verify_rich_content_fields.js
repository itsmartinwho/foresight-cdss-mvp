const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sqfowezscjfljekqxdkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZm93ZXpzY2pmbGpla3F4ZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2OTEyNjAsImV4cCI6MjA1MTI2NzI2MH0.VT6g1lWCNlBa4oCAhJZjGHaG2hGf0iVMFhKJjKRe1dA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRichContentFields() {
  console.log('🔍 Verifying rich content fields...');
  
  try {
    // Test query to check if fields exist and are accessible
    const { data, error } = await supabase
      .from('encounters')
      .select('id, patient_id, diagnosis_rich_content, treatments_rich_content')
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing rich content fields:', error);
      return false;
    }
    
    console.log('✅ Rich content fields are accessible!');
    console.log(`📊 Found ${data.length} encounters`);
    
    // Check if any have rich content already
    const withRichContent = data.filter(e => e.diagnosis_rich_content || e.treatments_rich_content);
    console.log(`📝 ${withRichContent.length} encounters already have rich content`);
    
    if (withRichContent.length > 0) {
      console.log('📋 Sample rich content:');
      withRichContent.slice(0, 2).forEach((encounter, i) => {
        console.log(`  Encounter ${encounter.id}:`);
        if (encounter.diagnosis_rich_content) {
          console.log(`    - Has diagnosis_rich_content: ${JSON.stringify(encounter.diagnosis_rich_content).substring(0, 100)}...`);
        }
        if (encounter.treatments_rich_content) {
          console.log(`    - Has treatments_rich_content: ${JSON.stringify(encounter.treatments_rich_content).substring(0, 100)}...`);
        }
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

verifyRichContentFields(); 