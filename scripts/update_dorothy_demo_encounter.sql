-- Update Dorothy Robinson's Demo Encounter with Correct Data
-- This script updates the existing encounter with the proper diabetes/warfarin case data

BEGIN;

-- Update the encounter with correct diabetes/warfarin case data
UPDATE encounters 
SET 
    encounter_type = 'outpatient',
    reason_code = 'E11.9',
    reason_display_text = 'Type 2 diabetes mellitus without complications',
    transcript = 'Dr. Chen: Good afternoon, Ms. Robinson. I am Dr. Chen. I see you are here for your diabetes follow-up. How have you been feeling lately?

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
    soap_note = 'S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness, increased urination, thirst, and easy bruising. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT. Reports recent nosebleed and multiple bruises. Last INR check 2 months ago, no recent diabetes monitoring labs. Broken glucometer, not checking blood sugars at home.

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
    treatments = '[
        {"drug": "Discontinue warfarin immediately", "status": "Discontinued", "rationale": "Immediate cessation of warfarin is essential to stop further anticoagulation contributing to bleeding"},
        {"drug": "Vitamin K (Phytonadione) 5-10 mg IV once", "status": "Prescribed", "rationale": "Rapidly reverses warfarin effect by restoring vitamin K-dependent clotting factors; IV route preferred for serious bleeding due to faster onset"},
        {"drug": "4-factor Prothrombin Complex Concentrates (PCC) 25-50 units/kg IV once", "status": "Prescribed", "rationale": "Provides rapid replacement of vitamin K-dependent factors II, VII, IX, and X for prompt reversal of anticoagulation; preferred over FFP due to faster INR correction and lower infusion volume"},
        {"drug": "Fresh Frozen Plasma (FFP) 10-15 mL/kg IV if PCC unavailable", "status": "Alternative", "rationale": "Alternative coagulation factor replacement; slower onset and requires large volume infusion; carries risk of volume overload"},
        {"drug": "Hold glyburide immediately", "status": "Discontinued", "rationale": "Glyburide potentiates bleeding risk by interaction with warfarin and causes hypoglycemia; hold to prevent further adverse effects"},
        {"drug": "Supportive care as clinically indicated", "status": "Ongoing", "rationale": "Maintain hemodynamic stability with fluids and blood transfusions as needed; localized hemostasis if applicable"}
    ]'::jsonb,
    observations = '{
        "Vital signs: BP 95/60 (orthostatic to 85/55), HR 88, Temp 98.6°F, RR 16",
        "General: Alert, mildly dehydrated appearance",
        "HEENT: Dry mucous membranes noted",
        "Cardiovascular: Regular rate and rhythm, no murmurs", 
        "Extremities: Multiple small bruises on bilateral arms, no peripheral edema",
        "Neurologic: Positive orthostatic changes - blood pressure drops to 85/55 when standing",
        "Labs ordered: BMP, HbA1c, PT/INR, CBC with differential"
    }'::text[],
    extra_data = '{
        "PatientID": "0681FA35-A794-4684-97BD-00B88370DB41",
        "demo_case": true,
        "case_type": "drug_interaction",
        "primary_concern": "warfarin_glyburide_interaction",
        "teaching_points": [
            "Drug-drug interactions with anticoagulants",
            "Diabetes medication safety with warfarin",
            "Bleeding risk assessment",
            "Orthostatic hypotension evaluation"
        ],
        "key_clinical_decisions": [
            "Immediate glyburide discontinuation",
            "Warfarin reversal consideration", 
            "Insulin therapy initiation",
            "Admission for observation"
        ]
    }'::jsonb,
    updated_at = now()
WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003';

-- Ensure the encounter has rich content for diagnosis and treatments
UPDATE encounters 
SET 
    diagnosis_rich_content = '{
        "content_type": "text/markdown",
        "text_content": "# Primary Diagnosis: Warfarin-induced Hemorrhagic Disorder (D68.32)\n\n**Clinical Presentation:**\n- Easy bruising and prolonged nosebleed episodes\n- Orthostatic hypotension with symptomatic dizziness\n- Multiple small bruises on bilateral arms without trauma history\n- No recent INR monitoring for 2 months\n\n**Contributing Factors:**\n- Recent addition of glyburide (3 weeks ago) increasing warfarin potency\n- Drug interaction: Glyburide + Warfarin significantly increases bleeding risk\n- Lack of anticoagulation monitoring for extended period\n- Possible warfarin over-anticoagulation\n\n**Complications:**\n- Active bleeding tendency with high hemorrhage risk\n- Drug interaction requiring immediate medication discontinuation\n- Need for urgent anticoagulation reversal",
        "rich_elements": [],
        "created_at": "' || now()::text || '",
        "version": "1.0"
    }'::jsonb,
    treatments_rich_content = '{
        "content_type": "text/markdown", 
        "text_content": "# Comprehensive Treatment Plan\n\n## Immediate Actions\n\n### Discontinue Glyburide Immediately\n- **Reason:** High-risk drug interaction with warfarin\n- **Risk:** Increased bleeding complications\n- **Alternative:** Switch to insulin therapy\n\n### Warfarin Management\n- **Assessment:** Check current INR level\n- **Consider reversal:** Vitamin K and/or PCC if bleeding\n- **Monitoring:** Daily INR until stable\n\n## Ongoing Management\n\n### Diabetes Control\n- Continue metformin 1000mg BID\n- Initiate insulin glargine 10 units daily\n- Blood glucose monitoring education\n- Endocrine consultation\n\n### Safety Measures\n- Orthostatic precautions\n- Fall prevention protocols\n- Patient education on bleeding signs\n- Follow-up in 48-72 hours",
        "rich_elements": [],
        "created_at": "' || now()::text || '",
        "version": "1.0"
    }'::jsonb
WHERE encounter_id = 'ENC-0681FA35-A794-4684-97BD-00B88370DB41-003';

COMMIT; 