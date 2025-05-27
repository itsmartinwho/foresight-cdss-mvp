-- SQL Query to export patient and encounter data for synthetic data generation
-- This query joins patients with their encounters based on the actual Supabase schema

SELECT
    -- Patient fields
    p.id AS patient_supabase_id,
    p.patient_id AS original_patient_id,
    p.first_name,
    p.last_name,
    p.gender,
    p.birth_date,
    p.race,
    p.ethnicity,
    p.marital_status,
    p.language,
    p.poverty_percentage,
    p.extra_data AS patient_extra_data,
    
    -- Encounter fields
    e.id AS encounter_supabase_id,
    e.encounter_id AS original_encounter_id,
    e.encounter_type,
    e.status AS encounter_status,
    e.scheduled_start_datetime,
    e.scheduled_end_datetime,
    e.actual_start_datetime,
    e.actual_end_datetime,
    e.reason_code,
    e.reason_display_text,
    e.transcript,
    e.soap_note,
    e.treatments,
    e.observations,  -- Note: This exists in actual DB but not in schema.sql
    e.prior_auth_justification,
    e.insurance_status,
    e.extra_data AS encounter_extra_data
FROM
    public.patients p
JOIN
    public.encounters e ON p.id = e.patient_supabase_id  -- Correct column name!
WHERE
    e.is_deleted = FALSE  -- Exclude soft-deleted encounters
ORDER BY
    p.patient_id, e.encounter_id; 