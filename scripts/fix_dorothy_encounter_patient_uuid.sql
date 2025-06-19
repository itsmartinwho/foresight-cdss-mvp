-- Fix Dorothy Robinson encounter patient_supabase_id to match patient UUID
-- This ensures the encounter can be properly loaded by supabaseDataService

DO $$
DECLARE
  v_patient_uuid UUID;
  v_encounter_uuid UUID;
BEGIN
  -- Get Dorothy Robinson's patient UUID
  SELECT id INTO v_patient_uuid FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';
  
  IF v_patient_uuid IS NULL THEN
    RAISE EXCEPTION 'Dorothy Robinson patient not found with patient_id: 0681FA35-A794-4684-97BD-00B88370DB41';
  END IF;

  -- Get Dorothy's encounter UUID
  SELECT id INTO v_encounter_uuid FROM public.encounters WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003';
  
  IF v_encounter_uuid IS NULL THEN
    RAISE EXCEPTION 'Dorothy Robinson encounter not found with encounter_id: ENC-0681FA35-A794-4684-97BD-00B88370DB41-003';
  END IF;

  -- Update the encounter to have the correct patient_supabase_id
  UPDATE public.encounters 
  SET patient_supabase_id = v_patient_uuid
  WHERE id = v_encounter_uuid;

  -- Verify the fix
  RAISE NOTICE 'Successfully updated encounter patient_supabase_id';
  RAISE NOTICE 'Patient UUID: %', v_patient_uuid;
  RAISE NOTICE 'Encounter UUID: %', v_encounter_uuid;
  
  -- Double-check the relationship
  IF EXISTS (
    SELECT 1 FROM public.encounters e 
    JOIN public.patients p ON e.patient_supabase_id = p.id 
    WHERE e.encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003' 
    AND p.patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'
  ) THEN
    RAISE NOTICE '✅ Verification successful: Patient and encounter are now properly linked';
  ELSE
    RAISE EXCEPTION '❌ Verification failed: Patient and encounter are still not linked';
  END IF;

END;
$$ LANGUAGE plpgsql; 