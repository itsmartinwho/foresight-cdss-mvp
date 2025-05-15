-- Schema for Foresight CDSS MVP - Unbundled Fields

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Internal Supabase ID
  patient_id TEXT UNIQUE NOT NULL, -- Original PatientID from TSV
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  dob DATE, -- Date of Birth
  photo_url TEXT,
  race TEXT,
  marital_status TEXT,
  language TEXT,
  poverty_percentage NUMERIC,
  alerts JSONB, -- Array of alert objects
  primary_diagnosis_description TEXT,
  general_diagnosis_details TEXT, -- General diagnosis notes
  next_appointment_date TIMESTAMPTZ, -- Timestamp with time zone
  patient_level_reason TEXT, -- General patient-level reason for contact
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  extra_data JSONB -- For any other miscellaneous original fields
);

-- Visits/Admissions Table
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Internal Supabase ID
  admission_id TEXT NOT NULL, -- Original AdmissionID from TSV (not globally unique)
  patient_supabase_id UUID REFERENCES public.patients(id) ON DELETE CASCADE, -- FK to patients table internal Supabase UUID
  admission_type TEXT,
  scheduled_start_datetime TIMESTAMPTZ,
  scheduled_end_datetime TIMESTAMPTZ,
  actual_start_datetime TIMESTAMPTZ,
  actual_end_datetime TIMESTAMPTZ,
  reason_for_visit TEXT,
  transcript TEXT,
  soap_note TEXT,
  treatments JSONB, -- Array of treatment objects
  prior_auth_justification TEXT,
  insurance_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  extra_data JSONB -- For any other miscellaneous original fields from admissions TSV
);

-- Transcripts Table (Separate from visits.transcript for more detailed/versioned transcripts if needed later)
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_supabase_id UUID REFERENCES public.visits(id) ON DELETE CASCADE, -- FK to visits table internal Supabase UUID
  -- Alternatively, could link via admission_id if preferred, but internal UUID is safer for DB relations
  -- admission_id TEXT REFERENCES public.visits(admission_id) ON DELETE CASCADE, 
  text TEXT,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
    WHERE tgname = 'set_visits_updated_at' AND tgrelid = 'public.visits'::regclass
  ) THEN
    CREATE TRIGGER set_visits_updated_at
    BEFORE UPDATE ON public.visits
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
    WHERE tgname = 'set_transcripts_updated_at' AND tgrelid = 'public.transcripts'::regclass
  ) THEN
    CREATE TRIGGER set_transcripts_updated_at
    BEFORE UPDATE ON public.transcripts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- Ensure the visits.admission_id is not globally unique but is unique per patient.
DO $$
BEGIN
  -- Drop legacy unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_admission_id_key'
  ) THEN
    ALTER TABLE public.visits DROP CONSTRAINT visits_admission_id_key;
  END IF;
END $$;

-- Create a composite unique constraint on (patient_supabase_id, admission_id)
ALTER TABLE public.visits
  ADD CONSTRAINT visits_patient_admission_unique UNIQUE (patient_supabase_id, admission_id);

-- Optional: Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_admission_id ON public.visits(admission_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_supabase_id ON public.visits(patient_supabase_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_visit_supabase_id ON public.transcripts(visit_supabase_id);

-- Rename patient_id column in visits table to patient_supabase_id to avoid confusion with the original PatientID from TSV
-- This is done last to ensure FK constraints are handled if tables already exist and are being altered.
-- If running on a fresh DB, this ALTER might not be necessary if the CREATE TABLE already has the new name.
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='patient_id') THEN
    ALTER TABLE public.visits RENAME COLUMN patient_id TO patient_supabase_id;
  END IF;
END $$; 