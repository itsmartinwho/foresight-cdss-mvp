-- Phase 2: Test Data Generation for Clinical Engine Testing
-- This script creates synthetic patient scenarios to test the diagnostic pipeline

-- Test Patient 1: Diabetes patient with follow-up admission
INSERT INTO public.patients(patient_id, first_name, last_name, gender, birth_date, race, ethnicity, language)
VALUES ('TEST_DM_001', 'John', 'Doe', 'male', '1980-05-01', 'White', 'Not Hispanic or Latino', 'en')
ON CONFLICT (patient_id) DO NOTHING;

-- Get the patient UUID
DO $$
DECLARE
  patient_uuid UUID;
  admission_uuid UUID;
BEGIN
  SELECT id INTO patient_uuid FROM public.patients WHERE patient_id = 'TEST_DM_001';
  
  -- Create an admission for this patient
  INSERT INTO public.admissions(
    id, 
    admission_id, 
    patient_supabase_id, 
    admission_type, 
    reason_for_admission, 
    scheduled_start_datetime,
    actual_start_datetime,
    transcript,
    status,
    extra_data
  )
  VALUES (
    gen_random_uuid(),
    'TEST_DM_001-V1', 
    patient_uuid, 
    'outpatient', 
    'Diabetes follow-up - fatigue and blurred vision',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour',
    'Patient complains of persistent fatigue for the past 3 months. Also reports occasional blurred vision, especially in the mornings. No chest pain or shortness of breath. Appetite normal but feels tired all the time.',
    'finished',
    jsonb_build_object('PatientID', 'TEST_DM_001')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO admission_uuid;
  
  -- Add existing diabetes diagnosis to problem list
  INSERT INTO public.conditions(patient_id, description, code, category, onset_date)
  VALUES (patient_uuid, 'Type 2 diabetes mellitus without complications', 'E11.9', 'problem-list', '2020-01-15')
  ON CONFLICT DO NOTHING;
  
  -- Add recent lab results
  INSERT INTO public.lab_results(patient_id, encounter_id, name, value, units, date_time, reference_range, flag)
  VALUES 
    (patient_uuid, admission_uuid, 'Hemoglobin A1C', '8.2', '%', NOW() - INTERVAL '1 week', '4.0-5.6', 'H'),
    (patient_uuid, admission_uuid, 'Glucose', '185', 'mg/dL', NOW() - INTERVAL '1 week', '70-100', 'H'),
    (patient_uuid, admission_uuid, 'Creatinine', '1.1', 'mg/dL', NOW() - INTERVAL '1 week', '0.7-1.3', NULL)
  ON CONFLICT DO NOTHING;
END $$;

-- Test Patient 2: New patient with joint pain and fatigue (possible RA)
INSERT INTO public.patients(patient_id, first_name, last_name, gender, birth_date, race, ethnicity, language)
VALUES ('TEST_RA_001', 'Jane', 'Smith', 'female', '1975-08-15', 'Black or African American', 'Not Hispanic or Latino', 'en')
ON CONFLICT (patient_id) DO NOTHING;

DO $$
DECLARE
  patient_uuid UUID;
  admission_uuid UUID;
BEGIN
  SELECT id INTO patient_uuid FROM public.patients WHERE patient_id = 'TEST_RA_001';
  
  -- Create an admission for this patient
  INSERT INTO public.admissions(
    id,
    admission_id, 
    patient_supabase_id, 
    admission_type, 
    reason_for_admission,
    scheduled_start_datetime,
    actual_start_datetime,
    transcript,
    status,
    extra_data
  )
  VALUES (
    gen_random_uuid(),
    'TEST_RA_001-V1', 
    patient_uuid, 
    'outpatient', 
    'Joint pain and fatigue',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours',
    'Patient reports bilateral joint pain in hands and wrists for the past 4 months. Morning stiffness lasting about 90 minutes. Significant fatigue throughout the day. No fever or weight loss. Family history of rheumatoid arthritis (mother).',
    'finished',
    jsonb_build_object('PatientID', 'TEST_RA_001')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO admission_uuid;
  
  -- Add lab results suggesting inflammation
  INSERT INTO public.lab_results(patient_id, encounter_id, name, value, units, date_time, reference_range, flag)
  VALUES 
    (patient_uuid, admission_uuid, 'ESR', '45', 'mm/hr', NOW() - INTERVAL '2 days', '0-20', 'H'),
    (patient_uuid, admission_uuid, 'CRP', '3.2', 'mg/dL', NOW() - INTERVAL '2 days', '0-1.0', 'H'),
    (patient_uuid, admission_uuid, 'RF', '82', 'IU/mL', NOW() - INTERVAL '2 days', '0-14', 'H')
  ON CONFLICT DO NOTHING;
END $$;

-- Test Patient 3: Patient with URI symptoms
INSERT INTO public.patients(patient_id, first_name, last_name, gender, birth_date, race, ethnicity, language)
VALUES ('TEST_URI_001', 'Robert', 'Johnson', 'male', '1990-03-20', 'White', 'Hispanic or Latino', 'en')
ON CONFLICT (patient_id) DO NOTHING;

DO $$
DECLARE
  patient_uuid UUID;
  admission_uuid UUID;
BEGIN
  SELECT id INTO patient_uuid FROM public.patients WHERE patient_id = 'TEST_URI_001';
  
  -- Create an admission for this patient
  INSERT INTO public.admissions(
    id,
    admission_id, 
    patient_supabase_id, 
    admission_type, 
    reason_for_admission,
    scheduled_start_datetime,
    actual_start_datetime,
    transcript,
    status,
    extra_data
  )
  VALUES (
    gen_random_uuid(),
    'TEST_URI_001-V1', 
    patient_uuid, 
    'outpatient', 
    'Cough and fever',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes',
    'Patient presents with fever up to 101F for 2 days, productive cough with yellow sputum, and sore throat. No shortness of breath. Mild headache. No known sick contacts.',
    'finished',
    jsonb_build_object('PatientID', 'TEST_URI_001')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO admission_uuid;
  
  -- Add basic lab results
  INSERT INTO public.lab_results(patient_id, encounter_id, name, value, units, date_time, reference_range, flag)
  VALUES 
    (patient_uuid, admission_uuid, 'WBC', '12.5', 'K/uL', NOW() - INTERVAL '1 hour', '4.5-11.0', 'H'),
    (patient_uuid, admission_uuid, 'Temperature', '101.2', 'F', NOW() - INTERVAL '30 minutes', '97.0-99.0', 'H')
  ON CONFLICT DO NOTHING;
END $$;

-- Test Patient 4: Patient with chest pain (cardiac workup)
INSERT INTO public.patients(patient_id, first_name, last_name, gender, birth_date, race, ethnicity, language)
VALUES ('TEST_CP_001', 'Mary', 'Williams', 'female', '1965-11-10', 'Asian', 'Not Hispanic or Latino', 'en')
ON CONFLICT (patient_id) DO NOTHING;

DO $$
DECLARE
  patient_uuid UUID;
  admission_uuid UUID;
BEGIN
  SELECT id INTO patient_uuid FROM public.patients WHERE patient_id = 'TEST_CP_001';
  
  -- Create an admission for this patient
  INSERT INTO public.admissions(
    id,
    admission_id, 
    patient_supabase_id, 
    admission_type, 
    reason_for_admission,
    scheduled_start_datetime,
    actual_start_datetime,
    transcript,
    status,
    extra_data
  )
  VALUES (
    gen_random_uuid(),
    'TEST_CP_001-V1', 
    patient_uuid, 
    'emergency', 
    'Chest pain',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours',
    'Patient reports intermittent chest pain for the past week. Pain is described as pressure-like, substernal, lasting 5-10 minutes. Occurs with exertion and relieved by rest. No radiation. Associated with mild shortness of breath. No nausea or diaphoresis.',
    'finished',
    jsonb_build_object('PatientID', 'TEST_CP_001')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO admission_uuid;
  
  -- Add existing conditions
  INSERT INTO public.conditions(patient_id, description, code, category, onset_date)
  VALUES 
    (patient_uuid, 'Essential hypertension', 'I10', 'problem-list', '2018-06-01'),
    (patient_uuid, 'Hyperlipidemia', 'E78.5', 'problem-list', '2019-03-15')
  ON CONFLICT DO NOTHING;
  
  -- Add cardiac-related lab results
  INSERT INTO public.lab_results(patient_id, encounter_id, name, value, units, date_time, reference_range, flag)
  VALUES 
    (patient_uuid, admission_uuid, 'Troponin I', '0.02', 'ng/mL', NOW() - INTERVAL '2 hours', '0-0.04', NULL),
    (patient_uuid, admission_uuid, 'Total Cholesterol', '245', 'mg/dL', NOW() - INTERVAL '1 month', '0-200', 'H'),
    (patient_uuid, admission_uuid, 'LDL', '165', 'mg/dL', NOW() - INTERVAL '1 month', '0-100', 'H')
  ON CONFLICT DO NOTHING;
END $$;

-- Summary of test patients created:
-- 1. TEST_DM_001: Diabetic patient with poor control, fatigue and blurred vision
-- 2. TEST_RA_001: New patient with joint pain, possible rheumatoid arthritis
-- 3. TEST_URI_001: Patient with upper respiratory infection symptoms
-- 4. TEST_CP_001: Patient with chest pain, cardiac risk factors

-- Verify test data was created
SELECT 
  p.patient_id,
  p.first_name || ' ' || p.last_name as name,
  COUNT(DISTINCT v.id) as admission_count,
  COUNT(DISTINCT c.id) as condition_count,
  COUNT(DISTINCT l.id) as lab_count
FROM public.patients p
LEFT JOIN public.admissions v ON v.patient_supabase_id = p.id
LEFT JOIN public.conditions c ON c.patient_id = p.id
LEFT JOIN public.lab_results l ON l.patient_id = p.id
WHERE p.patient_id LIKE 'TEST_%'
GROUP BY p.patient_id, p.first_name, p.last_name
ORDER BY p.patient_id; 