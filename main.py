from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional # Ensure List and Optional are imported
import sys
import os

# Add project root to Python path to allow importing clinical_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from clinical_engine import (
    run_full_diagnostic,
    Patient, # Assuming Patient model is needed for request body or internal use
    DiagnosticResult, # This is the response model
    # Import other necessary models from clinical_engine if they are part of the API contract
    # For example, if the FHIR bundle directly maps to some Pydantic models in clinical_engine
)

app = FastAPI()

# Placeholder for FHIR Bundle model. 
# For a real implementation, this would be a more complex Pydantic model 
# representing a FHIR Bundle structure.
class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "collection"
    entry: List[Dict[str, Any]] = [] # Simplified: a list of FHIR resources

class RunDxRequest(BaseModel):
    patient_id: str
    transcript: str
    # patient_data_dict is the raw patient data dictionary.
    # CURRENT (MVP v0): This dictionary is expected to be pre-compiled by the frontend,
    # by fetching all relevant patient data from Supabase (or other EMR sources)
    # and bundling it into a single JSON object. This reuses existing frontend data-fetching logic.
    # FUTURE: This might be replaced or augmented by a FHIR Bundle, or the backend might
    # take more responsibility for fetching/constructing this data from patient_id and visit_ids.
    patient_data_dict: Dict[str, Any]
    # fhir_bundle: FHIRBundle # Placeholder for future FHIR-based input

# Dummy clients for the clinical engine - replace with actual client initializations
class DummyLLMClient:
    async def query(self, prompt: str, context: Optional[str] = None) -> Dict[str, Any]:
        # Simulate LLM response
        if "diagnostic plan" in prompt.lower():
            return {
                "steps": [
                    {"id": "step1", "description": "Symptom Analysis", "query": "Analyze symptoms"},
                    {"id": "step2", "description": "Lab Review", "query": "Review lab results"}
                ],
                "rationale": "Based on symptoms, a two-step plan is proposed."
            }
        elif "synthesize diagnosis" in prompt.lower():
            return {
                "diagnosis_name": "Simulated Diagnosis",
                "confidence": 0.85,
                "supporting_evidence": ["Evidence A from context", "Evidence B from plan"],
                "differential_diagnoses": [{"name": "Other Condition", "likelihood": "Low", "key_factors": "Key factor"}],
                "recommended_tests": ["Test X", "Test Y"],
                "recommended_treatments": ["Treatment Z"],
            }
        return {"error": "Unknown prompt type for dummy LLM"}

class DummyGuidelineClient:
    async def search(self, query: str, patient_data: Optional[Dict[str, Any]] = None, max_results: int = 1) -> tuple[str, list]:
        return f"Guideline content for {query}", [{"type": "guideline", "id": "guideline1", "title": "Relevant Guideline", "content": "Guideline detail..."}]

class DummyClinicalTrialClient:
    async def search(self, diagnosis: str, patient_data: Optional[Dict[str, Any]] = None, max_results: int = 1) -> list:
        return [{"id": "NCT12345", "title": f"Trial for {diagnosis}", "phase": "3", "location": "USA", "contact": "test@example.com", "eligibility": "Must have diagnosis"}]

llm_client = DummyLLMClient()
guideline_client = DummyGuidelineClient()
clinical_trial_client = DummyClinicalTrialClient()

@app.post("/run-dx", response_model=DiagnosticResult)
async def run_dx_endpoint(request: RunDxRequest):
    """
    Runs the full diagnostic pipeline.
    Accepts patient ID, transcript, and a dictionary of patient data.
    (Future: Will accept a FHIR Bundle)
    """
    try:
        # CURRENT (MVP v0): The endpoint relies on the frontend to supply a comprehensive
        # patient_data_dict. The backend (run_full_diagnostic) then uses this dictionary.
        # TODO (Future): Implement FHIR Bundle processing. When a fhir_bundle is provided,
        # it would be parsed here, and patient_data_dict might be constructed from it,
        # or the engine might be refactored to consume FHIR resources directly.

        # Ensure patient_data_dict contains the 'patient' key with at least 'id'
        # as expected by the current run_full_diagnostic structure
        # This is a temporary measure until FHIR bundle parsing is in place.
        if "patient" not in request.patient_data_dict or "id" not in request.patient_data_dict["patient"]:
             # If patient_id is provided in the request, use it to structure basic patient info
             if request.patient_id:
                 request.patient_data_dict["patient"] = {"id": request.patient_id, **request.patient_data_dict.get("patient", {})}
             else: # Or if no patient_id at all, this will likely fail downstream or should be handled
                 raise HTTPException(status_code=400, detail="patient_data_dict must contain 'patient' with an 'id', or patient_id must be provided in request.")
        elif request.patient_id and request.patient_data_dict["patient"].get("id") != request.patient_id:
            # Ensure consistency if both are provided
            raise HTTPException(status_code=400, detail=f"patient_id in request ({request.patient_id}) does not match patient.id in patient_data_dict ({request.patient_data_dict['patient'].get('id')}).")


        diagnostic_result = await run_full_diagnostic(
            patient_id=request.patient_id,
            transcript=request.transcript,
            patient_data_dict=request.patient_data_dict,
            llm_client=llm_client,
            guideline_client=guideline_client,
            clinical_trial_client=clinical_trial_client
        )
        return diagnostic_result
    except ValueError as ve: # Catching specific errors like circular reference or missing symptoms
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Log the exception for debugging
        print(f"Error in /run-dx endpoint: {e}")
        # Consider specific error logging for production
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

# To run this FastAPI app:
# uvicorn main:app --reload
#
# Example curl request:
# curl -X POST "http://127.0.0.1:8000/run-dx" -H "Content-Type: application/json" -d '{"patient_id": "patient123", "transcript": "Patient complains of fatigue and joint pain.", "patient_data_dict": {"patient": {"id": "patient123", "gender": "Female", "date_of_birth": "1980-01-01", "race": "Caucasian", "marital_status": "Married", "language": "English", "poverty_percentage": 150.0}, "visits": [{"id": "visit1", "patient_id": "patient123", "start_date": "2023-01-15T09:00:00Z", "end_date": "2023-01-15T09:30:00Z", "reason": "Routine checkup", "transcript": "Patient notes mild fatigue.", "soap_note": "S: Mild fatigue. O: Vitals stable. A: Possible viral infection. P: Rest and hydration."}], "lab_results": [{"patient_id": "patient123", "admission_id": "visit1", "name": "CBC", "value": "Normal", "units": "", "date_time": "2023-01-15T09:15:00Z"}]}}'
# curl -X POST "http://127.0.0.1:8000/run-dx" -H "Content-Type: application/json" -d '{"patient_id": "patient123", "transcript": "Patient complains of fatigue and joint pain.", "patient_data_dict": {"patient": {"id": "patient123", "gender": "Female", "date_of_birth": "1980-01-01", "race": "Caucasian", "marital_status": "Married", "language": "English", "poverty_percentage": 150.0}, "visits": [{"id": "visit1", "patient_id": "patient123", "start_date": "2023-01-15T09:00:00Z", "end_date": "2023-01-15T09:30:00Z", "reason": "Routine checkup", "transcript": "Patient notes mild fatigue.", "soap_note": "S: Mild fatigue. O: Vitals stable. A: Possible viral infection. P: Rest and hydration."}], "lab_results": [{"patient_id": "patient123", "admission_id": "visit1", "name": "CBC", "value": "Normal", "units": "", "date_time": "2023-01-15T09:15:00Z"}]}}' 