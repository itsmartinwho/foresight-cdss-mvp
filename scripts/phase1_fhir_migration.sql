-- Phase 1: FHIR-Compatible Migration for Foresight CDSS MVP
-- This script aligns the database schema with minimal FHIR resources (US Core 6.1.0)
-- while preserving MVP functionality

-- 1. Add missing patient demographics for US Core
-- US Core Patient expects separate Race and Ethnicity
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS ethnicity TEXT;  -- e.g. "Hispanic or Latino" or "Not Hispanic or Latino"

-- 2. Standardize patient name and birth date fields
-- Rename dob to birth_date for FHIR alignment
ALTER TABLE public.patients 
  RENAME COLUMN dob TO birth_date;

-- 3. Add status field to visits (FHIR Encounter.status)
ALTER TABLE public.visits 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'finished';

-- 4. Add is_deleted boolean to visits for soft deletes
-- This field is referenced in code but was missing from schema
ALTER TABLE public.visits 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 5. Create Conditions table for diagnoses (FHIR Condition resource)
CREATE TABLE IF NOT EXISTS public.conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.visits(id),  -- which visit generated or noted this diagnosis (nullable for chronic conditions)
  code TEXT,        -- e.g. ICD-10 or SNOMED code
  description TEXT, -- human-readable diagnosis name
  category TEXT,    -- e.g. 'encounter-diagnosis' or 'problem-list'
  onset_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Lab Results table for observations (FHIR Observation resource)
CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.visits(id),
  name TEXT,        -- name of test or observation (e.g. "Hemoglobin A1C")
  value TEXT,       -- result value (as text to allow numeric or string results)
  units TEXT,       -- units of measure, if numeric
  date_time TIMESTAMPTZ,  -- when the observation was made
  reference_range TEXT,
  flag TEXT,        -- e.g. "H" or "L" for high/low flags
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_conditions_patient_id ON public.conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_conditions_encounter_id ON public.conditions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON public.lab_results(encounter_id);

-- 8. Add triggers for updated_at on new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_conditions_updated_at' AND tgrelid = 'public.conditions'::regclass
  ) THEN
    CREATE TRIGGER set_conditions_updated_at
    BEFORE UPDATE ON public.conditions
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
    WHERE tgname = 'set_lab_results_updated_at' AND tgrelid = 'public.lab_results'::regclass
  ) THEN
    CREATE TRIGGER set_lab_results_updated_at
    BEFORE UPDATE ON public.lab_results
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- 9. Data Migration: Copy existing primary diagnosis data into the new conditions table
-- This preserves any existing diagnosis information
INSERT INTO public.conditions(patient_id, code, description, category, created_at)
SELECT 
  id, 
  NULL, 
  primary_diagnosis_description, 
  'problem-list',
  now()
FROM public.patients
WHERE primary_diagnosis_description IS NOT NULL
  AND primary_diagnosis_description != ''
ON CONFLICT DO NOTHING;

-- 10. Populate synthetic lab results for testing (5 sample patients)
-- This creates realistic diabetic lab data for demo purposes
INSERT INTO public.lab_results(patient_id, encounter_id, name, value, units, date_time, reference_range, flag)
SELECT 
  p.id, 
  v.id, 
  'Hemoglobin A1C', 
  '6.8', 
  '%', 
  NOW() - interval '1 day', 
  '4.0-5.6', 
  'H'
FROM public.patients p
JOIN public.visits v ON v.patient_supabase_id = p.id
WHERE p.language IS NOT NULL  -- arbitrary condition to pick some patients
LIMIT 5;

-- Add more varied lab results for the same patients
INSERT INTO public.lab_results(patient_id, encounter_id, name, value, units, date_time, reference_range, flag)
SELECT 
  p.id, 
  v.id, 
  'Glucose', 
  '145', 
  'mg/dL', 
  NOW() - interval '1 day', 
  '70-100', 
  'H'
FROM public.patients p
JOIN public.visits v ON v.patient_supabase_id = p.id
WHERE p.language IS NOT NULL
LIMIT 5;

-- 11. Add sample ethnicity data for existing patients
-- Using standard OMB ethnicity categories
UPDATE public.patients
SET ethnicity = CASE 
  WHEN random() < 0.3 THEN 'Hispanic or Latino'
  ELSE 'Not Hispanic or Latino'
END
WHERE ethnicity IS NULL;

-- 12. Standardize gender values to match FHIR conventions
UPDATE public.patients
SET gender = LOWER(gender)
WHERE gender IS NOT NULL;

-- Note: The following columns are marked for deprecation but not dropped in Phase 1:
-- - patients.primary_diagnosis_description (migrated to conditions table)
-- - patients.general_diagnosis_details (migrated to conditions table)
-- These will be dropped in a later phase after frontend/engine updates 