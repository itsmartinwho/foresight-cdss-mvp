// Simple test script to check one encounter and run clinical engine
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqfowezscjfljekqxdkw.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZm93ZXpzY2pmbGpla3F4ZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2OTEyNjAsImV4cCI6MjA1MTI2NzI2MH0.VT6g1lWCNlBa4oCAhJZjGHaG2hGf0iVMFhKJjKRe1dA';

console.log('Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTargetPatients() {
  const targetNames = [
    { first: 'Maria', last: 'Gomez' },
    { first: 'James', last: 'Lee' },
    { first: 'Priya', last: 'Patel' },
    { first: 'Alice', last: 'Smith' }
  ];

  console.log('🔍 Looking for target patients and their encounters...');
  
  for (const target of targetNames) {
    try {
      console.log(`\n👤 Searching for ${target.first} ${target.last}...`);
      
      // Find patient
      const { data: patients, error: pErr } = await supabase
        .from('patients')
        .select('id, patient_id, first_name, last_name')
        .eq('first_name', target.first)
        .eq('last_name', target.last);
        
      if (pErr) {
        console.error(`❌ Error finding patient:`, pErr);
        continue;
      }
      
      if (!patients || patients.length === 0) {
        console.log(`⚠️  No patient found with name ${target.first} ${target.last}`);
        continue;
      }
      
      const patient = patients[0];
      console.log(`✅ Found patient: ${patient.first_name} ${patient.last_name} (ID: ${patient.patient_id})`);
      
      // Find encounters
      const { data: encounters, error: eErr } = await supabase
        .from('encounters')
        .select('id, encounter_id, transcript, diagnosis_rich_content, treatments_rich_content')
        .eq('patient_supabase_id', patient.id);
        
      if (eErr) {
        console.error(`❌ Error finding encounters:`, eErr);
        continue;
      }
      
      console.log(`📋 Found ${encounters.length} encounters for ${patient.first_name}`);
      
      encounters.forEach((enc, index) => {
        const hasTranscript = enc.transcript && enc.transcript.length > 20;
        const hasRichDiagnosis = !!enc.diagnosis_rich_content;
        const hasRichTreatments = !!enc.treatments_rich_content;
        
        console.log(`  ${index + 1}. Encounter ${enc.encounter_id}:`);
        console.log(`     - Has transcript: ${hasTranscript ? '✅' : '❌'} (${enc.transcript?.length || 0} chars)`);
        console.log(`     - Has rich diagnosis: ${hasRichDiagnosis ? '✅' : '❌'}`);
        console.log(`     - Has rich treatments: ${hasRichTreatments ? '✅' : '❌'}`);
        
        if (hasTranscript && !hasRichDiagnosis) {
          console.log(`     ⭐ CANDIDATE for clinical engine processing`);
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${target.first} ${target.last}:`, error);
    }
  }
}

async function testClinicalEngine() {
  console.log('\n🧪 Testing clinical engine import...');
  try {
    // Try to import the clinical engine
    const { ClinicalEngineServiceV3 } = require('../src/lib/clinicalEngineServiceV3');
    console.log('✅ ClinicalEngineServiceV3 imported successfully');
    
    const engine = new ClinicalEngineServiceV3();
    console.log('✅ ClinicalEngineServiceV3 instantiated successfully');
    
    return engine;
  } catch (error) {
    console.error('❌ Error with clinical engine:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting encounter analysis...');
  
  await findTargetPatients();
  
  const engine = await testClinicalEngine();
  if (engine) {
    console.log('\n✅ Ready to process encounters with clinical engine');
  } else {
    console.log('\n❌ Clinical engine is not ready');
  }
}

main().catch(console.error); 