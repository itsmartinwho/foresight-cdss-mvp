import { DemoDataService } from '../src/services/demo/DemoDataService';
import { createClient } from '@supabase/supabase-js';

/**
 * Script to update the demo system with fresh clinical engine results
 * This takes the clinical results we generated and updates the DemoDataService hardcoded data
 */

// New clinical results from our successful API call
const newClinicalResults = {
  // Primary diagnosis from clinical engine
  primaryDiagnosis: {
    name: "Fecal impaction",
    code: "K56.41",
    confidence: 90,
    description: "Fecal impaction with severe constipation requiring aggressive bowel regimen and medical intervention"
  },
  
  // Differential diagnoses from clinical engine
  differentialDiagnoses: [
    {
      name: "Opioid-Induced Constipation",
      likelihood: "High (90%)",
      keyFactors: "Recent hydrocodone use post-dental surgery, 6-day constipation history",
      priority: 1
    },
    {
      name: "Fecal Impaction", 
      likelihood: "Medium (60%)",
      keyFactors: "Abdominal distension, hard stool on rectal exam, radiographic findings",
      priority: 2
    },
    {
      name: "Dehydration Related Functional Constipation",
      likelihood: "Medium (70%)",
      keyFactors: "Poor fluid intake (1 glass water/day), low-fiber diet (fast food)",
      priority: 3
    },
    {
      name: "Partial Large Bowel Obstruction",
      likelihood: "Low (30%)", 
      keyFactors: "Colonic fecal retention on imaging, no complete obstruction signs",
      priority: 4
    },
    {
      name: "Secondary Constipation Due to AML History",
      likelihood: "Low (10%)",
      keyFactors: "History of acute myelomonocytic leukemia, potential medication effects",
      priority: 5
    }
  ],
  
  // Treatment recommendations from clinical engine
  treatments: [
    {
      drug: "Polyethylene glycol 3350 17g every 6 hours until bowel movement, then 17g nightly for 14 days",
      status: "Prescribed",
      rationale: "Osmotic laxative for severe fecal impaction with maintenance therapy to prevent recurrence"
    },
    {
      drug: "Docusate sodium 200mg twice daily",
      status: "Prescribed", 
      rationale: "Stool softener to facilitate easier bowel movements and reduce straining"
    },
    {
      drug: "Glycerin suppository every 12 hours as needed",
      status: "As needed",
      rationale: "Rectal stimulant if no bowel movement occurs within 12 hours"
    },
    {
      drug: "High-fiber diet with 25-30g fiber daily",
      status: "Patient education",
      rationale: "Dietary modification to prevent future constipation episodes and promote regular bowel function"
    },
    {
      drug: "Increased fluid intake to 8-10 glasses of water daily", 
      status: "Patient education",
      rationale: "Adequate hydration essential for preventing constipation and supporting treatment effectiveness"
    }
  ]
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fullTranscript = `Dr. Chen: Good afternoon, Ms. Robinson. I'm Dr. Chen. I see you're here for your diabetes follow-up. How have you been feeling lately?

Patient: Not too good, actually. I've been having these dizzy spells, especially when I stand up. And I've been going to the bathroom a lot more than usual, and I'm always thirsty.

Dr. Chen: I see. Tell me about your current medications. What are you taking for your diabetes?

Patient: Well, I'm taking metformin 1000mg twice a day, and my family doctor just started me on glyburide about three weeks ago. Oh, and I'm also taking warfarin because I had that blood clot last year.

Dr. Chen: Warfarin and glyburide together - that's something we need to be careful about. Have you noticed any unusual bleeding or bruising?

Patient: Actually, yes. I had a nosebleed yesterday that took forever to stop, and I've been bruising really easily. Is that related?

Dr. Chen: It could be. When was your last INR check for the warfarin?

Patient: Um, I think it was about two months ago? My primary care doctor said it was fine then.

Dr. Chen: And when was your last hemoglobin A1C and comprehensive metabolic panel?

Patient: I'm not sure what that is. I haven't had any blood work in probably four months.

Dr. Chen: Okay, we definitely need to get some labs today. With your diabetes and being on warfarin, we need to monitor things more closely. Tell me about your symptoms - the dizziness, when does it happen?

Patient: Mostly when I get up from sitting or lying down. Sometimes I feel like I might faint. And I've been really thirsty lately and urinating a lot more than usual.

Dr. Chen: Those symptoms suggest your blood sugar might not be well controlled. Are you checking your blood sugar at home?

Patient: I was, but my meter broke last month and I haven't gotten a new one yet.

Dr. Chen: Let me check your vital signs. Your blood pressure today is 95/60, which is lower than normal. Heart rate is 88. Let me examine you.

[Physical Examination]
General: Alert but appears mildly dehydrated
HEENT: Dry mucous membranes noted
Cardiovascular: Regular rate and rhythm, no murmurs
Extremities: Multiple small bruises on both arms, no peripheral edema
Neurologic: Positive orthostatic changes - blood pressure drops to 85/55 when standing

Dr. Chen: Ms. Robinson, I'm concerned about several things. First, the combination of glyburide and warfarin can increase your bleeding risk significantly. Second, your symptoms and examination suggest your diabetes may not be well controlled, and you might be dehydrated.

Patient: Oh no, is that dangerous?

Dr. Chen: We can manage this, but we need to make some changes. I'm going to order some urgent lab work - we need to check your blood sugar, kidney function, hemoglobin A1C, and your INR to see how thin your blood is.

Patient: Okay, whatever you think is best.

Dr. Chen: I'm also going to hold your glyburide for now and switch you to a different diabetes medication that's safer with warfarin. We'll need to coordinate with your primary care doctor about your warfarin dosing.

Patient: Will I be okay? I'm worried about my cancer history too - I had leukemia a few years ago.

Dr. Chen: Your leukemia history is important to consider, especially with the bleeding issues. We'll need to be extra careful with your blood counts. I'm going to admit you for observation so we can stabilize your blood sugar, adjust your medications safely, and get your bleeding risk under control.

Patient: I understand. Thank you for taking good care of me.

Dr. Chen: Of course. The nurse will get your lab work started, and I'll be back to discuss the results and our plan once we have them.`;

const fullSoapNote = `S: 46-year-old female with Type 2 diabetes mellitus presents with orthostatic dizziness, increased urination, thirst, and easy bruising. Currently taking metformin 1000mg BID and glyburide (started 3 weeks ago) for diabetes, plus warfarin for history of DVT. Reports recent nosebleed and multiple bruises. Last INR check 2 months ago, no recent diabetes monitoring labs. Broken glucometer, not checking blood sugars at home.

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
• New glucometer and diabetes education before discharge`;

const treatments = [
  { 
    drug: "Discontinue warfarin immediately", 
    status: "Discontinued", 
    rationale: "Immediate cessation of warfarin is essential to stop further anticoagulation contributing to bleeding" 
  },
  { 
    drug: "Vitamin K (Phytonadione) 5-10 mg IV once", 
    status: "Prescribed", 
    rationale: "Rapidly reverses warfarin effect by restoring vitamin K-dependent clotting factors; IV route preferred for serious bleeding due to faster onset" 
  },
  { 
    drug: "4-factor Prothrombin Complex Concentrates (PCC) 25-50 units/kg IV once", 
    status: "Prescribed", 
    rationale: "Provides rapid replacement of vitamin K-dependent factors II, VII, IX, and X for prompt reversal of anticoagulation; preferred over FFP due to faster INR correction and lower infusion volume" 
  },
  { 
    drug: "Fresh Frozen Plasma (FFP) 10-15 mL/kg IV if PCC unavailable", 
    status: "Alternative", 
    rationale: "Alternative coagulation factor replacement; slower onset and requires large volume infusion; carries risk of volume overload" 
  },
  { 
    drug: "Hold glyburide immediately", 
    status: "Discontinued", 
    rationale: "Glyburide potentiates bleeding risk by interaction with warfarin and causes hypoglycemia; hold to prevent further adverse effects" 
  },
  { 
    drug: "Supportive care as clinically indicated", 
    status: "Ongoing", 
    rationale: "Maintain hemodynamic stability with fluids and blood transfusions as needed; localized hemostasis if applicable" 
  }
];

async function updateDorothyEncounter() {
  console.log('🔄 Updating Dorothy Robinson encounter with complete demo data...');
  
  const dorothyPatientId = '0681FA35-A794-4684-97BD-00B88370DB41';
  const encounterText = 'Type 2 diabetes mellitus without complications';
  
  try {
    // Update the encounter with full demo data
    const { data, error } = await supabase
      .from('encounters')
      .update({
        transcript: fullTranscript,
        soap_note: fullSoapNote,
        treatments: treatments,
        extra_data: { PatientID: dorothyPatientId }
      })
      .eq('extra_data->>PatientID', dorothyPatientId)
      .eq('reason_display_text', encounterText);

    if (error) {
      console.error('❌ Error updating encounter:', error);
      process.exit(1);
    }

    console.log('✅ Successfully updated Dorothy Robinson encounter');
    console.log('📊 Updated data:');
    console.log(`   - Transcript: ${fullTranscript.length} characters`);
    console.log(`   - SOAP note: ${fullSoapNote.length} characters`);
    console.log(`   - Treatments: ${treatments.length} items`);
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('encounters')
      .select('encounter_id, reason_display_text, transcript, soap_note, treatments')
      .eq('extra_data->>PatientID', dorothyPatientId)
      .eq('reason_display_text', encounterText)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
    } else {
      console.log('✅ Verification successful:');
      console.log(`   - Encounter ID: ${verifyData.encounter_id}`);
      console.log(`   - Transcript length: ${verifyData.transcript?.length || 0} chars`);
      console.log(`   - SOAP note length: ${verifyData.soap_note?.length || 0} chars`);
      console.log(`   - Treatment count: ${Array.isArray(verifyData.treatments) ? verifyData.treatments.length : 0}`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

updateDorothyEncounter();

async function updateDemoDataService() {
  console.log('🔄 Updating DemoDataService with fresh clinical results...');
  
  try {
    // Read current DemoDataService file
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), 'src/services/demo/DemoDataService.ts');
    const currentContent = await fs.readFile(filePath, 'utf-8');
    
    // Update the diagnosis description in the demo data
    const updatedContent = currentContent.replace(
      /description: "Functional constipation, likely opioid-induced with contributing low-fiber diet"/,
      `description: "${newClinicalResults.primaryDiagnosis.description}"`
    ).replace(
      /code: "K59\.00"/,
      `code: "${newClinicalResults.primaryDiagnosis.code}"`
    );
    
    // Update the treatments array
    const newTreatmentsCode = `treatments: [
    ${newClinicalResults.treatments.map(treatment => 
      `{ 
      drug: "${treatment.drug}", 
      status: "${treatment.status}", 
      rationale: "${treatment.rationale}" 
    }`
    ).join(',\n    ')}
  ]`;
    
    const treatmentsUpdated = updatedContent.replace(
      /treatments: \[[\s\S]*?\]/,
      newTreatmentsCode
    );
    
    // Write updated content back to file
    await fs.writeFile(filePath, treatmentsUpdated);
    
    console.log('✅ DemoDataService updated successfully!');
    console.log('📊 New clinical results:');
    console.log(`   Primary Diagnosis: ${newClinicalResults.primaryDiagnosis.name} (${newClinicalResults.primaryDiagnosis.code})`);
    console.log(`   Differential Diagnoses: ${newClinicalResults.differentialDiagnoses.length} generated`);
    console.log(`   Treatment Recommendations: ${newClinicalResults.treatments.length} items`);
    
    return {
      success: true,
      data: newClinicalResults
    };
    
  } catch (error) {
    console.error('❌ Error updating DemoDataService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export data for use by demo hooks
export const demoClinicalResults = newClinicalResults;
export default updateDemoDataService;

// Run if called directly
if (require.main === module) {
  updateDemoDataService()
    .then(result => {
      if (result.success) {
        console.log('🎉 Demo data update completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Demo data update failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
} 