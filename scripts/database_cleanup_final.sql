-- Final Database Cleanup Script
-- This script removes legacy views and ensures the database is properly aligned with FHIR standards

-- 1. Drop problematic views that should not exist
DROP VIEW IF EXISTS public.admissions;
DROP VIEW IF EXISTS public.test_data_summary;

-- 2. Ensure all deprecated columns are removed from patients table
ALTER TABLE public.patients 
  DROP COLUMN IF EXISTS primary_diagnosis_description,
  DROP COLUMN IF EXISTS general_diagnosis_details;

-- 3. Ensure encounters table has proper FHIR-aligned column names
DO $$
BEGIN
  -- Rename admission_type to encounter_type if it exists
  IF EXISTS(SELECT 1 FROM information_schema.columns 
            WHERE table_schema='public' AND table_name='encounters' AND column_name='admission_type') THEN
    ALTER TABLE public.encounters RENAME COLUMN admission_type TO encounter_type;
    RAISE NOTICE 'Column encounters.admission_type renamed to encounter_type';
  END IF;
  
  -- Rename reason_for_visit to reason_display_text if it exists
  IF EXISTS(SELECT 1 FROM information_schema.columns 
            WHERE table_schema='public' AND table_name='encounters' AND column_name='reason_for_visit') THEN
    ALTER TABLE public.encounters RENAME COLUMN reason_for_visit TO reason_display_text;
    RAISE NOTICE 'Column encounters.reason_for_visit renamed to reason_display_text';
  END IF;
END $$;

-- 4. Add a table to store differential diagnoses if it doesn't exist
CREATE TABLE IF NOT EXISTS public.differential_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
  diagnosis_name TEXT NOT NULL,
  likelihood TEXT NOT NULL, -- 'High', 'Medium', 'Low', 'Very Low'
  key_factors TEXT,
  rank_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add trigger for differential_diagnoses updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_differential_diagnoses_updated_at' AND tgrelid = 'public.differential_diagnoses'::regclass
  ) THEN
    CREATE TRIGGER set_differential_diagnoses_updated_at
    BEFORE UPDATE ON public.differential_diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_differential_diagnoses_patient_id ON public.differential_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_differential_diagnoses_encounter_id ON public.differential_diagnoses(encounter_id);

-- 6. Add comments to document the schema
COMMENT ON TABLE public.patients IS 'FHIR-aligned patient demographics (US Core Patient)';
COMMENT ON TABLE public.encounters IS 'FHIR-aligned clinical encounters (US Core Encounter)';
COMMENT ON TABLE public.conditions IS 'FHIR-aligned diagnoses and problems (US Core Condition)';
COMMENT ON TABLE public.lab_results IS 'FHIR-aligned lab observations (US Core Observation)';
COMMENT ON TABLE public.differential_diagnoses IS 'Differential diagnoses considered during clinical encounters';

-- 7. Verify the cleanup
DO $$
DECLARE
  view_count INTEGER;
  deprecated_columns INTEGER;
BEGIN
  -- Check for problematic views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views 
  WHERE table_schema = 'public' 
    AND table_name IN ('admissions', 'test_data_summary');
  
  IF view_count > 0 THEN
    RAISE WARNING 'Found % problematic views still present', view_count;
  ELSE
    RAISE NOTICE 'All problematic views have been removed';
  END IF;
  
  -- Check for deprecated columns
  SELECT COUNT(*) INTO deprecated_columns
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name IN ('primary_diagnosis_description', 'general_diagnosis_details');
  
  IF deprecated_columns > 0 THEN
    RAISE WARNING 'Found % deprecated columns still present', deprecated_columns;
  ELSE
    RAISE NOTICE 'All deprecated columns have been removed';
  END IF;
END $$;

-- 8. Display final schema summary
SELECT 
  'Schema cleanup complete' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as view_count; 