import * as dotenv from 'dotenv';
import path from 'path';

// Resolve the project root and the .env.local file path
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');

console.log(`Attempting to load .env.local from: ${envPath}`);

const dotenvResult = dotenv.config({ path: envPath, debug: (process.env.DEBUG === 'true') });

if (dotenvResult.error) {
  console.error('Error loading .env.local:', dotenvResult.error);
  console.log('__dirname for migratePatients.ts:', __dirname);
  process.exit(1); // Exit if .env.local couldn't be loaded
}

if (!dotenvResult.parsed || Object.keys(dotenvResult.parsed).length === 0) {
  console.error('.env.local file was found, but it is empty or could not be parsed.');
  console.log('Parsed content (if any):', dotenvResult.parsed);
  process.exit(1);
}

console.log('Dotenv parsed content:', dotenvResult.parsed);
console.log('Script ENV VARS after dotenv.config:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

// Now import supabaseClient AFTER attempting to load .env.local
import { getSupabaseClient } from '../src/lib/supabaseClient';
import { readFileSync } from 'fs';

// Initialize the client *after* env vars are loaded
const supabase = getSupabaseClient();

interface PatientRow {
  PatientID: string;
  PatientGender: string;
  PatientDateOfBirth: string;
  firstName: string;
  lastName: string;
  name: string;
  photo: string;
  [key: string]: any;
}

interface AdmissionRow {
  AdmissionID: string;
  PatientID: string;
  AdmissionType: string;
  AdmissionStart: string;
  AdmissionEnd: string;
  [key: string]: any;
}

const DATA_DIR = path.join(__dirname, '..', 'public', 'data', '100-patients');

function parseTSV(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\n/);
  const header = lines.shift()?.split('\t') || [];
  return lines.map((line) => {
    const cols = line.split('\t');
    return header.reduce<Record<string, string>>((acc, col, idx) => {
      acc[col] = cols[idx] ?? '';
      return acc;
    }, {});
  });
}

async function migrate() {
  console.log('Starting migration to Supabase...');
  const patientsPath = path.join(DATA_DIR, 'Enriched_Patients.tsv');
  const admissionsPath = path.join(DATA_DIR, 'Enriched_Admissions.tsv');

  const patientsTSV = readFileSync(patientsPath, 'utf-8');
  const admissionsTSV = readFileSync(admissionsPath, 'utf-8');

  const patients: PatientRow[] = parseTSV(patientsTSV) as PatientRow[];
  const admissions: AdmissionRow[] = parseTSV(admissionsTSV) as AdmissionRow[];

  console.log(`Parsed ${patients.length} patients, ${admissions.length} admissions`);

  // Insert patients first
  for (const p of patients) {
    // Create a copy of the original row object for extra_data
    const extraData = { ...p };
    // Remove fields that are now top-level columns to avoid redundancy, if desired
    // delete extraData.PatientID;
    // delete extraData.name; 
    // delete extraData.PatientGender;
    // delete extraData.PatientDateOfBirth;
    // delete extraData.photo;

    const { error } = await supabase.from('patients').upsert(
      {
        patient_id: p.PatientID, // Original TSV PatientID
        name: p.name,
        gender: p.PatientGender,
        dob: p.PatientDateOfBirth ? new Date(p.PatientDateOfBirth).toISOString() : null,
        photo_url: p.photo,
        extra_data: extraData, // Store the full original row
      },
      {
        onConflict: 'patient_id', // Conflict on the original PatientID
        ignoreDuplicates: false, // Ensure updates happen
      },
    );

    if (error) {
      console.error('Error inserting patient', p.PatientID, error.message);
    }
  }

  // Map patientID to internal UUID id from DB for FK use
  const patientMap: Record<string, string> = {};
  const { data: dbPatients } = await supabase.from('patients').select('id, patient_id');
  dbPatients?.forEach((row) => {
    patientMap[row.patient_id] = row.id;
  });

  // Insert admissions
  for (const ad of admissions) {
    const patientUuid = patientMap[ad.PatientID];
    if (!patientUuid) {
      console.warn(`Skipping admission ${ad.AdmissionID}; patient ${ad.PatientID} not found in DB map`);
      continue;
    }
    
    // Store all original admission columns in extra_data
    const admissionExtraData = { ...ad }; 

    const { error } = await supabase.from('visits').upsert(
      {
        admission_id: ad.AdmissionID, // Use the original AdmissionID from TSV
        patient_id: patientUuid,      // FK to patients table internal UUID
        admission_type: ad.AdmissionType,
        started_at: ad.AdmissionStart ? new Date(ad.AdmissionStart).toISOString() : null,
        discharge_time: ad.AdmissionEnd ? new Date(ad.AdmissionEnd).toISOString() : null,
        // We don't have a separate transcript column in the TSV, it might be in extra_data 
        // transcript: ad.transcript, // Pull from extra_data if it exists there
        extra_data: admissionExtraData, // Store the full original row
      },
      {
        onConflict: 'admission_id', // Conflict on the original AdmissionID
        ignoreDuplicates: false, // Ensure updates happen
      },
    );

    if (error) {
      console.error('Error inserting admission', ad.AdmissionID, error.message);
    }
  }

  console.log('Migration finished.');
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
}); 