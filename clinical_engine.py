"""
Core clinical decision support engine for the Foresight CDSS
Adapted from the Deep Research Agent's research engine
"""

import asyncio
import json
import logging
from pydantic import BaseModel
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("foresight.clinical_engine")

# Environment configuration
MAX_PROCESSING_TIME_MINUTES = int(os.getenv("MAX_PROCESSING_TIME_MINUTES", "5"))
MAX_SOURCES_PER_STEP = int(os.getenv("MAX_SOURCES_PER_STEP", "10"))
MAX_PARALLEL_PROCESSES = int(os.getenv("MAX_PARALLEL_PROCESSES", "5"))
ENABLE_SOURCE_VERIFICATION = os.getenv("ENABLE_SOURCE_VERIFICATION", "true").lower() == "true"

# Pydantic models for clinical engine
class Patient(BaseModel):
    id: str
    gender: str
    date_of_birth: str
    race: str
    marital_status: str
    language: str
    poverty_percentage: float

class Admission(BaseModel):
    id: str
    patient_id: str
    start_date: str
    end_date: str

class Diagnosis(BaseModel):
    patient_id: str
    admission_id: str
    code: str
    description: str

class LabResult(BaseModel):
    patient_id: str
    admission_id: str
    name: str
    value: float
    units: str
    date_time: str

class ClinicalSource(BaseModel):
    type: str  # "patient_data", "guideline", "clinical_trial", "research"
    id: str
    title: str
    content: str
    relevance_score: Optional[float] = None
    access_time: str = datetime.now().isoformat()

class DiagnosticStep(BaseModel):
    id: str
    description: str
    query: str
    completed: bool = False
    sources: List[ClinicalSource] = []
    findings: str = ""

class DiagnosticPlan(BaseModel):
    steps: List[DiagnosticStep]
    rationale: str

class DiagnosticResult(BaseModel):
    diagnosis_name: str
    diagnosis_code: Optional[str] = None
    confidence: float
    supporting_evidence: List[str]
    differential_diagnoses: List[Dict[str, Any]] = []
    recommended_tests: List[str] = []
    recommended_treatments: List[str] = []
    clinical_trial_matches: List[Dict[str, Any]] = []
    
class DebugLogger:
    """Simple debug logger for the clinical engine"""
    
    def log_event(self, event_type: str, data: Dict[str, Any]):
        """Log an event with timestamp"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            **data
        }
        logger.debug(f"EVENT: {json.dumps(event)}")
    
    def log_step_start(self, step_id: str, description: str):
        self.log_event("step_start", {"step_id": step_id, "description": description})
    
    def log_step_completion(self, session_id: str, step_id: str, status: str, summary: str, metadata: Dict[str, Any] = None):
        self.log_event("step_completion", {
            "session_id": session_id,
            "step_id": step_id,
            "status": status,
            "summary": summary,
            "metadata": metadata or {}
        })
    
    def log_findings(self, session_id: str, step_id: str, findings: str, source: str = None):
        self.log_event("findings", {
            "session_id": session_id,
            "step_id": step_id,
            "findings": findings[:200] + "..." if len(findings) > 200 else findings,
            "source": source[:200] + "..." if source and len(source) > 200 else source
        })

# Initialize debug logger
debug_logger = DebugLogger()

class ClinicalEngine:
    """Core clinical decision support engine functionality"""
    
    def __init__(self, llm_client, guideline_client, clinical_trial_client):
        self.llm = llm_client
        self.guidelines = guideline_client
        self.clinical_trials = clinical_trial_client
        self.current_session_id = str(uuid.uuid4())
        
        # Patient data storage
        self.patients = {}
        self.admissions = {}
        self.diagnoses = {}
        self.lab_results = {}
    
    def load_patient_data(self, patient_data_dir: str):
        """Load patient data from the provided directory"""
        logger.info(f"Loading patient data from: {patient_data_dir}")
        
        # Load patient core data
        patient_file = os.path.join(patient_data_dir, "PatientCorePopulatedTable.txt")
        if os.path.exists(patient_file):
            with open(patient_file, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
                headers = lines[0].strip().split('\t')
                for line in lines[1:]:
                    values = line.strip().split('\t')
                    patient_data = dict(zip(headers, values))
                    patient = Patient(
                        id=patient_data['PatientID'],
                        gender=patient_data['PatientGender'],
                        date_of_birth=patient_data['PatientDateOfBirth'],
                        race=patient_data['PatientRace'],
                        marital_status=patient_data['PatientMaritalStatus'],
                        language=patient_data['PatientLanguage'],
                        poverty_percentage=float(patient_data['PatientPopulationPercentageBelowPoverty'])
                    )
                    self.patients[patient.id] = patient
        
        # Load admissions data
        admissions_file = os.path.join(patient_data_dir, "AdmissionsCorePopulatedTable.txt")
        if os.path.exists(admissions_file):
            with open(admissions_file, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
                headers = lines[0].strip().split('\t')
                for line in lines[1:]:
                    values = line.strip().split('\t')
                    admission_data = dict(zip(headers, values))
                    admission = Admission(
                        id=admission_data['AdmissionID'],
                        patient_id=admission_data['PatientID'],
                        start_date=admission_data['AdmissionStartDate'],
                        end_date=admission_data['AdmissionEndDate']
                    )
                    if admission.patient_id not in self.admissions:
                        self.admissions[admission.patient_id] = []
                    self.admissions[admission.patient_id].append(admission)
        
        # Load diagnoses data
        diagnoses_file = os.path.join(patient_data_dir, "AdmissionsDiagnosesCorePopulatedTable.txt")
        if os.path.exists(diagnoses_file):
            with open(diagnoses_file, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
                headers = lines[0].strip().split('\t')
                for line in lines[1:]:
                    values = line.strip().split('\t')
                    diagnosis_data = dict(zip(headers, values))
                    diagnosis = Diagnosis(
                        patient_id=diagnosis_data['PatientID'],
                        admission_id=diagnosis_data['AdmissionID'],
                        code=diagnosis_data['PrimaryDiagnosisCode'],
                        description=diagnosis_data['PrimaryDiagnosisDescription']
                    )
                    key = f"{diagnosis.patient_id}_{diagnosis.admission_id}"
                    if key not in self.diagnoses:
                        self.diagnoses[key] = []
                    self.diagnoses[key].append(diagnosis)
        
        # Load lab results data
        labs_file = os.path.join(patient_data_dir, "LabsCorePopulatedTable.txt")
        if os.path.exists(labs_file):
            with open(labs_file, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
                headers = lines[0].strip().split('\t')
                for line in lines[1:]:
                    values = line.strip().split('\t')
                    lab_data = dict(zip(headers, values))
                    try:
                        lab_result = LabResult(
                            patient_id=lab_data['PatientID'],
                            admission_id=lab_data['AdmissionID'],
                            name=lab_data['LabName'],
                            value=float(lab_data['LabValue']),
                            units=lab_data['LabUnits'],
                            date_time=lab_data['LabDateTime']
                        )
                        key = f"{lab_result.patient_id}_{lab_result.admission_id}"
                        if key not in self.lab_results:
                            self.lab_results[key] = []
                        self.lab_results[key].append(lab_result)
                    except ValueError:
                        # Skip lab results with non-numeric values
                        logger.warning(f"Skipping lab result with non-numeric value: {lab_data}")
        
        logger.info(f"Loaded {len(self.patients)} patients, {sum(len(admissions) for admissions in self.admissions.values())} admissions, "
                   f"{sum(len(diagnoses) for diagnoses in self.diagnoses.values())} diagnoses, "
                   f"{sum(len(labs) for labs in self.lab_results.values())} lab results")
    
    def get_patient_data(self, patient_id: str) -> Dict[str, Any]:
        """Get comprehensive data for a specific patient"""
        if patient_id not in self.patients:
            return {"error": "Patient not found"}
        
        patient = self.patients[patient_id]
        patient_admissions = self.admissions.get(patient_id, [])
        
        # Get diagnoses and lab results for each admission
        admission_details = []
        for admission in patient_admissions:
            admission_key = f"{patient_id}_{admission.id}"
            admission_diagnoses = self.diagnoses.get(admission_key, [])
            admission_labs = self.lab_results.get(admission_key, [])
            
            admission_details.append({
                "admission_id": admission.id,
                "start_date": admission.start_date,
                "end_date": admission.end_date,
                "diagnoses": [{"code": d.code, "description": d.description} for d in admission_diagnoses],
                "lab_results": [{"name": l.name, "value": l.value, "units": l.units, "date_time": l.date_time} for l in admission_labs]
            })
        
        return {
            "patient": patient.dict(),
            "admissions": admission_details
        }
    
    async def generate_diagnostic_plan(self, symptoms: List[str], patient_id: str = None) -> DiagnosticPlan:
        """Generate a diagnostic plan based on symptoms and patient data"""
        logger.info(f"Generating diagnostic plan for symptoms: {symptoms}")
        
        # Get patient data if provided
        patient_context = ""
        if patient_id and patient_id in self.patients:
            patient_data = self.get_patient_data(patient_id)
            patient_context = f"""
            PATIENT CONTEXT:
            {json.dumps(patient_data, indent=2)}
            """
        
        # Generate plan using LLM
        prompt = f"""
        Create a detailed diagnostic plan for a patient with the following symptoms:
        
        SYMPTOMS: {', '.join(symptoms)}
        
        {patient_context}
        
        Create a step-by-step diagnostic plan with 5-7 steps that would help thoroughly evaluate these symptoms and reach a diagnosis.
        """
        
        system_prompt = """
        You are an expert clinical diagnostician. Create a detailed diagnostic plan with 5-7 steps.
        Each step should have an ID, description, and a specific query to evaluate.
        Also provide a rationale explaining why this diagnostic approach is appropriate.
        
        Focus on a systematic approach that considers:
        1. Initial assessment of symptoms
        2. Relevant medical history and risk factors
        3. Physical examination findings to look for
        4. Laboratory tests to consider
        5. Imaging or specialized tests if needed
        6. Differential diagnosis evaluation
        7. Treatment considerations
        """
        
        # Pydantic models for diagnostic plan response
        class DiagnosticStepResponse(BaseModel):
            id: str
            description: str 
            query: str

        class DiagnosticPlanResponse(BaseModel):
            steps: List[DiagnosticStepResponse]
            rationale: str
        
        try:
            # This would call the actual LLM in production
            # For now, we'll simulate the response
            
            # Example diagnostic plan for demonstration
            if "fatigue" in symptoms and "joint pain" in symptoms:
                # Autoimmune-focused plan
                plan_data = DiagnosticPlanResponse(
                    steps=[
                        DiagnosticStepResponse(id="step1", description="Initial symptom assessment", 
                                              query="Evaluate fatigue and joint pain characteristics, duration, and pattern"),
                        DiagnosticStepResponse(id="step2", description="Medical history review", 
                                              query="Review patient history for autoimmune risk factors"),
                        DiagnosticStepResponse(id="step3", description="Physical examination", 
                                              query="Assess joints, skin, and lymph nodes"),
                        DiagnosticStepResponse(id="step4", description="Initial laboratory testing", 
                                              query="CBC, CMP, ESR, CRP, ANA, RF"),
                        DiagnosticStepResponse(id="step5", description="Specialized autoimmune testing", 
                                              query="Anti-CCP, anti-dsDNA, complement levels"),
                        DiagnosticStepResponse(id="step6", description="Differential diagnosis", 
                                              query="Evaluate for rheumatoid arthritis, SLE, and fibromyalgia"),
                        DiagnosticStepResponse(id="step7", description="Treatment considerations", 
                                              query="DMARD options and symptom management")
                    ],
                    rationale="This diagnostic plan focuses on evaluating fatigue and joint pain with an emphasis on autoimmune conditions, which are common causes of these symptoms. The plan includes a systematic approach from initial assessment to specialized testing and treatment considerations."
                )
            elif "weight loss" in symptoms and "abdominal pain" in symptoms:
                # Oncology-focused plan
                plan_data = DiagnosticPlanResponse(
                    steps=[
                        DiagnosticStepResponse(id="step1", description="Initial symptom assessment", 
                                              query="Evaluate weight loss amount, timeline, and abdominal pain characteristics"),
                        DiagnosticStepResponse(id="step2", description="Medical history review", 
                                              query="Review patient history for cancer risk factors"),
                        DiagnosticStepResponse(id="step3", description="Physical examination", 
                                              query="Abdominal exam, lymph node assessment"),
                        DiagnosticStepResponse(id="step4", description="Initial laboratory testing", 
                                              query="CBC, CMP, tumor markers (CA-19-9, CEA)"),
                        DiagnosticStepResponse(id="step5", description="Imaging studies", 
                                              query="Abdominal CT scan with contrast"),
                        DiagnosticStepResponse(id="step6", description="Endoscopic evaluation", 
                                              query="Upper endoscopy and colonoscopy"),
                        DiagnosticStepResponse(id="step7", description="Differential diagnosis", 
                                              query="Evaluate for pancreatic cancer, colorectal cancer, and IBD")
                    ],
                    rationale="This diagnostic plan addresses the concerning combination of weight loss and abdominal pain, which could indicate malignancy. The plan includes appropriate imaging, laboratory testing, and endoscopic procedures to evaluate for gastrointestinal or pancreatic cancer."
                )
            else:
                # General diagnostic plan
                plan_data = DiagnosticPlanResponse(
                    steps=[
                        DiagnosticStepResponse(id="step1", description="Initial symptom assessment", 
                                              query=f"Evaluate {', '.join(symptoms)} characteristics, duration, and pattern"),
                        DiagnosticStepResponse(id="step2", description="Medical history review", 
                                              query="Review patient history for relevant risk factors"),
                        DiagnosticStepResponse(id="step3", description="Physical examination", 
                                              query="Focused physical exam based on symptoms"),
                        DiagnosticStepResponse(id="step4", description="Initial laboratory testing", 
                                              query="CBC, CMP, and symptom-specific tests"),
                        DiagnosticStepResponse(id="step5", description="Imaging if indicated", 
                                              query="Determine appropriate imaging based on symptoms"),
                        DiagnosticStepResponse(id="step6", description="Differential diagnosis", 
                                              query=f"Evaluate common causes of {', '.join(symptoms)}")
                    ],
                    rationale=f"This diagnostic plan provides a systematic approach to evaluating {', '.join(symptoms)}. It includes a thorough history, physical examination, and appropriate testing to narrow down the differential diagnosis."
                )
            
            steps = []
            for step_data in plan_data.steps:
                steps.append(DiagnosticStep(
                    id=step_data.id,
                    description=step_data.description,
                    query=step_data.query,
                    completed=False,
                    sources=[],
                    findings=""
                ))
            
            return DiagnosticPlan(
                steps=steps,
                rationale=plan_data.rationale
            )
        except Exception as e:
            logger.error(f"Failed to generate diagnostic plan: {str(e)}")
            # Fallback plan
            return DiagnosticPlan(
                steps=[
                    DiagnosticStep(id="step1", description="Initial symptom assessment", 
                                  query=f"Evaluate {', '.join(symptoms)} characteristics"),
                    DiagnosticStep(id="step2", description="Medical history review", 
                                  query="Review patient history"),
                    DiagnosticStep(id="step3", description="Physical examination", 
                                  query="Perform focused physical exam"),
                    DiagnosticStep(id="step4", description="Basic laboratory testing", 
                                  query="Order CBC and CMP"),
                    DiagnosticStep(id="step5", description="Differential diagnosis", 
                                  query=f"Consider common causes of {', '.join(symptoms)}")
                ],
                rationale=f"Fallback diagnostic plan to evaluate {', '.join(symptoms)} systematically"
            )
    
    async def execute_diagnostic_step(self, step: DiagnosticStep, patient_id: str = None) -> DiagnosticStep:
        """Execute a single diagnostic step"""
        logger.info(f"Executing diagnostic step: {step.id} - {step.description}")
        
        # Log the start of the step execution
        debug_logger.log_step_start(step.id, step.description)
        
        # Initialize findings with empty string to avoid None values
        if step.findings is None:
            step.findings = ""
        
        # Get patient data if provided
        patient_data = None
        if patient_id and patient_id in self.patients:
            patient_data = self.get_patient_data(patient_id)
        
        # Query clinical guidelines based on the step query
        guideline_results = await self.guidelines.search(step.query, MAX_SOURCES_PER_STEP)
        
        # Process guideline sources
        sources = []
        for i, result in enumerate(guideline_results):
            source = ClinicalSource(
                type="guideline",
                id=result.get("id", f"guideline_{i}"),
                title=result.get("title", "Clinical Guideline"),
                content=result.get("content", ""),
                relevance_score=result.get("relevance_score", 0.8),
                access_time=datetime.now().isoformat()
            )
            sources.append(source)
        
        # If patient data is available, add it as a source
        if patient_data:
            patient_source = ClinicalSource(
                type="patient_data",
                id=patient_id,
                title=f"Patient Data for {patient_id}",
                content=json.dumps(patient_data, indent=2),
                relevance_score=1.0,
                access_time=datetime.now().isoformat()
            )
            sources.append(patient_source)
        
        # Extract findings from sources
        if sources:
            findings_prompt = f"""
            Extract the key findings related to the following diagnostic step:
            
            DIAGNOSTIC STEP: {step.description}
            QUERY: {step.query}
            
            Based on these sources:
            
            {json.dumps([s.dict() for s in sources], indent=2)}
            
            Summarize the key findings in 3-5 detailed paragraphs. Include specific facts, data points, and important details from the sources.
            Focus on clinically relevant information and note any contradictions between sources.
            
            Be comprehensive and thorough in your extraction, as these findings will be used to generate a diagnostic report later.
            """
            
            # This would call the actual LLM in production
            # For now, we'll simulate the findings based on the step
            
            if "Initial symptom assessment" in step.description:
                findings = """
                The initial assessment of the patient's symptoms reveals several key characteristics. The symptoms have been present for approximately 3 months, with gradual worsening over time. The patient reports moderate to severe fatigue that is worse in the mornings and improves slightly throughout the day. Joint pain primarily affects the small joints of the hands and wrists bilaterally, with morning stiffness lasting more than 1 hour. The patient also notes occasional low-grade fever and general malaise.

                The pattern of symptoms suggests a chronic, progressive condition rather than an acute process. The symmetrical joint involvement, prolonged morning stiffness, and accompanying fatigue are classic features seen in inflammatory arthritides, particularly rheumatoid arthritis. The presence of low-grade fever may indicate an underlying inflammatory or autoimmune process.

                The impact on daily functioning has been significant, with the patient reporting difficulty with fine motor tasks such as buttoning clothes and opening jars. Sleep quality has been poor due to joint discomfort, potentially exacerbating the fatigue symptoms. These functional limitations and symptom patterns are important considerations for both diagnosis and treatment planning.
                """
            elif "Medical history review" in step.description:
                findings = """
                Review of the patient's medical history reveals several relevant factors. The patient has a family history of autoimmune conditions, with a mother diagnosed with Hashimoto's thyroiditis and a maternal aunt with systemic lupus erythematosus (SLE). This family history significantly increases the patient's risk for developing autoimmune conditions, as genetic predisposition plays an important role in autoimmune pathogenesis.

                The patient's past medical history includes recurrent sinusitis treated with multiple courses of antibiotics over the past five years, and a previous episode of unexplained rash two years ago that resolved spontaneously. The patient has no history of chronic infections, malignancy, or major surgeries. Current medications include only occasional over-the-counter NSAIDs for pain relief, which provide minimal benefit for the joint symptoms.

                Social history indicates the patient is a non-smoker with minimal alcohol consumption. The patient works as an office administrator, which involves significant computer use that has become increasingly difficult due to joint pain. No significant environmental exposures or recent travel were reported. The patient has not tried any complementary or alternative therapies for symptom management.
                """
            elif "Physical examination" in step.description:
                findings = """
                Physical examination of the patient reveals several significant findings. There is visible swelling and tenderness of the metacarpophalangeal (MCP) and proximal interphalangeal (PIP) joints bilaterally, with the right hand slightly more affected than the left. Mild synovial thickening is palpable in these joints. Range of motion in the wrists is limited by approximately 20% bilaterally, with pain at the extremes of motion. No deformities or nodules are present at this time.

                Examination of the skin shows no current rash, petechiae, or purpura. There is no evidence of psoriatic lesions or nail changes. Mild pallor of the conjunctivae suggests possible anemia. Lymph node examination reveals small, mobile, non-tender cervical lymphadenopathy. Cardiopulmonary examination is unremarkable with no murmurs, rubs, or abnormal breath sounds.

                Neurological examination shows intact sensation and strength in all extremities, with no evidence of neuropathy. There is no spinal tenderness or limitation in range of motion of the cervical or lumbar spine. The remainder of the physical examination, including abdominal and genitourinary systems, is within normal limits. The overall physical findings support an inflammatory arthritis primarily affecting the small joints of the hands, consistent with early rheumatoid arthritis or another inflammatory arthropathy.
                """
            elif "laboratory testing" in step.description:
                findings = """
                Initial laboratory testing reveals several abnormalities consistent with an inflammatory process. The complete blood count (CBC) shows mild normocytic anemia with hemoglobin of 11.2 g/dL, which is common in chronic inflammatory conditions. The white blood cell count is within normal limits at 7.8 x 10^9/L, with a slight lymphopenia of 1.1 x 10^9/L. Platelet count is mildly elevated at 450 x 10^9/L, reflecting the acute phase response.

                Inflammatory markers are significantly elevated, with an erythrocyte sedimentation rate (ESR) of 42 mm/hr and C-reactive protein (CRP) of 2.8 mg/dL, strongly supporting an active inflammatory process. Comprehensive metabolic panel (CMP) shows normal renal and hepatic function. Rheumatoid factor (RF) is positive at 78 IU/mL (reference range <14 IU/mL), and anti-cyclic citrullinated peptide (anti-CCP) antibodies are strongly positive at >250 U/mL, which has high specificity for rheumatoid arthritis.

                Antinuclear antibody (ANA) testing is positive at a titer of 1:160 with a speckled pattern, which can be seen in various autoimmune conditions including RA and SLE. Complement levels (C3 and C4) are within normal limits, and anti-double-stranded DNA (anti-dsDNA) antibodies are negative, making SLE less likely. Thyroid function tests are normal. These laboratory findings, particularly the strongly positive RF and anti-CCP antibodies in the context of inflammatory arthritis, are highly suggestive of rheumatoid arthritis.
                """
            elif "Differential diagnosis" in step.description:
                findings = """
                The differential diagnosis evaluation reveals rheumatoid arthritis (RA) as the most likely diagnosis based on the clinical presentation and laboratory findings. The patient's symmetrical small joint polyarthritis, morning stiffness exceeding one hour, elevated inflammatory markers, and strongly positive RF and anti-CCP antibodies fulfill the 2010 ACR/EULAR classification criteria for RA. The high titer of anti-CCP antibodies is particularly significant, as it has approximately 95% specificity for RA and indicates a more severe disease course with higher risk of erosive joint damage.

                Systemic lupus erythematosus (SLE) remains in the differential but is less likely given the absence of characteristic multi-system involvement. While the patient has a positive ANA, the titer is relatively low, and specific SLE markers such as anti-dsDNA antibodies are negative. Normal complement levels and the absence of renal involvement, serositis, or typical cutaneous manifestations further decrease the likelihood of SLE.

                Other conditions considered include psoriatic arthritis, which typically presents with distal interphalangeal joint involvement and accompanying skin manifestations, neither of which are present in this case. Viral arthritides (such as parvovirus B19 or hepatitis C-associated) typically have a more acute onset and are often self-limiting. Crystal arthropathies like gout or pseudogout usually present with monoarticular or oligoarticular involvement rather than the symmetrical polyarthritis seen in this patient. The overall clinical picture is most consistent with early, seropositive rheumatoid arthritis.
                """
            elif "Treatment considerations" in step.description:
                findings = """
                Treatment considerations for this patient with likely rheumatoid arthritis should follow a treat-to-target approach with the goal of clinical remission or low disease activity. Given the high-risk features (high-titer anti-CCP positivity, elevated inflammatory markers), early aggressive therapy is warranted to prevent joint damage and disability. The current ACR/EULAR guidelines recommend initiating disease-modifying antirheumatic drugs (DMARDs) immediately upon diagnosis.

                Methotrexate is the recommended first-line DMARD, typically started at 7.5-10 mg weekly and gradually titrated to 20-25 mg weekly as tolerated. Concomitant folic acid supplementation (1 mg daily) is recommended to reduce side effects. For patients with moderate to high disease activity, combination therapy may be considered, either with other conventional DMARDs (such as hydroxychloroquine and sulfasalazine in triple therapy) or with a biologic agent such as a TNF inhibitor (etanercept, adalimumab, infliximab).

                Symptom management should include short-term use of NSAIDs for pain and inflammation, with appropriate gastrointestinal prophylaxis if needed. A short course of low-dose corticosteroids (e.g., prednisone 5-10 mg daily) may be considered as a bridge until DMARDs take effect, typically in 6-12 weeks. Patient education regarding the chronic nature of RA, the importance of medication adherence, and joint protection techniques is essential. Physical therapy for joint range of motion exercises and strengthening should be incorporated into the treatment plan. Regular monitoring of disease activity, medication side effects, and comorbidities is crucial for optimal management.
                """
            else:
                findings = f"Analysis of the {step.description} indicates several important clinical considerations relevant to the diagnostic process. The available data suggests patterns consistent with inflammatory or autoimmune processes that warrant further investigation. Specific findings include abnormal laboratory values and symptom patterns that align with established diagnostic criteria for several potential conditions. These findings will help narrow the differential diagnosis and guide subsequent diagnostic steps."
            
            # Log the findings
            debug_logger.log_findings(
                self.current_session_id,
                step.id,
                findings,
                source=json.dumps([s.dict() for s in sources])
            )
        else:
            findings = "No relevant information found for this diagnostic step."
        
        # Update step
        step.completed = True
        step.sources = sources
        step.findings = findings
        
        # Log the completion of the step
        debug_logger.log_step_completion(
            self.current_session_id,
            step.id,
            "completed",
            summary=findings[:400] + "..." if len(findings) > 400 else findings,
            metadata={
                "num_sources": len(sources),
                "step_description": step.description
            }
        )
        
        return step
    
    async def execute_diagnostic_plan(self, plan: DiagnosticPlan, patient_id: str = None, update_callback=None) -> Tuple[DiagnosticPlan, List[ClinicalSource]]:
        """Execute the entire diagnostic plan"""
        logger.info("Starting diagnostic plan execution")
        
        all_sources = []
        
        # Execute steps in parallel with a limit on concurrency
        async def execute_step_task(step):
            updated_step = await self.execute_diagnostic_step(step, patient_id)
            return updated_step
        
        # Process steps in batches to limit concurrency
        steps = plan.steps.copy()
        updated_steps = []
        
        for i in range(0, len(steps), MAX_PARALLEL_PROCESSES):
            batch = steps[i:i + MAX_PARALLEL_PROCESSES]
            tasks = [execute_step_task(step) for step in batch]
            batch_results = await asyncio.gather(*tasks)
            updated_steps.extend(batch_results)
            
            # Update plan with completed steps so far
            current_plan = DiagnosticPlan(
                steps=[*updated_steps, *steps[i + MAX_PARALLEL_PROCESSES:]],
                rationale=plan.rationale
            )
            
            # Call the callback with the updated plan if provided
            if update_callback:
                await update_callback(current_plan)
        
        # Update plan with completed steps
        plan.steps = updated_steps
        
        # Collect all sources
        for step in plan.steps:
            all_sources.extend(step.sources)
        
        return plan, all_sources
    
    async def generate_diagnostic_result(self, symptoms: List[str], plan: DiagnosticPlan, sources: List[ClinicalSource]) -> DiagnosticResult:
        """Generate a diagnostic result based on the executed plan"""
        logger.info("Generating diagnostic result")
        
        # Prepare findings from all steps
        findings_summary = "\n\n".join([
            f"## {step.description}\n\n{step.findings}" 
            for step in plan.steps if step.findings
        ])
        
        # Generate diagnostic result
        diagnostic_prompt = f"""
        Generate a comprehensive diagnostic assessment based on the following information:
        
        SYMPTOMS: {', '.join(symptoms)}
        
        DIAGNOSTIC FINDINGS:
        {findings_summary}
        
        Provide a detailed diagnostic assessment including:
        1. Primary diagnosis with confidence level
        2. Supporting evidence for this diagnosis
        3. Differential diagnoses to consider
        4. Recommended additional tests if needed
        5. Treatment recommendations based on current guidelines
        """
        
        # This would call the actual LLM in production
        # For now, we'll simulate the diagnostic result
        
        # Check for patterns in the findings to determine diagnosis
        if any("rheumatoid arthritis" in step.findings.lower() for step in plan.steps if step.findings):
            # RA diagnosis
            result = DiagnosticResult(
                diagnosis_name="Rheumatoid Arthritis",
                diagnosis_code="M05.79",
                confidence=0.92,
                supporting_evidence=[
                    "Symmetrical polyarthritis affecting small joints of hands",
                    "Morning stiffness lasting > 1 hour",
                    "Elevated inflammatory markers (ESR 42 mm/hr, CRP 2.8 mg/dL)",
                    "Strongly positive RF (78 IU/mL) and anti-CCP antibodies (>250 U/mL)",
                    "Family history of autoimmune conditions"
                ],
                differential_diagnoses=[
                    {"name": "Systemic Lupus Erythematosus", "likelihood": "Low", "key_factors": "Positive ANA but negative anti-dsDNA, normal complement levels, absence of typical organ involvement"},
                    {"name": "Psoriatic Arthritis", "likelihood": "Very Low", "key_factors": "No skin or nail changes, no DIP joint involvement"},
                    {"name": "Viral Arthritis", "likelihood": "Very Low", "key_factors": "Chronic progressive course rather than acute onset"}
                ],
                recommended_tests=[
                    "Hand/wrist X-rays to assess for erosions",
                    "Ultrasound of affected joints to evaluate synovitis",
                    "HLA-B27 to help rule out seronegative spondyloarthropathies",
                    "Hepatitis B and C serology prior to immunosuppressive therapy"
                ],
                recommended_treatments=[
                    "Methotrexate 15 mg weekly with folic acid 1 mg daily",
                    "Prednisone 10 mg daily for 4 weeks, then taper to 5 mg for 4 weeks, then discontinue",
                    "NSAIDs as needed for pain with appropriate GI prophylaxis",
                    "Referral to rheumatology for ongoing management",
                    "Physical therapy for joint protection techniques and exercises"
                ],
                clinical_trial_matches=[
                    {
                        "id": "NCT04134728",
                        "title": "Novel JAK Inhibitor for Early Rheumatoid Arthritis",
                        "phase": "Phase 3",
                        "location": "Multiple locations",
                        "contact": "research@arthritistrial.org",
                        "eligibility": "Early RA, anti-CCP positive, no prior biologic therapy"
                    },
                    {
                        "id": "NCT03922607",
                        "title": "Precision Medicine Approach to RA Treatment Selection",
                        "phase": "Phase 4",
                        "location": "University Medical Center",
                        "contact": "precision@umc.edu",
                        "eligibility": "New RA diagnosis, no contraindications to methotrexate"
                    }
                ]
            )
        elif any("leukemia" in step.findings.lower() for step in plan.steps if step.findings):
            # Leukemia diagnosis
            result = DiagnosticResult(
                diagnosis_name="Chronic Myeloid Leukemia",
                diagnosis_code="C92.10",
                confidence=0.88,
                supporting_evidence=[
                    "Fatigue and unintentional weight loss",
                    "Splenomegaly on physical examination",
                    "Leukocytosis with left shift",
                    "Presence of Philadelphia chromosome on cytogenetic testing",
                    "Elevated LDH and uric acid"
                ],
                differential_diagnoses=[
                    {"name": "Acute Myeloid Leukemia", "likelihood": "Moderate", "key_factors": "Absence of blast crisis, chronic rather than acute presentation"},
                    {"name": "Myelofibrosis", "likelihood": "Low", "key_factors": "No significant bone marrow fibrosis on biopsy"},
                    {"name": "Reactive Leukocytosis", "likelihood": "Very Low", "key_factors": "Presence of Philadelphia chromosome confirms neoplastic process"}
                ],
                recommended_tests=[
                    "BCR-ABL PCR quantification",
                    "Bone marrow biopsy with cytogenetics",
                    "HLA typing for potential stem cell transplant",
                    "Cardiac evaluation prior to TKI therapy"
                ],
                recommended_treatments=[
                    "Tyrosine kinase inhibitor therapy (imatinib 400 mg daily)",
                    "Allopurinol for tumor lysis prophylaxis",
                    "Referral to hematology-oncology",
                    "Genetic counseling"
                ],
                clinical_trial_matches=[
                    {
                        "id": "NCT03789942",
                        "title": "Novel TKI Combination for Newly Diagnosed CML",
                        "phase": "Phase 2",
                        "location": "Cancer Research Center",
                        "contact": "cml@cancerresearch.org",
                        "eligibility": "Newly diagnosed CML in chronic phase, no prior TKI therapy"
                    }
                ]
            )
        else:
            # Generic result
            result = DiagnosticResult(
                diagnosis_name="Undifferentiated Inflammatory Condition",
                diagnosis_code="M06.9",
                confidence=0.65,
                supporting_evidence=[
                    "Multiple inflammatory symptoms",
                    "Elevated inflammatory markers",
                    "Absence of definitive diagnostic criteria for specific conditions"
                ],
                differential_diagnoses=[
                    {"name": "Early Rheumatoid Arthritis", "likelihood": "Moderate", "key_factors": "Joint symptoms but incomplete criteria"},
                    {"name": "Undifferentiated Connective Tissue Disease", "likelihood": "Moderate", "key_factors": "Mixed features of several autoimmune conditions"},
                    {"name": "Viral Syndrome", "likelihood": "Low", "key_factors": "Chronic rather than self-limited course"}
                ],
                recommended_tests=[
                    "Complete autoimmune panel",
                    "Imaging of affected joints/organs",
                    "Consider referral to rheumatology"
                ],
                recommended_treatments=[
                    "NSAIDs for symptomatic relief",
                    "Close monitoring for evolution of symptoms",
                    "Consider hydroxychloroquine if symptoms persist"
                ]
            )
        
        return result
    
    async def match_clinical_trials(self, diagnosis: str, patient_id: str = None) -> List[Dict[str, Any]]:
        """Match patient to relevant clinical trials based on diagnosis"""
        logger.info(f"Matching clinical trials for diagnosis: {diagnosis}")
        
        # Get patient data if provided
        patient_data = None
        if patient_id and patient_id in self.patients:
            patient_data = self.get_patient_data(patient_id)
        
        # Query clinical trials database
        trial_results = await self.clinical_trials.search(diagnosis, MAX_SOURCES_PER_STEP)
        
        # Filter trials based on patient eligibility if patient data is available
        if patient_data:
            # This would implement actual eligibility matching logic
            # For now, we'll return all trials
            pass
        
        return trial_results
    
    async def generate_prior_authorization(self, diagnosis: str, treatment: str, patient_id: str) -> Dict[str, Any]:
        """Generate prior authorization request for insurance"""
        logger.info(f"Generating prior authorization for {treatment} for diagnosis {diagnosis}")
        
        if patient_id not in self.patients:
            return {"error": "Patient not found"}
        
        patient = self.patients[patient_id]
        
        # Basic prior authorization template
        auth_request = {
            "patient_information": {
                "name": f"Patient {patient_id[:8]}",  # Using part of ID as name for demo
                "date_of_birth": patient.date_of_birth,
                "insurance_id": f"INS{patient_id[:8]}",  # Simulated insurance ID
                "gender": patient.gender
            },
            "provider_information": {
                "name": "Dr. Primary Care",
                "npi": "1234567890",
                "facility": "Foresight Medical Clinic",
                "contact_phone": "555-123-4567",
                "contact_email": "provider@foresightclinic.example"
            },
            "service_request": {
                "diagnosis": diagnosis,
                "diagnosis_code": self._get_diagnosis_code(diagnosis),
                "requested_service": treatment,
                "service_code": self._get_service_code(treatment),
                "start_date": datetime.now().strftime("%Y-%m-%d"),
                "duration": "3 months",
                "frequency": self._get_treatment_frequency(treatment)
            },
            "clinical_justification": self._generate_clinical_justification(diagnosis, treatment, patient_id),
            "supporting_documentation": [
                "Clinical notes from patient encounter",
                "Relevant laboratory results",
                "Imaging reports if applicable"
            ]
        }
        
        return auth_request
    
    async def generate_specialist_referral(self, diagnosis: str, specialist_type: str, patient_id: str) -> Dict[str, Any]:
        """Generate specialist referral letter"""
        logger.info(f"Generating referral to {specialist_type} for diagnosis {diagnosis}")
        
        if patient_id not in self.patients:
            return {"error": "Patient not found"}
        
        patient = self.patients[patient_id]
        
        # Get recent lab results if available
        recent_labs = []
        for admission_id in self.admissions.get(patient_id, []):
            key = f"{patient_id}_{admission_id.id}"
            if key in self.lab_results:
                recent_labs.extend(self.lab_results[key])
        
        # Sort labs by date (most recent first)
        recent_labs.sort(key=lambda x: x.date_time, reverse=True)
        
        # Basic referral letter template
        referral = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "referring_provider": {
                "name": "Dr. Primary Care",
                "npi": "1234567890",
                "facility": "Foresight Medical Clinic",
                "contact_phone": "555-123-4567",
                "contact_email": "provider@foresightclinic.example"
            },
            "specialist": {
                "type": specialist_type,
                "facility": f"{specialist_type} Specialty Center"
            },
            "patient_information": {
                "name": f"Patient {patient_id[:8]}",  # Using part of ID as name for demo
                "date_of_birth": patient.date_of_birth,
                "gender": patient.gender,
                "contact_phone": "555-987-6543",  # Simulated
                "insurance": f"Insurance Plan {patient_id[-4:]}"  # Simulated
            },
            "referral_reason": {
                "diagnosis": diagnosis,
                "diagnosis_code": self._get_diagnosis_code(diagnosis),
                "reason_for_referral": self._get_referral_reason(diagnosis, specialist_type)
            },
            "clinical_information": {
                "history_of_present_illness": self._generate_history_of_present_illness(diagnosis, patient_id),
                "relevant_past_medical_history": self._generate_past_medical_history(patient_id),
                "current_medications": self._generate_current_medications(patient_id),
                "allergies": self._generate_allergies(patient_id),
                "physical_examination": self._generate_physical_exam(diagnosis),
                "recent_lab_results": [
                    {
                        "name": lab.name,
                        "value": lab.value,
                        "units": lab.units,
                        "date": lab.date_time,
                        "flag": "H" if self._is_lab_high(lab.name, lab.value) else 
                                "L" if self._is_lab_low(lab.name, lab.value) else "N"
                    } for lab in recent_labs[:10]  # Include up to 10 most recent labs
                ]
            },
            "requested_evaluation": self._get_requested_evaluation(diagnosis, specialist_type)
        }
        
        return referral
    
    # Helper methods for generating clinical documentation
    
    def _get_diagnosis_code(self, diagnosis: str) -> str:
        """Get ICD-10 code for diagnosis"""
        diagnosis_codes = {
            "Rheumatoid Arthritis": "M05.79",
            "Systemic Lupus Erythematosus": "M32.9",
            "Chronic Myeloid Leukemia": "C92.10",
            "Type 2 Diabetes": "E11.9",
            "Hypertension": "I10",
            "Asthma": "J45.909"
        }
        return diagnosis_codes.get(diagnosis, "R69")  # R69 is "Illness, unspecified"
    
    def _get_service_code(self, treatment: str) -> str:
        """Get service code for treatment"""
        # Simplified for demonstration
        if "methotrexate" in treatment.lower():
            return "J8610"
        elif "physical therapy" in treatment.lower():
            return "97110"
        elif "infusion" in treatment.lower():
            return "96365"
        else:
            return "99070"  # Generic supplies code
    
    def _get_treatment_frequency(self, treatment: str) -> str:
        """Get frequency for treatment"""
        if "methotrexate" in treatment.lower():
            return "Weekly"
        elif "daily" in treatment.lower():
            return "Daily"
        elif "monthly" in treatment.lower():
            return "Monthly"
        else:
            return "As directed"
    
    def _generate_clinical_justification(self, diagnosis: str, treatment: str, patient_id: str) -> str:
        """Generate clinical justification for prior authorization"""
        # This would be more sophisticated in production
        return f"Patient presents with {diagnosis} confirmed by clinical evaluation and laboratory testing. Standard first-line therapies have been ineffective or contraindicated. The requested treatment ({treatment}) is medically necessary according to current clinical guidelines and is expected to improve patient outcomes and quality of life."
    
    def _get_referral_reason(self, diagnosis: str, specialist_type: str) -> str:
        """Get reason for referral based on diagnosis and specialist type"""
        if specialist_type == "Rheumatology" and "Rheumatoid Arthritis" in diagnosis:
            return "Evaluation and management of newly diagnosed rheumatoid arthritis"
        elif specialist_type == "Hematology-Oncology" and "Leukemia" in diagnosis:
            return "Urgent evaluation and management of suspected chronic myeloid leukemia"
        else:
            return f"Evaluation and management of {diagnosis}"
    
    def _generate_history_of_present_illness(self, diagnosis: str, patient_id: str) -> str:
        """Generate history of present illness based on diagnosis"""
        if "Rheumatoid Arthritis" in diagnosis:
            return "Patient presents with a 3-month history of progressive joint pain and swelling, primarily affecting the small joints of the hands bilaterally. Associated symptoms include morning stiffness lasting >1 hour, fatigue, and occasional low-grade fever. Symptoms have significantly impacted daily activities and quality of life."
        elif "Leukemia" in diagnosis:
            return "Patient presents with a 2-month history of progressive fatigue, unintentional weight loss (15 pounds), night sweats, and easy bruising. Physical examination revealed splenomegaly and laboratory studies showed leukocytosis with left shift, prompting further evaluation."
        else:
            return f"Patient presents with symptoms consistent with {diagnosis}. Detailed evaluation was performed in the primary care setting, and findings warrant specialist assessment."
    
    def _generate_past_medical_history(self, patient_id: str) -> List[str]:
        """Generate past medical history for patient"""
        # This would pull from actual patient data in production
        return ["Hypertension", "Hyperlipidemia", "Appendectomy (2010)"]
    
    def _generate_current_medications(self, patient_id: str) -> List[str]:
        """Generate current medications for patient"""
        # This would pull from actual patient data in production
        return ["Lisinopril 10mg daily", "Atorvastatin 20mg daily", "Aspirin 81mg daily"]
    
    def _generate_allergies(self, patient_id: str) -> List[str]:
        """Generate allergies for patient"""
        # This would pull from actual patient data in production
        return ["Penicillin (hives)", "Sulfa drugs (rash)"]
    
    def _generate_physical_exam(self, diagnosis: str) -> str:
        """Generate physical examination findings based on diagnosis"""
        if "Rheumatoid Arthritis" in diagnosis:
            return "Vital signs stable. Musculoskeletal examination reveals bilateral synovitis of MCP and PIP joints with tenderness to palpation. Wrist range of motion limited by 20% bilaterally. No deformities present. Remainder of examination unremarkable."
        elif "Leukemia" in diagnosis:
            return "Vital signs: T 99.1°F, HR 92, BP 128/76, RR 18. General: pale appearance, mild distress. HEENT: no lymphadenopathy. Cardiopulmonary: unremarkable. Abdomen: spleen palpable 4cm below costal margin. Skin: scattered ecchymoses on extremities. Neurological: intact."
        else:
            return "Physical examination findings relevant to the diagnosis have been documented and are available upon request."
    
    def _get_requested_evaluation(self, diagnosis: str, specialist_type: str) -> List[str]:
        """Get requested evaluation items based on diagnosis and specialist"""
        if specialist_type == "Rheumatology" and "Rheumatoid Arthritis" in diagnosis:
            return [
                "Comprehensive rheumatologic evaluation",
                "Assessment of disease activity and prognosis",
                "Development of treatment plan",
                "Consideration of DMARD therapy",
                "Patient education regarding disease management"
            ]
        elif specialist_type == "Hematology-Oncology" and "Leukemia" in diagnosis:
            return [
                "Urgent comprehensive hematologic evaluation",
                "Bone marrow biopsy and cytogenetic analysis",
                "Staging and risk stratification",
                "Development of treatment plan",
                "Discussion of clinical trial options if appropriate"
            ]
        else:
            return [
                f"Comprehensive evaluation for {diagnosis}",
                "Development of specialist-guided treatment plan",
                "Recommendations for ongoing management"
            ]
    
    def _is_lab_high(self, lab_name: str, value: float) -> bool:
        """Check if lab value is high based on reference ranges"""
        # Simplified reference ranges for demonstration
        high_thresholds = {
            "METABOLIC: GLUCOSE": 100,
            "CBC: WHITE BLOOD CELLS": 10.5,
            "METABOLIC: CREATININE": 1.2,
            "URINALYSIS: RED BLOOD CELLS": 2,
            "ESR": 20,
            "CRP": 1.0
        }
        
        # Default to normal if reference range not defined
        threshold = high_thresholds.get(lab_name, float('inf'))
        return value > threshold
    
    def _is_lab_low(self, lab_name: str, value: float) -> bool:
        """Check if lab value is low based on reference ranges"""
        # Simplified reference ranges for demonstration
        low_thresholds = {
            "METABOLIC: GLUCOSE": 70,
            "CBC: HEMOGLOBIN": 12,
            "CBC: PLATELETS": 150,
            "METABOLIC: POTASSIUM": 3.5,
            "METABOLIC: SODIUM": 135
        }
        
        # Default to normal if reference range not defined
        threshold = low_thresholds.get(lab_name, float('-inf'))
        return value < threshold
