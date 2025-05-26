const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEFAULT_SYNTHETIC_DATA_PATH = path.join(__dirname, '../public/data/synthetic-data-cleaned.json');
const ERROR_LOG_PATH = path.join(__dirname, 'import_errors.log');
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50; // Process in batches to manage memory

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Error tracking
class ErrorTracker {
  constructor() {
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

  generateReport() {
    const report = {
      summary: this.summary,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings,
      reportGeneratedAt: new Date().toISOString()
    };

    // Write detailed error log
    fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(report, null, 2));
    
    // Console summary
    console.log('\n=== Import Summary ===');
    console.log(`Total records processed: ${this.summary.processedRecords}/${this.summary.totalRecords}`);
    console.log(`Successful encounter updates: ${this.summary.successfulUpdates}`);
    console.log(`Failed encounter updates: ${this.summary.failedUpdates}`);
    console.log(`Successful conditions: ${this.summary.successfulConditions}`);
    console.log(`Failed conditions: ${this.summary.failedConditions}`);
    console.log(`Successful lab results: ${this.summary.successfulLabResults}`);
    console.log(`Failed lab results: ${this.summary.failedLabResults}`);
    console.log(`Total errors: ${this.errors.length}`);
    console.log(`Total warnings: ${this.warnings.length}`);
    console.log(`\nDetailed error log saved to: ${ERROR_LOG_PATH}`);
  }
}

// Validation functions
async function validateUUIDs(patientId, encounterId, errorTracker) {
  try {
    // Validate patient exists
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      errorTracker.addError('VALIDATION', patientId, encounterId, 'Patient UUID not found in database', { patientId });
      return false;
    }

    // Validate encounter exists
    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .select('id, patient_supabase_id')
      .eq('id', encounterId)
      .single();

    if (encounterError || !encounter) {
      errorTracker.addError('VALIDATION', patientId, encounterId, 'Encounter UUID not found in database', { encounterId });
      return false;
    }

    // Validate encounter belongs to patient
    if (encounter.patient_supabase_id !== patientId) {
      errorTracker.addError('VALIDATION', patientId, encounterId, 'Encounter does not belong to specified patient', {
        expectedPatientId: patientId,
        actualPatientId: encounter.patient_supabase_id
      });
      return false;
    }

    return true;
  } catch (error) {
    errorTracker.addError('VALIDATION', patientId, encounterId, 'Error during UUID validation', { error: error.message });
    return false;
  }
}

function validateEncounterData(data, errorTracker, patientId, encounterId) {
  const issues = [];

  // Validate reason_code
  if (data.reason_code && typeof data.reason_code !== 'string') {
    issues.push('reason_code must be a string');
  }

  // Validate reason_display_text
  if (data.reason_display_text && typeof data.reason_display_text !== 'string') {
    issues.push('reason_display_text must be a string');
  }

  // Validate transcript
  if (data.transcript && typeof data.transcript !== 'string') {
    issues.push('transcript must be a string');
  }

  // Validate soap_note
  if (data.soap_note && typeof data.soap_note !== 'string') {
    issues.push('soap_note must be a string');
  }

  // Validate observations
  if (data.observations && typeof data.observations !== 'string') {
    issues.push('observations must be a string');
  }

  // Validate treatments (should be JSON string)
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
    errorTracker.addError('VALIDATION', patientId, encounterId, 'Encounter data validation failed', { issues });
    return false;
  }

  return true;
}

function validateConditionData(condition, errorTracker, index) {
  const issues = [];

  // Required fields
  if (!condition.patient_id) issues.push('patient_id is required');
  if (!condition.code) issues.push('code is required');
  if (!condition.category) issues.push('category is required');

  // Field types
  if (condition.patient_id && typeof condition.patient_id !== 'string') issues.push('patient_id must be a string');
  if (condition.encounter_id && typeof condition.encounter_id !== 'string') issues.push('encounter_id must be a string');
  if (condition.code && typeof condition.code !== 'string') issues.push('code must be a string');
  if (condition.description && typeof condition.description !== 'string') issues.push('description must be a string');
  if (condition.category && typeof condition.category !== 'string') issues.push('category must be a string');

  // Valid values for clinical_status
  const validClinicalStatuses = ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'];
  if (condition.clinical_status && !validClinicalStatuses.includes(condition.clinical_status)) {
    issues.push(`clinical_status must be one of: ${validClinicalStatuses.join(', ')}`);
  }

  // Valid values for verification_status
  const validVerificationStatuses = ['unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted', 'entered-in-error'];
  if (condition.verification_status && !validVerificationStatuses.includes(condition.verification_status)) {
    issues.push(`verification_status must be one of: ${validVerificationStatuses.join(', ')}`);
  }

  // Date validation
  if (condition.onset_date && !isValidDate(condition.onset_date)) {
    issues.push('onset_date must be a valid date (YYYY-MM-DD)');
  }

  if (issues.length > 0) {
    errorTracker.addError('VALIDATION', condition.patient_id, condition.encounter_id, 
      `Condition validation failed at index ${index}`, { issues, condition });
    return false;
  }

  return true;
}

function validateLabResultData(labResult, errorTracker, index) {
  const issues = [];

  // Required fields
  if (!labResult.patient_id) issues.push('patient_id is required');
  if (!labResult.name) issues.push('name is required');

  // Field types
  if (labResult.patient_id && typeof labResult.patient_id !== 'string') issues.push('patient_id must be a string');
  if (labResult.encounter_id && typeof labResult.encounter_id !== 'string') issues.push('encounter_id must be a string');
  if (labResult.name && typeof labResult.name !== 'string') issues.push('name must be a string');
  if (labResult.value && typeof labResult.value !== 'string' && typeof labResult.value !== 'number') {
    issues.push('value must be a string or number');
  }

  // Valid values for value_type
  const validValueTypes = ['numeric', 'string', 'coded', 'boolean', 'datetime'];
  if (labResult.value_type && !validValueTypes.includes(labResult.value_type)) {
    issues.push(`value_type must be one of: ${validValueTypes.join(', ')}`);
  }

  // DateTime validation
  if (labResult.date_time && !isValidDateTime(labResult.date_time)) {
    issues.push('date_time must be a valid ISO datetime');
  }

  if (issues.length > 0) {
    errorTracker.addError('VALIDATION', labResult.patient_id, labResult.encounter_id, 
      `Lab result validation failed at index ${index}`, { issues, labResult });
    return false;
  }

  return true;
}

// Helper functions
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

function isValidDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return date instanceof Date && !isNaN(date);
}

// Import functions
async function importEncounterUpdates(record, errorTracker) {
  const { patient_supabase_id, encounter_supabase_id, generated_encounter_updates } = record;

  if (!generated_encounter_updates) return true;

  try {
    // Prepare update data
    const updateData = {
      reason_code: generated_encounter_updates.reason_code,
      reason_display_text: generated_encounter_updates.reason_display_text,
      transcript: generated_encounter_updates.transcript,
      soap_note: generated_encounter_updates.soap_note,
      observations: generated_encounter_updates.observations ? 
        // Convert text observations to array format (split by sentences)
        generated_encounter_updates.observations
          .split(/\.\s+/)
          .filter(obs => obs.trim().length > 0)
          .map(obs => obs.trim() + (obs.endsWith('.') ? '' : '.'))
        : null,
      treatments: typeof generated_encounter_updates.treatments === 'string' 
        ? JSON.parse(generated_encounter_updates.treatments) 
        : generated_encounter_updates.treatments,
      updated_at: new Date().toISOString()
    };

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('encounters')
        .update(updateData)
        .eq('id', encounter_supabase_id);

      if (error) {
        errorTracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 
          'Failed to update encounter', { error: error.message });
        errorTracker.summary.failedUpdates++;
        return false;
      }
    }

    console.log(`✅ Updated encounter ${encounter_supabase_id}`);
    errorTracker.summary.successfulUpdates++;
    return true;
  } catch (error) {
    errorTracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 
      'Exception during encounter update', { error: error.message });
    errorTracker.summary.failedUpdates++;
    return false;
  }
}

async function importConditions(record, errorTracker) {
  const { patient_supabase_id, encounter_supabase_id, generated_conditions } = record;

  if (!generated_conditions || generated_conditions.length === 0) return true;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < generated_conditions.length; i++) {
    const condition = generated_conditions[i];
    
    // Clean up the condition data (remove any accidentally added id fields)
    const cleanCondition = {
      patient_id: condition.patient_id,
      encounter_id: condition.encounter_id,
      code: condition.code,
      description: condition.description,
      category: condition.category,
      clinical_status: condition.clinical_status || 'active',
      verification_status: condition.verification_status || 'confirmed',
      onset_date: condition.onset_date,
      note: condition.note,
      created_at: new Date().toISOString()
    };

    if (!validateConditionData(cleanCondition, errorTracker, i)) {
      failCount++;
      continue;
    }

    try {
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('conditions')
          .insert(cleanCondition);

        if (error) {
          errorTracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 
            `Failed to insert condition at index ${i}`, { error: error.message, condition: cleanCondition });
          failCount++;
          continue;
        }
      }

      successCount++;
    } catch (error) {
      errorTracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 
        `Exception during condition insert at index ${i}`, { error: error.message });
      failCount++;
    }
  }

  console.log(`✅ Imported ${successCount}/${generated_conditions.length} conditions for encounter ${encounter_supabase_id}`);
  errorTracker.summary.successfulConditions += successCount;
  errorTracker.summary.failedConditions += failCount;

  return failCount === 0;
}

async function importLabResults(record, errorTracker) {
  const { patient_supabase_id, encounter_supabase_id, generated_lab_results } = record;

  if (!generated_lab_results || generated_lab_results.length === 0) return true;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < generated_lab_results.length; i++) {
    const labResult = generated_lab_results[i];
    
    // Convert value to string for storage
    const cleanLabResult = {
      patient_id: labResult.patient_id,
      encounter_id: labResult.encounter_id,
      name: labResult.name,
      value: String(labResult.value),
      value_type: labResult.value_type || 'string',
      units: labResult.units,
      date_time: labResult.date_time,
      reference_range: labResult.reference_range,
      flag: labResult.flag,
      interpretation: labResult.interpretation,
      created_at: new Date().toISOString()
    };

    if (!validateLabResultData(cleanLabResult, errorTracker, i)) {
      failCount++;
      continue;
    }

    try {
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('lab_results')
          .insert(cleanLabResult);

        if (error) {
          errorTracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 
            `Failed to insert lab result at index ${i}`, { error: error.message, labResult: cleanLabResult });
          failCount++;
          continue;
        }
      }

      successCount++;
    } catch (error) {
      errorTracker.addError('IMPORT', patient_supabase_id, encounter_supabase_id, 
        `Exception during lab result insert at index ${i}`, { error: error.message });
      failCount++;
    }
  }

  console.log(`✅ Imported ${successCount}/${generated_lab_results.length} lab results for encounter ${encounter_supabase_id}`);
  errorTracker.summary.successfulLabResults += successCount;
  errorTracker.summary.failedLabResults += failCount;

  return failCount === 0;
}

// Main import function
async function importSyntheticData(inputPath) {
  const dataPath = inputPath || DEFAULT_SYNTHETIC_DATA_PATH;
  const errorTracker = new ErrorTracker();
  console.log('\n=== Synthetic Data Import  ===');
  if (DRY_RUN) {
    console.log('\n*** Running in DRY-RUN mode. No actual data will be written. ***\n');
  }

  console.log(`Reading synthetic data file from: ${dataPath}...`);
  let syntheticData;
  try {
    syntheticData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read or parse synthetic data file: ${dataPath}`, error);
    errorTracker.addError('FILE_READ', null, null, `Failed to read/parse ${dataPath}`, { error: error.message });
    errorTracker.generateReport();
    process.exit(1);
  }

  if (!syntheticData.synthetic_data || !Array.isArray(syntheticData.synthetic_data)) {
    errorTracker.addError('PARSE', null, null, 'Invalid synthetic data structure', {});
    errorTracker.generateReport();
    return;
  }

  const records = syntheticData.synthetic_data;
  errorTracker.summary.totalRecords = records.length;

  console.log(`Found ${records.length} records to process\n`);

  // Process records in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, Math.min(i + BATCH_SIZE, records.length));
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (records ${i + 1}-${Math.min(i + BATCH_SIZE, records.length)})...`);

    for (const record of batch) {
      errorTracker.summary.processedRecords++;
      
      const { patient_supabase_id, encounter_supabase_id } = record;
      
      console.log(`\nProcessing record for patient ${patient_supabase_id}, encounter ${encounter_supabase_id}`);

      // Validate UUIDs
      const isValid = await validateUUIDs(patient_supabase_id, encounter_supabase_id, errorTracker);
      if (!isValid) continue;

      // Validate encounter update data
      if (record.generated_encounter_updates && 
          !validateEncounterData(record.generated_encounter_updates, errorTracker, patient_supabase_id, encounter_supabase_id)) {
        continue;
      }

      // Import encounter updates
      if (record.generated_encounter_updates) {
        await importEncounterUpdates(record, errorTracker);
      }

      // Import conditions
      if (record.generated_conditions) {
        await importConditions(record, errorTracker);
      }

      // Import lab results
      if (record.generated_lab_results) {
        await importLabResults(record, errorTracker);
      }
    }
  }

  // Generate final report
  errorTracker.generateReport();
}

// Run the import
if (require.main === module) {
  const inputFile = process.argv.find(arg => arg.endsWith('.json'));
  if (!inputFile && !process.argv.includes('--dry-run') && process.argv.length > 2) {
    // Check if an argument was provided that doesn't end in .json, and it's not just a dry run flag
    console.log("Usage: node import_synthetic_data.js [path/to/your-data-file.json] [--dry-run]");
    console.log("If providing a file, it must be a .json file.");
    console.log("Using default data path as fallback.");
    importSyntheticData(DEFAULT_SYNTHETIC_DATA_PATH);
  } else if (inputFile) {
    importSyntheticData(inputFile);
  } else {
    importSyntheticData(DEFAULT_SYNTHETIC_DATA_PATH); // Default behavior if just `node import_synthetic_data.js` or `node import_synthetic_data.js --dry-run`
  }
} else {
  module.exports = importSyntheticData; // Export for potential programmatic use
} 