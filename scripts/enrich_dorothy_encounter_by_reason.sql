-- Fallback enrichment script: update Dorothy Diabetes encounter by reason text (production safety)
DO $$
DECLARE
  v_patient_uuid UUID;
BEGIN
  SELECT id INTO v_patient_uuid FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';

  UPDATE public.encounters
  SET transcript = 'Dr. Chen: Good afternoon, Ms. Robinson. I''m Dr. Chen. I see you''re here for your diabetes follow-up. How have you been feeling lately? ... (full transcript omitted here for brevity, same as full demo script) ',
      soap_note = 'S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness ... (full SOAP note) ',
      treatments = '[{"drug":"Discontinue warfarin immediately","status":"Discontinued","rationale":"Immediate cessation of warfarin ..."}, {"drug":"Vitamin K (Phytonadione) 5-10 mg IV once","status":"Prescribed","rationale":"Rapidly reverses warfarin effect ..."}, {"drug":"4-factor Prothrombin Complex Concentrates (PCC) 25-50 units/kg IV once","status":"Prescribed","rationale":"Provides rapid replacement of vitamin K-dependent factors ..."}, {"drug":"Fresh Frozen Plasma (FFP) 10-15 mL/kg IV if PCC unavailable","status":"Alternative","rationale":"Alternative coagulation factor replacement ..."}, {"drug":"Hold glyburide immediately","status":"Discontinued","rationale":"Glyburide potentiates bleeding risk ..."}, {"drug":"Supportive care as clinically indicated","status":"Ongoing","rationale":"Maintain hemodynamic stability ..."}]'::jsonb,
      extra_data = jsonb_set(coalesce(extra_data,'{}'::jsonb),'{"PatientID"}','"0681FA35-A794-4684-97BD-00B88370DB41"', true)
  WHERE patient_supabase_id = v_patient_uuid
    AND reason_display_text ILIKE '%diabetes mellitus without complications%';
END;
$$ LANGUAGE plpgsql; 