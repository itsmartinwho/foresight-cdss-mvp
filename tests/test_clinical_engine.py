import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock
import json
from typing import Dict, List, Optional, Any

from src.clinical_engine_prototype.engine import (
    ClinicalEngine,
    Patient,
    DiagnosticPlan,
    DiagnosticStep,
    DiagnosticResult,
    ClinicalSource,
    DifferentialDiagnosisItem,
    ClinicalTrialMatch,
    run_full_diagnostic # For integration test
)

# Dummy Clients for testing
@pytest.fixture
def mock_llm_client():
    client = AsyncMock()
    # Setup default mock behaviors for different prompts if needed
    async def query_side_effect(prompt: str, context: Optional[str] = None):
        if "Create a detailed diagnostic plan" in prompt:
            return {
                "steps": [
                    {"id": "step1_mock", "description": "Mock Symptom Analysis", "query": "Analyze mock symptoms"},
                    {"id": "step2_mock", "description": "Mock Lab Review", "query": "Review mock lab results"}
                ],
                "rationale": "Mock plan based on symptoms."
            }
        elif "Synthesize a diagnosis" in prompt:
            return {
                "diagnosis_name": "Mock Diagnosis",
                "confidence": 0.90,
                "supporting_evidence": ["Mock evidence A", "Mock evidence B"],
                "differential_diagnoses": [
                    DifferentialDiagnosisItem(name="Other Mock Condition", likelihood="Low", key_factors="Mock key factor").model_dump()
                ],
                "recommended_tests": ["Mock Test X"],
                "recommended_treatments": ["Mock Treatment Y"],
            }
        elif "Extract key findings" in prompt: # For execute_diagnostic_step
             return {
                "findings": "Mock findings extracted from sources.",
                "sources_used": ["source1", "source2"]
            }
        return {}
    client.query = query_side_effect
    return client

@pytest.fixture
def mock_guideline_client():
    client = AsyncMock()
    async def search_side_effect(query: str, patient_data: Optional[Dict[str, Any]] = None, max_results: int = 1):
        return f"Mock guideline content for {query}", [
            ClinicalSource(
                type="guideline", 
                id="guideline_mock1", 
                title="Mock Guideline", 
                content="Detailed mock guideline content...",
                relevance_score=0.9
            ).model_dump()
        ]
    client.search = search_side_effect
    return client

@pytest.fixture
def mock_clinical_trial_client():
    client = AsyncMock()
    async def search_side_effect(diagnosis: str, patient_data: Optional[Dict[str, Any]] = None, max_results: int = 1):
        return [
            ClinicalTrialMatch(
                id="NCT_mock123", 
                title=f"Mock Trial for {diagnosis}", 
                phase="2", 
                location="Mock Location", 
                contact="mock@example.com", 
                eligibility="Mock eligibility criteria"
            ).model_dump()
        ]
    client.search = search_side_effect
    return client

@pytest.fixture
def clinical_engine(mock_llm_client, mock_guideline_client, mock_clinical_trial_client):
    return ClinicalEngine(mock_llm_client, mock_guideline_client, mock_clinical_trial_client)

@pytest.fixture
def sample_patient_data_dict() -> Dict[str, Any]:
    return {
        "patient": {
            "id": "test_patient_001",
            "gender": "Female",
            "date_of_birth": "1985-05-15",
            "race": "Caucasian",
            "marital_status": "Married",
            "language": "English",
            "poverty_percentage": 120.5
        },
        "encounters": [],
        "lab_results": []
    }

@pytest.fixture
def sample_patient(sample_patient_data_dict) -> Patient:
    patient_model_data = sample_patient_data_dict["patient"].copy()
    patient_model_data['raw_data'] = sample_patient_data_dict
    return Patient(**patient_model_data)

# --- Unit Tests for Pipeline Stages ---

# Test Symptom Extraction
@pytest.mark.parametrize("transcript, expected_symptoms", [
    ("Patient complains of fatigue and joint pain.", ["fatigue", "joint pain"]),
    ("There is a headache and some nausea.", ["headache", "nausea"]),
    ("Shortness of breath noted, also a cough.", ["shortness of breath", "cough"]),
    ("No specific symptoms, patient feels generally unwell.", []),
    ("FATIGUE and JOINT PAIN all caps", ["fatigue", "joint pain"]),
    ("She has a rash and a fever.", ["rash", "fever"]),
    ("Complaining of fatigue, fatigue, and more fatigue.", ["fatigue"]),
    ("The patient mentioned abdominal pain and weight loss.", ["abdominal pain", "weight loss"])
])
def test_extract_symptoms_from_transcript(clinical_engine: ClinicalEngine, transcript: str, expected_symptoms: List[str]):
    # The current implementation of extract_symptoms_from_transcript is part of ClinicalEngine class
    # If it were a static method or standalone function, it could be called directly.
    # For now, testing via the engine instance.
    symptoms = clinical_engine.extract_symptoms_from_transcript(transcript)
    assert sorted(symptoms) == sorted(expected_symptoms)

# Test Plan Generation (Basic Structure)
@pytest.mark.asyncio
async def test_generate_diagnostic_plan(clinical_engine: ClinicalEngine, sample_patient: Patient):
    symptoms = ["fatigue", "joint pain"]
    plan = await clinical_engine.generate_diagnostic_plan(symptoms, sample_patient)
    assert isinstance(plan, DiagnosticPlan)
    assert len(plan.steps) > 0
    assert plan.rationale is not None
    # Check if mock LLM was called
    clinical_engine.llm.query.assert_called_once()
    call_args = clinical_engine.llm.query.call_args[0][0] # Get the prompt
    assert "fatigue" in call_args
    assert "joint pain" in call_args
    assert sample_patient.raw_data["patient"]["gender"] in call_args # Check if patient context was in prompt

# Test Plan Execution Step (Simplified)
@pytest.mark.asyncio
async def test_execute_diagnostic_step(clinical_engine: ClinicalEngine, sample_patient: Patient):
    test_step = DiagnosticStep(
        id="test_step_exec", 
        description="Test guideline lookup", 
        query="Lookup guidelines for arthritis"
    )
    
    # Mock the guideline client's search directly for this test for more specific assertion
    mock_guideline_response_content = "Guideline content for arthritis"
    mock_guideline_sources = [ClinicalSource(type="guideline", id="g1", title="Arthritis Guideline", content="...")]
    clinical_engine.guidelines.search = AsyncMock(return_value=(mock_guideline_response_content, mock_guideline_sources))
    
    # Mock the LLM query for findings extraction for this step
    mock_llm_findings = "Key findings: arthritis is common."
    async def llm_query_side_effect(prompt: str, context: Optional[str] = None):
        if "Extract key findings" in prompt:
            return {"findings": mock_llm_findings, "sources_used": [s.id for s in mock_guideline_sources]}
        return {}
    clinical_engine.llm.query = AsyncMock(side_effect=llm_query_side_effect)

    updated_step = await clinical_engine.execute_diagnostic_step(test_step, sample_patient)
    
    assert updated_step.completed is True
    assert updated_step.findings == mock_llm_findings
    assert len(updated_step.sources) == len(mock_guideline_sources)
    assert updated_step.sources[0].id == mock_guideline_sources[0].id
    
    clinical_engine.guidelines.search.assert_called_once_with(query=test_step.query, patient_data=sample_patient.raw_data, max_results=10)
    # Assert LLM was called for findings extraction
    clinical_engine.llm.query.assert_called_once()
    llm_call_args = clinical_engine.llm.query.call_args[0]
    assert "Extract key findings" in llm_call_args[0] # prompt
    assert mock_guideline_response_content in llm_call_args[1] # context

# Test Diagnosis Synthesis (Basic Structure)
@pytest.mark.asyncio
async def test_generate_diagnostic_result(clinical_engine: ClinicalEngine, sample_patient: Patient):
    symptoms = ["fever", "cough"]
    # Create a dummy plan with one completed step
    completed_step = DiagnosticStep(
        id="s1", 
        description="Chest X-Ray", 
        query="", 
        completed=True, 
        findings="Shows signs of pneumonia.",
        sources=[ClinicalSource(type="patient_data", id="pxr1", title="CXR Report", content="Pneumonia findings")]
    )
    plan = DiagnosticPlan(steps=[completed_step], rationale="Plan for respiratory symptoms")
    all_sources = completed_step.sources

    # Reset and re-configure mock LLM for this specific test if needed
    async def llm_diag_side_effect(prompt: str, context: Optional[str] = None):
        return {
            "diagnosis_name": "Pneumonia",
            "confidence": 0.95,
            "supporting_evidence": ["CXR shows signs of pneumonia."],
            "differential_diagnoses": [{"name": "Bronchitis", "likelihood": "Medium", "key_factors": "Less severe"}],
            "recommended_tests": ["Sputum culture"],
            "recommended_treatments": ["Antibiotics"],
        }
    clinical_engine.llm.query = AsyncMock(side_effect=llm_diag_side_effect)

    result = await clinical_engine.generate_diagnostic_result(symptoms, plan, all_sources, sample_patient)
    
    assert isinstance(result, DiagnosticResult)
    assert result.diagnosis_name == "Pneumonia"
    assert result.confidence == 0.95
    assert "CXR shows signs of pneumonia." in result.supporting_evidence
    assert len(result.differential_diagnoses) > 0
    assert result.differential_diagnoses[0].name == "Bronchitis"
    clinical_engine.llm.query.assert_called_once()
    call_args = clinical_engine.llm.query.call_args[0]
    assert "Synthesize a diagnosis" in call_args[0]
    assert "Pneumonia findings" in call_args[1] # Context should include findings
    assert "fever" in call_args[1] # And symptoms

# --- Integration Test for run_full_diagnostic ---
@pytest.mark.asyncio
async def test_run_full_diagnostic_end_to_end(
    mock_llm_client, 
    mock_guideline_client, 
    mock_clinical_trial_client,
    sample_patient_data_dict
):
    patient_id = sample_patient_data_dict["patient"]["id"]
    transcript = "Patient reports persistent cough and high fever for three days."

    # Configure mock LLM responses for each stage of run_full_diagnostic
    # This allows us to trace the flow and assert intermediate calls if necessary
    plan_generation_response = {
        "steps": [
            {"id": "integ_step1", "description": "Analyze fever and cough", "query": "Inquire about fever, cough details"},
            {"id": "integ_step2", "description": "Check vitals and history", "query": "Review vitals, patient history for respiratory illness"}
        ],
        "rationale": "Initial plan for fever and cough."
    }
    findings_extraction_response_step1 = {"findings": "High fever (102F), productive cough.", "sources_used": ["guideline_integ1"]}
    findings_extraction_response_step2 = {"findings": "History of asthma, current O2 sat 95%.", "sources_used": ["guideline_integ2"]}
    diagnosis_synthesis_response = {
        "diagnosis_name": "Probable Pneumonia",
        "confidence": 0.88,
        "supporting_evidence": ["High fever, productive cough", "History of asthma"],
        "differential_diagnoses": [
            DifferentialDiagnosisItem(name="Acute Bronchitis", likelihood="Medium", key_factors="Productive cough, fever, but CXR would differentiate").model_dump()
        ],
        "recommended_tests": ["Chest X-Ray", "Sputum Culture"],
        "recommended_treatments": ["Amoxicillin 1g TID", "Rest and hydration"],
        # Clinical trials are mocked separately by mock_clinical_trial_client
    }

    # Side effect function for mock_llm_client.query
    async def llm_query_router(prompt: str, context: Optional[str] = None):
        if "Create a detailed diagnostic plan" in prompt:
            # Ensure symptoms from transcript are in prompt
            assert "cough" in prompt.lower()
            assert "fever" in prompt.lower()
            return plan_generation_response
        elif "Extract key findings from the following sources for the step: 'Analyze fever and cough'" in prompt:
            return findings_extraction_response_step1
        elif "Extract key findings from the following sources for the step: 'Check vitals and history'" in prompt:
            return findings_extraction_response_step2
        elif "Synthesize a diagnosis based on the patient's symptoms, completed diagnostic plan, and supporting evidence" in prompt:
            # Check if findings from previous steps are in the context for diagnosis
            assert "High fever (102F), productive cough." in context
            assert "History of asthma, current O2 sat 95%." in context
            return diagnosis_synthesis_response
        raise ValueError(f"Unhandled LLM prompt in test: {prompt[:100]}...")

    mock_llm_client.query = AsyncMock(side_effect=llm_query_router)
    
    # Mock guideline client to return specific sources expected by LLM mock for findings
    async def guideline_search_router(query: str, patient_data: Optional[Dict[str, Any]] = None, max_results: int = 1):
        if "Inquire about fever, cough details" in query:
            return "Content for fever/cough", [ClinicalSource(type="guideline", id="guideline_integ1", title="Fever/Cough Guideline", content="...").model_dump()]
        elif "Review vitals, patient history for respiratory illness" in query:
            return "Content for vitals/history", [ClinicalSource(type="guideline", id="guideline_integ2", title="Vitals/History Guideline", content="...").model_dump()]
        return "Default guideline content", []
    mock_guideline_client.search = AsyncMock(side_effect=guideline_search_router)
    
    # Mock clinical trial client to return an empty list or specific items if needed for assertion
    mock_clinical_trial_client.search = AsyncMock(return_value=[
        ClinicalTrialMatch(id="NCT_integ_trial", title="Trial for Pneumonia", phase="3", location="Online", contact="test@test.com", eligibility="Confirmed Pneumonia").model_dump()
    ])

    result = await run_full_diagnostic(
        patient_id=patient_id,
        transcript=transcript,
        patient_data_dict=sample_patient_data_dict,
        llm_client=mock_llm_client,
        guideline_client=mock_guideline_client,
        clinical_trial_client=mock_clinical_trial_client
    )

    assert isinstance(result, DiagnosticResult)
    assert result.diagnosis_name == "Probable Pneumonia"
    assert result.confidence == 0.88
    assert "Chest X-Ray" in result.recommended_tests
    assert len(result.clinical_trial_matches) > 0
    assert result.clinical_trial_matches[0].id == "NCT_integ_trial"

    # Assert that the LLM was called multiple times (plan, each step, diagnosis)
    assert mock_llm_client.query.call_count >= 3 # At least plan, 2 steps, diagnosis
    # Assert guideline client was called for steps
    assert mock_guideline_client.search.call_count == 2 # For the two steps in the plan
    # Assert clinical trial client was called
    mock_clinical_trial_client.search.assert_called_once_with(diagnosis="Probable Pneumonia", patient_data=sample_patient_data_dict, max_results=5)


# Example of how to run tests:
# pytest test_clinical_engine.py