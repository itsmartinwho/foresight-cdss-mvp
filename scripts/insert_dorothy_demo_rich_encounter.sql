-- Insert Dorothy Robinson's Demo Encounter with Full Enriched Data
-- This script safely inserts the encounter data using the actual database schema
-- Patient UUID: 525dd1cb-9883-40d4-b94c-744c44b079f3
-- Encounter ID: ENC-0681FA35-A794-4684-97BD-00B88370DB41-003

DO $$
DECLARE
  v_patient_uuid UUID := '525dd1cb-9883-40d4-b94c-744c44b079f3';
  v_encounter_uuid UUID;
  v_treatment_data JSONB;
  v_diagnosis_rich_content JSONB;
  v_treatments_rich_content JSONB;
BEGIN
  -- Check if encounter already exists
  SELECT id INTO v_encounter_uuid 
  FROM encounters 
  WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003'
    AND patient_supabase_id = v_patient_uuid;

  IF v_encounter_uuid IS NULL THEN
    -- Prepare treatment data as JSONB
    v_treatment_data := '[
      {
        "drug": "Discontinue warfarin immediately",
        "status": "Discontinued",
        "rationale": "Immediate cessation of warfarin is essential to stop further anticoagulation contributing to bleeding"
      },
      {
        "drug": "Vitamin K (Phytonadione) 5-10 mg IV once",
        "status": "Prescribed", 
        "rationale": "Rapidly reverses warfarin effect by restoring vitamin K-dependent clotting factors; IV route preferred for serious bleeding due to faster onset"
      },
      {
        "drug": "4-factor Prothrombin Complex Concentrates (PCC) 25-50 units/kg IV once",
        "status": "Prescribed",
        "rationale": "Provides rapid replacement of vitamin K-dependent factors II, VII, IX, and X for prompt reversal of anticoagulation; preferred over FFP due to faster INR correction and lower infusion volume"
      },
      {
        "drug": "Fresh Frozen Plasma (FFP) 10-15 mL/kg IV if PCC unavailable",
        "status": "Alternative",
        "rationale": "Alternative coagulation factor replacement; slower onset and requires large volume infusion; carries risk of volume overload"
      },
      {
        "drug": "Hold glyburide immediately",
        "status": "Discontinued",
        "rationale": "Glyburide potentiates bleeding risk by interaction with warfarin and causes hypoglycemia; hold to prevent further adverse effects"
      },
      {
        "drug": "Supportive care as clinically indicated",
        "status": "Ongoing",
        "rationale": "Maintain hemodynamic stability with fluids and blood transfusions as needed; localized hemostasis if applicable"
      }
    ]'::JSONB;

    -- Prepare rich content for diagnosis
    v_diagnosis_rich_content := '{
      "primaryDiagnosis": {
        "name": "Warfarin-induced hemorrhagic disorder",
        "code": "D68.32",
        "confidence": 95,
        "description": "Warfarin-induced hemorrhagic disorder with bleeding tendency requiring immediate anticoagulation reversal and medication adjustment"
      },
      "clinicalSummary": "46-year-old female with diabetes presents with signs of warfarin-induced bleeding exacerbated by glyburide drug interaction. Critical case requiring immediate anticoagulation reversal.",
      "keyFindings": [
        "Easy bruising and prolonged nosebleeds",
        "Drug interaction: Warfarin + Glyburide",  
        "INR likely elevated (pending lab results)",
        "Dehydration and possible hyperglycemia"
      ]
    }'::JSONB;

    -- Prepare rich content for treatments
    v_treatments_rich_content := '{
      "treatmentPlan": {
        "immediate": [
          "Discontinue warfarin immediately",
          "Administer Vitamin K 5-10mg IV",
          "Consider PCC for rapid INR reversal"
        ],
        "monitoring": [
          "Serial INR checks every 6 hours",
          "CBC monitoring for bleeding",
          "Neurological assessments"
        ],
        "followUp": [
          "Hematology consultation within 24 hours",
          "Coordinate with primary care for long-term anticoagulation plan",
          "Patient education on drug interactions"
        ]
      },
      "clinicalJustification": "Critical bleeding risk from warfarin-glyburide interaction requires immediate reversal and medication adjustment to prevent life-threatening hemorrhage."
    }'::JSONB;

    -- Insert the main encounter record
    INSERT INTO encounters (
      encounter_id,
      patient_supabase_id,
      encounter_type,
      status,
      scheduled_start_datetime,
      scheduled_end_datetime,
      actual_start_datetime,
      actual_end_datetime,
      reason_code,
      reason_display_text,
      transcript,
      soap_note,
      treatments,
      diagnosis_rich_content,
      treatments_rich_content
    ) VALUES (
      'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003',
      v_patient_uuid,
      'ambulatory',
      'finished',
      '2025-05-17T14:11:57.063Z'::timestamptz,
      '2025-05-17T14:56:57.063Z'::timestamptz,
      '2025-05-17T14:11:57.063Z'::timestamptz,
      '2025-05-17T14:56:57.063Z'::timestamptz,
      'E11.9',
      'Type 2 diabetes mellitus without complications',
      'Dr. Chen: Good afternoon, Ms. Robinson. I''m Dr. Chen. I see you''re here for your diabetes follow-up. How have you been feeling lately?

Patient: Hi doctor. I''ve been having some issues. My blood sugars have been all over the place, and I''ve been getting these dizzy spells, especially when I stand up.

Dr. Chen: I see. Tell me about your current medications. What are you taking for your diabetes?

Patient: Well, I''m taking metformin 1000mg twice a day, and my family doctor just started me on glyburide about three weeks ago. Oh, and I''m also taking warfarin because I had that blood clot last year.

Dr. Chen: Warfarin and glyburide together - that''s something we need to be careful about. Have you noticed any unusual bleeding or bruising?

Patient: Actually, yes. I had a nosebleed yesterday that took forever to stop, and I''ve been bruising really easily. Is that related?

Dr. Chen: It could be. When was your last INR check for the warfarin?

Patient: Um, I think it was about two months ago? My primary care doctor said it was fine then.

Dr. Chen: And when was your last hemoglobin A1C and comprehensive metabolic panel?

Patient: I''m not sure what that is. I haven''t had any blood work in probably four months.

Dr. Chen: Okay, we definitely need to get some labs today. With your diabetes and being on warfarin, we need to monitor things more closely. Tell me about your symptoms - the dizziness, when does it happen?

Patient: Mostly when I get up from sitting or lying down. Sometimes I feel like I might faint. And I''ve been really thirsty lately and urinating a lot more than usual.

Dr. Chen: Those symptoms suggest your blood sugar might not be well controlled. Are you checking your blood sugar at home?

Patient: I was, but my meter broke last month and I haven''t gotten a new one yet.

Dr. Chen: Let me check your vital signs. Your blood pressure today is 95/60, which is lower than normal. Heart rate is 88. Let me examine you.

[Physical Examination]
General: Alert but appears mildly dehydrated
HEENT: Dry mucous membranes noted
Cardiovascular: Regular rate and rhythm, no murmurs
Extremities: Multiple small bruises on both arms, no peripheral edema
Neurologic: Positive orthostatic changes - blood pressure drops to 85/55 when standing

Dr. Chen: Ms. Robinson, I''m concerned about several things. First, the combination of glyburide and warfarin can increase your bleeding risk significantly. Second, your symptoms and examination suggest your diabetes may not be well controlled, and you might be dehydrated.

Patient: Oh no, is that dangerous?

Dr. Chen: We can manage this, but we need to make some changes. I''m going to order some urgent lab work - we need to check your blood sugar, kidney function, hemoglobin A1C, and your INR to see how thin your blood is.

Patient: Okay, whatever you think is best.

Dr. Chen: I''m also going to hold your glyburide for now and switch you to a different diabetes medication that''s safer with warfarin. We''ll need to coordinate with your primary care doctor about your warfarin dosing.

Patient: Will I be okay? I''m worried about my cancer history too - I had leukemia a few years ago.

Dr. Chen: Your leukemia history is important to consider, especially with the bleeding issues. We''ll need to be extra careful with your blood counts. I''m going to admit you for observation so we can stabilize your blood sugar, adjust your medications safely, and get your bleeding risk under control.

Patient: I understand. Thank you for taking good care of me.

Dr. Chen: Of course. The nurse will get your lab work started, and I''ll be back to discuss the results and our plan once we have them.',
      'S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness, increased urination, thirst, and easy bruising. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT. Reports recent nosebleed and multiple bruises. Last INR check 2 months ago, no recent diabetes monitoring labs. Broken glucometer, not checking blood sugars at home.

O: Vital signs: BP 95/60 (orthostatic to 85/55), HR 88, Temp 98.6°F, RR 16. General: Alert, mildly dehydrated appearance. HEENT: Dry mucous membranes. CVS: RRR, no murmurs. Extremities: Multiple small bruises on bilateral arms, no edema. Neurologic: Positive orthostatic vital signs.

A:
1. E11.9 Type 2 diabetes mellitus, poorly controlled - based on polyuria, polydipsia, and lack of monitoring
2. Drug interaction risk: Glyburide + Warfarin - increased bleeding risk
3. Z87.891 Personal history of nicotine dependence (leukemia)
4. Orthostatic hypotension, likely multifactorial (dehydration, medications)
5. Supratherapeutic anticoagulation suspected - easy bruising, nosebleed

P:
• STAT labs: BMP, HbA1c, PT/INR, CBC with diff
• Hold glyburide immediately due to drug interaction with warfarin
• Admit for observation and medication adjustment
• IV hydration with NS at 100 mL/hr
• Fingerstick glucose q6h
• Coordinate with primary care for warfarin management
• Endocrine consult for diabetes management
• New glucometer and diabetes education before discharge',
      v_treatment_data,
      v_diagnosis_rich_content,
      v_treatments_rich_content
    ) RETURNING id INTO v_encounter_uuid;

    RAISE NOTICE 'Inserted encounter with UUID: %', v_encounter_uuid;
  ELSE
    RAISE NOTICE 'Encounter already exists with UUID: %', v_encounter_uuid;
  END IF;

  -- Insert differential diagnoses
  INSERT INTO differential_diagnoses (
    patient_id,
    encounter_id,
    diagnosis_name,
    likelihood,
    key_factors,
    rank_order
  )
  SELECT 
    v_patient_uuid,
    v_encounter_uuid,
    dx.name,
    dx.likelihood,
    dx.factors,
    dx.rank
  FROM (
    VALUES
      ('Drug-Drug Interaction: Glyburide + Warfarin', 'High (95%)', 'Recent glyburide initiation with existing warfarin therapy, bleeding symptoms', 1),
      ('Uncontrolled Type 2 Diabetes Mellitus', 'High (90%)', 'Polyuria, polydipsia, no recent monitoring, broken glucometer', 2),
      ('Supratherapeutic Anticoagulation', 'High (85%)', 'Easy bruising, prolonged nosebleed, INR overdue by 2 months', 3),
      ('Diabetic Ketoacidosis (DKA)', 'Moderate (40%)', 'Dehydration, polyuria, polydipsia, but no known ketosis symptoms', 4),
      ('Hyperosmolar Hyperglycemic State (HHS)', 'Moderate (35%)', 'Dehydration, altered mental status, elderly patient with Type 2 DM', 5)
  ) AS dx(name, likelihood, factors, rank)
  WHERE v_encounter_uuid IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Insert primary diagnosis as condition
  INSERT INTO conditions (
    patient_id,
    encounter_id,
    code,
    description,
    category,
    onset_date,
    clinical_status,
    verification_status
  )
  SELECT 
    v_patient_uuid,
    v_encounter_uuid,
    'D68.32',
    'Warfarin-induced hemorrhagic disorder with bleeding tendency requiring immediate anticoagulation reversal and medication adjustment',
    'drug-interaction',
    '2025-05-17'::date,
    'active',
    'confirmed'
  WHERE v_encounter_uuid IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Insert lab results
  INSERT INTO lab_results (
    patient_id,
    encounter_id,
    name,
    value,
    units,
    reference_range,
    flag,
    date_time
  )
  SELECT 
    v_patient_uuid,
    v_encounter_uuid,
    lab.test,
    lab.value,
    lab.unit,
    lab.range,
    lab.status,
    '2025-05-17T15:30:00.000Z'::timestamptz
  FROM (
    VALUES
      ('INR', '4.2', 'ratio', '0.8-1.2', 'abnormal'),
      ('Hemoglobin A1C', '10.2', '%', '4.0-5.6', 'abnormal'),
      ('Random Glucose', '285', 'mg/dL', '70-139', 'abnormal'),
      ('Hemoglobin', '10.8', 'g/dL', '12.0-15.5', 'low'),
      ('Platelet Count', '165', 'K/uL', '150-450', 'normal')
  ) AS lab(test, value, unit, range, status)
  WHERE v_encounter_uuid IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Insert critical alert
  INSERT INTO alerts (
    patient_id,
    encounter_id,
    alert_type,
    severity,
    category,
    title,
    message,
    suggestion,
    confidence_score,
    context_data,
    status
  )
  SELECT 
    v_patient_uuid,
    v_encounter_uuid,
    'DRUG_INTERACTION',
    'CRITICAL',
    'drug-interaction',
    'Critical Drug Interaction: Warfarin + Glyburide with Bleeding',
    'Patient presents with signs of warfarin-induced bleeding (INR 4.2, easy bruising, nosebleeds) exacerbated by glyburide interaction. Immediate anticoagulation reversal required.',
    'Discontinue warfarin immediately, administer Vitamin K 5-10mg IV, consider PCC if severe bleeding, hold glyburide, frequent INR monitoring',
    0.98,
    '{
      "triggeringFactors": ["High INR (4.2)", "Recent glyburide initiation", "Bleeding symptoms", "No recent INR monitoring"],
      "suggestedActions": ["Discontinue warfarin immediately", "Administer Vitamin K 5-10mg IV", "Consider PCC if severe bleeding", "Hold glyburide", "Frequent INR monitoring"],
      "conditionType": "Drug Interaction"
    }'::jsonb,
    'active'
  WHERE v_encounter_uuid IS NOT NULL
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql; 