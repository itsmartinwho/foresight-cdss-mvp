const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const supabase = createClient(
  'https://lmwbmckvlvzwftjwatxr.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd2JtY2t2bHZ6d2Z0andhdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzc0MTIsImV4cCI6MjA2MjY1MzQxMn0.vb8ox4rmreRTbZZ-KZVos-7veAZaSu-V6GU79GsLj24'
);

async function debugClinicalEngine() {
  // Get patient data to see the structure
  console.log('🔍 Getting patient data structure...');
  
  const { data: patientData, error: pError } = await supabase
    .from('patients')
    .select('*')
    .eq('patient_id', 'RUGOWDBR4X61')
    .single();
    
  if (pError) {
    console.error('Error getting patient:', pError);
    return;
  }
  
  console.log('👤 Patient found:', patientData.first_name, patientData.last_name);
  console.log('📋 Patient Supabase ID:', patientData.id);
  
  // Get encounter data
  const { data: encounterData, error: eError } = await supabase
    .from('encounters')
    .select('*')
    .eq('encounter_id', '2ed99ffb-ce68-45d8-8f1f-35bb244c721d')
    .single();
    
  if (eError) {
    console.error('Error getting encounter:', eError);
    return;
  }
  
  console.log('📝 Encounter found:');
  console.log('  - Encounter ID:', encounterData.encounter_id);
  console.log('  - Supabase ID:', encounterData.id);
  console.log('  - Patient Supabase ID:', encounterData.patient_supabase_id);
  console.log('  - Transcript length:', encounterData.transcript?.length || 0);
  
  // Test the clinical engine with very detailed logging
  console.log('\n🧠 Testing clinical engine API...');
  
  const testPayload = {
    patientId: 'RUGOWDBR4X61',
    encounterId: '2ed99ffb-ce68-45d8-8f1f-35bb244c721d',
    transcript: encounterData.transcript
  };
  
  console.log('📤 Sending payload:');
  console.log('  - Patient ID:', testPayload.patientId);
  console.log('  - Encounter ID:', testPayload.encounterId);
  console.log('  - Transcript length:', testPayload.transcript?.length || 0);
  
  try {
    const response = await fetch('http://localhost:3000/api/clinical-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (result.success !== false) {
      console.log('✅ API call successful');
      
      // Wait a moment then check the database
      console.log('\n⏳ Waiting 3 seconds then checking database...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { data: updatedEncounter, error: checkError } = await supabase
        .from('encounters')
        .select('soap_note, treatments, diagnosis_rich_content, treatments_rich_content')
        .eq('id', encounterData.id)
        .single();
        
      if (checkError) {
        console.error('Error checking updated encounter:', checkError);
        return;
      }
      
      console.log('🔍 Database check results:');
      console.log('  - SOAP Note saved:', !!updatedEncounter.soap_note);
      console.log('  - Treatments saved:', !!updatedEncounter.treatments && updatedEncounter.treatments.length > 0);
      console.log('  - Diagnosis rich content saved:', !!updatedEncounter.diagnosis_rich_content);
      console.log('  - Treatments rich content saved:', !!updatedEncounter.treatments_rich_content);
      
      if (!updatedEncounter.soap_note && !updatedEncounter.diagnosis_rich_content) {
        console.log('\n❌ Nothing was saved to database. This suggests:');
        console.log('  1. The clinical engine is not finding the encounter properly');
        console.log('  2. There might be an error in the saveResults method');
        console.log('  3. The encounter lookup logic might be failing');
      } else {
        console.log('\n🎉 Success! Data was saved to database.');
      }
    } else {
      console.error('❌ API returned error:', result);
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }
}

// Debug script to test Dorothy Robinson encounter loading
// This will help identify why her encounter isn't showing in the dropdown

console.log('🔍 Debugging Dorothy Robinson encounter loading...');

// Test the exact logic that supabaseDataService uses
const dorothyPatientId = '0681FA35-A794-4684-97BD-00B88370DB41';

console.log('Expected patient ID:', dorothyPatientId);
console.log('');

// Test scenario 1: Check if the patient lookup works
console.log('1️⃣ Testing patient lookup...');
console.log('When loadSinglePatientData() runs:');
console.log('- It fetches patient row where patient_id =', dorothyPatientId);
console.log('- It creates patient.id =', dorothyPatientId);
console.log('- It sets patientUuidToOriginalId[patientRow.id] = patient.id');
console.log('');

// Test scenario 2: Check encounter processing logic
console.log('2️⃣ Testing encounter processing logic...');
console.log('When processing encounters:');
console.log('- It fetches encounters where extra_data->>PatientID =', dorothyPatientId);
console.log('- For each encounter row:');
console.log('  - encounterBusinessKey = row.encounter_id');
console.log('  - patientSupabaseUUIDFromEncounter = row.patient_supabase_id');
console.log('  - patientPublicId = this.patientUuidToOriginalId[patientSupabaseUUIDFromEncounter]');
console.log('');

// Test scenario 3: Identify the mismatch
console.log('3️⃣ Potential issue:');
console.log('The problem is likely that:');
console.log('- patientRow.id (Supabase UUID) !== row.patient_supabase_id (encounter foreign key)');
console.log('- This causes patientPublicId to be undefined');
console.log('- Which causes the encounter to be skipped with warning message');
console.log('');

// Test scenario 4: Solution
console.log('4️⃣ Solution:');
console.log('We need to check if:');
console.log('- Dorothy patient record has correct Supabase UUID');
console.log('- Dorothy encounter record has correct patient_supabase_id foreign key');
console.log('- These two UUIDs match exactly');
console.log('');

console.log('✅ To fix: Run SQL query to verify UUID matching and fix if needed');
console.log('SQL: SELECT p.id, p.patient_id, e.patient_supabase_id, e.encounter_id FROM patients p JOIN encounters e ON p.id = e.patient_supabase_id;');

debugClinicalEngine(); 