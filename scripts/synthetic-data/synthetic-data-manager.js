#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BATCH_SIZE = 50;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// CORE CLASSES AND UTILITIES
// =============================================================================

class OperationTracker {
  constructor(operationType = 'Operation') {
    this.operationType = operationType;
    this.errors = [];
    this.warnings = [];
    this.summary = {
      totalRecords: 0,
      processedRecords: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      successfulConditions: 0,
      failedConditions: 0,
      successfulLabResults: 0,
      failedLabResults: 0
    };
    this.startTime = Date.now();
  }

  addError(type, patientId, encounterId, message, details = {}) {
    const error = {
      type,
      patientId,
      encounterId,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    this.errors.push(error);
    console.error(`❌ Error: ${type} - ${message}`, details);
  }

  addWarning(type, message, details = {}) {
    const warning = {
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    this.warnings.push(warning);
    console.warn(`⚠️  Warning: ${type} - ${message}`, details);
  }

  logSuccess(type, id) {
    switch (type) {
      case 'encounter': this.summary.successfulUpdates++; break;
      case 'condition': this.summary.successfulConditions++; break;
      case 'lab_result': this.summary.successfulLabResults++; break;
    }
    console.log(`✅ Successfully processed ${type}: ${id}`);
  }

  generateReport(outputPath = null) {
    const duration = Date.now() - this.startTime;
    const report = {
      operationType: this.operationType,
      summary: this.summary,
      duration: `${Math.round(duration / 1000)}s`,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings,
      reportGeneratedAt: new Date().toISOString()
    };

    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    }
    
    console.log('\n=== Operation Summary ===');
    console.log(`Operation: ${this.operationType}`);
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Total records processed: ${this.summary.processedRecords}/${this.summary.totalRecords}`);
    console.log(`Successful encounter updates: ${this.summary.successfulUpdates}`);
    console.log(`Failed encounter updates: ${this.summary.failedUpdates}`);
    console.log(`Successful conditions: ${this.summary.successfulConditions}`);
    console.log(`Failed conditions: ${this.summary.failedConditions}`);
    console.log(`Successful lab results: ${this.summary.successfulLabResults}`);
    console.log(`Failed lab results: ${this.summary.failedLabResults}`);
    console.log(`Total errors: ${this.errors.length}`);
    console.log(`Total warnings: ${this.warnings.length}`);
    
    if (outputPath) {
      console.log(`\nDetailed report saved to: ${outputPath}`);
    }
    
    return report;
  }
}

// =============================================================================
// DATA CLEANING FUNCTIONS
// =============================================================================

function cleanRawJsonData(rawData) {
  console.log('🧹 Cleaning raw JSON data...');
  
  let cleanedData = rawData;
  
  // Fix common malformed JSON issues
  cleanedData = cleanedData.replace(/"patient_id: "/g, '"patient_id": "');
  cleanedData = cleanedData.replace(/\s*id: "some-uuid-condition-\d+-\d+",\s*/g, '');
  cleanedData = cleanedData.replace(/"encounter_supabase_encounter_id: "/g, '"encounter_supabase_id": "');
  
  // Try parsing, if fails attempt more aggressive cleaning
  try {
    return JSON.parse(cleanedData);
  } catch (parseError) {
    console.warn('⚠️  Initial parse failed, attempting line-by-line fixes...');
    
    const lines = cleanedData.split('\n');
    const fixedLines = lines.map(line => {
      if (line.trim().match(/^\s*id:\s*"some-uuid-/)) {
        return '';
      }
      return line;
    }).filter(line => line !== '');
    
    cleanedData = fixedLines.join('\n');
    return JSON.parse(cleanedData);
  }
}

function cleanSyntheticDataStructure(jsonData) {
  console.log('🔧 Cleaning synthetic data structure...');
  
  if (!jsonData.synthetic_data || !Array.isArray(jsonData.synthetic_data)) {
    throw new Error('Invalid data structure: synthetic_data array not found');
  }

  jsonData.synthetic_data.forEach((record, recordIndex) => {
    // Clean conditions
    if (record.generated_conditions && Array.isArray(record.generated_conditions)) {
      record.generated_conditions = record.generated_conditions.map((condition, condIndex) => {
        delete condition.id;
        condition.patient_id = record.patient_supabase_id;
        condition.encounter_id = record.encounter_supabase_id;
        
        // Fix clinical_status values
        const validStatuses = ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'];
        if (!validStatuses.includes(condition.clinical_status)) {
          console.warn(`⚠️  Invalid clinical_status "${condition.clinical_status}" in record ${recordIndex}, condition ${condIndex}. Setting to 'active'.`);
          condition.clinical_status = 'active';
        }
        
        return condition;
      });
    }
    
    // Clean lab results
    if (record.generated_lab_results && Array.isArray(record.generated_lab_results)) {
      record.generated_lab_results = record.generated_lab_results.map((labResult) => {
        labResult.patient_id = record.patient_supabase_id;
        labResult.encounter_id = record.encounter_supabase_id;
        
        if (labResult.value !== null && labResult.value !== undefined) {
          labResult.value = String(labResult.value);
        }
        
        return labResult;
      });
    }
  });

  return jsonData;
}

async function correctPatientNameInconsistencies(jsonData) {
  console.log('👤 Correcting patient name inconsistencies in transcripts...');
  
  const patientNameCache = new Map();
  const placeholderNames = ['Kevin', 'Jack', 'Sarah', 'John', 'Jane', 'Patient', 'Mr. Smith', 'Ms. Doe'];
  
  async function getPatientFirstName(patientId) {
    if (patientNameCache.has(patientId)) {
      return patientNameCache.get(patientId);
    }

    try {
      const { data: patient, error } = await supabase
        .from('patients')
        .select('first_name')
        .eq('id', patientId)
        .single();

      if (error || !patient || !patient.first_name) {
        patientNameCache.set(patientId, null);
        return null;
      }
      
      patientNameCache.set(patientId, patient.first_name);
      return patient.first_name;
    } catch (dbError) {
      console.warn(`⚠️  Database error fetching patient name for ID ${patientId}: ${dbError.message}`);
      patientNameCache.set(patientId, null);
      return null;
    }
  }

  function correctTranscript(transcript, actualFirstName) {
    if (!transcript || !actualFirstName) {
      return transcript;
    }
    
    let correctedTranscript = transcript;
    for (const placeholder of placeholderNames) {
      const regex = new RegExp(`(Clinician:|Doctor:)(\\s*)${placeholder}([\\s\\S]*?(?:\\n|$))`, 'gi');
      correctedTranscript = correctedTranscript.replace(regex, (match, prefix, spacing, suffix) => {
        const placeholderPattern = new RegExp(`^${placeholder}([,?.:!]|\\s|$)`, 'i');
        if (placeholderPattern.test(suffix.trimStart().substring(0, placeholder.length + 1))) {
          return `${prefix}${spacing}${actualFirstName}${suffix.substring(placeholder.length)}`;
        }
        return match;
      });

      const directAddressRegex = new RegExp(`\\b${placeholder}([,?.:!])`, 'gi');
      correctedTranscript = correctedTranscript.replace(directAddressRegex, `${actualFirstName}$1`);
    }
    return correctedTranscript;
  }

  let transcriptsCorrected = 0;
  for (const record of jsonData.synthetic_data) {
    if (record.patient_supabase_id && record.generated_encounter_updates?.transcript) {
      const actualFirstName = await getPatientFirstName(record.patient_supabase_id);
      if (actualFirstName) {
        const originalTranscript = record.generated_encounter_updates.transcript;
        const corrected = correctTranscript(originalTranscript, actualFirstName);
        if (corrected !== originalTranscript) {
          record.generated_encounter_updates.transcript = corrected;
          transcriptsCorrected++;
        }
      }
    }
  }

  console.log(`✅ Corrected ${transcriptsCorrected} transcripts with patient names`);
  return jsonData;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

async function validateUUIDs(patientId, encounterId, tracker) {
  try {
    // Validate patient exists
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      tracker.addError('VALIDATION', patientId, encounterId, 'Patient UUID not found in database', { patientId });
      return false;
    }

    // Validate encounter exists and belongs to patient
    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .select('id, patient_supabase_id')
      .eq('id', encounterId)
      .single();

    if (encounterError || !encounter) {
      tracker.addError('VALIDATION', patientId, encounterId, 'Encounter UUID not found in database', { encounterId });
      return false;
    }

    if (encounter.patient_supabase_id !== patientId) {
      tracker.addError('VALIDATION', patientId, encounterId, 'Encounter does not belong to specified patient', {
        expectedPatientId: patientId,
        actualPatientId: encounter.patient_supabase_id
      });
      return false;
    }

    return true;
  } catch (error) {
    tracker.addError('VALIDATION', patientId, encounterId, 'Error during UUID validation', { error: error.message });
    return false;
  }
}

function validateEncounterData(data, tracker, patientId, encounterId) {
  const issues = [];

  if (data.reason_code && typeof data.reason_code !== 'string') {
    issues.push('reason_code must be a string');
  }
  if (data.reason_display_text && typeof data.reason_display_text !== 'string') {
    issues.push('reason_display_text must be a string');
  }
  if (data.transcript && typeof data.transcript !== 'string') {
    issues.push('transcript must be a string');
  }
  if (data.soap_note && typeof data.soap_note !== 'string') {
    issues.push('soap_note must be a string');
  }
  if (data.observations && typeof data.observations !== 'string') {
    issues.push('observations must be a string');
  }

  if (data.treatments) {
    try {
      const treatments = typeof data.treatments === 'string' ? JSON.parse(data.treatments) : data.treatments;
      if (!Array.isArray(treatments)) {
        issues.push('treatments must be an array');
      }
    } catch (e) {
      issues.push('treatments is not valid JSON');
    }
  }

  if (issues.length > 0) {
    tracker.addError('VALIDATION', patientId, encounterId, 'Encounter data validation failed', { issues });
    return false;
  }

  return true;
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

async function importEncounterUpdates(record, tracker, dryRun = false) {
  const { patient_supabase_id, encounter_supabase_id, generated_encounter_updates } = record;
  
  if (!generated_encounter_updates) {
    tracker.addWarning('SKIP', 'No encounter updates provided', { encounter_supabase_id });
    return false;
  }

  if (!validateEncounterData(generated_encounter_updates, tracker, patient_supabase_id, encounter_supabase_id)) {
    return false;
  }

  if (dryRun) {
    console.log(`🔍 DRY RUN: Would update encounter ${encounter_supabase_id}`);
    tracker.logSuccess('encounter', encounter_supabase_id);
    return true;
  }

  try {
    const updateData = { ...generated_encounter_updates };
    
    // Handle observations field - convert to array if database expects array
    if (updateData.observations && typeof updateData.observations === 'string') {
      updateData.observations = updateData.observations
        .split(/\.\s+/)
        .filter(obs => obs.trim().length > 0)
        .map(obs => obs.trim() + (obs.endsWith('.') ? '' : '.'));
    }

    // Handle treatments - ensure it's proper JSON
    if (updateData.treatments) {
      updateData.treatments = typeof updateData.treatments === 'string' 
        ? JSON.parse(updateData.treatments) 
        : updateData.treatments;
    }

    const { error } = await supabase
      .from('encounters')
      .update(updateData)
      .eq('id', encounter_supabase_id);

    if (error) throw error;
    
    tracker.logSuccess('encounter', encounter_supabase_id);
    return true;
  } catch (error) {
    tracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 'Failed to update encounter', { error: error.message });
    return false;
  }
}

async function importConditions(record, tracker, dryRun = false) {
  const { patient_supabase_id, encounter_supabase_id, generated_conditions } = record;
  
  if (!generated_conditions || !Array.isArray(generated_conditions)) {
    return true; // No conditions to import is not an error
  }

  let successCount = 0;
  for (let i = 0; i < generated_conditions.length; i++) {
    const condition = { ...generated_conditions[i] };
    
    // Ensure proper IDs
    condition.patient_id = patient_supabase_id;
    condition.encounter_id = encounter_supabase_id;

    if (dryRun) {
      console.log(`🔍 DRY RUN: Would create condition ${condition.code} for encounter ${encounter_supabase_id}`);
      tracker.logSuccess('condition', `${encounter_supabase_id}_condition_${i}`);
      successCount++;
      continue;
    }

    try {
      const { error } = await supabase
        .from('conditions')
        .insert(condition);

      if (error) throw error;
      
      tracker.logSuccess('condition', `${encounter_supabase_id}_condition_${i}`);
      successCount++;
    } catch (error) {
      tracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, `Failed to import condition ${i}`, { 
        error: error.message, 
        condition 
      });
    }
  }

  return successCount === generated_conditions.length;
}

async function importLabResults(record, tracker, dryRun = false) {
  const { patient_supabase_id, encounter_supabase_id, generated_lab_results } = record;
  
  if (!generated_lab_results || !Array.isArray(generated_lab_results)) {
    return true; // No lab results to import is not an error
  }

  let successCount = 0;
  for (let i = 0; i < generated_lab_results.length; i++) {
    const labResult = { ...generated_lab_results[i] };
    
    // Ensure proper IDs
    labResult.patient_id = patient_supabase_id;
    labResult.encounter_id = encounter_supabase_id;

    if (dryRun) {
      console.log(`🔍 DRY RUN: Would create lab result ${labResult.name} for encounter ${encounter_supabase_id}`);
      tracker.logSuccess('lab_result', `${encounter_supabase_id}_lab_${i}`);
      successCount++;
      continue;
    }

    try {
      const { error } = await supabase
        .from('lab_results')
        .insert(labResult);

      if (error) throw error;
      
      tracker.logSuccess('lab_result', `${encounter_supabase_id}_lab_${i}`);
      successCount++;
    } catch (error) {
      tracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, `Failed to import lab result ${i}`, { 
        error: error.message, 
        labResult 
      });
    }
  }

  return successCount === generated_lab_results.length;
}

// =============================================================================
// MAIN OPERATIONS
// =============================================================================

async function processSyntheticData(inputPath, options = {}) {
  const { 
    dryRun = false, 
    skipCleaning = false,
    skipValidation = false,
    outputCleanedPath = null,
    errorLogPath = null 
  } = options;
  
  const tracker = new OperationTracker('Synthetic Data Import');
  
  console.log(`\n🚀 ${dryRun ? 'DRY RUN: ' : ''}Processing synthetic data from: ${inputPath}`);
  
  try {
    // Read and clean data
    const rawData = fs.readFileSync(inputPath, 'utf8');
    let jsonData = cleanRawJsonData(rawData);
    
    if (!skipCleaning) {
      jsonData = cleanSyntheticDataStructure(jsonData);
      jsonData = await correctPatientNameInconsistencies(jsonData);
      
      if (outputCleanedPath) {
        fs.writeFileSync(outputCleanedPath, JSON.stringify(jsonData, null, 2));
        console.log(`✅ Cleaned data saved to: ${outputCleanedPath}`);
      }
    }
    
    if (!jsonData.synthetic_data) {
      throw new Error('No synthetic_data array found in input file');
    }
    
    tracker.summary.totalRecords = jsonData.synthetic_data.length;
    console.log(`📊 Found ${tracker.summary.totalRecords} records to process`);
    
    // Process in batches
    for (let i = 0; i < jsonData.synthetic_data.length; i += BATCH_SIZE) {
      const batch = jsonData.synthetic_data.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jsonData.synthetic_data.length / BATCH_SIZE)} (${batch.length} records)`);
      
      for (const record of batch) {
        const { patient_supabase_id, encounter_supabase_id } = record;
        
        console.log(`\n🔄 Processing: Patient ${patient_supabase_id}, Encounter ${encounter_supabase_id}`);
        
        // Validate UUIDs
        if (!skipValidation && !await validateUUIDs(patient_supabase_id, encounter_supabase_id, tracker)) {
          tracker.summary.processedRecords++;
          continue;
        }
        
        // Import encounter updates
        await importEncounterUpdates(record, tracker, dryRun);
        
        // Import conditions
        await importConditions(record, tracker, dryRun);
        
        // Import lab results
        await importLabResults(record, tracker, dryRun);
        
        tracker.summary.processedRecords++;
      }
    }
    
    const report = tracker.generateReport(errorLogPath);
    return report;
    
  } catch (error) {
    console.error('❌ Fatal error during processing:', error.message);
    tracker.addError('FATAL', null, null, 'Processing failed', { error: error.message });
    return tracker.generateReport(errorLogPath);
  }
}

async function processTranscriptUpdates(inputPath, options = {}) {
  const { dryRun = false } = options;
  const tracker = new OperationTracker('Transcript Updates');
  
  console.log(`\n🔄 ${dryRun ? 'DRY RUN: ' : ''}Processing transcript updates from: ${inputPath}`);
  
  try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(rawData);
    
    if (!data.synthetic_transcript_updates) {
      throw new Error('Expected synthetic_transcript_updates field not found');
    }
    
    tracker.summary.totalRecords = data.synthetic_transcript_updates.length;
    console.log(`📊 Found ${tracker.summary.totalRecords} transcript updates to process`);
    
    for (let i = 0; i < data.synthetic_transcript_updates.length; i++) {
      const update = data.synthetic_transcript_updates[i];
      const encounterID = update.encounter_supabase_id;
      
      console.log(`\n🔄 Processing ${i + 1}/${tracker.summary.totalRecords}: ${encounterID}`);
      
      try {
        // Validate encounter exists
        const { data: existingEncounter, error: fetchError } = await supabase
          .from('encounters')
          .select('id')
          .eq('id', encounterID)
          .single();
        
        if (fetchError || !existingEncounter) {
          throw new Error(`Encounter ${encounterID} not found in database`);
        }
        
        if (dryRun) {
          console.log(`🔍 DRY RUN: Would update encounter ${encounterID} with new transcript and fields`);
          tracker.logSuccess('encounter', encounterID);
          tracker.summary.processedRecords++;
          continue;
        }
        
        // Prepare update object
        const updateFields = {};
        
        if (update.new_transcript) {
          updateFields.transcript = update.new_transcript;
        }
        
        if (update.other_field_updates) {
          if (update.other_field_updates.reason_code) {
            updateFields.reason_code = update.other_field_updates.reason_code;
          }
          if (update.other_field_updates.reason_display_text) {
            updateFields.reason_display_text = update.other_field_updates.reason_display_text;
          }
          if (update.other_field_updates.soap_note) {
            updateFields.soap_note = update.other_field_updates.soap_note;
          }
          if (update.other_field_updates.observations) {
            if (typeof update.other_field_updates.observations === 'string') {
              updateFields.observations = update.other_field_updates.observations
                .split(/\.\s+/)
                .filter(obs => obs.trim().length > 0)
                .map(obs => obs.trim() + (obs.endsWith('.') ? '' : '.'));
            } else {
              updateFields.observations = update.other_field_updates.observations;
            }
          }
        }
        
        // Update the encounter
        const { error: updateError } = await supabase
          .from('encounters')
          .update(updateFields)
          .eq('id', encounterID);
        
        if (updateError) {
          throw updateError;
        }
        
        tracker.logSuccess('encounter', encounterID);
        tracker.summary.processedRecords++;
        
      } catch (error) {
        tracker.addError('IMPORT', null, encounterID, `Failed to update encounter`, { error: error.message });
        tracker.summary.processedRecords++;
      }
    }
    
    return tracker.generateReport();
    
  } catch (error) {
    console.error('❌ Error processing transcript updates:', error.message);
    tracker.addError('FATAL', null, null, 'Processing failed', { error: error.message });
    return tracker.generateReport();
  }
}

async function validateImportResults() {
  console.log('\n🔍 Validating import results...\n');
  
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
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
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
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
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
    if (encounters && encounters.length > 0) {
      const sample = encounters[0];
      console.log('Sample encounter:');
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Reason: ${sample.reason_display_text}`);
      console.log(`   - Observations: ${sample.observations ? (Array.isArray(sample.observations) ? sample.observations.slice(0, 2).join('; ') + '...' : sample.observations.substring(0, 100) + '...') : 'None'}`);
      console.log(`   - Treatments: ${sample.treatments ? (Array.isArray(sample.treatments) ? sample.treatments.length + ' treatments' : 'Has treatments') : 'None'}`);
    }
    
    console.log('\n✅ Validation complete!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

function showHelp() {
  console.log(`
🔬 Synthetic Data Manager

USAGE:
  node synthetic-data-manager.js <command> [options]

COMMANDS:
  import <file>              Import synthetic data from JSON file
  transcript <file>          Import transcript updates from JSON file  
  clean <input> <output>     Clean and prepare raw synthetic data
  validate                   Validate recent import results

OPTIONS:
  --dry-run                  Show what would be done without making changes
  --skip-cleaning            Skip data cleaning step during import
  --skip-validation          Skip UUID validation during import
  --error-log <file>         Save detailed error log to file

EXAMPLES:
  # Clean raw data
  node synthetic-data-manager.js clean raw-data.json cleaned-data.json
  
  # Import with dry run
  node synthetic-data-manager.js import cleaned-data.json --dry-run
  
  # Import for real
  node synthetic-data-manager.js import cleaned-data.json --error-log errors.json
  
  # Import transcript updates
  node synthetic-data-manager.js transcript transcript-updates.json
  
  # Validate recent imports
  node synthetic-data-manager.js validate

For more information, see the documentation in /docs/
  `);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const command = args[0];
  const dryRun = args.includes('--dry-run');
  const skipCleaning = args.includes('--skip-cleaning');
  const skipValidation = args.includes('--skip-validation');
  
  let errorLogPath = null;
  const errorLogIndex = args.indexOf('--error-log');
  if (errorLogIndex !== -1 && args[errorLogIndex + 1]) {
    errorLogPath = args[errorLogIndex + 1];
  }
  
  try {
    switch (command) {
      case 'import': {
        const inputFile = args[1];
        if (!inputFile) {
          console.error('❌ Error: Input file required for import command');
          process.exit(1);
        }
        
        const options = { 
          dryRun, 
          skipCleaning, 
          skipValidation, 
          errorLogPath,
          outputCleanedPath: skipCleaning ? null : inputFile.replace('.json', '-cleaned.json')
        };
        
        const report = await processSyntheticData(inputFile, options);
        process.exit(report.errorCount > 0 ? 1 : 0);
        break;
      }
      
      case 'transcript': {
        const inputFile = args[1];
        if (!inputFile) {
          console.error('❌ Error: Input file required for transcript command');
          process.exit(1);
        }
        
        const report = await processTranscriptUpdates(inputFile, { dryRun });
        process.exit(report.errorCount > 0 ? 1 : 0);
        break;
      }
      
      case 'clean': {
        const inputFile = args[1];
        const outputFile = args[2];
        if (!inputFile || !outputFile) {
          console.error('❌ Error: Both input and output files required for clean command');
          process.exit(1);
        }
        
        const rawData = fs.readFileSync(inputFile, 'utf8');
        let jsonData = cleanRawJsonData(rawData);
        jsonData = cleanSyntheticDataStructure(jsonData);
        jsonData = await correctPatientNameInconsistencies(jsonData);
        
        fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
        console.log(`✅ Cleaned data saved to: ${outputFile}`);
        break;
      }
      
      case 'validate': {
        await validateImportResults();
        break;
      }
      
      default:
        console.error(`❌ Error: Unknown command '${command}'`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  processSyntheticData,
  processTranscriptUpdates,
  validateImportResults,
  cleanRawJsonData,
  cleanSyntheticDataStructure,
  correctPatientNameInconsistencies
}; 