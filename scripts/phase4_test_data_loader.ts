import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TestPatient {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string;
  race?: string;
  ethnicity?: string;
  language: string;
}

interface TestEncounter {
  patient_id: string;
  encounter_id: string;
  encounter_type: string;
  reason_code: string;
  reason_display_text: string;
  transcript?: string;
}

interface TestCondition {
  patient_id: string;
  code: string;
  description: string;
  category: string;
  onset_date?: string;
}

interface TestLabResult {
  patient_id: string;
  encounter_id: string;
  name: string;
  value: string;
  units?: string;
  reference_range?: string;
  flag?: string;
}

async function clearTestData() {
  console.log('Clearing existing test data...');
  const { error } = await supabase
    .from('patients')
    .delete()
    .like('patient_id', 'TEST_%');
  
  if (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
}

async function insertTestPatients() {
  const testPatients: TestPatient[] = [
    {
      id: 'TEST_HEALTHY_001',
      first_name: 'Alice',
      last_name: 'Smith',
      gender: 'female',
      birth_date: '1990-01-01',
      race: 'Asian',
      ethnicity: 'Not Hispanic or Latino',
      language: 'en'
    },
    {
      id: 'TEST_CHRONIC_001',
      first_name: 'Bob',
      last_name: 'Jones',
      gender: 'male',
      birth_date: '1950-07-07',
      race: 'White',
      ethnicity: 'Hispanic or Latino',
      language: 'en'
    },
    {
      id: 'TEST_MINIMAL_001',
      first_name: 'Charlie',
      last_name: 'Brown',
      gender: 'male',
      birth_date: '1985-05-15',
      language: 'en'
    },
    {
      id: 'TEST_PEDS_001',
      first_name: 'Diana',
      last_name: 'Wilson',
      gender: 'female',
      birth_date: '2015-03-20',
      race: 'Black or African American',
      ethnicity: 'Not Hispanic or Latino',
      language: 'en'
    },
    {
      id: 'TEST_ELDERLY_001',
      first_name: 'Eleanor',
      last_name: 'Thompson',
      gender: 'female',
      birth_date: '1940-12-25',
      race: 'White',
      ethnicity: 'Not Hispanic or Latino',
      language: 'en'
    }
  ];

  console.log('Inserting test patients...');
  for (const patient of testPatients) {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        patient_id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        name: `${patient.first_name} ${patient.last_name}`,
        gender: patient.gender,
        birth_date: patient.birth_date,
        race: patient.race,
        ethnicity: patient.ethnicity,
        language: patient.language
      })
      .select()
      .single();

    if (error) {
      console.error(`Error inserting patient ${patient.id}:`, error);
      throw error;
    }
    console.log(`✓ Inserted patient ${patient.id}`);
  }
}

async function insertTestEncounters() {
  const encounters: TestEncounter[] = [
    {
      patient_id: 'TEST_HEALTHY_001',
      encounter_id: 'TEST_HEALTHY_001-V1',
      encounter_type: 'consultation',
      reason_code: 'R05',
      reason_display_text: 'Cough - mild upper respiratory symptoms',
      transcript: 'Patient presents with mild cough for 3 days. No fever, no shortness of breath.'
    },
    {
      patient_id: 'TEST_CHRONIC_001',
      encounter_id: 'TEST_CHRONIC_001-V1',
      encounter_type: 'consultation',
      reason_code: 'R53.83',
      reason_display_text: 'Fatigue and joint pain',
      transcript: 'Patient reports increasing fatigue over past month. Also experiencing joint pain in hands and knees, worse in the morning.'
    },
    {
      patient_id: 'TEST_MINIMAL_001',
      encounter_id: 'TEST_MINIMAL_001-V1',
      encounter_type: 'consultation',
      reason_code: 'R51',
      reason_display_text: 'Headache',
      transcript: 'Tension-type headache for 2 days. No visual changes, no nausea.'
    },
    {
      patient_id: 'TEST_PEDS_001',
      encounter_id: 'TEST_PEDS_001-V1',
      encounter_type: 'consultation',
      reason_code: 'R50.9',
      reason_display_text: 'Fever and ear pain',
      transcript: 'Child brought in by parent with fever 101.5F and complaining of right ear pain since yesterday.'
    },
    {
      patient_id: 'TEST_ELDERLY_001',
      encounter_id: 'TEST_ELDERLY_001-V1',
      encounter_type: 'consultation',
      reason_code: 'R26.2',
      reason_display_text: 'Difficulty walking and dizziness',
      transcript: 'Patient reports increased difficulty with ambulation and episodes of dizziness, especially when standing up.'
    }
  ];

  console.log('Inserting test encounters...');
  for (const encounter of encounters) {
    // First get the patient's Supabase UUID
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', encounter.patient_id)
      .single();

    if (patientError || !patient) {
      console.error(`Error finding patient ${encounter.patient_id}:`, patientError);
      continue;
    }

    const now = new Date();
    const { error } = await supabase
      .from('encounters')
      .insert({
        encounter_id: encounter.encounter_id,
        patient_supabase_id: patient.id,
        encounter_type: encounter.encounter_type,
        reason_code: encounter.reason_code,
        reason_display_text: encounter.reason_display_text,
        transcript: encounter.transcript,
        status: 'finished',
        scheduled_start_datetime: now.toISOString(),
        scheduled_end_datetime: new Date(now.getTime() + 30 * 60000).toISOString() // 30 minutes later
      });

    if (error) {
      console.error(`Error inserting encounter ${encounter.encounter_id}:`, error);
      throw error;
    }
    console.log(`✓ Inserted encounter ${encounter.encounter_id}`);
  }
}

async function insertTestConditions() {
  const conditions: TestCondition[] = [
    // Bob's chronic conditions
    { patient_id: 'TEST_CHRONIC_001', code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'problem-list', onset_date: '2010-01-01' },
    { patient_id: 'TEST_CHRONIC_001', code: 'I10', description: 'Essential (primary) hypertension', category: 'problem-list', onset_date: '2015-06-15' },
    { patient_id: 'TEST_CHRONIC_001', code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'problem-list', onset_date: '2012-03-20' },
    { patient_id: 'TEST_CHRONIC_001', code: 'M79.3', description: 'Myalgia', category: 'problem-list', onset_date: '2020-11-01' },
    // Eleanor's conditions
    { patient_id: 'TEST_ELDERLY_001', code: 'I48.91', description: 'Unspecified atrial fibrillation', category: 'problem-list', onset_date: '2018-01-01' },
    { patient_id: 'TEST_ELDERLY_001', code: 'N18.3', description: 'Chronic kidney disease, stage 3', category: 'problem-list', onset_date: '2019-06-01' },
    { patient_id: 'TEST_ELDERLY_001', code: 'F03.90', description: 'Unspecified dementia without behavioral disturbance', category: 'problem-list', onset_date: '2021-01-01' }
  ];

  console.log('Inserting test conditions...');
  for (const condition of conditions) {
    // Get patient UUID
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', condition.patient_id)
      .single();

    if (patientError || !patient) {
      console.error(`Error finding patient ${condition.patient_id}:`, patientError);
      continue;
    }

    const { error } = await supabase
      .from('conditions')
      .insert({
        patient_id: patient.id,
        code: condition.code,
        description: condition.description,
        category: condition.category,
        onset_date: condition.onset_date
      });

    if (error) {
      console.error(`Error inserting condition for ${condition.patient_id}:`, error);
      throw error;
    }
    console.log(`✓ Inserted condition ${condition.code} for ${condition.patient_id}`);
  }
}

async function insertTestLabResults() {
  const labResults: TestLabResult[] = [
    // Bob's labs
    { patient_id: 'TEST_CHRONIC_001', encounter_id: 'TEST_CHRONIC_001-V1', name: 'Hemoglobin A1C', value: '8.2', units: '%', reference_range: '4.0-5.6', flag: 'H' },
    { patient_id: 'TEST_CHRONIC_001', encounter_id: 'TEST_CHRONIC_001-V1', name: 'Glucose', value: '185', units: 'mg/dL', reference_range: '70-100', flag: 'H' },
    { patient_id: 'TEST_CHRONIC_001', encounter_id: 'TEST_CHRONIC_001-V1', name: 'LDL Cholesterol', value: '145', units: 'mg/dL', reference_range: '<100', flag: 'H' },
    // Diana's labs
    { patient_id: 'TEST_PEDS_001', encounter_id: 'TEST_PEDS_001-V1', name: 'Temperature', value: '101.5', units: 'F', reference_range: '97.0-99.0', flag: 'H' },
    { patient_id: 'TEST_PEDS_001', encounter_id: 'TEST_PEDS_001-V1', name: 'WBC Count', value: '12.5', units: 'K/uL', reference_range: '4.5-11.0', flag: 'H' },
    // Eleanor's labs
    { patient_id: 'TEST_ELDERLY_001', encounter_id: 'TEST_ELDERLY_001-V1', name: 'Creatinine', value: '1.8', units: 'mg/dL', reference_range: '0.6-1.2', flag: 'H' },
    { patient_id: 'TEST_ELDERLY_001', encounter_id: 'TEST_ELDERLY_001-V1', name: 'eGFR', value: '35', units: 'mL/min/1.73m2', reference_range: '>60', flag: 'L' },
    { patient_id: 'TEST_ELDERLY_001', encounter_id: 'TEST_ELDERLY_001-V1', name: 'INR', value: '2.5', units: '', reference_range: '2.0-3.0', flag: '' }
  ];

  console.log('Inserting test lab results...');
  for (const lab of labResults) {
    // Get patient and encounter UUIDs
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', lab.patient_id)
      .single();

    if (patientError || !patient) {
      console.error(`Error finding patient ${lab.patient_id}:`, patientError);
      continue;
    }

    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .select('id')
      .eq('encounter_id', lab.encounter_id)
      .single();

    if (encounterError || !encounter) {
      console.error(`Error finding encounter ${lab.encounter_id}:`, encounterError);
      continue;
    }

    const { error } = await supabase
      .from('lab_results')
      .insert({
        patient_id: patient.id,
        encounter_id: encounter.id,
        name: lab.name,
        value: lab.value,
        units: lab.units,
        date_time: new Date().toISOString(),
        reference_range: lab.reference_range,
        flag: lab.flag
      });

    if (error) {
      console.error(`Error inserting lab result ${lab.name} for ${lab.patient_id}:`, error);
      throw error;
    }
    console.log(`✓ Inserted lab result ${lab.name} for ${lab.patient_id}`);
  }
}

async function main() {
  try {
    console.log('Starting Phase 4 test data load...\n');
    
    await clearTestData();
    await insertTestPatients();
    await insertTestEncounters();
    await insertTestConditions();
    await insertTestLabResults();
    
    console.log('\n✅ Test data loaded successfully!');
    console.log('\nTest patients created:');
    console.log('- TEST_HEALTHY_001: Alice Smith (healthy adult)');
    console.log('- TEST_CHRONIC_001: Bob Jones (multiple chronic conditions)');
    console.log('- TEST_MINIMAL_001: Charlie Brown (minimal data)');
    console.log('- TEST_PEDS_001: Diana Wilson (pediatric)');
    console.log('- TEST_ELDERLY_001: Eleanor Thompson (elderly with polypharmacy)');
    
  } catch (error) {
    console.error('Error loading test data:', error);
    process.exit(1);
  }
}

main(); 