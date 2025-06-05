-- We are querying each table separately to avoid complex joins that might duplicate data
-- and to make the output easier to read and consume.

-- Query to retrieve ALL data for patient Dorothy Robinson (0681FA35-A794-4684-97BD-00B88370DB41)
-- Using separate queries to avoid data duplication that occurs with JOINs
-- Each section will return clean, non-duplicated data from each table

-- 1. Patient Details
SELECT 'PATIENT_DETAILS' as data_type, *
FROM public.patients
WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';

-- 2. All Encounters (includes transcripts, SOAP notes, treatments, etc.)
SELECT 'ENCOUNTERS' as data_type, *
FROM public.encounters
WHERE patient_supabase_id = (SELECT id FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41');

-- 3. All Conditions/Diagnoses
SELECT 'CONDITIONS' as data_type, *
FROM public.conditions
WHERE patient_id = (SELECT id FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41');

-- 4. All Lab Results/Observations
SELECT 'LAB_RESULTS' as data_type, *
FROM public.lab_results
WHERE patient_id = (SELECT id FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41');

-- 5. All Differential Diagnoses
SELECT 'DIFFERENTIAL_DIAGNOSES' as data_type, *
FROM public.differential_diagnoses
WHERE patient_id = (SELECT id FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41');

-- This query joins all tables related to a single patient to retrieve all available data.
-- It uses LEFT JOINs to ensure that the patient's information is returned even if there
-- are no corresponding records in the other tables (e.g., no encounters, no conditions).
-- Note: This may result in duplicated data in the patient.* columns if the patient has multiple records in the joined tables.

SELECT
    p.*,
    e.id as encounter_id,
    e.encounter_type,
    e.status as encounter_status,
    e.scheduled_start_datetime,
    e.actual_start_datetime,
    e.reason_display_text,
    e.transcript,
    e.soap_note,
    c.id as condition_id,
    c.code as condition_code,
    c.description as condition_description,
    c.category as condition_category,
    lr.id as lab_result_id,
    lr.name as lab_name,
    lr.value as lab_value,
    lr.units as lab_units,
    dd.id as differential_diagnosis_id,
    dd.diagnosis_name,
    dd.likelihood as differential_diagnosis_likelihood
FROM
    public.patients p
LEFT JOIN
    public.encounters e ON p.id = e.patient_supabase_id
LEFT JOIN
    public.conditions c ON p.id = c.patient_id AND (e.id IS NULL OR e.id = c.encounter_id)
LEFT JOIN
    public.lab_results lr ON p.id = lr.patient_id AND (e.id IS NULL OR e.id = lr.encounter_id)
LEFT JOIN
    public.differential_diagnoses dd ON p.id = dd.patient_id AND (e.id IS NULL OR e.id = dd.encounter_id)
WHERE
    p.patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';

-- Hierarchical JSON export for patient Dorothy Robinson
-- This creates a single JSON structure with:
-- - Patient details at the top level
-- - Array of encounters, each containing its associated data (labs, conditions, etc.)
-- - No data duplication

WITH patient_data AS (
  SELECT 
    p.*,
    json_agg(
      json_build_object(
        'encounter_id', e.id,
        'encounter_business_id', e.encounter_id,
        'encounter_type', e.encounter_type,
        'status', e.status,
        'scheduled_start_datetime', e.scheduled_start_datetime,
        'scheduled_end_datetime', e.scheduled_end_datetime,
        'actual_start_datetime', e.actual_start_datetime,
        'actual_end_datetime', e.actual_end_datetime,
        'reason_code', e.reason_code,
        'reason_display_text', e.reason_display_text,
        'transcript', e.transcript,
        'soap_note', e.soap_note,
        'treatments', e.treatments,
        'observations', e.observations,
        'prior_auth_justification', e.prior_auth_justification,
        'insurance_status', e.insurance_status,
        'conditions', (
          SELECT json_agg(
            json_build_object(
              'condition_id', c.id,
              'code', c.code,
              'description', c.description,
              'category', c.category,
              'clinical_status', c.clinical_status,
                             'verification_status', c.verification_status,
               'onset_date', c.onset_date,
               'note', c.note
            )
          )
          FROM public.conditions c 
          WHERE c.patient_id = p.id AND (c.encounter_id = e.id OR c.encounter_id IS NULL)
        ),
        'lab_results', (
          SELECT json_agg(
            json_build_object(
              'lab_id', lr.id,
              'name', lr.name,
              'value', lr.value,
              'value_type', lr.value_type,
              'units', lr.units,
              'date_time', lr.date_time,
              'reference_range', lr.reference_range,
              'flag', lr.flag,
              'interpretation', lr.interpretation
            )
          )
          FROM public.lab_results lr 
          WHERE lr.patient_id = p.id AND (lr.encounter_id = e.id OR lr.encounter_id IS NULL)
        ),
        'differential_diagnoses', (
          SELECT json_agg(
            json_build_object(
              'diagnosis_id', dd.id,
              'diagnosis_name', dd.diagnosis_name,
              'likelihood', dd.likelihood,
              'key_factors', dd.key_factors,
              'rank_order', dd.rank_order
            )
          )
          FROM public.differential_diagnoses dd 
          WHERE dd.patient_id = p.id AND (dd.encounter_id = e.id OR dd.encounter_id IS NULL)
        ),
        'created_at', e.created_at,
        'updated_at', e.updated_at,
        'extra_data', e.extra_data
      )
    ) FILTER (WHERE e.id IS NOT NULL) AS encounters
  FROM public.patients p
  LEFT JOIN public.encounters e ON p.id = e.patient_supabase_id
  WHERE p.patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'
  GROUP BY p.id, p.patient_id, p.first_name, p.last_name, p.gender, p.birth_date, 
           p.race, p.ethnicity, p.marital_status, p.language, p.poverty_percentage, 
           p.photo_url, p.alerts, p.created_at, p.updated_at, p.extra_data
)
SELECT json_build_object(
  'patient_id', patient_id,
  'first_name', first_name,
  'last_name', last_name,
  'gender', gender,
  'birth_date', birth_date,
  'race', race,
  'ethnicity', ethnicity,
  'marital_status', marital_status,
  'language', language,
  'poverty_percentage', poverty_percentage,
  'photo_url', photo_url,
  'alerts', alerts,
  'encounters', encounters,
  'created_at', created_at,
  'updated_at', updated_at,
  'extra_data', extra_data
) AS patient_complete_data
FROM patient_data; 