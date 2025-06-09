# Product Requirements Document: Editable Consultation Fields

## Introduction/Overview
This feature will make consultation and patient data fields editable in the patient workspace, specifically in the 'consultation' and 'all data' tabs. Users will be able to edit fields starting from below the red line indicator and downwards, including consultation details, summary notes, transcript, and placeholder sections. The feature aims to provide flexible data management while maintaining data integrity through appropriate input controls and validation.

## Goals
1. Enable direct editing of consultation data fields in patient workspaces
2. Provide appropriate editors for different field types (text, date/time, rich text)
3. Maintain data consistency across the application when changes are made
4. Follow existing UI patterns from the differential diagnosis section
5. Ensure seamless integration with existing database structure and dependent services

## User Stories
1. **As a clinician**, I want to edit the reason for visit so that I can correct or update the consultation purpose after the fact.
2. **As a clinician**, I want to edit the consultation date and time so that I can correct scheduling errors or reschedule consultations.
3. **As a clinician**, I want to edit summary notes (S, O, A, P sections) so that I can refine and improve clinical documentation.
4. **As a clinician**, I want to edit the consultation transcript so that I can correct transcription errors or add clarifications.
5. **As a clinician**, I want to edit placeholder data in clinical trials and prior authorization sections so that I can update relevant information as it becomes available.
6. **As a user**, I want visual feedback when hovering over editable sections so that I understand what can be modified.
7. **As a user**, I want to save or cancel my changes explicitly so that I have control over when modifications are committed.

## Functional Requirements

### Core Editing Functionality
1. **Hover-to-Edit Discovery**: Edit buttons must appear on hover for all editable sections below the red line indicator
2. **Section-Based Editing**: Only the clicked section becomes editable while other sections remain in view mode
3. **Multiple Concurrent Edits**: Users can edit multiple sections simultaneously, but each must be saved independently
4. **Save/Cancel Actions**: Each editable section must provide inline save and cancel buttons
5. **Undo/Redo Support**: Include undo and redo functionality following the differential diagnosis pattern

### Field-Specific Requirements
6. **Reason for Visit**: Provide free-text input with rich text editing capabilities
7. **Date and Time**: Use appropriate date/time picker components with no logical restrictions
8. **Summary Notes**: Provide rich text editors for each SOAP section (Subjective, Objective, Assessment, Plan)
9. **Transcript Editing**: Open transcript editing in a modal with full rich text editing capabilities
10. **Clinical Trials/Prior Authorization**: Allow editing of placeholder data following current mock data structure

### Data Validation
11. **Required Field Validation**: Enforce same required field rules as new consultation logic (e.g., date and time must be present)
12. **Type Safety**: Input UI components must prevent entry of incorrect data types
13. **Format Validation**: Ensure data format consistency through appropriate input controls

### User Experience
14. **Unsaved Changes Warning**: Display modal alert when user attempts to navigate away with unsaved changes, offering save or discard options
15. **Visual Consistency**: Follow existing UI patterns from differential diagnosis section for edit controls
16. **Non-Editable Fields**: Exclude identifiers (Patient ID, Encounter ID) from editing capability

### Data Persistence
17. **Database Updates**: Save changes to primary database tables upon explicit save action
18. **Extra Data Sync**: Update the `extra_data` JSONB field in encounters table when related fields are modified
19. **Real-time Updates**: Ensure other views and tabs reflect changes immediately after save
20. **Data Migration**: Perform one-time update of potentially stale `extra_data` field to ensure current accuracy

## Non-Goals (Out of Scope)
1. **User Role Restrictions**: No role-based editing permissions (all users can edit all fields)
2. **Auto-save Functionality**: Changes require explicit save action
3. **Edit History/Audit Trail**: No tracking of who made edits or when
4. **Version Control**: No ability to view previous versions of data
5. **Confirmation Dialogs**: No additional confirmation for significant changes
6. **Differential Diagnosis Editing**: This section is already perfect and requires no changes beyond hover-edit button
7. **Real-time Collaboration**: No concurrent editing by multiple users

## Design Considerations
- **UI Consistency**: Use the same edit button style and behavior as the differential diagnosis section
- **Responsive Design**: Ensure edit controls work across different screen sizes
- **Accessibility**: Maintain keyboard navigation and screen reader compatibility
- **Loading States**: Provide appropriate feedback during save operations

## Technical Considerations
- **Database Schema**: Work with existing encounters table structure and `extra_data` JSONB field
- **State Management**: Handle edit states without affecting other application components
- **Data Synchronization**: Ensure `extra_data` field stays current with individual field changes
- **Legacy Data**: Address potentially stale data in `extra_data` field from previous updates
- **API Integration**: Update relevant endpoints to handle field-level updates
- **Medical Advisor Integration**: Ensure updated data flows to AI advisor and clinical engine services

## Success Metrics
1. **User Adoption**: 80% of active users utilize the editing functionality within first month
2. **Data Accuracy**: Reduction in data inconsistencies between individual fields and `extra_data` JSONB
3. **User Satisfaction**: Positive feedback on editing workflow and UI consistency
4. **Performance**: No degradation in page load times with new editing capabilities
5. **Error Reduction**: Decrease in support tickets related to data correction requests

## Open Questions
1. Should there be any rate limiting on save operations to prevent excessive database writes?
2. Are there any specific formatting requirements for the rich text editors (allowed tags, styling options)?
3. Should the system provide any templates or auto-completion for common entries in summary notes?
4. Are there any compliance or regulatory considerations for editing historical consultation data?

## Implementation Priority
**High Priority:**
- Basic editing functionality for reason for visit and date/time
- Summary notes rich text editing
- Save/cancel/undo/redo controls

**Medium Priority:**
- Transcript modal editing
- Extra data field synchronization
- Unsaved changes warning

**Low Priority:**
- Clinical trials and prior authorization placeholder editing
- Data migration for stale extra_data fields 