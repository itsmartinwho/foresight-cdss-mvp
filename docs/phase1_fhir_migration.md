# Phase 1: FHIR-Compatible Migration

## Overview

This document describes the Phase 1 migration to align the Foresight CDSS MVP database schema with minimal FHIR resources (US Core 6.1.0) while preserving MVP functionality.

## Migration Goals

1. **Align patient demographics with US Core requirements**
   - Add ethnicity field for separate race/ethnicity tracking
   - Standardize field names (dob → birth_date)

2. **Enhance visits table for FHIR Encounter compatibility**
   - Add status field for encounter status tracking
   - Add is_deleted field for soft delete functionality

3. **Introduce FHIR-aligned resource tables**
   - Create conditions table for diagnoses (FHIR Condition)
   - Create lab_results table for observations (FHIR Observation)

4. **Preserve existing data**
   - Migrate existing diagnosis data to new conditions table
   - Keep deprecated fields temporarily for backward compatibility

## Database Changes

### Modified Tables

#### patients
- **Added**: `ethnicity TEXT` - US Core requirement for ethnicity tracking
- **Renamed**: `dob` → `birth_date` - FHIR naming alignment
- **Standardized**: Gender values to lowercase for FHIR compatibility

#### encounters (formerly visits/admissions)
- **Renamed and Evolved**: This table, originally `visits` and later referred to as `admissions` in some contexts, is now primarily known as `encounters` to align with FHIR terminology.
- **Key Fields Include**: 
    - `id`: Supabase UUID (Primary Key)
    - `encounter_id`: Human-readable business key
    - `status TEXT DEFAULT 'finished'`: FHIR Encounter.status
    - `is_deleted BOOLEAN DEFAULT FALSE`: Soft delete support
    - `reason_code TEXT`: Stores the coded reason for the encounter (e.g., from a terminology like SNOMED CT). Replaces older `reason_for_admission` fields.
    - `reason_display_text TEXT`: Human-readable version of the reason, often accompanying `reason_code`.
- **Frontend Note**: When displaying the reason for an encounter, frontend components should prefer `encounter.reasonDisplayText` if available, otherwise fallback to `encounter.reasonCode`.

### New Tables

#### conditions
Represents FHIR Condition resources (diagnoses/problems):
```sql
CREATE TABLE public.conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.visits(id),
  code TEXT,              -- ICD-10 or SNOMED code
  description TEXT,       -- Human-readable diagnosis
  category TEXT,          -- 'encounter-diagnosis' or 'problem-list'
  onset_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### lab_results
Represents FHIR Observation resources (lab results/vitals):
```sql
CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.visits(id),
  name TEXT,              -- Test name (e.g., "Hemoglobin A1C")
  value TEXT,             -- Result value
  units TEXT,             -- Units of measure
  date_time TIMESTAMPTZ,  -- When observed
  reference_range TEXT,   -- Normal range
  flag TEXT,              -- High/Low indicators
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Code Changes

### TypeScript Updates

1. **Patient Interface** (`src/lib/types.ts`)
   - Added `ethnicity?: string` field

2. **SupabaseDataService** (`src/lib/supabaseDataService.ts`)
   - Updated to use `birth_date` instead of `dob`
   - Added ethnicity field mapping
   - Added methods to fetch diagnoses and lab results
   - Created UUID to patient ID mapping for data retrieval
   - **Note on Encounters/Admissions**: The method `getPatientEncounters(patientId: string)` is the primary method for fetching patient encounters. While an alias `getPatientAdmissions(patientId: string)` exists for backward compatibility, it is recommended to use `getPatientEncounters` directly to avoid potential build or linting issues, as these tools may not consistently resolve the alias.

### New Methods

- `getPatientDiagnoses(patientId: string): Diagnosis[]`
- `getPatientLabResults(patientId: string): LabResult[]`
- `getDiagnosesForAdmission(patientId: string, admissionId: string): Diagnosis[]`
- `getLabResultsForAdmission(patientId: string, admissionId: string): LabResult[]`

## Migration Steps

1. **Run the SQL migration script**
   ```bash
   # Execute scripts/phase1_fhir_migration.sql in Supabase SQL editor
   ```

2. **Verify the migration**
   - Check that existing patient diagnosis data was migrated to conditions table
   - Verify sample lab results were created for testing
   - Confirm all patients have ethnicity values

3. **Update and restart the application**
   ```bash
   # Restart the Next.js development server
   npm run dev
   ```

## Data Migration Details

### Diagnosis Migration
Existing `primary_diagnosis_description` values are migrated to the conditions table as 'problem-list' entries:
```sql
INSERT INTO public.conditions(patient_id, code, description, category)
SELECT id, NULL, primary_diagnosis_description, 'problem-list'
FROM public.patients
WHERE primary_diagnosis_description IS NOT NULL;
```

### Synthetic Data Generation
Sample lab results are created for testing:
- Hemoglobin A1C results with high values (diabetic range)
- Glucose results with elevated values
- Applied to 5 sample patients for demonstration

### Ethnicity Population
All existing patients are assigned ethnicity values using OMB categories:
- 30% assigned "Hispanic or Latino"
- 70% assigned "Not Hispanic or Latino"

## Backward Compatibility

The following fields are retained but marked for deprecation:
- `patients.primary_diagnosis_description`
- `patients.general_diagnosis_details`

These will be removed in a future phase after frontend updates.

## Testing

After migration, verify:
1. Patient list displays correctly with all existing data
2. Diagnoses appear in the patient workspace
3. Lab results are visible in the appropriate tabs
4. Soft delete functionality works for visits
5. New patient creation uses birth_date field

## Next Steps

Phase 2 will focus on:
- Removing deprecated fields
- Adding FHIR resource identifiers
- Implementing FHIR-compliant data validation
- Creating FHIR resource endpoints 