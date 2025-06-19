-- Stand-alone seed script: insert Dorothy Robinson (safe/idempotent)
-- Usage example (local):
--   supabase db connect < scripts/insert_dorothy_robinson_seed.sql
-- Or via psql: psql $DATABASE_URL -f scripts/insert_dorothy_robinson_seed.sql
--
-- This script does NOT alter existing tables; it only inserts records if they
-- do not already exist. Running it multiple times is harmless.

DO $$
DECLARE
  v_patient_uuid UUID;
  v_encounter_uuid UUID;
BEGIN
  ------------------------------------------------------------------
  -- 1. Patient ------------------------------------------------------
  ------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'
  ) THEN
    INSERT INTO public.patients (
      patient_id, first_name, last_name, gender, birth_date,
      race, ethnicity, marital_status, language,
      poverty_percentage, photo_url, alerts, extra_data
    ) VALUES (
      '0681FA35-A794-4684-97BD-00B88370DB41',
      'Dorothy',
      'Robinson',
      'female',
      '1978-10-02',
      'White',
      'Hispanic or Latino',
      'Unknown',
      'Spanish',
      19.16,
      'https://ui-avatars.com/api/?name=DR&background=D0F0C0&color=ffffff&size=60&rounded=true',
      '[{"id":"0681FA35-A794-4684-97BD-00B88370DB41_malignancy_history","patientId":"0681FA35-A794-4684-97BD-00B88370DB41","msg":"History of acute myelomonocytic leukemia in complete remission; higher risk of secondary malignancies and infection.","type":"oncology","severity":"moderate","triggeringFactors":["Previous AML","Immunocompromised history"],"suggestedActions":["Monitor for infection signs","Regular oncology follow-up"],"createdAt":"2025-01-15T09:00:00Z","confidence":95,"likelihood":4,"conditionType":"Cancer History"}]'::jsonb,
      jsonb_build_object('nextAppointment','2025-07-01T10:00:00Z','reason','Oncology follow-up and general health maintenance')
    );
  END IF;

  SELECT id INTO v_patient_uuid FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';

  ------------------------------------------------------------------
  -- 2. Encounter ----------------------------------------------------
  ------------------------------------------------------------------
  IF v_patient_uuid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.encounters WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003' AND patient_supabase_id = v_patient_uuid
  ) THEN
    INSERT INTO public.encounters (
      encounter_id, patient_supabase_id, encounter_type, status,
      scheduled_start_datetime, scheduled_end_datetime,
      actual_start_datetime, actual_end_datetime,
      reason_code, reason_display_text, transcript, soap_note,
      treatments, diagnosis_rich_content, treatments_rich_content
    ) VALUES (
      'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003',
      v_patient_uuid,
      'ambulatory',
      'finished',
      '2025-05-17T14:11:57.063Z',
      '2025-05-17T14:56:57.063Z',
      '2025-05-17T14:11:57.063Z',
      '2025-05-17T14:56:57.063Z',
      'E11.9',
      'Type 2 diabetes mellitus without complications',
      'Transcript excerpt unavailable',
      'SOAP note excerpt unavailable',
      '[]'::jsonb,
      NULL,
      NULL
    ) RETURNING id INTO v_encounter_uuid;
  END IF;

  ------------------------------------------------------------------
  -- 3. Diagnosis ----------------------------------------------------
  ------------------------------------------------------------------
  IF v_patient_uuid IS NOT NULL AND v_encounter_uuid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conditions WHERE patient_id = v_patient_uuid AND encounter_id = v_encounter_uuid AND code = 'D68.32'
  ) THEN
    INSERT INTO public.conditions (
      patient_id, encounter_id, code, description, category,
      clinical_status, verification_status, onset_date, note
    ) VALUES (
      v_patient_uuid,
      v_encounter_uuid,
      'D68.32',
      'Warfarin-induced hemorrhagic disorder with bleeding tendency requiring immediate anticoagulation reversal and medication adjustment',
      'encounter-diagnosis',
      'active',
      'confirmed',
      '2025-05-17',
      'Seeded from demo script'
    );
  END IF;

  ------------------------------------------------------------------
  -- 4. Alert ---------------------------------------------------------
  ------------------------------------------------------------------
  IF v_patient_uuid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.alerts WHERE patient_id = v_patient_uuid AND title = 'Possible Systemic Lupus Erythematosus'
  ) THEN
    INSERT INTO public.alerts (
      patient_id, encounter_id, alert_type, severity, category,
      title, message, suggestion, confidence_score,
      source_reasoning, processing_model, context_data, status,
      is_post_consultation
    ) VALUES (
      v_patient_uuid,
      NULL,
      'COMPLEX_CONDITION',
      'CRITICAL',
      'complex_case',
      'Possible Systemic Lupus Erythematosus',
      'Patient meets multiple SLE criteria; urgent rheumatology referral recommended.',
      'Order anti-dsDNA, anti-Sm antibodies, urinalysis; monitor renal involvement.',
      0.88,
      'Classic lupus triad + positive labs',
      'clinical-pattern-recognition',
      '{"triggeringFactors":["Photosensitive rash","Polyarthritis","Low complement"]}'::jsonb,
      'active',
      true
    );
  END IF;
END;
$$ LANGUAGE plpgsql; 