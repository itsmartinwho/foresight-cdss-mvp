# Task List: SOAP Notes in Consultation Modal

Based on PRD: `tasks/prd-soap-notes-consultation-modal.md`

## Relevant Files
- `src/lib/clinicalEngineServiceV3.ts` - Update clinical engine to generate only S/O sections, mirror A/P from existing data
- `src/components/modals/ConsultationPanel.tsx` - Main consultation modal requiring layout expansion and SOAP panel integration
- `src/services/demo/DemoDataService.ts` - Add getSoapNotes method for demo mode
- `src/components/soap/SOAPNotesPanel.tsx` - New component for SOAP notes display and editing (to be created)
- `src/components/soap/SOAPNoteEditor.tsx` - Individual SOAP section editors (to be created)
- `src/hooks/demo/useDemoConsultation.tsx` - Update to handle SOAP notes in demo mode
- `src/lib/supabaseDataService.ts` - Update to handle SOAP notes persistence and synchronization

## Tasks

- [x] 1.0 Update Clinical Engine Logic for SOAP Generation
  - [x] 1.1 Create S/O-specific prompts for patient vs doctor input extraction
  - [x] 1.2 Modify generateSoapNote method to generate only Subjective and Objective sections
  - [x] 1.3 Update saveResults method to mirror Assessment from differentials and Plan from treatments
  - [x] 1.4 Create helper functions to format A/P sections from existing data
- [x] 2.0 Create SOAP Notes UI Components
  - [x] 2.1 Create SOAPNotesPanel component with responsive layout
  - [x] 2.2 Create individual SOAPSectionEditor components for S, O, A, P
  - [x] 2.3 Implement loading state and error handling for SOAP generation
  - [x] 2.4 Add proper styling consistent with glass-dense design system
- [x] 3.0 Integrate SOAP Panel into Consultation Modal
  - [x] 3.1 Expand ConsultationPanel modal size (50% wider, 50% taller)
  - [x] 3.2 Implement side-by-side layout for transcript and SOAP panels
  - [x] 3.3 Add responsive breakpoints for mobile stacking
  - [x] 3.4 Integrate SOAP generation trigger with clinical engine workflow
- [x] 4.0 Implement Demo Mode SOAP Notes Support
  - [x] 4.1 Add getSoapNotes method to DemoDataService
  - [x] 4.2 Update useDemoConsultation hook to handle SOAP notes display
  - [x] 4.3 Implement read-only mode for demo SOAP notes
  - [x] 4.4 Add timing for SOAP notes appearance after transcript completion
- [x] 5.0 Add Data Synchronization Between SOAP Sections and Tabs
  - [x] 5.1 Implement bi-directional sync between Assessment section and Differentials tab
  - [x] 5.2 Implement bi-directional sync between Plan section and Treatment tab
  - [x] 5.3 Add debounced synchronization to prevent excessive updates
  - [x] 5.4 Integrate SOAP changes into universal save/undo system 