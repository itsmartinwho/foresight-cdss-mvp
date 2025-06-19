import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = 'https://lmwbmckvlvzwftjwatxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_TRANSCRIPT = `Clinician: Good morning, Maria. What brings you in today?

Maria: Hi Doctor. I've been having these really bad headaches for about two weeks now. They're different from my usual headaches.

Clinician: Can you describe what's different about them?

Maria: They're much more intense, probably around an 8 out of 10. And I get nauseous when they hit. Sometimes I even vomit.

Clinician: When do these headaches typically occur?

Maria: They seem to come on suddenly, usually in the afternoon. And bright lights make them so much worse.

Clinician: Any visual changes? Flashing lights, blind spots, or aura?

Maria: Yes! About 20 minutes before the headache starts, I see these zigzag patterns in my vision. It's really scary.

Clinician: Do you have any family history of migraines?

Maria: Actually, yes. My mother gets severe migraines. She's always had them.

Clinician: Have you tried any medications?

Maria: I took some ibuprofen, but it barely helps. The pain is just too intense.

Clinician: Any recent stress, changes in sleep, or dietary changes?

Maria: Well, I started a new job about a month ago. It's been pretty stressful, and I haven't been sleeping well.

Clinician: Based on your symptoms - the visual aura, family history, and the pattern of headaches - this sounds like classic migraine with aura. Let's discuss treatment options.`;

async function createTestEncounter() {
  console.log('🔍 Finding Maria Gomez...');
  
  // Find Maria Gomez
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('*')
    .eq('first_name', 'Maria')
    .eq('last_name', 'Gomez');
    
  if (pErr) throw pErr;
  
  if (!patients || patients.length === 0) {
    throw new Error('Maria Gomez not found');
  }
  
  const patient = patients[0];
  console.log(`👤 Found patient: ${patient.first_name} ${patient.last_name} (ID: ${patient.patient_id})`);
  
  // Create new encounter
  const encounterId = uuidv4();
  const encounterData = {
    encounter_id: encounterId,
    patient_supabase_id: patient.id,
    encounter_type: 'consultation',
    scheduled_start_datetime: new Date().toISOString(),
    actual_start_datetime: new Date().toISOString(),
    actual_end_datetime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes later
    transcript: TEST_TRANSCRIPT,
    status: 'completed',
    reason_display_text: 'Severe headaches with visual aura'
  };
  
  console.log('📝 Creating new test encounter...');
  const { data: encounter, error: eErr } = await supabase
    .from('encounters')
    .insert(encounterData)
    .select()
    .single();
    
  if (eErr) throw eErr;
  
  console.log(`✅ Created encounter: ${encounterId}`);
  console.log(`📋 Supabase ID: ${encounter.id}`);
  
  return {
    patientId: patient.patient_id,
    encounterId: encounter.id,
    encounterUuid: encounterId,
    transcript: TEST_TRANSCRIPT
  };
}

async function testClinicalEngine(patientId: string, encounterId: string, transcript: string) {
  console.log('⚙️  Testing clinical engine API...');
  
  const response = await fetch('http://localhost:3000/api/clinical-engine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientId,
      encounterId,
      transcript
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Clinical engine API call finished');
  
  if (result.success) {
    console.log('🎉 Processing completed successfully!');
    console.log('📝 Diagnosis:', result.result?.diagnosis || 'Not provided');
    console.log('💊 Treatments:', result.result?.treatments?.length || 0, 'treatments');
    if (result.result?.richContent) {
      console.log('✨ Rich content generated:', !!result.result.richContent.diagnosis, 'diagnosis,', !!result.result.richContent.treatments, 'treatments');
    }
  } else {
    console.log('⚠️  API returned success: false');
    console.log('📄 Response:', JSON.stringify(result, null, 2));
  }
  
  return result;
}

async function main() {
  try {
    console.log('🚀 Creating test encounter for Maria Gomez...');
    
    const { patientId, encounterId, encounterUuid, transcript } = await createTestEncounter();
    
    console.log('\n⏳ Waiting 2 seconds before calling clinical engine...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🧠 Running clinical engine...');
    await testClinicalEngine(patientId, encounterId, transcript);
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📋 Test encounter created: ${encounterUuid}`);
    console.log(`🔗 You can view this encounter in the app using encounter ID: ${encounterId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main(); 