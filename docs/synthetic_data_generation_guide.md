# Synthetic Data Generation Guide for Foresight CDSS

## Overview
This guide provides instructions for an LLM to generate synthetic clinical data for the Foresight CDSS system.
The LLM will receive a CSV export of existing patient and encounter data. For each encounter in the CSV, the LLM should generate new associated clinical data as specified below.

## Input Data Context
The LLM will be provided with rows from a data export. Each row represents an **existing encounter** and includes the following key identifiers from the database, which **MUST be used** to link the newly generated data:
- `patient_supabase_id`: The Supabase UUID of the patient.
- `encounter_supabase_id`: The Supabase UUID of the specific encounter.
- Various demographic and existing encounter details to provide context.

## Fields to Generate Synthetically
For each provided encounter (`encounter_supabase_id`), the LLM must generate the following:

### 1. Updates for the Existing Encounter Record
These fields should be generated to update the existing encounter identified by `encounter_supabase_id`.

- **`reason_code`**:
    - **Type**: `TEXT`
    - **Description**: Medical code for the encounter reason (e.g., SNOMED CT, ICD-10).
    - **Example**: `"185349003"` (Streptococcal sore throat)
- **`reason_display_text`**:
    - **Type**: `TEXT`
    - **Description**: Human-readable reason for the visit.
    - **Example**: `"Patient presents with sore throat and fever for 3 days."`
- **`transcript`**:
    - **Type**: `TEXT`
    - **Description**: A realistic, detailed transcript of the patient-clinician interaction during the encounter.
    - **Example**: `"Doctor: Good morning, how are you feeling today?\nPatient: I've had this terrible sore throat..."` (Ensure newlines are properly escaped if the final JSON is a single string).
- **`soap_note`**:
    - **Type**: `TEXT`
    - **Description**: A structured clinical note in SOAP format (Subjective, Objective, Assessment, Plan).
    - **Example**: `"S: Patient complains of sore throat x3 days...\nO: Vital signs...\nA: Acute pharyngitis...\nP: Amoxicillin..."`
- **`observations`**: (This field is `TEXT` in the `encounters` table)
    - **Type**: `TEXT`
    - **Description**: General clinical observations made during the encounter not captured elsewhere.
    - **Example**: `"Patient appears ill but not in acute distress. Mild dehydration noted. Positive rapid strep test."`
- **`treatments`**:
    - **Type**: `JSONB` (The LLM should generate a JSON array of objects as a string)
    - **Description**: An array of treatment objects. Each object should detail a specific treatment.
    - **Example JSON structure for the array**:
      ```json
      [
        {
          "treatment_name": "Amoxicillin",
          "treatment_type": "medication",
          "dosage": "500mg",
          "route": "PO",
          "frequency": "TID",
          "duration": "10 days",
          "instructions": "Take with food",
          "prescribed_date": "YYYY-MM-DD"
        },
        {
          "treatment_name": "Rest and hydration",
          "treatment_type": "lifestyle",
          "instructions": "Get plenty of rest and drink warm fluids"
        }
      ]
      ```

### 2. New Associated `conditions` Records
For each encounter, generate one or more related condition records. Each condition record is an object.

- **`code`**:
    - **Type**: `TEXT`
    - **Description**: Standardized medical code (e.g., ICD-10, SNOMED CT).
    - **Example**: `"J02.0"`
- **`description`**:
    - **Type**: `TEXT`
    - **Description**: Human-readable diagnosis name.
    - **Example**: `"Streptococcal pharyngitis"`
- **`category`**:
    - **Type**: `TEXT`
    - **Description**: Must be either `'encounter-diagnosis'` (for conditions diagnosed during this encounter) or `'problem-list-item'` (for pre-existing or chronic conditions relevant to this encounter).
    - **Example**: `"encounter-diagnosis"`
- **`clinical_status`**:
    - **Type**: `TEXT`
    - **Description**: FHIR Condition.clinicalStatus.
    - **Allowed Values**: `'active'`, `'recurrence'`, `'relapse'`, `'inactive'`, `'remission'`, `'resolved'`. (Default to `'active'` if unsure).
    - **Example**: `"active"`
- **`verification_status`**:
    - **Type**: `TEXT`
    - **Description**: FHIR Condition.verificationStatus.
    - **Allowed Values**: `'unconfirmed'`, `'provisional'`, `'differential'`, `'confirmed'`, `'refuted'`, `'entered-in-error'`. (Default to `'confirmed'` if unsure).
    - **Example**: `"confirmed"`
- **`onset_date`**:
    - **Type**: `DATE`
    - **Description**: Date the condition started (format: `YYYY-MM-DD`). Must be on or before the encounter date.
    - **Example**: `"2023-10-23"`
- **`note`**:
    - **Type**: `TEXT` (Optional)
    - **Description**: Additional clinical notes about this specific condition.
    - **Example**: `"Rapid strep test was positive."`

### 3. New Associated `lab_results` Records
For each encounter, generate plausible lab results. Each lab result is an object.

- **`name`**:
    - **Type**: `TEXT`
    - **Description**: Name or code of the lab test (e.g., LOINC).
    - **Example**: `"Hemoglobin A1c"`, `"Rapid Strep Test"`
- **`value`**:
    - **Type**: `TEXT`
    - **Description**: The result of the lab test.
    - **Example**: `"7.2"`, `"Positive"`, `"120"`
- **`value_type`**:
    - **Type**: `TEXT`
    - **Description**: Helps interpret the `value` field.
    - **Allowed Values**: `'numeric'`, `'string'`, `'coded'`, `'boolean'`, `'datetime'`.
    - **Example**: `"numeric"` for `"7.2"`, `"string"` for `"Positive"`
- **`units`**:
    - **Type**: `TEXT` (Optional, use if `value_type` is `'numeric'`)
    - **Description**: Units for numeric values.
    - **Example**: `"%"`, `"mg/dL"`
- **`date_time`**:
    - **Type**: `TIMESTAMPTZ`
    - **Description**: When the observation was made or result recorded (ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`). Should be around the encounter time.
    - **Example**: `"2023-10-26T10:30:00Z"`
- **`reference_range`**:
    - **Type**: `TEXT` (Optional)
    - **Description**: Normal range for the observation.
    - **Example**: `"4.0-5.6 %"`
- **`flag`**:
    - **Type**: `TEXT` (Optional)
    - **Description**: Abnormality indicator.
    - **Allowed Values**: `'H'` (High), `'L'` (Low), `'A'` (Abnormal), `NULL` (Normal or not applicable).
    - **Example**: `"H"`
- **`interpretation`**:
    - **Type**: `TEXT` (Optional)
    - **Description**: Textual interpretation of the result.
    - **Example**: `"Above target range, indicates poor glycemic control."`

## Expected Output Format

The LLM should output a **single JSON object**. This object will contain one key: `"synthetic_data"`.
The value of `"synthetic_data"` will be an **array of objects**.
Each object in this array corresponds to **one of the input encounters** and must include:

1.  `patient_supabase_id`: Copied directly from the input for that encounter.
2.  `encounter_supabase_id`: Copied directly from the input for that encounter.
3.  `generated_encounter_updates`: An object containing the synthetically generated fields for updating the existing encounter record (`reason_code`, `reason_display_text`, `transcript`, `soap_note`, `observations`, `treatments`). The `treatments` field itself should be a JSON array (represented as a string if the final output must be purely string-based JSON, or as a native JSON array if the target system can parse it).
4.  `generated_conditions`: An array of objects, where each object represents a new condition record to be associated with this encounter. Each condition object should contain all fields specified under "New Associated `conditions` Records".
5.  `generated_lab_results`: An array of objects, where each object represents a new lab result record to be associated with this encounter. Each lab result object should contain all fields specified under "New Associated `lab_results` Records".

**Example of the final JSON output structure for a single encounter:**
```json
{
  "synthetic_data": [
    {
      "patient_supabase_id": "provided_patient_uuid_from_input_csv",
      "encounter_supabase_id": "provided_encounter_uuid_from_input_csv",
      "generated_encounter_updates": {
        "reason_code": "J02.9",
        "reason_display_text": "Acute pharyngitis, unspecified",
        "transcript": "Doctor: Hello... Patient: I have a sore throat...",
        "soap_note": "S: Patient reports sore throat... O: Temp 38.1C... A: Pharyngitis... P: Rest, fluids.",
        "observations": "Tonsils are red and swollen.",
        "treatments": "[{"treatment_name": "Acetaminophen", "dosage": "500mg", "route": "PO", "frequency": "PRN"}]"
      },
      "generated_conditions": [
        {
          "code": "J02.9",
          "description": "Acute pharyngitis, unspecified",
          "category": "encounter-diagnosis",
          "clinical_status": "active",
          "verification_status": "confirmed",
          "onset_date": "2023-10-25",
          "note": "Rapid strep test negative."
        }
      ],
      "generated_lab_results": [
        {
          "name": "Rapid Strep Test",
          "value": "Negative",
          "value_type": "string",
          "units": null,
          "date_time": "2023-10-28T09:15:00Z",
          "reference_range": null,
          "flag": null,
          "interpretation": "No evidence of Group A Streptococcus."
        },
        {
          "name": "White Blood Cell Count",
          "value": "11.5",
          "value_type": "numeric",
          "units": "x10^9/L",
          "date_time": "2023-10-28T09:30:00Z",
          "reference_range": "4.0-11.0",
          "flag": "H",
          "interpretation": "Slightly elevated, may indicate infection."
        }
      ]
    }
    // ... more objects, one for each encounter from the input CSV
  ]
}
```

## Generation Guidelines

1.  **Medical Plausibility**: All generated data must be medically realistic and consistent with the provided patient and encounter context.
2.  **Consistency**:
    - Conditions should align with lab results and treatments.
    - Transcripts and SOAP notes should reflect the generated conditions, labs, and treatments.
3.  **Temporal Logic**:
    - `onset_date` for conditions should be on or before the encounter date.
    - `lab_results.date_time` should be contemporaneous with the encounter.
    - `treatments.prescribed_date` (if included) should be on the encounter date.
4.  **Data Types and Formats**: Adhere strictly to the specified data types and formats (e.g., `YYYY-MM-DD` for dates, ISO 8601 for TIMESTAMPTZ).
5.  **Variety**: Generate a diverse range of plausible clinical scenarios, conditions, lab results, and treatments.
6.  **Completeness**: For each encounter row from the input, provide all requested generated fields. If a field is optional and not applicable, use `null` (for JSON `null`) or omit it if appropriate for the JSON structure (e.g., optional text fields could be empty strings or null).

## Important Schema Notes (For LLM Context - Do Not Output This Section)
The following notes describe the target database schema for context but are not part of the LLM's output instructions.
- `encounters.patient_supabase_id` is the correct FK to `patients.id`.
- `encounters.observations` is a `TEXT` field.
- `conditions.onset_date` is `DATE`.
- `conditions` table has `clinical_status` and `verification_status`.
- `lab_results` table has `value_type` and `interpretation`.

## Data Export Query
Use the query in `scripts/data_export_query.sql` to export existing data.

## Common Condition Examples

### Diabetes Follow-up
- reason_code: `"44054006"`
- reason_display_text: `"Follow-up visit for diabetes management"`
- Related labs: HbA1c, fasting glucose, lipid panel
- Treatments: Metformin, lifestyle modifications

### Acute Respiratory Infection
- reason_code: `"J06.9"`
- reason_display_text: `"Upper respiratory infection with cough and congestion"`
- Related labs: Rapid flu test, CBC if severe
- Treatments: Symptomatic care, possibly antibiotics if bacterial

### Hypertension Management
- reason_code: `"I10"`
- reason_display_text: `"Routine blood pressure check and medication adjustment"`
- Related labs: Basic metabolic panel, lipid panel
- Treatments: ACE inhibitors, lifestyle modifications 