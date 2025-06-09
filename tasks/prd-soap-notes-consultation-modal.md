# Product Requirements Document: SOAP Notes in Consultation Modal

## Introduction/Overview

This feature adds comprehensive SOAP (Subjective, Objective, Assessment, Plan) notes functionality to the consultation modal, displaying generated clinical notes alongside the transcript in both real and demo modes. The feature automatically generates structured clinical documentation from transcripts using the clinical engine API, providing doctors with editable, professionally formatted notes that follow medical documentation standards.

**Problem Solved**: Currently, the consultation modal lacks structured clinical documentation capabilities, requiring doctors to manually create SOAP notes elsewhere or rely on unstructured text. This feature provides automatic generation of properly formatted SOAP notes directly within the consultation workflow.

**Goal**: Streamline clinical documentation by automatically generating editable SOAP notes from consultation transcripts, improving documentation quality and reducing physician administrative burden.

## Goals

1. **Automate Clinical Documentation**: Generate structured SOAP notes automatically from consultation transcripts using AI-powered clinical reasoning
2. **Improve Documentation Quality**: Ensure notes follow medical documentation standards with proper SOAP format and content guidelines
3. **Enhance Workflow Efficiency**: Integrate SOAP note generation seamlessly into the existing consultation workflow without disrupting current processes
4. **Maintain Data Consistency**: Ensure real-time synchronization between SOAP note sections and corresponding tabs (Assessment ↔ Differentials, Plan ↔ Treatment)
5. **Support Both Modes**: Provide consistent functionality in both real consultation and demo modes with appropriate data sources

## User Stories

### Primary User Stories

1. **As a physician conducting a real consultation**, I want SOAP notes to be automatically generated from my transcript so that I can have structured documentation without manual formatting work.

2. **As a physician reviewing generated SOAP notes**, I want to edit each section independently (S, O, A, P) so that I can customize the documentation to match my clinical judgment.

3. **As a physician working with the assessment section**, I want changes to differential diagnoses to sync between the SOAP notes and the differentials tab so that my documentation remains consistent across all views.

4. **As a physician managing treatment plans**, I want changes to the plan section to sync with the treatment tab so that my therapeutic decisions are reflected everywhere.

5. **As a physician using the demo mode**, I want to see pre-existing SOAP notes from Dorothy Robinson's encounter displayed immediately after the transcript finishes so that I can understand the system's capabilities.

6. **As a physician working on multiple sections**, I want a unified save/undo/redo system across all consultation fields so that I can manage my changes efficiently.

### Secondary User Stories

7. **As a physician on a smaller screen**, I want the modal to be responsive so that I can access SOAP notes functionality on various devices.

8. **As a physician reviewing consultation data**, I want the SOAP notes to always be visible once available so that I don't miss important documentation.

## Functional Requirements

### Core SOAP Notes Generation

1. **The system must automatically trigger SOAP note generation when the clinical engine starts processing a transcript.**
2. **The system must display a "Generating notes" placeholder with loading indicator when SOAP generation begins.**
3. **The system must generate SOAP notes with the following field mappings:**
   - Subjective: Summary of patient's input from transcript (capturing patient's narrative, symptoms, concerns)
   - Objective: Summary of doctor's input from transcript (capturing examination findings, clinical observations)
   - Assessment: Display of differential diagnoses from clinical engine
   - Plan: Display of treatment plan from clinical engine

### Layout and UI Requirements

4. **The consultation modal must be expanded to 50% wider and 50% taller to accommodate the SOAP notes panel.**
5. **The SOAP notes must appear in a separate right panel alongside the transcript panel.**
6. **The layout must be responsive, stacking panels on smaller screens and displaying side-by-side on larger screens.**
7. **The SOAP notes panel must always be visible once notes are available (no hide/show toggle).**

### Editing and Interaction Requirements

8. **The system must provide separate edit controls for each SOAP section (S, O, A, P).**
9. **Each SOAP section must be editable using rich text editing capabilities similar to existing consultation fields.**
10. **The system must implement real-time synchronization between Assessment section and Differentials tab.**
11. **The system must implement real-time synchronization between Plan section and Treatment tab.**
12. **Synchronization must occur when editing is closed (e.g., by clicking elsewhere or losing focus).**

### Save and State Management

13. **The system must implement universal save/discard/undo/redo functionality for all consultation fields.**
14. **Changes to SOAP notes must be included in the unified change management system.**
15. **The system must track and manage edit history across all consultation components.**

### Demo Mode Requirements

16. **In demo mode, the system must display Dorothy Robinson's existing SOAP notes from the demo encounter data.**
17. **Demo SOAP notes must appear immediately after the transcript animation finishes.**
18. **Demo SOAP notes must not be editable (read-only mode).**
19. **The system must not attempt to generate new SOAP notes in demo mode.**

### Data Integration Requirements

20. **The system must integrate with the existing Clinical Engine V3 API for SOAP note generation.**
21. **Generated SOAP notes must be saved to the database using existing encounter update mechanisms.**
22. **The system must handle SOAP note data persistence consistently with other consultation data.**

## Non-Goals (Out of Scope)

1. **Custom SOAP Templates**: This feature will not include custom SOAP note templates or formatting options beyond the standard S/O/A/P structure.
2. **Voice-to-SOAP Direct Generation**: The system will not bypass transcript generation to create SOAP notes directly from audio.
3. **Multi-Encounter SOAP Comparison**: No functionality for comparing SOAP notes across different encounters.
4. **SOAP Note Sharing/Export**: No specialized sharing or export features beyond existing consultation export capabilities.
5. **Advanced Clinical Decision Support**: No integration with clinical guidelines or decision trees within SOAP notes.
6. **SOAP Note Versioning**: No detailed version history beyond the unified undo/redo system.
7. **Integration with External EMR Systems**: No direct export to external electronic medical record systems.

## Design Considerations

### UI/UX Requirements

- **Consistent Styling**: SOAP notes panel should match the existing glass-dense design system used throughout the consultation modal
- **Clear Section Separation**: Each SOAP section (S, O, A, P) should be clearly delineated with headers and appropriate spacing
- **Loading States**: Provide clear visual feedback during SOAP note generation with appropriate loading indicators
- **Error Handling**: Display user-friendly error messages if SOAP note generation fails
- **Responsive Breakpoints**: Define specific breakpoints for panel stacking vs. side-by-side layout

### Component Integration

- **Rich Text Editor**: Utilize existing `RichTextEditor` component for SOAP section editing
- **Synchronization Logic**: Implement two-way data binding between SOAP sections and corresponding tabs
- **State Management**: Extend existing consultation state management to include SOAP note fields

## Technical Considerations

### API Integration

- **Clinical Engine V3**: Extend existing `/api/clinical-engine` endpoint to include SOAP note generation
- **Database Schema**: Utilize existing `encounters.soap_note` field for persistence
- **Demo Data Service**: Add `getSoapNotes()` method to `DemoDataService` for demo mode

### Performance Considerations

- **Lazy Loading**: SOAP notes panel should only render when data is available
- **Debounced Synchronization**: Implement debouncing for real-time sync to prevent excessive API calls
- **Modal Size Optimization**: Ensure expanded modal size doesn't impact performance on lower-end devices

### Dependencies

- **Existing Clinical Engine**: Requires functional Clinical Engine V3 for SOAP note generation
- **Rich Text Editor**: Depends on current `RichTextEditor` component implementation
- **Supabase Integration**: Requires existing database connectivity for data persistence

## Success Metrics

### User Experience Metrics

1. **Documentation Completion Rate**: Increase in percentage of consultations with completed SOAP notes (target: >90%)
2. **Time to Documentation**: Reduction in time from consultation completion to final documentation (target: 50% reduction)
3. **Edit Frequency**: Average number of edits made to generated SOAP notes (baseline metric for quality assessment)

### Technical Performance Metrics

4. **Generation Speed**: SOAP notes generated within 30 seconds of clinical engine completion
5. **Sync Reliability**: 99%+ accuracy in bi-directional synchronization between SOAP sections and tabs
6. **Error Rate**: <5% failure rate in SOAP note generation attempts

### Clinical Quality Metrics

7. **Documentation Standards Compliance**: Generated SOAP notes meet medical documentation standards (clinical review required)
8. **Content Accuracy**: Generated content accurately reflects transcript information (clinical validation required)

## Open Questions

1. **Clinical Validation Process**: What process should be implemented to validate the clinical accuracy of generated SOAP notes before full deployment?

2. **Character Limits**: Should there be character limits for individual SOAP sections to ensure concise documentation?

3. **Template Customization**: While custom templates are out of scope, should there be basic formatting preferences (e.g., bullet points vs. paragraphs)?

4. **Integration Testing**: How should we test the synchronization between SOAP sections and tabs to ensure reliability?

5. **Backup Data Recovery**: What mechanisms should be in place if SOAP note generation fails but other clinical engine outputs succeed?

6. **Mobile Experience**: Are there specific mobile-first considerations for the responsive design beyond standard responsive practices?

7. **Accessibility Compliance**: What accessibility standards should the SOAP notes editing interface meet (WCAG 2.1 AA compliance)?

8. **Clinical Engine Failures**: How should the system behave if the clinical engine generates other outputs successfully but fails specifically on SOAP note generation? 