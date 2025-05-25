# Phase 3: Frontend UI Updates for FHIR-Aligned Data and AI Outputs

## Overview

Phase 3 focuses on updating the frontend UI to display the new FHIR-aligned data structures from Phase 1 and integrate the AI clinical engine outputs from Phase 2. This phase ensures clinicians can view patient demographics, encounter details, diagnoses, lab results, and AI-generated clinical recommendations in a user-friendly interface.

## Key Changes Implemented

### 1. Patient Demographics Display

**File Modified:** `src/components/PatientDetail.tsx`

- Added display of new FHIR-aligned fields:
  - **Ethnicity**: Now displayed alongside existing demographics
  - **Race**: Displayed when available
  - Updated to use `reasonCode` field for encounters (replacing legacy `reason` field)

```tsx
// Patient header now shows:
{patient.ethnicity && <span>Ethnicity: {patient.ethnicity}</span>}
{patient.race && <span>Race: {patient.race}</span>}
```

### 2. AI Analysis Panel Component

**New File:** `src/components/AIAnalysisPanel.tsx`

Created a comprehensive AI analysis panel that:
- Provides a "Generate AI Diagnosis & Plan" button
- Displays AI-generated results including:
  - Primary diagnosis (editable)
  - Differential diagnoses
  - Recommended tests
  - Treatment recommendations
  - Draft SOAP note
  - Referral documents (if applicable)
  - Prior authorization documents (if applicable)
- Allows clinicians to edit the primary diagnosis before saving
- Includes a "Save Plan to Visit" button to persist results

Key features:
- Loading states during AI analysis
- Editable diagnosis field for clinician control
- Confidence scores displayed for diagnoses
- Structured display of all AI outputs

### 3. Clinical Engine API Endpoint

**New File:** `src/app/api/clinical-engine/route.ts`

Created an API endpoint to interface with the clinical engine:
- Accepts POST requests with `patientId` and `encounterId`
- Calls `ClinicalEngineServiceV2.runDiagnosticPipeline()`
- Returns the complete `ClinicalOutputPackage` with all AI-generated results

### 4. Integration with Consultation Tab

**File Modified:** `src/app/consultation/[id]/ConsultationTab.tsx`

- Imported and integrated the `AIAnalysisPanel` component
- Added `handleAIResultsSave` function to persist AI results:
  - Updates SOAP notes in the encounters table
  - Saves diagnoses to the conditions table (via engine)
  - Stores treatments and other data
- Modified layout to accommodate the AI panel below the transcript editor

### 5. Data Service Updates

**File Modified:** `src/lib/supabaseDataService.ts`

Added new methods to support UI updates:
- `updateEncounterSOAPNote()`: Updates SOAP notes for an encounter
- `updateAdmissionSOAPNote()`: Backward compatibility alias

These methods update both the database and local cache, ensuring UI consistency.

## UI/UX Improvements

### 1. Encounter Information Display
- Encounter type/class is now shown in visit headers
- Reason for visit (reasonCode) is prominently displayed
- Consistent use of FHIR-aligned terminology in the UI

### 2. AI Results Presentation
- Clean, structured layout for AI outputs
- Visual hierarchy with clear sections for each type of result
- Confidence indicators for diagnoses
- Editable fields where clinician input is expected

### 3. Data Consistency
- All new data from the clinical engine is immediately visible in:
  - Diagnosis tab (via conditions table)
  - Treatment tab (via encounters.treatments)
  - Consultation tab (SOAP notes)
  - All Data view (comprehensive display)

## Technical Considerations

### 1. Component Architecture
- AI Analysis Panel is a self-contained component
- Uses React hooks for state management
- Integrates with existing Supabase data service

### 2. Data Flow
1. User clicks "Generate AI Diagnosis & Plan"
2. API call to `/api/clinical-engine`
3. Clinical engine processes and returns results
4. Results displayed in editable UI
5. User reviews/edits and saves
6. Data persisted to appropriate tables
7. UI refreshes to show updated data

### 3. Error Handling
- Loading states during AI processing
- Error alerts for failed API calls
- Graceful handling of missing data

## Future Enhancements

1. **Real-time Updates**: Implement WebSocket connections for live updates
2. **Batch Processing**: Allow analysis of multiple encounters
3. **Customizable AI Parameters**: Let users adjust confidence thresholds
4. **Export Functionality**: Generate PDF reports of AI recommendations
5. **Audit Trail**: Track all edits to AI-generated content
6. **AI-Generated `reasonCode`**:
    * Automatically generate the `reasonCode` (e.g., a SNOMED CT code) based on the textual `reasonDisplayText` (reason for visit) provided by the user for an encounter.
    * This generation should occur automatically when a new encounter is created or when the `reasonDisplayText` is updated.
    * If a user manually edits the `reasonCode` field, the system should respect this manual input and not overwrite it with an AI-generated code, even if the `reasonDisplayText` is subsequently changed. The AI generation should only occur if the `reasonCode` field has not been manually overridden.

## Testing Recommendations

1. **Component Testing**:
   - Test AI panel with various response scenarios
   - Verify edit functionality preserves user changes
   - Ensure save operations update all relevant tables

2. **Integration Testing**:
   - Verify data flow from engine to UI
   - Test with different patient/encounter combinations
   - Validate FHIR field mappings

3. **User Acceptance Testing**:
   - Clinician review of AI output presentation
   - Workflow validation for diagnosis editing
   - Performance testing with real-world data volumes

## Migration Notes

- No database migrations required (uses Phase 1 schema)
- Frontend changes are backward compatible
- Existing patient data will display new fields when available
- AI features are opt-in (require explicit user action) 