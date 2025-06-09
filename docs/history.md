# Project History and Incident Reports

This document contains a log of notable incidents, bug fixes, and data recovery operations that have occurred during the development of the Foresight CDSS MVP. These notes provide valuable historical context and lessons learned.

## Data Recovery and Synthetic Data Management

### Data Recovery (May 27, 2025)

A significant data recovery operation was undertaken on May 27, 2025, due to an accidental deletion of legitimate encounter data by an overly aggressive cleanup script.

**Summary of the Incident and Recovery:**
*   **Issue:** Accidental deletion of ~259 encounters. The database state dropped from ~376 encounters to 117.
*   **Cause:** A cleanup script deleted encounters created within 30 seconds of each other, intended to remove duplicates but affecting legitimate data.
*   **Recovery Outcome:** Successfully restored the database from 117 to 340 encounters, achieving a ~90% recovery rate of the original target.
*   **Process:**
    1.  **Assessment:** Identified the root cause and analyzed the extent of data loss.
    2.  **Script Development:** Created a conservative cleanup script and an encounter regeneration script (`scripts/synthetic-data/regenerate-lost-encounters.js`).
    3.  **Execution:** Generated 223 realistic synthetic encounters, distributed evenly across 108 patients.
    4.  **Validation:** Verified encounter counts, distribution, and data quality.
*   **Scripts Created:**
    *   `scripts/synthetic-data/conservative-cleanup.js`: For safe duplicate removal (targets recent duplicates within a smaller time window).
    *   `scripts/synthetic-data/regenerate-lost-encounters.js`: For regenerating lost encounter data.
*   **Key Learnings:**
    *   The importance of robust backup strategies (daily exports recommended).
    *   The need for conservative cleanup procedures with mandatory dry runs.
    *   Enhanced schema management and validation before bulk operations.

**How-to: Regenerate Lost Encounters (If Necessary)**
The script used for the May 2025 recovery can be reused if a similar situation arises.
```bash
# Dry run to preview changes
node scripts/synthetic-data/regenerate-lost-encounters.js

# Execute regeneration
node scripts/synthetic-data/regenerate-lost-encounters.js --execute
```
This script analyzes the current database state, calculates missing encounters, generates realistic synthetic clinical data, and distributes it evenly.

### Synthetic Data and Cleanup

The system relies on synthetic data for development and testing. Occasionally, cleanup of this data is necessary, for example, to remove duplicates generated during testing or by bugs.

**Past Cleanup Incident (January 15, 2025):**
*   **Issue:** Two patients (Maria Gomez and Justin Rodriguez) had hundreds of duplicate/empty encounters due to an infinite loop bug in the "New Consultation" button.
*   **Maria Gomez:** 290 empty encounters out of 292 total.
*   **Justin Rodriguez:** 169 empty encounters out of 176 total.
*   **Cleanup:** A script (`cleanup_duplicate_encounters.js` - historical, may not be current) was created to remove only encounters with no content (no reason, transcript, or SOAP note). 459 duplicate/empty encounters were removed, preserving legitimate ones.
*   **Lessons Learned:**
    *   UI bugs can lead to significant data pollution.
    *   Better data validation is needed to prevent empty encounter creation.
    *   Monitoring for unusual encounter creation patterns is recommended.

**How-to: Conservative Cleanup (If Needed for Duplicates)**
The `conservative-cleanup.js` script was developed to avoid accidental data loss.
```bash
# Dry run to preview changes
node scripts/synthetic-data/conservative-cleanup.js

# Execute cleanup
node scripts/synthetic-data/conservative-cleanup.js --execute
```
This script targets only very recent duplicates (e.g., created in the last 6 hours) and uses a short time window (e.g., 10 seconds) for identifying duplicates. Always perform a dry run first.


## Past Issue: Infinite Loop in "New Consultation" Modal (May 2025)

A critical bug was identified and resolved where the "New Consultation" modal could trigger an infinite loop, rapidly creating multiple duplicate encounters. This issue occurred multiple times before a final fix was implemented.

**Root Causes:**
1.  **Double Navigation:** The modal would navigate to the patient page after creating an encounter and then call an `onConsultationCreated` callback, which, through a chain of events, could trigger another navigation attempt to the same patient page, potentially corrupting state and reopening the modal.
2.  **No Double-Click Protection:** Users could click the "Start Consultation" button multiple times before the first request completed, leading to multiple encounter creations.
3.  **Stale Form State:** The modal's state wasn't always reset when closed, potentially leading to unexpected behavior upon reopening.

**Solution Implemented (in `src/components/modals/NewConsultationModal.tsx` - Note: this modal might be superseded by `ConsultationPanel` for some functionalities, but the lessons are broadly applicable):
1.  **Eliminated Double Navigation:** Ensured the modal was closed *before* any navigation occurred and prevented subsequent callbacks that could re-trigger navigation.
2.  **Loading State Protection:** Added an `isCreating` state variable to disable the submission button while an encounter creation was in progress, preventing double-clicks.
3.  **Form State Reset:** Implemented a `useEffect` hook to reset all form state within the modal when it is closed.

**Lessons Learned & Future Prevention:**
*   **Modal Management:** Always close modals *before* initiating navigation or significant state changes triggered by modal actions.
*   **Submission Protection:** Use loading states (`isLoading`, `isSubmitting`, etc.) to prevent double submissions for any asynchronous operations.
*   **State Reset:** Ensure that modal/form state is explicitly reset when closed or dismissed to prevent stale data issues.
*   **Callback Chains:** Be cautious with callback chains that can trigger navigation or major state updates, as they can lead to race conditions or unexpected loops.
*   **Testing:** Specifically test for race conditions and double-clicking on critical action buttons.
*   **Data Impact:** This bug caused significant data pollution (e.g., hundreds of empty encounters for specific patients), as documented in the "Data Recovery and Synthetic Data Management" section. This highlights the importance of fixing UI bugs promptly to prevent backend data issues.

---

## Differential Diagnoses Scrollability Fix (June 2025)

**Problem**: The differential diagnoses list in the `ConsultationPanel` modal was not vertically scrollable. The root cause was that the flexbox height constraint from the modal's top-level container was not being correctly propagated down to the list component, preventing `overflow-y-auto` from activating.

**Root Cause**: While `DifferentialDiagnosesList` was correctly structured internally to have a scrollable content area (`flex-1 overflow-y-auto min-h-0`), its immediate parent container in `ConsultationPanel.tsx` (`<div class="... p-4">`) was a block-level element, not a flex container. This broke the height propagation chain, so the `h-full` prop on `DifferentialDiagnosesList` had no effect.

**Solution Implemented**:
1.  **Enabled Flexbox Hierarchy in `ConsultationPanel.tsx`**:
    *   The parent `div` wrapping the tab content (the one with `p-4`) was converted into a flex container by adding `flex flex-col`. This ensures it passes flex context to its children.
    *   The `DifferentialDiagnosesList` component is now passed `className="flex-1 min-h-0"` instead of `h-full`. This makes it a proper flex child that grows and shrinks correctly within its parent.

2.  **Simplified `DifferentialDiagnosesList.tsx`**:
    *   The hardcoded `h-full` class was removed from the component's root `div`. Its size is now correctly and exclusively controlled by the props passed from its parent (`ConsultationPanel.tsx`), making it more reusable.

**Key Learning**: For a scrollable flex child (e.g., `flex-1 overflow-y-auto`) to work, **every parent in the hierarchy must correctly propagate height constraints**. If a `div` in the middle of a flexbox chain is not itself a flex container (`display: flex`), it will break the chain, and children with `flex-1` or `h-full` will not receive the necessary height to calculate overflow. The fix was to ensure the immediate parent was also a `flex-col` container.

**Components Modified**:
- `src/components/modals/ConsultationPanel.tsx`: Added `flex-col` to the tab content wrapper and changed the prop passed to the list component to `flex-1 min-h-0`.
- `src/components/diagnosis/DifferentialDiagnosesList.tsx`: Removed the redundant `h-full` class from the root element.

**Testing Results**:
- All 5 differential diagnosis cards are now accessible through vertical scrolling.
- The list's header remains fixed during scroll operations as intended.
- The solution works correctly in both normal and demo modes.

---

## SOAP Notes Scrollability Fix (December 2025)

**Problem**: The SOAP notes panel in the `ConsultationPanel` modal was not vertically scrollable. Users could not scroll within the SOAP content when it exceeded the available height, making the content inaccessible.

**Root Cause**: Same flexbox hierarchy issue as the differential diagnoses fix. The transcript/SOAP container was using `h-full` instead of `flex-1 min-h-0`, breaking the flexbox height propagation chain. SOAP notes are one level deeper in the hierarchy than differential diagnoses were, requiring the same pattern to be applied to their parent container.

**Solution Implemented**:
1.  **Fixed Flexbox Chain in `ConsultationPanel.tsx`**:
    *   Changed the transcript/SOAP container from `h-full flex flex-col gap-4` to `flex-1 min-h-0 flex flex-col gap-4`.
    *   This ensures proper height propagation down to the `SOAPNotesPanel` component, which already had the correct internal structure (`flex-1 min-h-0` and `overflow-y-auto`).

**Components Modified**:
- `src/components/modals/ConsultationPanel.tsx`: Changed `h-full` to `flex-1 min-h-0` in the transcript/SOAP container div.

**Key Learning**: This confirms the pattern from the differential diagnoses fix - **every parent in the flexbox hierarchy must correctly propagate height constraints**. When adding new scrollable content areas, ensure all parent containers maintain the flexbox chain with `flex-1 min-h-0` instead of `h-full`.

**Testing Enhanced**:
- Enhanced demo SOAP notes data with comprehensive content to ensure sufficient text for scrollability testing
- All sections (S, O, A, P) now contain detailed clinical information that will definitely require scrolling
- Subjective: Added detailed history, review of systems, and social history
- Objective: Added comprehensive physical examination findings and laboratory results
- Assessment: Added detailed clinical reasoning for each differential diagnosis
- Plan: Added immediate management, medications, monitoring, consultations, patient education, and long-term care plans

**Testing Results**:
- SOAP notes content is now scrollable independently from the transcript area.
- The fix works correctly in both side-by-side layout (desktop) and stacked layout (mobile).
- All SOAP sections (S, O, A, P) are accessible through vertical scrolling when content exceeds the available height.
- Enhanced demo data ensures consistent testing of scrollability across all environments.

---

## Deprecated Code Cleanup (June 2025)

Several deprecated files and services were identified and cleaned up to maintain code quality and reduce confusion about which systems are currently active.

### Files Removed or Deprecated

**Removed Files:**
- `src/lib/clinicalEngineService.ts`: Original clinical engine using keyword matching. Replaced by `ClinicalEngineServiceV3` which uses GPT-based reasoning.
- `src/lib/symptomExtractor.ts`: Basic keyword-based symptom extraction. Functionality moved to `ClinicalEngineServiceV3`.
- `src/components/DiagnosticAdvisor.tsx`: Old diagnostic workflow component. Not used - replaced by `AdvisorView` component.

**Files Remaining (still deprecated):**
- All deprecated files have been removed from the codebase to reduce confusion and maintenance burden.

### Current Active Systems

**Clinical Engine:**
- Uses `ClinicalEngineServiceV3` for all clinical reasoning
- GPT-based multi-step diagnostic process
- API endpoints: `/api/clinical-engine` and `/api/clinical-engine/differential-diagnoses`

**Advisor Feature:**
- Uses `AdvisorView` component (accessible at `/advisor`)
- Chat-based AI advisor with OpenAI Code Interpreter integration
- No relation to the deprecated `DiagnosticAdvisor` component

**Migration Notes:**
- All references to `clinicalEngineService` (non-V3) have been removed from active code
- Documentation updated to reference only current services
- Deprecated files contain clear migration guidance

---

## Transcription UI Functionality Validation (June 2025)

An investigation into an apparent issue with the transcript UI in patient consultation tabs confirmed that the functionality is working as designed. Key findings include:

*   **Data Integrity**: The database contains substantial and valid transcript data for numerous encounters.
*   **Data Service**: The `supabaseDataService` correctly fetches and processes transcript data.
*   **UI Rendering**: The `ConsultationTab.tsx` component accurately displays transcript content, including HTML formatting, using `dangerouslySetInnerHTML`.
*   **No Systemic Issue**: The initially reported problem was not due to a systemic bug; the transcript system operates correctly.

The investigation involved database queries, data service testing, and UI component analysis. Several debugging scripts were created in the `scripts/` directory, which can be referenced for future troubleshooting if similar concerns arise. These include:
*   `scripts/check_transcript_data.js`: Verifies transcript content in the database.
*   `scripts/find_real_transcripts.js`: Identifies encounters with substantial transcript text.
*   `scripts/test_data_service_simple.js`: A basic test for the data service logic.
*   `scripts/get_patient_with_transcript.js`: Retrieves test patient details with associated transcripts.
*   `debug_transcript_issue.js`: A more comprehensive script for debugging transcript-related issues. 