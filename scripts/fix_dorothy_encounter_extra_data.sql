-- Ensure Dorothy Robinson encounter has correct extra_data for SupabaseDataService filtering

DO $$
BEGIN
  UPDATE public.encounters
  SET extra_data = jsonb_build_object('PatientID', '0681FA35-A794-4684-97BD-00B88370DB41')
  WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003'
    AND (extra_data IS NULL OR NOT (extra_data ? 'PatientID'));
END;
$$ LANGUAGE plpgsql; 