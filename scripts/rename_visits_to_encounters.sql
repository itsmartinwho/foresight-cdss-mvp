-- TODO: drop VIEW admissions once all code paths read from encounters
-- Migration Script: Rename "visits/admissions" to "encounters" throughout the database
-- This script updates table names, column names, and all references to use FHIR-compliant terminology
-- Run this script in your Supabase SQL editor

-- 1A. Rename the table
ALTER TABLE public.admissions RENAME TO encounters;

-- 1B. Rename columns to FHIR-compliant names
ALTER TABLE public.encounters
  RENAME COLUMN reason_for_admission TO reason_code;  -- maps to Encounter.reasonCode.text

-- Note: admission_type is kept but should be understood as encounter_type or encounter_class

-- 1C. Re-point foreign keys
ALTER TABLE public.conditions
  DROP CONSTRAINT IF EXISTS conditions_encounter_id_fkey,
  ADD CONSTRAINT conditions_encounter_id_fkey
    FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;

ALTER TABLE public.lab_results
  DROP CONSTRAINT IF EXISTS lab_results_encounter_id_fkey,
  ADD CONSTRAINT lab_results_encounter_id_fkey
    FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;

-- 1D. Create temporary backward-compatibility view
-- TODO: drop VIEW admissions after all code migrated (target: 2 sprints)
CREATE OR REPLACE VIEW public.admissions AS SELECT * FROM public.encounters;

-- 5. Update any other views or functions that reference the old table names
-- (Add any custom views or functions here if they exist)

-- 6. Verify the changes
SELECT 
  'Table renamed successfully' as status,
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'encounters';

-- Check column rename
SELECT 
  'Column renamed successfully' as status,
  column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'encounters' 
  AND column_name = 'reason_code';

-- List all foreign keys referencing the encounters table
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'encounters'; 