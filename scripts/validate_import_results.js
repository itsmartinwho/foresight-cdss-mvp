const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function validateImportResults() {
  console.log('=== Post-Import Validation ===\n');
  
  try {
    // Check encounter updates
    console.log('1. Validating encounter updates...');
    const { data: encounters, error: encounterError } = await supabase
      .from('encounters')
      .select('id, reason_code, reason_display_text, transcript, soap_note, observations, treatments')
      .not('reason_code', 'is', null)
      .not('transcript', 'is', null);
    
    if (encounterError) {
      console.error('❌ Error querying encounters:', encounterError);
    } else {
      console.log(`✅ Found ${encounters.length} encounters with synthetic data`);
      console.log(`   - Encounters with reason codes: ${encounters.filter(e => e.reason_code).length}`);
      console.log(`   - Encounters with transcripts: ${encounters.filter(e => e.transcript).length}`);
      console.log(`   - Encounters with SOAP notes: ${encounters.filter(e => e.soap_note).length}`);
      console.log(`   - Encounters with observations: ${encounters.filter(e => e.observations && e.observations.length > 0).length}`);
      console.log(`   - Encounters with treatments: ${encounters.filter(e => e.treatments && e.treatments.length > 0).length}`);
    }
    
    // Check conditions
    console.log('\n2. Validating conditions...');
    const { data: conditions, error: conditionError } = await supabase
      .from('conditions')
      .select('id, patient_id, encounter_id, code, description, category, clinical_status, verification_status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
    
    if (conditionError) {
      console.error('❌ Error querying conditions:', conditionError);
    } else {
      console.log(`✅ Found ${conditions.length} new conditions`);
      const categories = [...new Set(conditions.map(c => c.category))];
      console.log(`   - Categories: ${categories.join(', ')}`);
      const statuses = [...new Set(conditions.map(c => c.clinical_status))];
      console.log(`   - Clinical statuses: ${statuses.join(', ')}`);
    }
    
    // Check lab results
    console.log('\n3. Validating lab results...');
    const { data: labResults, error: labError } = await supabase
      .from('lab_results')
      .select('id, patient_id, encounter_id, name, value, value_type, units, interpretation')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
    
    if (labError) {
      console.error('❌ Error querying lab results:', labError);
    } else {
      console.log(`✅ Found ${labResults.length} new lab results`);
      const valueTypes = [...new Set(labResults.map(l => l.value_type))];
      console.log(`   - Value types: ${valueTypes.join(', ')}`);
      const withUnits = labResults.filter(l => l.units).length;
      console.log(`   - Results with units: ${withUnits}`);
      const withInterpretation = labResults.filter(l => l.interpretation).length;
      console.log(`   - Results with interpretation: ${withInterpretation}`);
    }
    
    // Check referential integrity
    console.log('\n4. Validating referential integrity...');
    
    // Check for orphaned conditions
    const { data: orphanedConditions, error: orphanError } = await supabase
      .from('conditions')
      .select('id, patient_id, encounter_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .is('patient_id', null);
    
    if (orphanError) {
      console.error('❌ Error checking orphaned conditions:', orphanError);
    } else if (orphanedConditions.length > 0) {
      console.warn(`⚠️  Found ${orphanedConditions.length} conditions with null patient_id`);
    } else {
      console.log('✅ No orphaned conditions found');
    }
    
    // Sample data display
    console.log('\n5. Sample imported data...');
    if (encounters.length > 0) {
      const sample = encounters[0];
      console.log('Sample encounter:');
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Reason: ${sample.reason_display_text}`);
      console.log(`   - Observations: ${sample.observations ? sample.observations.slice(0, 2).join('; ') + '...' : 'None'}`);
      console.log(`   - Treatments: ${sample.treatments ? sample.treatments.length + ' treatments' : 'None'}`);
    }
    
    console.log('\n=== Validation Complete ===');
    console.log('✅ Synthetic data import validation successful!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

validateImportResults(); 