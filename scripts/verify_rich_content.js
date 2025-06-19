const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lmwbmckvlvzwftjwatxr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24'
);

async function verifyRichContent() {
  try {
    // Check our test encounter
    const { data, error } = await supabase
      .from('encounters')
      .select('encounter_id, soap_note, treatments, diagnosis_rich_content, treatments_rich_content')
      .eq('encounter_id', '2ed99ffb-ce68-45d8-8f1f-35bb244c721d')
      .single();
      
    if (error) {
      console.log('Error:', error);
      return;
    }
    
    console.log('🎉 Rich Content Verification:');
    console.log('✅ SOAP Note saved:', !!data.soap_note);
    console.log('✅ Treatments saved:', !!data.treatments && data.treatments.length > 0);
    console.log('✅ Diagnosis rich content saved:', !!data.diagnosis_rich_content);
    console.log('✅ Treatments rich content saved:', !!data.treatments_rich_content);
    
    if (data.diagnosis_rich_content) {
      console.log('\n📋 Diagnosis Rich Content Type:', data.diagnosis_rich_content.content_type);
    }
    
    if (data.treatments_rich_content) {
      console.log('💊 Treatments Rich Content Type:', data.treatments_rich_content.content_type);
      console.log('💊 Rich Elements Count:', data.treatments_rich_content.rich_elements?.length || 0);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyRichContent(); 