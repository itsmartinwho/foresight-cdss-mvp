-- Schema for Foresight CDSS MVP - FHIR-Aligned

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Internal Supabase ID
  patient_id TEXT UNIQUE NOT NULL, -- Original PatientID from TSV (globally unique business ID)
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  birth_date DATE, -- Changed from dob
  race TEXT,
  ethnicity TEXT, -- Added field
  marital_status TEXT,
  language TEXT,
  poverty_percentage NUMERIC,
  photo_url TEXT,
  alerts JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  extra_data JSONB -- For any other miscellaneous fields or less structured FHIR extensions
);

COMMENT ON TABLE public.patients IS 'Stores patient demographic information, aligned with FHIR Patient resource concepts. Contains one record per unique patient.';
COMMENT ON COLUMN public.patients.id IS 'Internal Supabase UUID, primary key.';
COMMENT ON COLUMN public.patients.patient_id IS 'Business identifier for the patient (e.g., MRN from source system). Must be unique.';
COMMENT ON COLUMN public.patients.birth_date IS 'Patient''s date of birth.';
COMMENT ON COLUMN public.patients.extra_data IS 'JSONB field for storing additional, non-standardized patient information or extensions.';

-- Encounters Table
CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Internal Supabase ID
  encounter_id TEXT NOT NULL, -- Original AdmissionID/EncounterID from source (unique per patient)
  patient_supabase_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE, -- FK to patients table internal Supabase UUID
  encounter_type TEXT, -- FHIR-aligned: e.g., 'ambulatory', 'inpatient', 'emergency'
  status TEXT DEFAULT 'finished', -- FHIR-aligned: e.g., 'planned', 'in-progress', 'finished', 'cancelled'
  scheduled_start_datetime TIMESTAMPTZ,
  scheduled_end_datetime TIMESTAMPTZ,
  actual_start_datetime TIMESTAMPTZ,
  actual_end_datetime TIMESTAMPTZ,
  reason_code TEXT, -- Coded reason for encounter (e.g., SNOMED CT code)
  reason_display_text TEXT, -- Human-readable reason for encounter
  transcript TEXT,
  soap_note TEXT, -- Or consider a separate 'clinical_notes' table linked to encounters
  treatments JSONB, -- Array of treatment objects or references
  observations TEXT, -- Clinical observations made during the encounter
  prior_auth_justification TEXT,
  insurance_status TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  extra_data JSONB -- For any other miscellaneous original fields or FHIR extensions
);

COMMENT ON TABLE public.encounters IS 'Stores information about patient encounters (visits, consultations), aligned with FHIR Encounter resource concepts.';
COMMENT ON COLUMN public.encounters.id IS 'Internal Supabase UUID, primary key.';
COMMENT ON COLUMN public.encounters.encounter_id IS 'Business identifier for the encounter (e.g., Visit ID from source system). Unique within a patient context.';
COMMENT ON COLUMN public.encounters.patient_supabase_id IS 'Foreign key referencing the patient associated with this encounter.';
COMMENT ON COLUMN public.encounters.encounter_type IS 'Category of the encounter (e.g., outpatient, inpatient).';
COMMENT ON COLUMN public.encounters.status IS 'The status of the encounter (e.g., planned, finished).';
COMMENT ON COLUMN public.encounters.reason_code IS 'Coded reason for the encounter (e.g., SNOMED CT).';
COMMENT ON COLUMN public.encounters.reason_display_text IS 'Human-readable description of the reason for the encounter.';
COMMENT ON COLUMN public.encounters.is_deleted IS 'Flag for soft-deleting encounters.';
COMMENT ON COLUMN public.encounters.extra_data IS 'JSONB field for storing additional, non-standardized encounter information.';

-- Conditions Table (Diagnoses and Problems)
CREATE TABLE IF NOT EXISTS public.conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL, -- Encounter where condition was recorded
    code TEXT NOT NULL, -- ICD-10, SNOMED CT code
    description TEXT, -- Human-readable description of the condition
    category TEXT NOT NULL, -- 'problem-list-item' or 'encounter-diagnosis'
    clinical_status TEXT DEFAULT 'active', -- FHIR Condition.clinicalStatus (active, recurrence, relapse, inactive, remission, resolved)
    verification_status TEXT DEFAULT 'confirmed', -- FHIR Condition.verificationStatus (unconfirmed, provisional, differential, confirmed, refuted, entered-in-error)
    onset_date DATE,
    recorded_date DATE DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    extra_data JSONB
);

COMMENT ON TABLE public.conditions IS 'Stores patient conditions (diagnoses, problems), aligned with FHIR Condition resource concepts.';
COMMENT ON COLUMN public.conditions.category IS 'Distinguishes between a problem list item and an encounter diagnosis.';
COMMENT ON COLUMN public.conditions.clinical_status IS 'The clinical status of the condition.';
COMMENT ON COLUMN public.conditions.verification_status IS 'The verification status of the condition.';

-- Lab Results (Observations)
CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL, -- Encounter where observation was made
    name TEXT NOT NULL, -- LOINC code or textual name of the lab/observation
    value TEXT, -- Value of the observation (can be numeric, string, coded)
    value_type TEXT DEFAULT 'string', -- Helps interpret value: 'numeric', 'string', 'coded', 'boolean', 'datetime'
    units TEXT,
    date_time TIMESTAMPTZ, -- When the observation was made or result recorded
    reference_range TEXT, -- e.g., "70-100"
    flag TEXT, -- e.g., 'H', 'L', 'A' (abnormal)
    interpretation TEXT, -- Interpretation of the result
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    extra_data JSONB
);

COMMENT ON TABLE public.lab_results IS 'Stores laboratory results and other observations, aligned with FHIR Observation resource concepts.';
COMMENT ON COLUMN public.lab_results.name IS 'Name or code for the observation (e.g., LOINC).';
COMMENT ON COLUMN public.lab_results.value_type IS 'Indicates the data type of the observation value.';

-- Differential Diagnoses Table
CREATE TABLE IF NOT EXISTS public.differential_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    diagnosis_name TEXT NOT NULL,
    likelihood TEXT, -- e.g., 'High', 'Medium', 'Low', or a numeric score
    key_factors TEXT,
    rank_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    extra_data JSONB
);

COMMENT ON TABLE public.differential_diagnoses IS 'Stores differential diagnoses generated by the clinical engine for a given encounter.';

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at on table modifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_patients_updated_at' AND tgrelid = 'public.patients'::regclass
  ) THEN
    CREATE TRIGGER set_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_encounters_updated_at' AND tgrelid = 'public.encounters'::regclass  -- Changed from visits
  ) THEN
    CREATE TRIGGER set_encounters_updated_at -- Changed from set_visits_updated_at
    BEFORE UPDATE ON public.encounters -- Changed from visits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- Add triggers for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_conditions_updated_at' AND tgrelid = 'public.conditions'::regclass
  ) THEN
    CREATE TRIGGER set_conditions_updated_at
    BEFORE UPDATE ON public.conditions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_lab_results_updated_at' AND tgrelid = 'public.lab_results'::regclass
  ) THEN
    CREATE TRIGGER set_lab_results_updated_at
    BEFORE UPDATE ON public.lab_results
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_differential_diagnoses_updated_at' AND tgrelid = 'public.differential_diagnoses'::regclass
  ) THEN
    CREATE TRIGGER set_differential_diagnoses_updated_at
    BEFORE UPDATE ON public.differential_diagnoses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

-- Create a composite unique constraint on (patient_id, encounter_id) for the encounters table
-- Ensure this is added only if it doesn't exist to prevent errors on re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.encounters'::regclass 
    AND conname = 'encounters_patient_encounter_unique'
  ) THEN
    ALTER TABLE public.encounters
      ADD CONSTRAINT encounters_patient_encounter_unique UNIQUE (patient_supabase_id, encounter_id);
  END IF;
END $$;

-- Optional: Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_encounter_id ON public.encounters(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_supabase_id ON public.encounters(patient_supabase_id);
-- CREATE INDEX IF NOT EXISTS idx_transcripts_visit_supabase_id ON public.transcripts(visit_supabase_id); -- Removed as transcripts table is not in the core schema

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_conditions_patient_id ON public.conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_conditions_encounter_id ON public.conditions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_conditions_code ON public.conditions(code);
CREATE INDEX IF NOT EXISTS idx_conditions_category ON public.conditions(category);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON public.lab_results(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_name ON public.lab_results(name);
CREATE INDEX IF NOT EXISTS idx_lab_results_date_time ON public.lab_results(date_time);

CREATE INDEX IF NOT EXISTS idx_differential_diagnoses_patient_id ON public.differential_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_differential_diagnoses_encounter_id ON public.differential_diagnoses(encounter_id);

-- Removed: Old RENAME COLUMN logic for patient_id to patient_supabase_id as table 'visits' is replaced by 'encounters'
-- and 'patient_id' is used directly as FK.
/*
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='patient_id') THEN
    ALTER TABLE public.visits RENAME COLUMN patient_id TO patient_supabase_id;
  END IF;
END $$; 
*/ 