# Clinical Engine Guide

This document provides a guide to the Clinical Engine, covering its architecture, batch processing capabilities, and future enhancements.

## V3 Architecture

The Clinical Engine V3 uses a multi-step GPT-based clinical reasoning process to provide more accurate and context-aware results than previous versions.

### Multi-Step Clinical Reasoning Process

1.  **Stage 1: Comprehensive Patient Data Loading**: The engine loads the complete patient context, including demographics, medical history, encounters, and lab results.
2.  **Stage 2: Differential Diagnosis Generation**: A GPT model (`gpt-4.1-mini`) generates 3-5 ranked differential diagnoses based on the patient data.
3.  **Stage 3: Primary Diagnosis and Treatment Plan**: A second GPT model (`o4-mini`) creates a primary diagnosis and treatment plan, considering the differential diagnoses from the previous stage.
4.  **Stage 4: Additional Clinical Field Extraction**: The engine extracts specific fields like ICD-10 codes and encounter reasons.
5.  **Stage 5: SOAP Note Generation**: A SOAP note is automatically generated.
6.  **Stage 6: Automated Document Generation**: The engine can generate referral documents and prior authorization requests.
7.  **Stage 7: Database Persistence**: All results are saved to the appropriate tables in the database.

### Benefits of V3

- **Clinical Accuracy**: Leverages the medical knowledge of GPT models.
- **Context Awareness**: Considers the full patient history.
- **Structured Output**: Provides consistent JSON responses.
- **Auditability**: Saves all reasoning steps.

### Future Enhancements

The roadmap for the Clinical Engine includes:
- Integration with clinical decision trees and medical guidelines.
- Enhanced lab analysis and drug interaction checking.
- Probabilistic reasoning and risk factor analysis.
- Continuous learning from physician feedback.

## Batch Processing

The batch clinical engine processing system identifies patients with clinical transcripts but minimal existing clinical results and automatically generates comprehensive clinical results using the clinical engine API.

### How It Works

The system uses a script (`scripts/batch_clinical_engine_processing.ts`) to identify target encounters and process them through the clinical engine.

#### Patient Selection Criteria

The system selects encounters that have:
1. A transcript with a length greater than 100 characters.
2. Fewer than 3 differential diagnoses OR no primary encounter diagnosis.

### Usage

1.  **Prerequisites**: Make sure the database is set up with the `get_patients_for_clinical_engine()` function and that your `.env.local` file has the necessary environment variables.
2.  **Run the script**:
    ```bash
    npx ts-node scripts/batch_clinical_engine_processing.ts
    ```

### Safety Features

- **Rate Limiting**: 1-second delay between API calls.
- **Retry Logic**: Up to 3 attempts for failed API calls.
- **Data Validation**: Validates transcript length and verifies that results were created. 