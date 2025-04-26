import { 
  DiagnosticPlan, 
  DiagnosticStep, 
  DiagnosticResult, 
  ClinicalSource,
  ClinicalTrial,
  PriorAuthorization,
  SpecialistReferral
} from './types';

/**
 * Service for clinical decision support functionality
 * This is a frontend service that would communicate with the Python clinical engine
 */
class ClinicalEngineService {
  private apiBaseUrl = '/api/clinical-engine';

  /**
   * Generate a diagnostic plan based on symptoms and patient data
   */
  async generateDiagnosticPlan(symptoms: string[], patientId?: string): Promise<DiagnosticPlan> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Example diagnostic plan for demonstration
      if (symptoms.includes('fatigue') && symptoms.includes('joint pain')) {
        // Autoimmune-focused plan
        return {
          steps: [
            {
              id: "step1",
              description: "Initial symptom assessment", 
              query: "Evaluate fatigue and joint pain characteristics, duration, and pattern",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step2",
              description: "Medical history review", 
              query: "Review patient history for autoimmune risk factors",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step3",
              description: "Physical examination", 
              query: "Assess joints, skin, and lymph nodes",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step4",
              description: "Initial laboratory testing", 
              query: "CBC, CMP, ESR, CRP, ANA, RF",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step5",
              description: "Specialized autoimmune testing", 
              query: "Anti-CCP, anti-dsDNA, complement levels",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step6",
              description: "Differential diagnosis", 
              query: "Evaluate for rheumatoid arthritis, SLE, and fibromyalgia",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step7",
              description: "Treatment considerations", 
              query: "DMARD options and symptom management",
              completed: false,
              sources: [],
              findings: ""
            }
          ],
          rationale: "This diagnostic plan focuses on evaluating fatigue and joint pain with an emphasis on autoimmune conditions, which are common causes of these symptoms. The plan includes a systematic approach from initial assessment to specialized testing and treatment considerations."
        };
      } else if (symptoms.includes('weight loss') && symptoms.includes('abdominal pain')) {
        // Oncology-focused plan
        return {
          steps: [
            {
              id: "step1",
              description: "Initial symptom assessment", 
              query: "Evaluate weight loss amount, timeline, and abdominal pain characteristics",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step2",
              description: "Medical history review", 
              query: "Review patient history for cancer risk factors",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step3",
              description: "Physical examination", 
              query: "Abdominal exam, lymph node assessment",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step4",
              description: "Initial laboratory testing", 
              query: "CBC, CMP, tumor markers (CA-19-9, CEA)",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step5",
              description: "Imaging studies", 
              query: "Abdominal CT scan with contrast",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step6",
              description: "Endoscopic evaluation", 
              query: "Upper endoscopy and colonoscopy",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step7",
              description: "Differential diagnosis", 
              query: "Evaluate for pancreatic cancer, colorectal cancer, and IBD",
              completed: false,
              sources: [],
              findings: ""
            }
          ],
          rationale: "This diagnostic plan addresses the concerning combination of weight loss and abdominal pain, which could indicate malignancy. The plan includes appropriate imaging, laboratory testing, and endoscopic procedures to evaluate for gastrointestinal or pancreatic cancer."
        };
      } else {
        // General diagnostic plan
        return {
          steps: [
            {
              id: "step1",
              description: "Initial symptom assessment", 
              query: `Evaluate ${symptoms.join(', ')} characteristics, duration, and pattern`,
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step2",
              description: "Medical history review", 
              query: "Review patient history for relevant risk factors",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step3",
              description: "Physical examination", 
              query: "Focused physical exam based on symptoms",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step4",
              description: "Initial laboratory testing", 
              query: "CBC, CMP, and symptom-specific tests",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step5",
              description: "Imaging if indicated", 
              query: "Determine appropriate imaging based on symptoms",
              completed: false,
              sources: [],
              findings: ""
            },
            {
              id: "step6",
              description: "Differential diagnosis", 
              query: `Evaluate common causes of ${symptoms.join(', ')}`,
              completed: false,
              sources: [],
              findings: ""
            }
          ],
          rationale: `This diagnostic plan provides a systematic approach to evaluating ${symptoms.join(', ')}. It includes a thorough history, physical examination, and appropriate testing to narrow down the differential diagnosis.`
        };
      }
    } catch (error) {
      console.error('Error generating diagnostic plan:', error);
      throw new Error('Failed to generate diagnostic plan');
    }
  }

  /**
   * Execute a diagnostic step
   */
  async executeDiagnosticStep(step: DiagnosticStep, patientId?: string): Promise<DiagnosticStep> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate findings based on the step
      let findings = "";
      
      if (step.description.includes("Initial symptom assessment")) {
        findings = `
          The initial assessment of the patient's symptoms reveals several key characteristics. The symptoms have been present for approximately 3 months, with gradual worsening over time. The patient reports moderate to severe fatigue that is worse in the mornings and improves slightly throughout the day. Joint pain primarily affects the small joints of the hands and wrists bilaterally, with morning stiffness lasting more than 1 hour. The patient also notes occasional low-grade fever and general malaise.

          The pattern of symptoms suggests a chronic, progressive condition rather than an acute process. The symmetrical joint involvement, prolonged morning stiffness, and accompanying fatigue are classic features seen in inflammatory arthritides, particularly rheumatoid arthritis. The presence of low-grade fever may indicate an underlying inflammatory or autoimmune process.

          The impact on daily functioning has been significant, with the patient reporting difficulty with fine motor tasks such as buttoning clothes and opening jars. Sleep quality has been poor due to joint discomfort, potentially exacerbating the fatigue symptoms. These functional limitations and symptom patterns are important considerations for both diagnosis and treatment planning.
        `;
      } else if (step.description.includes("Medical history review")) {
        findings = `
          Review of the patient's medical history reveals several relevant factors. The patient has a family history of autoimmune conditions, with a mother diagnosed with Hashimoto's thyroiditis and a maternal aunt with systemic lupus erythematosus (SLE). This family history significantly increases the patient's risk for developing autoimmune conditions, as genetic predisposition plays an important role in autoimmune pathogenesis.

          The patient's past medical history includes recurrent sinusitis treated with multiple courses of antibiotics over the past five years, and a previous episode of unexplained rash two years ago that resolved spontaneously. The patient has no history of chronic infections, malignancy, or major surgeries. Current medications include only occasional over-the-counter NSAIDs for pain relief, which provide minimal benefit for the joint symptoms.

          Social history indicates the patient is a non-smoker with minimal alcohol consumption. The patient works as an office administrator, which involves significant computer use that has become increasingly difficult due to joint pain. No significant environmental exposures or recent travel were reported. The patient has not tried any complementary or alternative therapies for symptom management.
        `;
      } else if (step.description.includes("Physical examination")) {
        findings = `
          Physical examination of the patient reveals several significant findings. There is visible swelling and tenderness of the metacarpophalangeal (MCP) and proximal interphalangeal (PIP) joints bilaterally, with the right hand slightly more affected than the left. Mild synovial thickening is palpable in these joints. Range of motion in the wrists is limited by approximately 20% bilaterally, with pain at the extremes of motion. No deformities or nodules are present at this time.

          Examination of the skin shows no current rash, petechiae, or purpura. There is no evidence of psoriatic lesions or nail changes. Mild pallor of the conjunctivae suggests possible anemia. Lymph node examination reveals small, mobile, non-tender cervical lymphadenopathy. Cardiopulmonary examination is unremarkable with no murmurs, rubs, or abnormal breath sounds.

          Neurological examination shows intact sensation and strength in all extremities, with no evidence of neuropathy. There is no spinal tenderness or limitation in range of motion of the cervical or lumbar spine. The remainder of the physical examination, including abdominal and genitourinary systems, is within normal limits. The overall physical findings support an inflammatory arthritis primarily affecting the small joints of the hands, consistent with early rheumatoid arthritis or another inflammatory arthropathy.
        `;
      } else if (step.description.includes("laboratory testing")) {
        findings = `
          Initial laboratory testing reveals several abnormalities consistent with an inflammatory process. The complete blood count (CBC) shows mild normocytic anemia with hemoglobin of 11.2 g/dL, which is common in chronic inflammatory conditions. The white blood cell count is within normal limits at 7.8 x 10^9/L, with a slight lymphopenia of 1.1 x 10^9/L. Platelet count is mildly elevated at 450 x 10^9/L, reflecting the acute phase response.

          Inflammatory markers are significantly elevated, with an erythrocyte sedimentation rate (ESR) of 42 mm/hr and C-reactive protein (CRP) of 2.8 mg/dL, strongly supporting an active inflammatory process. Comprehensive metabolic panel (CMP) shows normal renal and hepatic function. Rheumatoid factor (RF) is positive at 78 IU/mL (reference range <14 IU/mL), and anti-cyclic citrullinated peptide (anti-CCP) antibodies are strongly positive at >250 U/mL, which has high specificity for rheumatoid arthritis.

          Antinuclear antibody (ANA) testing is positive at a titer of 1:160 with a speckled pattern, which can be seen in various autoimmune conditions including RA and SLE. Complement levels (C3 and C4) are within normal limits, and anti-double-stranded DNA (anti-dsDNA) antibodies are negative, making SLE less likely. Thyroid function tests are normal. These laboratory findings, particularly the strongly positive RF and anti-CCP antibodies in the context of inflammatory arthritis, are highly suggestive of rheumatoid arthritis.
        `;
      } else if (step.description.includes("Differential diagnosis")) {
        findings = `
          The differential diagnosis evaluation reveals rheumatoid arthritis (RA) as the most likely diagnosis based on the clinical presentation and laboratory findings. The patient's symmetrical small joint polyarthritis, morning stiffness exceeding one hour, elevated inflammatory markers, and strongly positive RF and anti-CCP antibodies fulfill the 2010 ACR/EULAR classification criteria for RA. The high titer of anti-CCP antibodies is particularly significant, as it has approximately 95% specificity for RA and indicates a more severe disease course with higher risk of erosive joint damage.

          Systemic lupus erythematosus (SLE) remains in the differential but is less likely given the absence of characteristic multi-system involvement. While the patient has a positive ANA, the titer is relatively low, and specific SLE markers such as anti-dsDNA antibodies are negative. Normal complement levels and the absence of renal involvement, serositis, or typical cutaneous manifestations further decrease the likelihood of SLE.

          Other conditions considered include psoriatic arthritis, which typically presents with distal interphalangeal joint involvement and accompanying skin manifestations, neither of which are present in this case. Viral arthritides (such as parvovirus B19 or hepatitis C-associated) typically have a more acute onset and are often self-limiting. Crystal arthropathies like gout or pseudogout usually present with monoarticular or oligoarticular involvement rather than the symmetrical polyarthritis seen in this patient. The overall clinical picture is most consistent with early, seropositive rheumatoid arthritis.
        `;
      } else if (step.description.includes("Treatment considerations")) {
        findings = `
          Treatment considerations for this patient with likely rheumatoid arthritis should follow a treat-to-target approach with the goal of clinical remission or low disease activity. Given the high-risk features (high-titer anti-CCP positivity, elevated inflammatory markers), early aggressive therapy is warranted to prevent joint damage and disability. The current ACR/EULAR guidelines recommend initiating disease-modifying antirheumatic drugs (DMARDs) immediately upon diagnosis.

          Methotrexate is the recommended first-line DMARD, typically started at 7.5-10 mg weekly and gradually titrated to 20-25 mg weekly as tolerated. Concomitant folic acid supplementation (1 mg daily) is recommended to reduce side effects. For patients with moderate to high disease activity, combination therapy may be considered, either with other conventional DMARDs (such as hydroxychloroquine and sulfasalazine in triple therapy) or with a biologic agent such as a TNF inhibitor (etanercept, adalimumab, infliximab).

          Symptom management should include short-term use of NSAIDs for pain and inflammation, with appropriate gastrointestinal prophylaxis if needed. A short course of low-dose corticosteroids (e.g., prednisone 5-10 mg daily) may be considered as a bridge until DMARDs take effect, typically in 6-12 weeks. Patient education regarding the chronic nature of RA, the importance of medication adherence, and joint protection techniques is essential. Physical therapy for joint range of motion exercises and strengthening should be incorporated into the treatment plan. Regular monitoring of disease activity, medication side effects, and comorbidities is crucial for optimal management.
        `;
      } else {
        findings = `Analysis of the ${step.description} indicates several important clinical considerations relevant to the diagnostic process. The available data suggests patterns consistent with inflammatory or autoimmune processes that warrant further investigation. Specific findings include abnormal laboratory values and symptom patterns that align with established diagnostic criteria for several potential conditions. These findings will help narrow the differential diagnosis and guide subsequent diagnostic steps.`;
      }
      
      // Create a sample clinical source
      const sources: ClinicalSource[] = [
        {
          type: "guideline",
          id: "guideline_1",
          title: "Clinical Practice Guideline",
          content: "Relevant guideline content for this diagnostic step",
          relevanceScore: 0.85,
          accessTime: new Date().toISOString()
        }
      ];
      
      // If patient ID is provided, add patient data as a source
      if (patientId) {
        sources.push({
          type: "patient_data",
          id: patientId,
          title: `Patient Data for ${patientId}`,
          content: "Patient data relevant to this diagnostic step",
          relevanceScore: 1.0,
          accessTime: new Date().toISOString()
        });
      }
      
      // Return updated step
      return {
        ...step,
        completed: true,
        sources,
        findings: findings.trim()
      };
    } catch (error) {
      console.error('Error executing diagnostic step:', error);
      throw new Error('Failed to execute diagnostic step');
    }
  }

  /**
   * Execute a complete diagnostic plan
   */
  async executeDiagnosticPlan(plan: DiagnosticPlan, patientId?: string, updateCallback?: (plan: DiagnosticPlan) => void): Promise<DiagnosticPlan> {
    try {
      const updatedSteps: DiagnosticStep[] = [];
      
      // Execute each step sequentially
      for (const step of plan.steps) {
        const updatedStep = await this.executeDiagnosticStep(step, patientId);
        updatedSteps.push(updatedStep);
        
        // Update the plan with completed steps so far
        const currentPlan: DiagnosticPlan = {
          steps: [...updatedSteps, ...plan.steps.slice(updatedSteps.length)],
          rationale: plan.rationale
        };
        
        // Call the callback with the updated plan if provided
        if (updateCallback) {
          updateCallback(currentPlan);
        }
      }
      
      // Return the updated plan
      return {
        steps: updatedSteps,
        rationale: plan.rationale
      };
    } catch (error) {
      console.error('Error executing diagnostic plan:', error);
      throw new Error('Failed to execute diagnostic plan');
    }
  }

  /**
   * Generate a diagnostic result based on the executed plan
   */
  async generateDiagnosticResult(symptoms: string[], plan: DiagnosticPlan): Promise<DiagnosticResult> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for patterns in the findings to determine diagnosis
      const hasRheumatoidArthritis = plan.steps.some(step => 
        step.findings.toLowerCase().includes('rheumatoid arthritis'));
      
      const hasLeukemia = plan.steps.some(step => 
        step.findings.toLowerCase().includes('leukemia'));
      
      if (hasRheumatoidArthritis) {
        // RA diagnosis
        return {
          diagnosisName: "Rheumatoid Arthritis",
          diagnosisCode: "M05.79",
          confidence: 0.92,
          supportingEvidence: [
            "Symmetrical polyarthritis affecting small joints of hands",
            "Morning stiffness lasting > 1 hour",
            "Elevated inflammatory markers (ESR 42 mm/hr, CRP 2.8 mg/dL)",
            "Strongly positive RF (78 IU/mL) and anti-CCP antibodies (>250 U/mL)",
            "Family history of autoimmune conditions"
          ],
          differentialDiagnoses: [
            {name: "Systemic Lupus Erythematosus", likelihood: "Low", keyFactors: "Positive ANA but negative anti-dsDNA, normal complement levels, absence of typical organ involvement"},
            {name: "Psoriatic Arthritis", likelihood: "Very Low", keyFactors: "No skin or nail changes, no DIP joint involvement"},
            {name: "Viral Arthritis", likelihood: "Very Low", keyFactors: "Chronic progressive course rather than acute onset"}
          ],
          recommendedTests: [
            "Hand/wrist X-rays to assess for erosions",
            "Ultrasound of affected joints to evaluate synovitis",
            "HLA-B27 to help rule out seronegative spondyloarthropathies",
            "Hepatitis B and C serology prior to immunosuppressive therapy"
          ],
          recommendedTreatments: [
            "Methotrexate 15 mg weekly with folic acid 1 mg daily",
            "Prednisone 10 mg daily for 4 weeks, then taper to 5 mg for 4 weeks, then discontinue",
            "NSAIDs as needed for pain with appropriate GI prophylaxis",
            "Referral to rheumatology for ongoing management",
            "Physical therapy for joint protection techniques and exercises"
          ],
          clinicalTrialMatches: [
            {
              id: "NCT04134728",
              title: "Novel JAK Inhibitor for Early Rheumatoid Arthritis",
              phase: "Phase 3",
              location: "Multiple locations",
              contact: "research@arthritistrial.org",
              eligibility: "Early RA, anti-CCP positive, no prior biologic therapy"
            },
            {
              id: "NCT03922607",
              title: "Precision Medicine Approach to RA Treatment Selection",
              phase: "Phase 4",
              location: "University Medical Center",
              contact: "precision@umc.edu",
              eligibility: "New RA diagnosis, no contraindications to methotrexate"
            }
          ]
        };
      } else if (hasLeukemia) {
        // Leukemia diagnosis
        return {
          diagnosisName: "Chronic Myeloid Leukemia",
          diagnosisCode: "C92.10",
          confidence: 0.88,
          supportingEvidence: [
            "Fatigue and unintentional weight loss",
            "Splenomegaly on physical examination",
            "Leukocytosis with left shift",
            "Presence of Philadelphia chromosome on cytogenetic testing",
            "Elevated LDH and uric acid"
          ],
          differentialDiagnoses: [
            {name: "Acute Myeloid Leukemia", likelihood: "Moderate", keyFactors: "Absence of blast crisis, chronic rather than acute presentation"},
            {name: "Myelofibrosis", likelihood: "Low", keyFactors: "No significant bone marrow fibrosis on biopsy"},
            {name: "Reactive Leukocytosis", likelihood: "Very Low", keyFactors: "Presence of Philadelphia chromosome confirms neoplastic process"}
          ],
          recommendedTests: [
            "BCR-ABL PCR quantification",
            "Bone marrow biopsy with cytogenetics",
            "HLA typing for potential stem cell transplant",
            "Cardiac evaluation prior to TKI therapy"
          ],
          recommendedTreatments: [
            "Tyrosine kinase inhibitor therapy (imatinib 400 mg daily)",
            "Allopurinol for tumor lysis prophylaxis",
            "Referral to hematology-oncology",
            "Genetic counseling"
          ],
          clinicalTrialMatches: [
            {
              id: "NCT03789942",
              title: "Novel TKI Combination for Newly Diagnosed CML",
              phase: "Phase 2",
              location: "Cancer Research Center",
              contact: "cml@cancerresearch.org",
              eligibility: "Newly diagnosed CML in chronic phase, no prior TKI therapy"
            }
          ]
        };
      } else {
        // Generic result
        return {
          diagnosisName: "Undifferentiated Inflammatory Condition",
          diagnosisCode: "M06.9",
          confidence: 0.65,
          supportingEvidence: [
            "Multiple inflammatory symptoms",
            "Elevated inflammatory markers",
            "Absence of definitive diagnostic criteria for specific conditions"
          ],
          differentialDiagnoses: [
            {name: "Early Rheumatoid Arthritis", likelihood: "Moderate", keyFactors: "Joint symptoms but incomplete criteria"},
            {name: "Undifferentiated Connective Tissue Disease", likelihood: "Moderate", keyFactors: "Mixed features of several autoimmune conditions"},
            {name: "Viral Syndrome", likelihood: "Low", keyFactors: "Chronic rather than self-limited course"}
          ],
          recommendedTests: [
            "Complete autoimmune panel",
            "Imaging of affected joints/organs",
            "Consider referral to rheumatology"
          ],
          recommendedTreatments: [
            "NSAIDs for symptomatic relief",
            "Close monitoring for evolution of symptoms",
            "Consider hydroxychloroquine if symptoms persist"
          ],
          clinicalTrialMatches: []
        };
      }
    } catch (error) {
      console.error('Error generating diagnostic result:', error);
      throw new Error('Failed to generate diagnostic result');
    }
  }

  /**
   * Match patient to relevant clinical trials based on diagnosis
   */
  async matchClinicalTrials(diagnosis: string, patientId?: string): Promise<ClinicalTrial[]> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return sample clinical trials based on diagnosis
      if (diagnosis.toLowerCase().includes('rheumatoid arthritis')) {
        return [
          {
            id: "NCT04134728",
            title: "Novel JAK Inhibitor for Early Rheumatoid Arthritis",
            phase: "Phase 3",
            location: "Multiple locations",
            contact: "research@arthritistrial.org",
            eligibility: "Early RA, anti-CCP positive, no prior biologic therapy"
          },
          {
            id: "NCT03922607",
            title: "Precision Medicine Approach to RA Treatment Selection",
            phase: "Phase 4",
            location: "University Medical Center",
            contact: "precision@umc.edu",
            eligibility: "New RA diagnosis, no contraindications to methotrexate"
          },
          {
            id: "NCT04515979",
            title: "Gut Microbiome Modulation in Rheumatoid Arthritis",
            phase: "Phase 2",
            location: "Arthritis Research Institute",
            contact: "microbiome@arthritisresearch.org",
            eligibility: "RA diagnosis within past 2 years, currently on stable DMARD therapy"
          }
        ];
      } else if (diagnosis.toLowerCase().includes('leukemia')) {
        return [
          {
            id: "NCT03789942",
            title: "Novel TKI Combination for Newly Diagnosed CML",
            phase: "Phase 2",
            location: "Cancer Research Center",
            contact: "cml@cancerresearch.org",
            eligibility: "Newly diagnosed CML in chronic phase, no prior TKI therapy"
          },
          {
            id: "NCT04156698",
            title: "Immunotherapy for Refractory CML",
            phase: "Phase 1/2",
            location: "National Cancer Institute",
            contact: "immunotherapy@nci.org",
            eligibility: "CML with T315I mutation or failure of ≥2 TKIs"
          }
        ];
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error matching clinical trials:', error);
      throw new Error('Failed to match clinical trials');
    }
  }

  /**
   * Generate prior authorization request for insurance
   */
  async generatePriorAuthorization(diagnosis: string, treatment: string, patientId: string): Promise<PriorAuthorization> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return sample prior authorization
      return {
        patientInformation: {
          name: `Patient ${patientId.substring(0, 8)}`,
          dateOfBirth: "1970-01-01",
          insuranceId: `INS${patientId.substring(0, 8)}`,
          gender: "Female"
        },
        providerInformation: {
          name: "Dr. Primary Care",
          npi: "1234567890",
          facility: "Foresight Medical Clinic",
          contactPhone: "555-123-4567",
          contactEmail: "provider@foresightclinic.example"
        },
        serviceRequest: {
          diagnosis: diagnosis,
          diagnosisCode: this.getDiagnosisCode(diagnosis),
          requestedService: treatment,
          serviceCode: this.getServiceCode(treatment),
          startDate: new Date().toISOString().split('T')[0],
          duration: "3 months",
          frequency: this.getTreatmentFrequency(treatment)
        },
        clinicalJustification: this.generateClinicalJustification(diagnosis, treatment),
        supportingDocumentation: [
          "Clinical notes from patient encounter",
          "Relevant laboratory results",
          "Imaging reports if applicable"
        ]
      };
    } catch (error) {
      console.error('Error generating prior authorization:', error);
      throw new Error('Failed to generate prior authorization');
    }
  }

  /**
   * Generate specialist referral letter
   */
  async generateSpecialistReferral(diagnosis: string, specialistType: string, patientId: string): Promise<SpecialistReferral> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return sample specialist referral
      return {
        date: new Date().toISOString().split('T')[0],
        referringProvider: {
          name: "Dr. Primary Care",
          npi: "1234567890",
          facility: "Foresight Medical Clinic",
          contactPhone: "555-123-4567",
          contactEmail: "provider@foresightclinic.example"
        },
        specialist: {
          type: specialistType,
          facility: `${specialistType} Specialty Center`
        },
        patientInformation: {
          name: `Patient ${patientId.substring(0, 8)}`,
          dateOfBirth: "1970-01-01",
          gender: "Female",
          contactPhone: "555-987-6543",
          insurance: `Insurance Plan ${patientId.substring(patientId.length - 4)}`
        },
        referralReason: {
          diagnosis: diagnosis,
          diagnosisCode: this.getDiagnosisCode(diagnosis),
          reasonForReferral: this.getReferralReason(diagnosis, specialistType)
        },
        clinicalInformation: {
          historyOfPresentIllness: this.generateHistoryOfPresentIllness(diagnosis),
          relevantPastMedicalHistory: [
            "Hypertension",
            "Hyperlipidemia",
            "Appendectomy (2010)"
          ],
          currentMedications: [
            "Lisinopril 10mg daily",
            "Atorvastatin 20mg daily",
            "Aspirin 81mg daily"
          ],
          allergies: [
            "Penicillin (hives)",
            "Sulfa drugs (rash)"
          ],
          physicalExamination: this.generatePhysicalExam(diagnosis),
          recentLabResults: [
            {
              name: "CBC: HEMOGLOBIN",
              value: 11.2,
              units: "g/dL",
              date: "2025-04-20T10:30:00Z",
              flag: "L"
            },
            {
              name: "ESR",
              value: 42,
              units: "mm/hr",
              date: "2025-04-20T10:30:00Z",
              flag: "H"
            },
            {
              name: "CRP",
              value: 2.8,
              units: "mg/dL",
              date: "2025-04-20T10:30:00Z",
              flag: "H"
            }
          ]
        },
        requestedEvaluation: this.getRequestedEvaluation(diagnosis, specialistType)
      };
    } catch (error) {
      console.error('Error generating specialist referral:', error);
      throw new Error('Failed to generate specialist referral');
    }
  }

  // Helper methods

  private getDiagnosisCode(diagnosis: string): string {
    const diagnosisCodes: Record<string, string> = {
      "Rheumatoid Arthritis": "M05.79",
      "Systemic Lupus Erythematosus": "M32.9",
      "Chronic Myeloid Leukemia": "C92.10",
      "Type 2 Diabetes": "E11.9",
      "Hypertension": "I10",
      "Asthma": "J45.909"
    };
    
    for (const [key, value] of Object.entries(diagnosisCodes)) {
      if (diagnosis.includes(key)) {
        return value;
      }
    }
    
    return "R69"; // Illness, unspecified
  }

  private getServiceCode(treatment: string): string {
    if (treatment.toLowerCase().includes('methotrexate')) {
      return "J8610";
    } else if (treatment.toLowerCase().includes('physical therapy')) {
      return "97110";
    } else if (treatment.toLowerCase().includes('infusion')) {
      return "96365";
    } else {
      return "99070"; // Generic supplies code
    }
  }

  private getTreatmentFrequency(treatment: string): string {
    if (treatment.toLowerCase().includes('methotrexate')) {
      return "Weekly";
    } else if (treatment.toLowerCase().includes('daily')) {
      return "Daily";
    } else if (treatment.toLowerCase().includes('monthly')) {
      return "Monthly";
    } else {
      return "As directed";
    }
  }

  private generateClinicalJustification(diagnosis: string, treatment: string): string {
    return `Patient presents with ${diagnosis} confirmed by clinical evaluation and laboratory testing. Standard first-line therapies have been ineffective or contraindicated. The requested treatment (${treatment}) is medically necessary according to current clinical guidelines and is expected to improve patient outcomes and quality of life.`;
  }

  private getReferralReason(diagnosis: string, specialistType: string): string {
    if (specialistType === "Rheumatology" && diagnosis.includes("Rheumatoid Arthritis")) {
      return "Evaluation and management of newly diagnosed rheumatoid arthritis";
    } else if (specialistType === "Hematology-Oncology" && diagnosis.includes("Leukemia")) {
      return "Urgent evaluation and management of suspected chronic myeloid leukemia";
    } else {
      return `Evaluation and management of ${diagnosis}`;
    }
  }

  private generateHistoryOfPresentIllness(diagnosis: string): string {
    if (diagnosis.includes("Rheumatoid Arthritis")) {
      return "Patient presents with a 3-month history of progressive joint pain and swelling, primarily affecting the small joints of the hands bilaterally. Associated symptoms include morning stiffness lasting >1 hour, fatigue, and occasional low-grade fever. Symptoms have significantly impacted daily activities and quality of life.";
    } else if (diagnosis.includes("Leukemia")) {
      return "Patient presents with a 2-month history of progressive fatigue, unintentional weight loss (15 pounds), night sweats, and easy bruising. Physical examination revealed splenomegaly and laboratory studies showed leukocytosis with left shift, prompting further evaluation.";
    } else {
      return `Patient presents with symptoms consistent with ${diagnosis}. Detailed evaluation was performed in the primary care setting, and findings warrant specialist assessment.`;
    }
  }

  private generatePhysicalExam(diagnosis: string): string {
    if (diagnosis.includes("Rheumatoid Arthritis")) {
      return "Vital signs stable. Musculoskeletal examination reveals bilateral synovitis of MCP and PIP joints with tenderness to palpation. Wrist range of motion limited by 20% bilaterally. No deformities present. Remainder of examination unremarkable.";
    } else if (diagnosis.includes("Leukemia")) {
      return "Vital signs: T 99.1°F, HR 92, BP 128/76, RR 18. General: pale appearance, mild distress. HEENT: no lymphadenopathy. Cardiopulmonary: unremarkable. Abdomen: spleen palpable 4cm below costal margin. Skin: scattered ecchymoses on extremities. Neurological: intact.";
    } else {
      return "Physical examination findings relevant to the diagnosis have been documented and are available upon request.";
    }
  }

  private getRequestedEvaluation(diagnosis: string, specialistType: string): string[] {
    if (specialistType === "Rheumatology" && diagnosis.includes("Rheumatoid Arthritis")) {
      return [
        "Comprehensive rheumatologic evaluation",
        "Assessment of disease activity and prognosis",
        "Development of treatment plan",
        "Consideration of DMARD therapy",
        "Patient education regarding disease management"
      ];
    } else if (specialistType === "Hematology-Oncology" && diagnosis.includes("Leukemia")) {
      return [
        "Urgent comprehensive hematologic evaluation",
        "Bone marrow biopsy and cytogenetic analysis",
        "Staging and risk stratification",
        "Development of treatment plan",
        "Discussion of clinical trial options if appropriate"
      ];
    } else {
      return [
        `Comprehensive evaluation for ${diagnosis}`,
        "Development of specialist-guided treatment plan",
        "Recommendations for ongoing management"
      ];
    }
  }
}

// Export as singleton
export const clinicalEngineService = new ClinicalEngineService();
