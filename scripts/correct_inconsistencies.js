const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key for read-only patient data

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables for URL or Anon Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cache for patient names to avoid repeated DB calls
const patientNameCache = new Map();

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

    if (error) {
      console.warn(`Could not fetch patient name for ID ${patientId}: ${error.message}`);
      patientNameCache.set(patientId, null); // Cache null to avoid refetching on error
      return null;
    }
    if (patient && patient.first_name) {
      patientNameCache.set(patientId, patient.first_name);
      return patient.first_name;
    }
    patientNameCache.set(patientId, null);
    return null;
  } catch (dbError) {
    console.warn(`Database error fetching patient name for ID ${patientId}: ${dbError.message}`);
    patientNameCache.set(patientId, null);
    return null;
  }
}

// Names that the LLM might have used as placeholders for the patient in transcripts
const placeholderPatientNames = ['Kevin', 'Jack', 'Sarah', 'John', 'Jane', 'Patient', 'Mr. Smith', 'Ms. Doe']; // Add more if observed

function correctTranscript(transcript, actualFirstName) {
  if (!transcript || !actualFirstName) {
    return transcript;
  }
  let correctedTranscript = transcript;
  for (const placeholder of placeholderPatientNames) {
    // Regex to match the placeholder name when addressed by clinician, case-insensitive
    // Looks for "Clinician: Placeholder," or "Doctor: Placeholder,"
    const regex = new RegExp(`(Clinician:|Doctor:)(\\s*)${placeholder}([\\s\\S]*?(?:\\n|$))`, 'gi');
    correctedTranscript = correctedTranscript.replace(regex, (match, prefix, spacing, suffix) => {
        // Check if the placeholder is immediately followed by a common punctuation like a comma or question mark, or end of line
        const placeholderPattern = new RegExp(`^${placeholder}([,?.:!]|\\s|$)`, 'i');
        if (placeholderPattern.test(suffix.trimStart().substring(0, placeholder.length + 1))) {
             return `${prefix}${spacing}${actualFirstName}${suffix.substring(placeholder.length)}`;
        }
        return match; // Return original match if the pattern isn't as expected (e.g. placeholder is part of a larger word)
    });

    // Simpler replacement for direct address like "Placeholder, how are you?"
    const directAddressRegex = new RegExp(`\\b${placeholder}([,?.:!])`, 'gi');
    correctedTranscript = correctedTranscript.replace(directAddressRegex, `${actualFirstName}$1`);
  }
  return correctedTranscript;
}

async function correctInconsistencies(inputPath, outputPath) {
  console.log(`Correcting inconsistencies in: ${inputPath}`);
  let jsonData;
  try {
    jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read or parse input file: ${inputPath}`, error);
    process.exit(1);
  }

  if (!jsonData.synthetic_data || !Array.isArray(jsonData.synthetic_data)) {
    console.error('Invalid data structure: synthetic_data array not found.');
    process.exit(1);
  }

  let recordsProcessed = 0;
  let transcriptsCorrected = 0;

  for (const record of jsonData.synthetic_data) {
    if (record.patient_supabase_id && record.generated_encounter_updates && record.generated_encounter_updates.transcript) {
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
    // Add other correction logic here if needed in the future
    recordsProcessed++;
  }

  try {
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    console.log('✅ Inconsistency correction complete!');
    console.log(`Processed ${recordsProcessed} records.`);
    console.log(`Corrected ${transcriptsCorrected} transcripts.`);
    console.log(`Corrected data saved to: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to write corrected data to: ${outputPath}`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile || !outputFile) {
    console.log("Usage: node correct_inconsistencies.js <inputFile.json> <outputFile.json>");
    process.exit(1);
  }
  correctInconsistencies(inputFile, outputFile);
} else {
  module.exports = correctInconsistencies;
} 