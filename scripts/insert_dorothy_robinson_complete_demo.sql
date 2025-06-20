-- Insert Dorothy Robinson Complete Demo Data
-- This script safely inserts Dorothy Robinson's full demo data only if it doesn't exist

BEGIN;

-- Insert encounter with full transcript and SOAP notes
INSERT INTO encounters (
    id,
    encounter_id,
    patient_supabase_id,
    actual_start_datetime,
    actual_end_datetime,
    reason_code,
    reason_display_text,
    transcript,
    soap_note,
    treatments
)
SELECT 
    'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid,
    'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003',
    '0681FA35-A794-4684-97BD-00B88370DB41'::uuid,
    '2025-05-17T14:11:57.063Z'::timestamptz,
    '2025-05-17T14:56:57.063Z'::timestamptz,
    'E11.9',
    'Type 2 diabetes mellitus without complications',
    'Dr. Chen: Good afternoon, Ms. Robinson. I am Dr. Chen. I see you are here for your diabetes follow-up. How have you been feeling lately?

Patient: Hi doctor. I have been having some issues. My blood sugars have been all over the place, and I have been getting these dizzy spells, especially when I stand up.

Dr. Chen: I see. Tell me about your current medications. What are you taking for your diabetes?

Patient: Well, I am taking metformin 1000mg twice a day, and my family doctor just started me on glyburide about three weeks ago. Oh, and I am also taking warfarin because I had that blood clot last year.

Dr. Chen: Warfarin and glyburide together - that is something we need to be careful about. Have you noticed any unusual bleeding or bruising?

Patient: Actually, yes. I had a nosebleed yesterday that took forever to stop, and I have been bruising really easily. Is that related?

Dr. Chen: It could be. When was your last INR check for the warfarin?

Patient: Um, I think it was about two months ago? My primary care doctor said it was fine then.

Dr. Chen: And when was your last hemoglobin A1C and comprehensive metabolic panel?

Patient: I am not sure what that is. I have not had any blood work in probably four months.

Dr. Chen: Okay, we definitely need to get some labs today. With your diabetes and being on warfarin, we need to monitor things more closely. Tell me about your symptoms - the dizziness, when does it happen?

Patient: Mostly when I get up from sitting or lying down. Sometimes I feel like I might faint. And I have been really thirsty lately and urinating a lot more than usual.

Dr. Chen: Those symptoms suggest your blood sugar might not be well controlled. Are you checking your blood sugar at home?

Patient: I was, but my meter broke last month and I have not gotten a new one yet.

Dr. Chen: Let me check your vital signs. Your blood pressure today is 95/60, which is lower than normal. Heart rate is 88. Let me examine you.

[Physical Examination] General: Alert but appears mildly dehydrated. HEENT: Dry mucous membranes noted. Cardiovascular: Regular rate and rhythm, no murmurs. Extremities: Multiple small bruises on both arms, no peripheral edema. Neurologic: Positive orthostatic changes.

Dr. Chen: Ms. Robinson, I am concerned about several things. First, the combination of glyburide and warfarin can increase your bleeding risk significantly. Second, your symptoms and examination suggest your diabetes may not be well controlled.

Patient: Oh no, is that dangerous?

Dr. Chen: We can manage this, but we need to make some changes. I am going to order some urgent lab work and hold your glyburide for now and switch you to a different diabetes medication that is safer with warfarin.

Patient: Will I be okay? I am worried about my cancer history too - I had leukemia a few years ago.

Dr. Chen: Your leukemia history is important to consider, especially with the bleeding issues. We will need to be extra careful with your blood counts. I am going to admit you for observation.

Patient: I understand. Thank you for taking good care of me.',
    'S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness, increased urination, thirst, and easy bruising. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT.

O: Vital signs: BP 95/60 (orthostatic to 85/55), HR 88. General: Alert, mildly dehydrated appearance. HEENT: Dry mucous membranes. CVS: RRR, no murmurs. Extremities: Multiple small bruises on bilateral arms.

A: 1. E11.9 Type 2 diabetes mellitus, poorly controlled 2. Drug interaction risk: Glyburide + Warfarin 3. Z87.891 Personal history of leukemia 4. Orthostatic hypotension 5. Supratherapeutic anticoagulation suspected

P: STAT labs: BMP, HbA1c, PT/INR, CBC with diff. Hold glyburide immediately. Admit for observation and medication adjustment.',
    '[
        {"drug": "Discontinue warfarin immediately", "status": "Discontinued", "rationale": "Stop further anticoagulation contributing to bleeding"},
        {"drug": "Vitamin K 5-10 mg IV once", "status": "Prescribed", "rationale": "Rapidly reverses warfarin effect"},
        {"drug": "Hold glyburide immediately", "status": "Discontinued", "rationale": "Glyburide potentiates bleeding risk with warfarin"}
    ]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM encounters WHERE id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid
);

-- Insert primary diagnosis
INSERT INTO conditions (
    id,
    patient_id,
    encounter_id,
    code,
    description
)
SELECT
    gen_random_uuid(),
    '0681FA35-A794-4684-97BD-00B88370DB41'::uuid,
    'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid,
    'D68.32',
    'Warfarin-induced hemorrhagic disorder with bleeding tendency'
WHERE NOT EXISTS (
    SELECT 1 FROM conditions 
    WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'::uuid 
    AND encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid
    AND code = 'D68.32'
);

-- Insert differential diagnoses from clinical results
INSERT INTO differential_diagnoses (
    id,
    patient_id,
    encounter_id,
    name,
    likelihood,
    likelihood_percentage,
    qualitative_risk,
    probability_decimal,
    rank,
    key_factors
)
SELECT 
    gen_random_uuid(),
    '0681FA35-A794-4684-97BD-00B88370DB41'::uuid,
    'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid,
    'Drug-Drug Interaction: Glyburide + Warfarin',
    'Certain',
    95,
    'Certain',
    95,
    1,
    'Recent glyburide initiation with existing warfarin therapy, bleeding symptoms'
WHERE NOT EXISTS (
    SELECT 1 FROM differential_diagnoses 
    WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'::uuid 
    AND encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid
    AND name = 'Drug-Drug Interaction: Glyburide + Warfarin'
);

INSERT INTO differential_diagnoses (
    id,
    patient_id,
    encounter_id,
    name,
    likelihood,
    likelihood_percentage,
    qualitative_risk,
    probability_decimal,
    rank,
    key_factors
)
SELECT 
    gen_random_uuid(),
    '0681FA35-A794-4684-97BD-00B88370DB41'::uuid,
    'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid,
    'Uncontrolled Type 2 Diabetes Mellitus',
    'Certain',
    90,
    'Certain',
    90,
    2,
    'Polyuria, polydipsia, no recent monitoring, broken glucometer'
WHERE NOT EXISTS (
    SELECT 1 FROM differential_diagnoses 
    WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'::uuid 
    AND encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid
    AND name = 'Uncontrolled Type 2 Diabetes Mellitus'
);

INSERT INTO differential_diagnoses (
    id,
    patient_id,
    encounter_id,
    name,
    likelihood,
    likelihood_percentage,
    qualitative_risk,
    probability_decimal,
    rank,
    key_factors
)
SELECT 
    gen_random_uuid(),
    '0681FA35-A794-4684-97BD-00B88370DB41'::uuid,
    'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid,
    'Supratherapeutic Anticoagulation',
    'High',
    85,
    'High',
    85,
    3,
    'Easy bruising, prolonged nosebleed, INR overdue by 2 months'
WHERE NOT EXISTS (
    SELECT 1 FROM differential_diagnoses 
    WHERE patient_id = '0681FA35-A794-4684-97BD-00B88370DB41'::uuid 
    AND encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid
    AND name = 'Supratherapeutic Anticoagulation'
);

-- Insert complex case alert
INSERT INTO alerts (
    id,
    patient_id,
    encounter_id,
    msg,
    date,
    type,
    severity,
    triggering_factors,
    suggested_actions,
    created_at,
    confidence,
    likelihood,
    condition_type
)
SELECT
    '0681FA35-A794-4684-97BD-00B88370DB41_malignancy_history'::text,
    '0681FA35-A794-4684-97BD-00B88370DB41'::uuid,
    'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid,
    'History of acute myelomonocytic leukemia in complete remission; higher risk of secondary malignancies and infection.',
    '2025-01-15',
    'oncology',
    'moderate',
    '["Previous AML", "Immunocompromised history"]'::jsonb,
    '["Monitor for infection signs", "Regular oncology follow-up"]'::jsonb,
    '2025-01-15T09:00:00Z'::timestamptz,
    95,
    4,
    'Cancer History'
WHERE NOT EXISTS (
    SELECT 1 FROM alerts WHERE id = '0681FA35-A794-4684-97BD-00B88370DB41_malignancy_history'
);

COMMIT; 