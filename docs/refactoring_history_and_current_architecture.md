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

## Conclusion

The multi-phase refactoring has significantly matured the Foresight CDSS. The system now boasts a cleaner, FHIR-aligned database, a more robust clinical engine, and a UI that effectively presents complex clinical information. This consolidated architecture provides a strong foundation for ongoing development, feature enhancement, and eventual integration with broader healthcare ecosystems. The historical scripts associated with intermediate refactoring steps have been deprecated and removed, with their purpose and actions documented herein. 