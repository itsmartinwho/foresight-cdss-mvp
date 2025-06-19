const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lmwbmckvlvzwftjwatxr.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24'
);

async function checkRichContent() {
  const { data, error } = await supabase
    .from('encounters')
    .select('soap_note, treatments, diagnosis_rich_content, treatments_rich_content')
    .eq('id', '52c3d8b7-640e-45ef-a7ac-281ce28f6c83');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const encounter = data[0];
  if (!encounter) {
    console.log('❌ Encounter not found');
    return;
  }
  
  console.log('🎉 Rich Content Status:');
  console.log('✅ SOAP Note saved:', !!encounter.soap_note);
  console.log('✅ Treatments saved:', !!encounter.treatments);
  console.log('✅ Diagnosis rich content saved:', !!encounter.diagnosis_rich_content);
  console.log('✅ Treatments rich content saved:', !!encounter.treatments_rich_content);
  
  if (encounter.diagnosis_rich_content) {
    console.log('\n📋 Diagnosis Rich Content Preview:');
    console.log('Type:', encounter.diagnosis_rich_content.content_type);
    console.log('Elements:', encounter.diagnosis_rich_content.rich_elements?.length || 0);
  }
  
  if (encounter.treatments_rich_content) {
    console.log('\n💊 Treatments Rich Content Preview:');
    console.log('Type:', encounter.treatments_rich_content.content_type);
    console.log('Elements:', encounter.treatments_rich_content.rich_elements?.length || 0);
  }
}

checkRichContent(); 