-- Complete enrichment script for Dorothy Robinson's encounter
-- Updates with full transcript, SOAP note, and treatments from demo service

DO $$
DECLARE
  v_patient_uuid UUID;
  v_full_transcript TEXT;
  v_full_soap_note TEXT;
  v_treatments_json JSONB;
BEGIN
  -- Get Dorothy Robinson's patient UUID
  SELECT id INTO v_patient_uuid FROM public.patients WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41';

  -- Full demo transcript
  v_full_transcript := 'Dr. Chen: Good afternoon, Ms. Robinson. I''m Dr. Chen. I see you''re here for your diabetes follow-up. How have you been feeling lately?

Patient: Not too good, actually. I''ve been having these dizzy spells, especially when I stand up. And I''ve been going to the bathroom a lot more than usual, and I''m always thirsty.

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

Dr. Chen: Of course. The nurse will get your lab work started, and I''ll be back to discuss the results and our plan once we have them.';

  -- Full SOAP note
  v_full_soap_note := 'S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness, increased urination, thirst, and easy bruising. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT. Reports recent nosebleed and multiple bruises. Last INR check 2 months ago, no recent diabetes monitoring labs. Broken glucometer, not checking blood sugars at home.

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
• New glucometer and diabetes education before discharge';

  -- Complete treatments JSON
  v_treatments_json := '[
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
  ]'::jsonb;

  -- Update the encounter with complete demo data
  UPDATE public.encounters
  SET 
    transcript = v_full_transcript,
    soap_note = v_full_soap_note,
    treatments = v_treatments_json,
    extra_data = jsonb_set(coalesce(extra_data,'{}'::jsonb),'{"PatientID"}','"0681FA35-A794-4684-97BD-00B88370DB41"', true)
  WHERE patient_supabase_id = v_patient_uuid
    AND reason_display_text ILIKE '%diabetes mellitus without complications%';

  -- Report success
  RAISE NOTICE 'Successfully updated Dorothy Robinson encounter with complete demo data';
  RAISE NOTICE 'Transcript length: % characters', length(v_full_transcript);
  RAISE NOTICE 'SOAP note length: % characters', length(v_full_soap_note);
  RAISE NOTICE 'Treatments count: % items', jsonb_array_length(v_treatments_json);

END;
$$ LANGUAGE plpgsql; 