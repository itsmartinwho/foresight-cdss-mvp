# Comprehensive Refactoring History and Current Architecture

## Overview

This document provides a consolidated history of the Foresight CDSS refactoring efforts and describes the current state of the system architecture. It aims to be the single source of truth regarding the evolution of the codebase and database, ensuring clarity for future development and maintenance.

## Introduction

The Foresight CDSS MVP underwent several significant refactoring phases to align its database schema with FHIR (Fast Healthcare Interoperability Resources) standards, enhance its clinical engine capabilities, and improve the overall maintainability and scalability of the application. This document outlines the journey through these phases, detailing the key changes, and concludes with a description of the current, stable architecture.

## Phase 1: FHIR-Compatible Migration

**Goal:** Align the database schema with minimal FHIR resources (US Core 6.1.0) while preserving MVP functionality.

**Key Changes:**

*   **Patient Demographics:**
    *   Added `ethnicity` field to `patients` table for separate race/ethnicity tracking.
    *   Standardized field names (e.g., `dob` → `birth_date`).
    *   Standardized gender values to lowercase.
*   **Encounters Table (formerly `visits`/`admissions`):**
    *   Renamed `visits` to `encounters` to align with FHIR terminology.
    *   Added `status` field for encounter status tracking (e.g., 'finished', 'planned').
    *   Added `is_deleted` field for soft delete functionality.
    *   Standardized `reason_code` (coded reason, e.g., SNOMED CT) and `reason_display_text` (human-readable reason).
*   **New FHIR-aligned Resource Tables:**
    *   `conditions`: Created to store diagnoses and problems, aligning with the FHIR Condition resource.
        *   Fields: `id`, `patient_id`, `encounter_id`, `code` (ICD-10/SNOMED), `description`, `category` ('encounter-diagnosis' or 'problem-list'), `onset_date`, `note`.
    *   `lab_results`: Created for observations like lab results and vitals, aligning with the FHIR Observation resource.
        *   Fields: `id`, `patient_id`, `encounter_id`, `name`, `value`, `units`, `date_time`, `reference_range`, `flag`.
*   **Data Migration:**
    *   Existing diagnosis data from `patients.primary_diagnosis_description` was migrated to the new `conditions` table as 'problem-list' entries.
    *   Synthetic lab result data was generated for testing.
    *   Ethnicity values were populated for existing patients.
*   **Code Updates:**
    *   `Patient` interface (`src/lib/types.ts`) updated with `ethnicity`.
    *   `SupabaseDataService` (`src/lib/supabaseDataService.ts`) updated to use new field names and added methods for fetching data from `conditions` and `lab_results`.
    *   The method `getPatientEncounters(patientId: string)` became the primary method for fetching encounters, with `getPatientAdmissions(patientId: string)` retained temporarily as an alias.
*   **Deprecated Fields (Phase 1):**
    *   `patients.primary_diagnosis_description`
    *   `patients.general_diagnosis_details`
    *   These were marked for removal in a later phase.

**Historical Script:** `scripts/phase1_fhir_migration.sql` (This script is now obsolete and has been removed. It handled the initial schema changes and data migration for Phase 1).

## Phase 2: Clinical Engine Refactoring

**Goal:** Refactor the clinical engine logic to utilize the new FHIR-aligned schema from Phase 1, enabling it to pull structured data and write comprehensive diagnostic outputs back to the database.

**Key Components & Changes:**

*   **`PatientContextLoader` (`src/lib/patientContextLoader.ts`):**
    *   A new service to fetch patient data (demographics, encounters, conditions, lab_results) and assemble it into a structured, FHIR-like context object for the engine.
*   **`SymptomExtractor` (`src/lib/symptomExtractor.ts`):**
    *   Implemented keyword-based symptom extraction from consultation transcripts (MVP).
*   **`ClinicalEngineServiceV2` (`src/lib/clinicalEngineServiceV2.ts`):**
    *   Enhanced clinical engine with a multi-stage diagnostic pipeline:
        1.  Load Patient Context
        2.  Extract Symptoms
        3.  Generate Diagnostic Plan
        4.  Execute Plan (populate findings based on patient data)
        5.  Synthesize Diagnosis (primary diagnosis and differentials)
        6.  Generate Treatment Plan
        7.  Create SOAP Note
        8.  Generate Documents (referrals, prior auth if needed)
        9.  Save Results to database.
*   **Database Integration (Outputs):**
    *   Primary diagnosis written to `conditions` table (category: 'encounter-diagnosis').
    *   SOAP notes, treatments, and prior auth justifications updated in the `encounters` table.
    *   Referral/prior auth documents stored in `encounters.extra_data`.
*   **Mock Logic:**
    *   The engine used symptom patterns and mock logic for diagnosis (e.g., Fever + Cough → URI) and treatment recommendations.
*   **Test Data:**
    *   Specific test patients (e.g., `TEST_DM_001`, `TEST_RA_001`) were introduced to validate engine logic for different scenarios.

**Historical Script:** `scripts/phase2_test_data.sql` (This script is now obsolete and has been removed. It populated the database with test data specific to Phase 2 validation).
**Historical Script:** `scripts/rename_visits_to_encounters.sql` (This script, likely used to formalize the table name change from `visits` to `encounters`, is now obsolete and has been removed. This change was a core part of the FHIR alignment).

## Phase 3: Frontend UI Updates

**Goal:** Update the frontend UI to display data from the FHIR-aligned structures and integrate outputs from the refactored AI clinical engine.

**Key Changes:**

*   **Patient Demographics Display (`src/components/PatientDetail.tsx`):**
    *   Added display of `ethnicity` and `race`.
    *   Updated to use `reasonCode` and `reasonDisplayText` for encounters.
*   **AI Analysis Panel (`src/components/AIAnalysisPanel.tsx`):**
    *   New component to trigger AI analysis and display results: primary diagnosis (editable), differential diagnoses, recommended tests, treatment plan, draft SOAP note, referral/prior auth documents.
    *   Included a "Save Plan to Visit" button.
*   **Clinical Engine API Endpoint (`src/app/api/clinical-engine/route.ts`):**
    *   Created a POST endpoint to call `ClinicalEngineServiceV2.runDiagnosticPipeline()`.
*   **Integration with Consultation Tab (`src/app/consultation/[id]/ConsultationTab.tsx`):**
    *   Integrated `AIAnalysisPanel`.
    *   Added `handleAIResultsSave` to persist AI results.
*   **Data Service Updates (`src/lib/supabaseDataService.ts`):**
    *   Added `updateEncounterSOAPNote()` (and alias `updateAdmissionSOAPNote()`).
*   **UI/UX Improvements:**
    *   Consistent use of FHIR terminology.
    *   Structured layout for AI outputs with confidence indicators.
    *   Ensured data consistency across different tabs post-AI analysis.
*   **Code Consistency Fixes:**
    *   Replaced widespread use of the alias `getPatientAdmissions` with the direct `getPatientEncounters` to resolve build/lint issues.
    *   Updated encounter reason display to use `encounter.reasonDisplayText || encounter.reasonCode || 'N/A'`.

**No specific database migration script for Phase 3** as it primarily involved frontend and API changes utilizing the schema established in Phase 1.

## Database Cleanup & Finalization (Phases referred to as "Database Cleanup" and "Phase 4")

**Goal:** Complete the FHIR migration by removing all deprecated fields, adding comprehensive and diverse test data, ensuring schema consistency, and removing obsolete database objects. This consolidated phase ensures the system is production-ready.

**Key Changes:**

*   **SQL Script Corrections:**
    *   Prior to removal, the Phase 4 SQL script was corrected to remove references to fields no longer present in the schema (`patients.phone`, `patients.email`, `patients.address`, `encounters.date_time`, `encounters.encounter_class`) and to use the correct current field names (`birth_date`, `encounter_type`, `reason_code`, `reason_display_text`, `scheduled_start_datetime`). These corrections formed the basis for the final cleanup actions.
*   **Deprecated Fields Removal:**
    *   `patients.primary_diagnosis_description` and `patients.general_diagnosis_details` were permanently removed from the `patients` table. All diagnosis information is now managed in the `conditions` table.
*   **Code Updates:**
    *   Removed references to the deprecated patient fields from:
        *   `src/lib/types.ts` (Patient interface)
        *   `src/lib/supabaseDataService.ts`
        *   `src/lib/patientContextLoader.ts`
    *   Updated `src/components/ui/QuickSearch.tsx` to search the `conditions` table for diagnoses instead of patient-level fields.
*   **New Table: `differential_diagnoses`:**
    *   Created to store AI-generated differential diagnoses.
    *   Fields: `id`, `patient_id`, `encounter_id`, `diagnosis_name`, `likelihood`, `key_factors`, `rank_order`.
*   **Removal of Problematic Views:**
    *   `admissions` view (which was a duplicate/legacy reference to encounters) was removed.
    *   `test_data_summary` view was removed.
*   **Comprehensive Test Data:**
    *   Introduced diverse test patient scenarios (e.g., `TEST_HEALTHY_001`, `TEST_CHRONIC_001`, `TEST_MINIMAL_001`, `TEST_PEDS_001`, `TEST_ELDERLY_001`) to validate system behavior under various conditions.
*   **Schema Documentation:**
    *   Added `COMMENT` documentation to all core tables in the database, clarifying their purpose and FHIR alignment.
*   **Data Integrity Checks:**
    *   Implemented checks for orphaned records and data consistency.

**Historical Scripts:**

*   `scripts/database_cleanup_final.sql`: This script handled the removal of problematic views, deprecated columns, creation of the `differential_diagnoses` table, and added indexes/documentation. It is now obsolete and has been removed as its actions are incorporated into the final schema.
*   `scripts/phase4_final_cleanup.sql`: This script focused on dropping deprecated columns and inserting comprehensive test data. It is now obsolete and has been removed.
*   `scripts/phase4_test_data_loader.ts`: A TypeScript-based loader for programmatic insertion of test data. While the specific "phase 4" version is part of this historical context, the practice of using a programmatic loader for test data might persist. This specific script is considered part of the finalized refactoring and is removed from the active scripts list.
*   `docs/phase4_corrected_sql_instructions.md`: Obsolete documentation file providing detailed corrections to the Phase 4 SQL script; its content has been merged into this consolidated document and the file has been removed.

## Current Post-Refactor Architecture

The Foresight CDSS now operates on a FHIR-aligned database schema and a robust clinical engine.

### Core Database Tables:

1.  **`patients`**: Stores patient demographic information.
    *   Key fields: `id` (UUID), `patient_id` (text, unique), `first_name`, `last_name`, `gender`, `birth_date`, `race`, `ethnicity`, `extra_data` (JSONB for extensibility).
    *   No longer contains direct diagnosis fields.

2.  **`encounters`**: Stores information about patient encounters (visits, consultations).
    *   Key fields: `id` (UUID), `encounter_id` (text), `patient_supabase_id` (FK to `patients`), `encounter_type`, `reason_code`, `reason_display_text`, `transcript`, `soap_note`, `treatments` (JSONB), `status`, `is_deleted`, `extra_data` (JSONB).

3.  **`conditions`**: Stores diagnoses, problems, and health concerns.
    *   Key fields: `id` (UUID), `patient_id` (FK to `patients`), `encounter_id` (FK to `encounters`), `code` (e.g., ICD-10, SNOMED), `description` (text), `category` (e.g., 'problem-list', 'encounter-diagnosis'), `onset_date`.

4.  **`lab_results`**: Stores laboratory and observation data.
    *   Key fields: `id` (UUID), `patient_id` (FK to `patients`), `encounter_id` (FK to `encounters`), `name`, `value`, `units`, `date_time`, `reference_range`, `flag`.

5.  **`differential_diagnoses`**: Stores differential diagnoses generated by the clinical engine.
    *   Key fields: `id` (UUID), `patient_id` (FK to `patients`), `encounter_id` (FK to `encounters`), `diagnosis_name`, `likelihood`, `key_factors`, `rank_order`.

### Clinical Engine (`ClinicalEngineServiceV2`):

*   **Input:** Assembles `FHIRPatientContext` from the database tables.
*   **Processing:**
    1.  Extracts symptoms from encounter transcripts.
    2.  Generates a diagnostic plan.
    3.  Executes the plan, incorporating patient history, labs, and (mock) clinical reasoning.
    4.  Synthesizes a primary diagnosis and differential diagnoses.
    5.  Generates treatment recommendations.
    6.  Creates a SOAP note.
    7.  Generates supporting documents (e.g., referrals) if applicable.
*   **Output:**
    *   Saves primary diagnosis to `conditions`.
    *   Saves differential diagnoses to `differential_diagnoses`.
    *   Updates `encounters` with SOAP note, treatments, and links to documents in `extra_data`.

### Frontend Integration:

*   The UI (`AIAnalysisPanel` in particular) allows clinicians to trigger the engine, review its outputs, edit the primary diagnosis, and save the results back to the database.
*   All patient data views (demographics, diagnoses, labs, encounter details) now pull from the normalized, FHIR-aligned tables.

### Key Benefits of the Current Architecture:

*   **FHIR Alignment:** Facilitates interoperability and future EHR integration.
*   **Structured Data:** Diagnoses, lab results, and encounters are stored in a normalized and structured manner, improving data quality and analytical capabilities.
*   **Dedicated Differential Diagnosis Storage:** Allows for clear tracking of the engine's reasoning.
*   **End-to-End AI Workflow:** Provides a complete pipeline from data ingestion to clinician-reviewed output.
*   **Schema Clarity:** Reduced redundancy and clearer separation of concerns in the database.

## Recent Deployment and Code Quality Fixes (December 2024)

**Goal:** Resolve deployment issues on Vercel following the major refactoring phases and ensure code quality standards.

**Key Issues Resolved:**

### Deployment Error Resolution:

1. **Toast Hook Import Errors:**
   - Fixed incorrect import paths for `use-toast` hook in `PatientWorkspaceView.tsx` and `ConsultationTab.tsx`
   - Resolved `variant` prop type issues in toast notifications

2. **Missing Component Functions:**
   - Implemented missing functions in `ConsultationTab.tsx`: `getCursorPosition`, `handleSaveTranscript`, `handleManualSave`
   - Ensured proper prop typing for new consultation creation

3. **Terminology Refactoring (Admission → Encounter):**
   - Updated `PatientWorkspaceView.tsx`: `AdmissionDetailsWrapper` → `EncounterDetailsWrapper`
   - Refactored all child tab components (`DiagnosisTab`, `TreatmentTab`, `LabsTab`, `PriorAuthTab`, `HistoryTab`, `AllDataViewTab`)
   - Updated props and internal logic to use `encounter` objects instead of `admission`

4. **Component Import Issues:**
   - Removed unused `Spinner` import in `AIAnalysisPanel.tsx`
   - Fixed `DiagnosticAdvisor.tsx` to use `EncounterDetailsWrapper` and `encounters` key for backend alignment

5. **Missing UI Components:**
   - Created `src/components/ui/data-table.tsx` using ShadCN UI template structure
   - Created `src/components/views/patient-columns.tsx` for patient table columns
   - Installed missing dependencies: `@tanstack/react-table`, `lucide-react`

6. **TypeScript Type Errors:**
   - Fixed `SortableKey` type mismatch in `PatientsListView.tsx` (`scheduledStart` → `scheduledDate`)
   - Corrected function arguments passed to `onSelect`

7. **Supabase Client Integration:**
   - Fixed import issues in `patientContextLoader.ts` - removed unused direct `supabase` import
   - Updated to use `getSupabaseClient()` function properly

8. **FHIR Type Alignment:**
   - Defined proper FHIR-like types (`FHIRCondition`, `FHIRObservation`, `FHIRCodeableConcept`, `FHIRReference`)
   - Updated `FHIRPatientContext` to use `FHIRCondition[]` and `FHIRObservation[]`
   - Modified data transformation in `patientContextLoader.ts` and `clinicalEngineServiceV2.ts`
   - Added missing fields like `flag` and `referenceRange` to `FHIRObservation`

9. **Code Quality Issues:**
   - **Cyrillic Variable Names:** Fixed hallucinated Cyrillic variable names in `symptomExtractor.ts`:
     - `симптомы` → `basicSymptoms`
     - `симптомыДляПациента` → `extractSymptomsForPatient`
     - `текстКонсультации` → `consultationText`
     - `известныеСимптомы` → `knownSymptoms`
     - `базовыеСимптомы` (undefined) → `basicSymptoms`

### Post-Deployment Runtime Issues (May 2024):

10. **Consultation Tab Visibility Issue:**
    - **Problem:** Consultation tab was not visible on initial page load, only appeared after navigating to another tab and back
    - **Root Cause:** Tab name inconsistency between ForesightApp ("consult") and PatientWorkspaceView ("consultation"), plus overly restrictive rendering logic
    - **Solution:** 
      - Changed ForesightApp initial tab from "consult" to "consultation"
      - Updated all navigation links from "tab=consult" to "tab=consultation"
      - Simplified consultation tab rendering logic to show whenever patient is available
      - Removed outdated ConsultationTab component that used deprecated "Admission" terminology

11. **Missing Diagnoses and Lab Results in Tabs:**
    - **Problem:** Diagnosis and Treatment tabs showed "No diagnoses/treatments found" despite database containing mock data
    - **Root Cause:** Encounter ID mismatch in data filtering logic
    - **Technical Details:** 
      - Database schema: `conditions.encounter_id` and `lab_results.encounter_id` are UUID foreign keys referencing `encounters.id`
      - Code issue: Filtering methods were trying to match business encounter identifiers instead of Supabase UUIDs
    - **Solution:**
      - Updated `getDiagnosesForEncounter()` and `getLabResultsForEncounter()` methods in `supabaseDataService.ts`
      - Changed filtering logic to directly match Supabase UUIDs (`dx.encounterId === encounterId`)
      - Added debug logging to track encounter ID matching process
      - Removed complex business identifier fallback logic that was causing the mismatch

12. **Empty Transcript Display:**
    - **Problem:** Past consultation transcripts were not displaying in the consultation tab
    - **Likely Cause:** Mock data in database may not include transcript content for existing encounters
    - **Status:** Resolved by encounter ID matching fix, as transcript loading uses the same encounter retrieval logic

### Process Improvements:

- **Iterative Deployment Testing:** Implemented a process of committing fixes after each logical resolution and triggering new Vercel deployments to catch subsequent errors
- **Systematic Error Tracking:** Maintained detailed logs of each deployment error and its resolution
- **Code Consistency:** Ensured all variable names and function signatures use English terminology
- **Database Schema Alignment:** Verified that code logic matches the actual database foreign key relationships

**Files Modified:**
- `src/components/views/PatientWorkspaceView.tsx`
- `src/app/consultation/[id]/ConsultationTab.tsx`
- `src/components/views/DiagnosisTab.tsx`, `TreatmentTab.tsx`, `LabsTab.tsx`, `PriorAuthTab.tsx`, `HistoryTab.tsx`, `AllDataViewTab.tsx`
- `src/components/advisor/AIAnalysisPanel.tsx`
- `src/components/advisor/DiagnosticAdvisor.tsx`
- `src/components/views/PatientDetail.tsx`
- `src/components/views/PatientsListView.tsx`
- `src/components/ui/data-table.tsx` (created)
- `src/components/views/patient-columns.tsx` (created)
- `src/lib/patientContextLoader.ts`
- `src/lib/clinicalEngineServiceV2.ts`
- `src/lib/symptomExtractor.ts`
- `src/lib/supabaseDataService.ts` (encounter ID matching fixes)
- `src/components/ForesightApp.tsx` (tab name consistency)
- `src/components/ui/QuickSearch.tsx` (navigation link fixes)

**Dependencies Added:**
- `@tanstack/react-table`
- `lucide-react`

## Conclusion

The multi-phase refactoring has significantly matured the Foresight CDSS. The system now boasts a cleaner, FHIR-aligned database, a more robust clinical engine, and a UI that effectively presents complex clinical information. Recent deployment fixes have ensured code quality standards and resolved integration issues that arose during the refactoring process. This consolidated architecture provides a strong foundation for ongoing development, feature enhancement, and eventual integration with broader healthcare ecosystems. The historical scripts associated with intermediate refactoring steps have been deprecated and removed, with their purpose and actions documented herein. 