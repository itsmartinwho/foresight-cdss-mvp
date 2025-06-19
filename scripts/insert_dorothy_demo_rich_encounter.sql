-- Seed script: insert FULL demo encounter for Dorothy Robinson with rich data
-- Run via: psql $DATABASE_URL -f scripts/insert_dorothy_demo_rich_encounter.sql
-- Idempotent: does nothing if the encounter_id already exists.

DO $$
DECLARE
  v_patient_uuid UUID;
  v_new_encounter_uuid UUID;
BEGIN
  -- Locate patient UUID
  SELECT id INTO v_patient_uuid FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';
  IF v_patient_uuid IS NULL THEN
    RAISE NOTICE 'Dorothy Robinson patient row not found – aborting full demo encounter seed.';
    RETURN;
  END IF;

  -- Encounter identifier we will use (005 to avoid collision)
  IF NOT EXISTS (
    SELECT 1 FROM public.encounters 
    WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-005'
      AND patient_supabase_id = v_patient_uuid
  ) THEN

    INSERT INTO public.encounters (
      encounter_id, patient_supabase_id, encounter_type, status,
      scheduled_start_datetime, scheduled_end_datetime,
      actual_start_datetime, actual_end_datetime,
      reason_code, reason_display_text,
      transcript, soap_note, treatments
    ) VALUES (
      'ENC-0681FA35-A794-4684-97BD-00B88370DB41-005',
      v_patient_uuid,
      'ambulatory',
      'finished',
      '2025-05-17T14:11:57.063Z',
      '2025-05-17T14:56:57.063Z',
      '2025-05-17T14:11:57.063Z',
      '2025-05-17T14:56:57.063Z',
      'E11.9',
      'Type 2 diabetes mellitus without complications',
      'Demo transcript excerpt',
      'Demo SOAP note excerpt',
      '[]'::jsonb
    ) RETURNING id INTO v_new_encounter_uuid;
  END IF;

  ------------------------------------------------------------------
  -- Differential Diagnoses -----------------------------------------
  ------------------------------------------------------------------
  IF v_new_encounter_uuid IS NOT NULL THEN
    -- Define helper to insert if missing
    PERFORM 1;
    -- High-level list
    INSERT INTO public.differential_diagnoses (patient_id, encounter_id, diagnosis_name, likelihood, key_factors, rank_order)
    SELECT * FROM (
      VALUES
        (v_patient_uuid, v_new_encounter_uuid, 'Drug-Drug Interaction: Glyburide + Warfarin', 'High (95%)', 'Recent glyburide initiation with warfarin; bleeding symptoms', 1),
        (v_patient_uuid, v_new_encounter_uuid, 'Uncontrolled Type 2 Diabetes Mellitus', 'High (90%)', 'Polyuria, polydipsia, no recent monitoring; broken glucometer', 2),
        (v_patient_uuid, v_new_encounter_uuid, 'Supratherapeutic Anticoagulation', 'High (85%)', 'Easy bruising, prolonged nosebleed, INR overdue', 3),
        (v_patient_uuid, v_new_encounter_uuid, 'Diabetic Ketoacidosis (DKA)', 'Moderate (40%)', 'Dehydration and hyperglycemia; limited ketosis signs', 4),
        (v_patient_uuid, v_new_encounter_uuid, 'Hyperosmolar Hyperglycemic State (HHS)', 'Moderate (35%)', 'Severe dehydration, altered mentation risk', 5)
    ) AS t(p_id, e_id, name, likelihood_txt, factors, rnk)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql; 