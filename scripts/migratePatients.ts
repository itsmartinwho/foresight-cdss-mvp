import * as dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';
import { getSupabaseClient } from '../src/lib/supabaseClient'; // Adjusted path if necessary

// Load environment variables
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');
dotenv.config({ path: envPath });

const supabase = getSupabaseClient();

const DATA_DIR = path.join(__dirname, '..', 'docs', 'archived-data');

// Helper to parse problematic JSON strings (alertsJSON, treatmentsJSON)
function cleanAndParseJson(jsonString: string | undefined | null, fieldName: string, recordId: string): any[] | undefined {
  if (!jsonString || typeof jsonString !== 'string' || jsonString.trim() === '' || jsonString.trim() === '[]') {
    return fieldName === 'alerts' ? [] : undefined;
  }
  let cleanedString = jsonString;
  try {
    // Handle if it's already a string representation of a JSON string (double-stringified)
    // e.g., "\"[{\\\"id\\\": ...}]\""
    if (cleanedString.startsWith('"') && cleanedString.endsWith('"')) {
      cleanedString = JSON.parse(cleanedString); // First unwrap
    }
    // Now, cleanedString should be like "[{\"id\": ...}]" or "[{id: ...}]" if malformed
    // Replace \"\" with \" for internal quotes if they exist
    cleanedString = cleanedString.replace(/""/g, '"');

    const parsed = JSON.parse(cleanedString);
    return Array.isArray(parsed) ? parsed : (fieldName === 'alerts' ? [] : undefined);
  } catch (e) {
    console.warn(`Migration: Error parsing ${fieldName} for record ${recordId}. Raw: '${jsonString}', Cleaned: '${cleanedString}'. Error: ${e}`);
    return fieldName === 'alerts' ? [] : undefined;
  }
}

function parseTSV(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/); // Handles both LF and CRLF
  if (lines.length === 0) return [];
  const header = lines.shift()!.split('\t').map(h => h.trim().replace(/\uFEFF/g, '')); // Strip BOM
  return lines.map((line) => {
    const values = line.split('\t');
    const rowObject: Record<string, string> = {};
    header.forEach((colName, index) => {
      rowObject[colName] = values[index] !== undefined ? values[index].trim() : '';
    });
    return rowObject;
  });
}

async function migrate() {
  console.log('Starting migration to Supabase with unbundled schema...');

  // 1. Read and Parse TSV Data
  const patientsPath = path.join(DATA_DIR, 'Enriched_Patients.tsv');
  const admissionsPath = path.join(DATA_DIR, 'Enriched_Admissions.tsv');

  const patientsTSV = readFileSync(patientsPath, 'utf-8');
  const admissionsTSV = readFileSync(admissionsPath, 'utf-8');

  const patientRows = parseTSV(patientsTSV);
  const admissionRows = parseTSV(admissionsTSV);
  console.log(`Parsed ${patientRows.length} patient rows, ${admissionRows.length} admission rows.`);

  // 2. Upsert Patients
  const patientSupabaseIdMap: Record<string, string> = {}; // Maps original PatientID to Supabase internal UUID

  for (const p of patientRows) {
    const alertsArray = cleanAndParseJson(p.alertsJSON, 'alerts', p.PatientID) || [];
    const patientDataForSupabase = {
      patient_id: p.PatientID,
      name: p.name,
      first_name: p.firstName,
      last_name: p.lastName,
      gender: p.PatientGender,
      dob: p.PatientDateOfBirth && p.PatientDateOfBirth.trim() !== '' ? new Date(p.PatientDateOfBirth).toISOString().split('T')[0] : null,
      photo_url: p.photo,
      race: p.PatientRace,
      marital_status: p.PatientMaritalStatus,
      language: p.PatientLanguage,
      poverty_percentage: p.PatientPopulationPercentageBelowPoverty ? parseFloat(p.PatientPopulationPercentageBelowPoverty) : null,
      alerts: alertsArray, // Already parsed array
      primary_diagnosis_description: p.PrimaryDiagnosis, // Assuming a column named PrimaryDiagnosis in TSV
      general_diagnosis_details: p.Diagnosis,       // Assuming a column named Diagnosis in TSV
      next_appointment_date: p.NextAppointmentDate && p.NextAppointmentDate.trim() !== '' ? new Date(p.NextAppointmentDate).toISOString() : null,
      patient_level_reason: p.PatientReason,      // Assuming a column named PatientReason in TSV
      extra_data: { ...p } // Store all original fields in extra_data for now, can be pruned later
    };

    const { data: upsertedPatient, error } = await supabase
      .from('patients')
      .upsert(patientDataForSupabase, { onConflict: 'patient_id', ignoreDuplicates: false })
      .select('id, patient_id') // Select Supabase internal ID and original patient_id
      .single();

    if (error) {
      console.error(`Error upserting patient ${p.PatientID}:`, error.message, 'Data:', patientDataForSupabase);
    } else if (upsertedPatient) {
      patientSupabaseIdMap[upsertedPatient.patient_id] = upsertedPatient.id; // Map original ID to Supabase UUID
    }
  }
  console.log(`Upserted ${Object.keys(patientSupabaseIdMap).length} patients and mapped their Supabase IDs.`);

  // 3. Upsert Admissions/Visits
  for (const ad of admissionRows) {
    const patientSupabaseUUID = patientSupabaseIdMap[ad.PatientID];
    if (!patientSupabaseUUID) {
      console.warn(`Skipping admission ${ad.AdmissionID}; Patient ${ad.PatientID} not found in Supabase ID map.`);
      continue;
    }

    const treatmentsArray = cleanAndParseJson(ad.treatmentsJSON, 'treatments', ad.AdmissionID);
    
    const admissionDataForSupabase = {
      admission_id: ad.AdmissionID,
      patient_supabase_id: patientSupabaseUUID,
      admission_type: ad.AdmissionType,
      scheduled_start_datetime: ad.ScheduledStartDateTime && ad.ScheduledStartDateTime.trim() !== '' ? new Date(ad.ScheduledStartDateTime).toISOString() : null,
      scheduled_end_datetime: ad.ScheduledEndDateTime && ad.ScheduledEndDateTime.trim() !== '' ? new Date(ad.ScheduledEndDateTime).toISOString() : null,
      actual_start_datetime: ad.ActualStartDateTime && ad.ActualStartDateTime.trim() !== '' ? new Date(ad.ActualStartDateTime).toISOString() : null,
      actual_end_datetime: ad.ActualEndDateTime && ad.ActualEndDateTime.trim() !== '' ? new Date(ad.ActualEndDateTime).toISOString() : null,
      reason_for_visit: ad.ReasonForVisit || ad.EncounterReason, // Fallback if one is empty
      transcript: ad.transcript, // Assuming transcript is a direct column in TSV
      soap_note: ad.soapNote,   // Assuming soapNote is a direct column in TSV
      treatments: treatmentsArray, // Already parsed array
      prior_auth_justification: ad.priorAuthJustification,
      insurance_status: ad.InsuranceStatus,
      extra_data: { ...ad } // Store all original fields for now
    };

    const { error } = await supabase
      .from('visits')
      .upsert(admissionDataForSupabase, { onConflict: 'patient_supabase_id,admission_id', ignoreDuplicates: false });

    if (error) {
      console.error(`Error upserting admission ${ad.AdmissionID} for patient ${ad.PatientID}:`, error.message, 'Data:', admissionDataForSupabase);
    }
  }
  console.log('Finished upserting admissions.');

  console.log('Migration finished.');
}

migrate().catch((e) => {
  console.error('Migration script failed:', e);
  process.exit(1);
}); 