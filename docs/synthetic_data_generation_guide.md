# Synthetic Data Generation Guide for Foresight CDSS

## Overview
This guide provides instructions for generating synthetic clinical data for the Foresight CDSS system. The data should be realistic and follow the formats specified below.

## Important Schema Notes

### ⚠️ Schema Discrepancies
The actual database schema differs from `schema.sql` in several important ways:

1. **encounters.patient_supabase_id**: In the actual database, the foreign key to patients is named `patient_supabase_id`, NOT `patient_id`
2. **encounters.observations**: This field exists in the actual DB but not in schema.sql
3. **conditions.onset_date**: The actual DB uses `onset_date` (DATE), not `onset_datetime` (TIMESTAMPTZ)
4. **Missing columns**: Some columns like `clinical_status`, `verification_status`, `value_type`, and `interpretation` don't exist in the actual tables

## Data Export Query
Use the query in `scripts/data_export_query.sql` to export existing data.

## Fields to Generate

### 1. For Existing Encounters (UPDATE operations)

#### reason_code
- **Type**: `TEXT`
- **Description**: Medical code for the encounter reason
- **Examples**:
  - `"185349003"` (Streptococcal sore throat - SNOMED CT)
  - `"R10.9"` (Unspecified abdominal pain - ICD-10)
  - `"44054006"` (Diabetes mellitus type 2 - SNOMED CT)
- **Format**: Prefer SNOMED CT codes for conditions, ICD-10 for billing

#### reason_display_text
- **Type**: `TEXT`
- **Description**: Human-readable reason for visit
- **Examples**:
  - `"Patient presents with sore throat and fever for 3 days"`
  - `"Follow-up visit for diabetes management"`
  - `"Annual physical examination"`
- **Format**: Clear, concise clinical language

#### transcript
- **Type**: `TEXT`
- **Description**: Full conversation transcript
- **Example Format**:
```
Doctor: Good morning, how are you feeling today?
Patient: I've had this terrible sore throat for about three days now.
Doctor: I see. Any fever or other symptoms?
Patient: Yes, I've been running a fever of about 101°F, and I feel really tired.
Doctor: Let me take a look at your throat...
[Continue with realistic clinical dialogue]
```

#### soap_note
- **Type**: `TEXT`
- **Description**: Structured clinical note
- **Format**:
```
S (Subjective): Patient complains of sore throat x3 days, fever up to 101°F, fatigue, difficulty swallowing. Denies cough, runny nose.

O (Objective): Vital signs: T 100.8°F, BP 120/80, HR 88, RR 16. HEENT: Pharynx erythematous with white exudate on tonsils bilaterally. Anterior cervical lymphadenopathy present. Lungs clear to auscultation.

A (Assessment): Acute pharyngitis, likely streptococcal given clinical presentation. Rapid strep test positive.

P (Plan): 
1. Amoxicillin 500mg PO TID x 10 days
2. Acetaminophen PRN for fever and pain
3. Increase fluid intake
4. Return if symptoms worsen or no improvement in 48-72 hours
```

#### observations
- **Type**: `TEXT`
- **Description**: Clinical observations during the encounter
- **Note**: This field exists in the actual DB but not in schema.sql
- **Example**: `"Patient appears ill but not in acute distress. Mild dehydration noted. Positive rapid strep test."`

#### treatments
- **Type**: `JSONB`
- **Description**: Array of treatment objects
- **Example**:
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
    "prescribed_date": "2023-10-26"
  },
  {
    "treatment_name": "Throat lozenges",
    "treatment_type": "symptomatic",
    "instructions": "Use as needed for throat pain",
    "otc": true
  },
  {
    "treatment_name": "Rest and hydration",
    "treatment_type": "lifestyle",
    "instructions": "Get plenty of rest and drink warm fluids"
  }
]
```

### 2. For New Conditions Records (INSERT operations)

#### Key Linking Fields
- `patient_id`: Use `patient_supabase_id` from the export query
- `encounter_id`: Use `encounter_supabase_id` from the export query (can be NULL for problem list items)

#### condition fields
- **code**: `TEXT` - ICD-10 or SNOMED CT code
  - Examples: `"J02.0"` (Streptococcal pharyngitis), `"E11.9"` (Type 2 diabetes)
- **description**: `TEXT` - Human-readable diagnosis
  - Examples: `"Acute streptococcal pharyngitis"`, `"Type 2 diabetes mellitus without complications"`
- **category**: `TEXT` - Must be either:
  - `"encounter-diagnosis"` - Diagnosis made during this specific encounter
  - `"problem-list-item"` - Ongoing condition in patient's problem list
- **onset_date**: `DATE` - When the condition started (format: `YYYY-MM-DD`)
- **note**: `TEXT` (Optional) - Additional clinical notes

### 3. For New Lab Results Records (INSERT operations)

#### Key Linking Fields
- `patient_id`: Use `patient_supabase_id` from the export query
- `encounter_id`: Use `encounter_supabase_id` from the export query (can be NULL)

#### lab_results fields
- **name**: `TEXT` - Lab test name or LOINC code
  - Examples: `"Hemoglobin A1c"`, `"LOINC:4548-4"`, `"Rapid Strep Test"`
- **value**: `TEXT` - Test result
  - Examples: `"7.2"`, `"Positive"`, `"120"`
- **units**: `TEXT` - Units of measurement
  - Examples: `"%"`, `"mg/dL"`, `"mmol/L"`
- **date_time**: `TIMESTAMPTZ` - When test was performed
  - Format: `"2023-10-26T10:30:00Z"`
- **reference_range**: `TEXT` - Normal range
  - Examples: `"4.0-5.6 %"`, `"70-100 mg/dL"`
- **flag**: `TEXT` - Abnormality indicator
  - Values: `"H"` (High), `"L"` (Low), `"A"` (Abnormal), `NULL` (Normal)

## SQL Commands for Data Import

### Update existing encounters
```sql
UPDATE public.encounters
SET 
  reason_code = $1,
  reason_display_text = $2,
  transcript = $3,
  soap_note = $4,
  observations = $5,
  treatments = $6,
  updated_at = NOW()
WHERE id = $7;  -- Use encounter_supabase_id from export
```

### Insert new conditions
```sql
INSERT INTO public.conditions (
  patient_id, encounter_id, code, description, category, onset_date, note
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
);
```

### Insert new lab results
```sql
INSERT INTO public.lab_results (
  patient_id, encounter_id, name, value, units, date_time, reference_range, flag
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
);
```

## Generation Guidelines

1. **Medical Accuracy**: Ensure generated data is medically plausible
2. **Consistency**: Match conditions with appropriate lab results and treatments
3. **Temporal Logic**: Ensure dates make sense (onset before encounter, lab results during encounter)
4. **Privacy**: Never use real patient data; all generated data should be synthetic
5. **Variety**: Include a mix of common conditions (diabetes, hypertension) and acute issues (infections, injuries)

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