# Phase 2: Clinical Engine Refactoring

## Overview

Phase 2 refactors the clinical engine logic to use the new FHIR-aligned schema from Phase 1. The engine now pulls structured data from normalized tables and produces comprehensive diagnostic outputs that are written back to the database.

**Note:** We store each patient visit in the `encounters` table (FHIR: Encounter). "Admission" will only be used later inside the hospitalization slice of Encounter for inpatient workflows.

## Key Components

### 1. PatientContextLoader (`src/lib/patientContextLoader.ts`)

A new service that fetches patient data from the FHIR-aligned schema and assembles it into a structured context object.

**Features:**
- Fetches patient demographics from the `patients` table
- Retrieves encounters from the `encounters` table
- Loads conditions from the `conditions` table (problem list)
- Fetches observations from the `lab_results` table
- Assembles data into a FHIR-like context object

**Usage:**
```typescript
const context = await PatientContextLoader.fetch(
  patientId,
  currentEncounterId,
  includeEncounterIds // optional array of prior encounters to include
);
```

### 2. SymptomExtractor (`src/lib/symptomExtractor.ts`)

Extracts symptoms from consultation transcripts using keyword matching.

**Features:**
- Keyword-based symptom extraction (MVP implementation)
- Supports common symptoms and their variations
- Returns standardized symptom list
- Can store extracted symptoms in encounter `extra_data`

**Supported Symptoms:**
- Physical: headache, fever, fatigue, joint pain, chest pain, etc.
- Gastrointestinal: nausea, vomiting, diarrhea, abdominal pain
- Respiratory: cough, shortness of breath, sore throat
- Mental health: anxiety, depression, insomnia
- And more...

### 3. ClinicalEngineServiceV2 (`src/lib/clinicalEngineServiceV2.ts`)

Enhanced clinical engine that implements the full diagnostic pipeline.

**Pipeline Stages:**

1. **Load Patient Context**: Fetch FHIR-aligned data
2. **Extract Symptoms**: Process transcript to identify symptoms
3. **Generate Diagnostic Plan**: Create step-by-step evaluation plan
4. **Execute Plan**: Populate findings based on patient data
5. **Synthesize Diagnosis**: Determine primary diagnosis and differentials
6. **Generate Treatment Plan**: Recommend treatments based on diagnosis
7. **Create SOAP Note**: Format clinical documentation
8. **Generate Documents**: Create referrals/prior auth if needed
9. **Save Results**: Write all outputs back to database

**Key Methods:**
- `runDiagnosticPipeline()`: Main entry point
- `generateDiagnosticPlan()`: Creates evaluation steps
- `synthesizeDiagnosis()`: Determines diagnosis from findings
- `generateTreatmentPlan()`: Recommends treatments
- `saveResults()`: Persists outputs to database

## Database Integration

### Writing Results

The engine writes results to multiple tables:

1. **Conditions Table**: Primary diagnosis with ICD-10 code
   ```sql
   INSERT INTO conditions (patient_id, encounter_id, code, description, category)
   VALUES (?, ?, 'M06.9', 'Rheumatoid arthritis', 'encounter-diagnosis');
   ```

2. **Encounters Table**: SOAP note, treatments, and prior auth
   ```sql
   UPDATE encounters 
   SET soap_note = ?, treatments = ?, prior_auth_justification = ?
   WHERE id = ?;
   ```

3. **Extra Data**: Referral/prior auth documents
   ```sql
   UPDATE encounters 
   SET extra_data = jsonb_set(extra_data, '{documents}', ?)
   WHERE id = ?;
   ```

## Mock Logic Examples

### Diagnosis Patterns

The engine uses symptom patterns to determine diagnoses:

- **Fever + Cough** → Upper Respiratory Infection (J06.9)
- **Fatigue + Joint Pain** → Check for RA markers → Rheumatoid Arthritis (M06.9) or Myalgia (M79.3)
- **Chest Pain** → Chest Pain, Unspecified (R07.9) with cardiac differentials
- **Fatigue (diabetic)** → Consider poor glycemic control

### Treatment Recommendations

Based on diagnosis code:

- **J06.9 (URI)**: Acetaminophen, rest, hydration
- **M05/M06 (RA)**: Methotrexate, folic acid, NSAIDs
- **R07.9 (Chest pain)**: Consider aspirin, PPI therapy
- **E11 (Diabetes)**: Adjust medications based on A1C

### Lab Integration

The engine considers lab results in its logic:
- High A1C (>7%) suggests poor diabetic control
- Elevated ESR/CRP suggests inflammation
- Positive RF/Anti-CCP supports RA diagnosis

## Test Data

Four test patients are provided:

1. **TEST_DM_001**: Diabetic with poor control (A1C 8.2%)
   - Symptoms: Fatigue, blurred vision
   - Expected: Diabetes management recommendations

2. **TEST_RA_001**: Possible rheumatoid arthritis
   - Symptoms: Joint pain, morning stiffness, fatigue
   - Labs: High ESR, CRP, RF
   - Expected: RA diagnosis, rheumatology referral

3. **TEST_URI_001**: Upper respiratory infection
   - Symptoms: Fever, cough, sore throat
   - Expected: URI diagnosis, symptomatic treatment

4. **TEST_CP_001**: Chest pain with cardiac risk
   - Symptoms: Exertional chest pain
   - History: HTN, hyperlipidemia
   - Expected: Cardiac workup recommendations

## Running Test Data

1. Execute the test data script:
   ```sql
   -- Run scripts/phase2_test_data.sql in Supabase
   ```

2. Test the engine with a test patient:
   ```typescript
   const engine = new ClinicalEngineServiceV2();
   const result = await engine.runDiagnosticPipeline(
     'TEST_RA_001',
     'TEST_RA_001-V1'
   );
   ```

3. Verify outputs in database:
   - Check `conditions` table for new diagnosis
   - Check `encounters` table for SOAP note and treatments
   - Review generated documents in `extra_data`

## Future Enhancements

1. **LLM Integration**: Replace keyword matching with NLP
2. **Guideline Integration**: Query clinical guidelines
3. **Clinical Trials**: Match patients to trials
4. **FHIR Export**: Generate standard FHIR resources
5. **Audit Trail**: Track all engine decisions

## API Integration

The engine can be called from:
- Frontend components (via API)
- Backend API endpoints
- Scheduled jobs for batch processing

Example API endpoint:
```typescript
app.post('/api/clinical-engine/run', async (req, res) => {
  const { patientId, encounterId } = req.body;
  const engine = new ClinicalEngineServiceV2();
  const result = await engine.runDiagnosticPipeline(patientId, encounterId);
  res.json(result);
});
``` 