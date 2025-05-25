-- Phase 4: Final Cleanup and Transition
-- This script removes deprecated fields and prepares the system for production use

-- 1. Drop deprecated diagnosis fields from patients table
-- These have been migrated to the conditions table in Phase 1
ALTER TABLE public.patients 
  DROP COLUMN IF EXISTS primary_diagnosis_description,
  DROP COLUMN IF EXISTS general_diagnosis_details;

-- 2. Ensure encounter_id is properly unique per patient
-- The field is already unique, but let's add a comment for clarity
COMMENT ON COLUMN public.encounters.encounter_id IS 'Human-readable unique identifier per patient (e.g., P001-V1)';

-- 3. Add comprehensive test data for end-to-end testing
-- Clear existing test data first (only test patients starting with TEST_)
DELETE FROM public.patients WHERE patient_id LIKE 'TEST_%';

-- 3a. Healthy adult with no chronic conditions
INSERT INTO public.patients (
  patient_id, first_name, last_name, name, gender, birth_date, 
  race, ethnicity, language
) VALUES (
  'TEST_HEALTHY_001', 'Alice', 'Smith', 'Alice Smith', 'female', '1990-01-01',
  'Asian', 'Not Hispanic or Latino', 'en'
);

-- Add an encounter for the healthy patient
INSERT INTO public.encounters (
  encounter_id, patient_supabase_id, admission_type,
  reason_code, reason_display_text, status, scheduled_start_datetime
) VALUES (
  'TEST_HEALTHY_001-V1',
  (SELECT id FROM public.patients WHERE patient_id = 'TEST_HEALTHY_001'),
  'consultation', 'R05', 'Cough - mild upper respiratory symptoms',
  'finished', NOW() - INTERVAL '2 days'
);

-- 3b. Patient with multiple chronic conditions
INSERT INTO public.patients (
  patient_id, first_name, last_name, name, gender, birth_date,
  race, ethnicity, language
) VALUES (
  'TEST_CHRONIC_001', 'Bob', 'Jones', 'Bob Jones', 'male', '1950-07-07',
  'White', 'Hispanic or Latino', 'en'
);

-- Add multiple chronic conditions for Bob
INSERT INTO public.conditions (patient_id, code, description, category, onset_date) VALUES
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 'E11.9', 'Type 2 diabetes mellitus without complications', 'problem-list', '2010-01-01'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 'I10', 'Essential (primary) hypertension', 'problem-list', '2015-06-15'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 'E78.5', 'Hyperlipidemia, unspecified', 'problem-list', '2012-03-20'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 'M79.3', 'Myalgia', 'problem-list', '2020-11-01');

-- Add an encounter for the chronic patient
INSERT INTO public.encounters (
  encounter_id, patient_supabase_id, admission_type,
  reason_code, reason_display_text, status, scheduled_start_datetime
) VALUES (
  'TEST_CHRONIC_001-V1',
  (SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'),
  'consultation', 'R53.83', 'Fatigue and joint pain',
  'finished', NOW() - INTERVAL '1 day'
);

-- Add lab results for the chronic patient
INSERT INTO public.lab_results (patient_id, encounter_id, name, value, units, date_time, reference_range, flag) VALUES
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_CHRONIC_001-V1'),
   'Hemoglobin A1C', '8.2', '%', NOW() - INTERVAL '1 week', '4.0-5.6', 'H'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_CHRONIC_001-V1'),
   'Glucose', '185', 'mg/dL', NOW() - INTERVAL '1 week', '70-100', 'H'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_CHRONIC_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_CHRONIC_001-V1'),
   'LDL Cholesterol', '145', 'mg/dL', NOW() - INTERVAL '1 week', '<100', 'H');

-- 3c. Edge case: Patient with missing data
INSERT INTO public.patients (
  patient_id, first_name, last_name, gender, birth_date,
  language -- Minimal data, no race/ethnicity
) VALUES (
  'TEST_MINIMAL_001', 'Charlie', 'Brown', 'male', '1985-05-15', 'en'
);

-- Add encounter with no lab results
INSERT INTO public.encounters (
  encounter_id, patient_supabase_id, admission_type,
  reason_code, reason_display_text, status, scheduled_start_datetime
) VALUES (
  'TEST_MINIMAL_001-V1',
  (SELECT id FROM public.patients WHERE patient_id = 'TEST_MINIMAL_001'),
  'consultation', 'R51', 'Headache',
  'finished', NOW() - INTERVAL '3 days'
);

-- 3d. Pediatric patient
INSERT INTO public.patients (
  patient_id, first_name, last_name, name, gender, birth_date,
  race, ethnicity, language
) VALUES (
  'TEST_PEDS_001', 'Diana', 'Wilson', 'Diana Wilson', 'female', '2015-03-20',
  'Black or African American', 'Not Hispanic or Latino', 'en'
);

-- Add encounter for pediatric patient
INSERT INTO public.encounters (
  encounter_id, patient_supabase_id, admission_type,
  reason_code, reason_display_text, status, scheduled_start_datetime
) VALUES (
  'TEST_PEDS_001-V1',
  (SELECT id FROM public.patients WHERE patient_id = 'TEST_PEDS_001'),
  'consultation', 'R50.9', 'Fever and ear pain',
  'finished', NOW() - INTERVAL '4 hours'
);

-- Add pediatric-specific lab results
INSERT INTO public.lab_results (patient_id, encounter_id, name, value, units, date_time, reference_range, flag) VALUES
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_PEDS_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_PEDS_001-V1'),
   'Temperature', '101.5', 'F', NOW() - INTERVAL '4 hours', '97.0-99.0', 'H'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_PEDS_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_PEDS_001-V1'),
   'WBC Count', '12.5', 'K/uL', NOW() - INTERVAL '3 hours', '4.5-11.0', 'H');

-- 3e. Elderly patient with polypharmacy
INSERT INTO public.patients (
  patient_id, first_name, last_name, name, gender, birth_date,
  race, ethnicity, language
) VALUES (
  'TEST_ELDERLY_001', 'Eleanor', 'Thompson', 'Eleanor Thompson', 'female', '1940-12-25',
  'White', 'Not Hispanic or Latino', 'en'
);

-- Add multiple conditions for elderly patient
INSERT INTO public.conditions (patient_id, code, description, category, onset_date) VALUES
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'), 'I48.91', 'Unspecified atrial fibrillation', 'problem-list', '2018-01-01'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'), 'N18.3', 'Chronic kidney disease, stage 3', 'problem-list', '2019-06-01'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'), 'F03.90', 'Unspecified dementia without behavioral disturbance', 'problem-list', '2021-01-01');

-- Add encounter for elderly patient
INSERT INTO public.encounters (
  encounter_id, patient_supabase_id, admission_type,
  reason_code, reason_display_text, status, scheduled_start_datetime
) VALUES (
  'TEST_ELDERLY_001-V1',
  (SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'),
  'consultation', 'R26.2', 'Difficulty walking and dizziness',
  'finished', NOW() - INTERVAL '6 hours'
);

-- Add lab results for elderly patient
INSERT INTO public.lab_results (patient_id, encounter_id, name, value, units, date_time, reference_range, flag) VALUES
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_ELDERLY_001-V1'),
   'Creatinine', '1.8', 'mg/dL', NOW() - INTERVAL '1 day', '0.6-1.2', 'H'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_ELDERLY_001-V1'),
   'eGFR', '35', 'mL/min/1.73m2', NOW() - INTERVAL '1 day', '>60', 'L'),
  ((SELECT id FROM public.patients WHERE patient_id = 'TEST_ELDERLY_001'), 
   (SELECT id FROM public.encounters WHERE encounter_id = 'TEST_ELDERLY_001-V1'),
   'INR', '2.5', '', NOW() - INTERVAL '1 day', '2.0-3.0', '');

-- 4. Create a summary view of the test data
CREATE OR REPLACE VIEW test_data_summary AS
SELECT 
  p.patient_id,
  p.first_name || ' ' || p.last_name as full_name,
  p.gender,
  DATE_PART('year', AGE(p.birth_date)) as age,
  p.race,
  p.ethnicity,
  COUNT(DISTINCT c.id) as chronic_conditions,
  COUNT(DISTINCT e.id) as encounters,
  COUNT(DISTINCT l.id) as lab_results
FROM public.patients p
LEFT JOIN public.conditions c ON c.patient_id = p.id
LEFT JOIN public.encounters e ON e.patient_supabase_id = p.id
LEFT JOIN public.lab_results l ON l.patient_id = p.id
WHERE p.patient_id LIKE 'TEST_%'
GROUP BY p.patient_id, p.first_name, p.last_name, p.gender, p.birth_date, p.race, p.ethnicity;

-- 5. Verify data integrity
DO $$
DECLARE
  orphaned_conditions INTEGER;
  orphaned_labs INTEGER;
  duplicate_encounter_ids INTEGER;
BEGIN
  -- Check for orphaned conditions
  SELECT COUNT(*) INTO orphaned_conditions
  FROM public.conditions c
  WHERE NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id = c.patient_id);
  
  -- Check for orphaned lab results
  SELECT COUNT(*) INTO orphaned_labs
  FROM public.lab_results l
  WHERE NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id = l.patient_id);
  
  -- Check for duplicate encounter_ids per patient
  SELECT COUNT(*) INTO duplicate_encounter_ids
  FROM (
    SELECT patient_supabase_id, encounter_id, COUNT(*) as cnt
    FROM public.encounters
    GROUP BY patient_supabase_id, encounter_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF orphaned_conditions > 0 THEN
    RAISE NOTICE 'Warning: Found % orphaned conditions', orphaned_conditions;
  END IF;
  
  IF orphaned_labs > 0 THEN
    RAISE NOTICE 'Warning: Found % orphaned lab results', orphaned_labs;
  END IF;
  
  IF duplicate_encounter_ids > 0 THEN
    RAISE NOTICE 'Warning: Found % duplicate encounter IDs', duplicate_encounter_ids;
  END IF;
  
  RAISE NOTICE 'Data integrity check complete';
END $$;

-- 6. Final schema documentation
COMMENT ON TABLE public.patients IS 'FHIR-aligned patient demographics (US Core Patient)';
COMMENT ON TABLE public.encounters IS 'FHIR-aligned clinical encounters (US Core Encounter)';
COMMENT ON TABLE public.conditions IS 'FHIR-aligned diagnoses and problems (US Core Condition)';
COMMENT ON TABLE public.lab_results IS 'FHIR-aligned lab observations (US Core Observation)';

-- Display test data summary
SELECT * FROM test_data_summary ORDER BY patient_id; 