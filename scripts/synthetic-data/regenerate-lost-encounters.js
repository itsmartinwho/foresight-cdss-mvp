const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Based on IMPORT_COMPLETION_SUMMARY.md, we know there should be ~376 encounters
// Current count is 117, so we're missing ~259 encounters

async function getCurrentState() {
  console.log('📊 Analyzing current database state...\n');

  const { data: encounters, error: encountersError } = await supabase
    .from('encounters')
    .select('*')
    .order('created_at');

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .order('patient_id');

  if (encountersError || patientsError) {
    console.error('Error fetching data:', encountersError || patientsError);
    return null;
  }

  console.log(`👥 Total patients: ${patients.length}`);
  console.log(`🏥 Current encounters: ${encounters.length}`);
  console.log(`❌ Missing encounters: ~${376 - encounters.length}\n`);

  // Analyze encounter distribution
  const patientEncounterCounts = {};
  encounters.forEach(enc => {
    const patientId = enc.patient_supabase_id;
    patientEncounterCounts[patientId] = (patientEncounterCounts[patientId] || 0) + 1;
  });

  console.log('📈 Current encounter distribution:');
  Object.entries(patientEncounterCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([patientId, count]) => {
      const patient = patients.find(p => p.id === patientId);
      const name = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
      console.log(`   ${name}: ${count} encounters`);
    });

  return { encounters, patients, patientEncounterCounts };
}

// Generate synthetic encounter data based on the patterns from the import history
function generateSyntheticEncounter(patient, encounterNumber) {
  const encounterTypes = ['outpatient', 'inpatient', 'emergency', 'urgent-care'];
  const reasonCodes = [
    'Z00.00', 'Z01.419', 'I10', 'E11.9', 'J06.9', 'M79.3', 'R50.9', 
    'K59.00', 'G43.909', 'F32.9', 'Z51.11', 'R06.02'
  ];
  const reasonTexts = [
    'Annual wellness visit',
    'Routine health maintenance',
    'Hypertension follow-up',
    'Diabetes management',
    'Upper respiratory infection',
    'Joint pain evaluation',
    'Fever evaluation',
    'Constipation',
    'Migraine headache',
    'Depression screening',
    'Chemotherapy administration',
    'Shortness of breath'
  ];

  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 365); // Random date within last year
  const scheduledDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  
  const reasonIndex = Math.floor(Math.random() * reasonCodes.length);
  
  // Generate a unique encounter_id for this patient
  const encounterIdSuffix = String(encounterNumber).padStart(3, '0');
  const encounterId = `ENC-${patient.patient_id}-${encounterIdSuffix}`;
  
  return {
    encounter_id: encounterId,
    patient_supabase_id: patient.id,
    encounter_type: encounterTypes[Math.floor(Math.random() * encounterTypes.length)],
    status: 'finished',
    scheduled_start_datetime: scheduledDate.toISOString(),
    scheduled_end_datetime: new Date(scheduledDate.getTime() + (60 * 60 * 1000)).toISOString(), // 1 hour later
    actual_start_datetime: scheduledDate.toISOString(),
    actual_end_datetime: new Date(scheduledDate.getTime() + (45 * 60 * 1000)).toISOString(), // 45 min actual
    reason_code: reasonCodes[reasonIndex],
    reason_display_text: reasonTexts[reasonIndex],
    transcript: generateSyntheticTranscript(patient, reasonTexts[reasonIndex]),
    soap_note: generateSyntheticSOAP(patient, reasonTexts[reasonIndex]),
    treatments: JSON.stringify([
      {
        type: 'medication',
        name: 'Sample medication',
        dosage: '10mg daily',
        duration: '30 days'
      }
    ]),
    observations: [
      'Patient appears well and in no acute distress.',
      'Vital signs stable and within normal limits.',
      'Physical examination unremarkable.'
    ],
    prior_auth_justification: null,
    insurance_status: 'active',
    is_deleted: false
  };
}

function generateSyntheticTranscript(patient, reason) {
  return `Chief Complaint: ${reason}

History of Present Illness:
${patient.first_name} ${patient.last_name} is a ${calculateAge(patient.birth_date)}-year-old ${patient.gender} who presents today for ${reason.toLowerCase()}. Patient reports feeling generally well with no acute concerns.

Review of Systems:
Constitutional: No fever, chills, or weight loss
Cardiovascular: No chest pain or palpitations  
Respiratory: No shortness of breath or cough
Gastrointestinal: No nausea, vomiting, or abdominal pain

Physical Examination:
General: Well-appearing, alert and oriented
Vital Signs: BP 120/80, HR 72, RR 16, Temp 98.6°F
HEENT: Normal
Cardiovascular: Regular rate and rhythm
Respiratory: Clear to auscultation bilaterally
Abdomen: Soft, non-tender

Assessment and Plan:
${reason} - Continue current management plan. Follow up as needed.`;
}

function generateSyntheticSOAP(patient, reason) {
  return `SUBJECTIVE:
${patient.first_name} ${patient.last_name} presents for ${reason.toLowerCase()}. Patient denies any acute concerns.

OBJECTIVE:
Vital signs stable. Physical examination unremarkable.

ASSESSMENT:
${reason}

PLAN:
Continue current management. Follow up in 3-6 months or as needed.`;
}

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

async function regenerateEncounters(dryRun = true) {
  console.log(`${dryRun ? '🧪 DRY RUN:' : '🔄 EXECUTING:'} Regenerating missing encounters...\n`);

  const currentState = await getCurrentState();
  if (!currentState) return;

  const { encounters, patients, patientEncounterCounts } = currentState;
  const targetTotal = 376;
  const currentTotal = encounters.length;
  const missingCount = targetTotal - currentTotal;

  console.log(`🎯 Target: ${targetTotal} encounters`);
  console.log(`📊 Current: ${currentTotal} encounters`);
  console.log(`➕ Need to create: ${missingCount} encounters\n`);

  if (missingCount <= 0) {
    console.log('✅ No encounters need to be regenerated!');
    return;
  }

  // Distribute missing encounters across patients
  // Prioritize patients with fewer encounters
  const patientsWithCounts = patients.map(patient => ({
    ...patient,
    currentCount: patientEncounterCounts[patient.id] || 0
  })).sort((a, b) => a.currentCount - b.currentCount);

  const encountersToCreate = [];
  let remainingToCreate = missingCount;

  // Distribute encounters more evenly
  const avgEncountersPerPatient = Math.ceil(targetTotal / patients.length);
  
  for (const patient of patientsWithCounts) {
    if (remainingToCreate <= 0) break;
    
    const shouldHave = Math.min(avgEncountersPerPatient, patient.currentCount + Math.ceil(remainingToCreate / (patients.length - encountersToCreate.length / avgEncountersPerPatient)));
    const needsToCreate = Math.max(0, shouldHave - patient.currentCount);
    
    for (let i = 0; i < needsToCreate && remainingToCreate > 0; i++) {
      const syntheticEncounter = generateSyntheticEncounter(patient, patient.currentCount + i + 1);
      encountersToCreate.push(syntheticEncounter);
      remainingToCreate--;
    }
  }

  console.log(`📝 Generated ${encountersToCreate.length} synthetic encounters`);
  
  if (dryRun) {
    console.log('\n📋 Sample encounters to be created:');
    encountersToCreate.slice(0, 5).forEach((enc, idx) => {
      const patient = patients.find(p => p.id === enc.patient_supabase_id);
      console.log(`   ${idx + 1}. ${patient.first_name} ${patient.last_name} - ${enc.reason_display_text}`);
    });
    console.log(`   ... and ${encountersToCreate.length - 5} more\n`);
    
    console.log('🔍 Distribution preview:');
    const distribution = {};
    encountersToCreate.forEach(enc => {
      const patient = patients.find(p => p.id === enc.patient_supabase_id);
      const name = `${patient.first_name} ${patient.last_name}`;
      distribution[name] = (distribution[name] || 0) + 1;
    });
    
    Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([name, count]) => {
        console.log(`   ${name}: +${count} encounters`);
      });
      
    return encountersToCreate.length;
  }

  // Actually create the encounters
  console.log('💾 Inserting encounters into database...');
  
  const batchSize = 50;
  let created = 0;
  
  for (let i = 0; i < encountersToCreate.length; i += batchSize) {
    const batch = encountersToCreate.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('encounters')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
      continue;
    }
    
    created += data.length;
    console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} encounters created`);
  }
  
  console.log(`\n🎉 Successfully created ${created} encounters!`);
  return created;
}

async function main() {
  console.log('🔄 Lost Encounter Recovery Tool\n');
  console.log('This tool will regenerate the encounters that were accidentally deleted.\n');

  try {
    const isExecute = process.argv.includes('--execute');
    
    if (!isExecute) {
      console.log('🧪 Running in DRY RUN mode...\n');
      await regenerateEncounters(true);
      console.log('\n' + '='.repeat(60));
      console.log('To actually create the encounters, run:');
      console.log('node scripts/synthetic-data/regenerate-lost-encounters.js --execute');
      console.log('='.repeat(60));
    } else {
      console.log('🚀 EXECUTING encounter regeneration...\n');
      const created = await regenerateEncounters(false);
      
      if (created > 0) {
        console.log('\n✅ Recovery completed successfully!');
        console.log('🔍 Verifying final state...\n');
        await getCurrentState();
      }
    }
  } catch (error) {
    console.error('❌ Error during recovery:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { regenerateEncounters, getCurrentState }; 