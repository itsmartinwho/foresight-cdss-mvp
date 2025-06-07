# Task List: Differential Diagnoses Display and Integration

## Overview
Implementation tasks for the differential diagnoses feature based on `prd-differential-diagnoses-display.md`.

## Tasks

- [x] 1.0 Research and Analyze Current Implementation
  - [x] 1.1 Investigate existing clinical engine API endpoints and differential diagnosis logic
  - [x] 1.2 Research current ICD-11 integration and code lookup functionality (using ICD-10 instead)
  - [x] 1.3 Analyze existing consultation modal and patient workspace UI structure
  - [x] 1.4 Document current data models for diagnoses and consultation results

- [x] 2.0 Backend API and Data Structure Implementation
  - [x] 2.1 Define TypeScript interfaces for differential diagnosis data structure
  - [x] 2.2 Create or update API endpoints for differential diagnosis generation
  - [x] 2.3 Implement reasoning model integration for final diagnosis synthesis
  - [x] 2.4 Set up ICD-10 code lookup and validation functionality (using existing ICD-10 integration)
  - [x] 2.5 Update database schema to store differential diagnoses data (existing table confirmed)

- [x] 3.0 Frontend UI Component Development
  - [x] 3.1 Create DifferentialDiagnosisCard component with likelihood visualization
  - [x] 3.2 Build DifferentialDiagnosesList component for displaying multiple diagnoses
  - [x] 3.3 Implement likelihood indicators (progress bars, color coding)
  - [x] 3.4 Create editable diagnosis components with text editing capabilities
  - [x] 3.5 Design loading states and placeholder components

- [x] 4.0 Real-time Integration and State Management
  - [x] 4.1 Integrate differential diagnoses display into consultation modal
  - [x] 4.2 Add differential diagnoses section to patient workspace diagnosis tab
  - [x] 4.3 Implement real-time updates and progressive loading during clinical engine processing
  - [x] 4.4 Set up state management for differential diagnoses and editing states
  - [x] 4.5 Connect final diagnosis synthesis with reasoning model outputs

- [x] 5.0 Testing and Validation
  - [x] 5.1 Write unit tests for differential diagnosis components
  - [x] 5.2 Create integration tests for API endpoints
  - [x] 5.3 Test real-time functionality and state management
  - [x] 5.4 Validate ICD-10 code integration and display (using ICD-10 instead of ICD-11)
  - [x] 5.5 End-to-end testing of complete workflow

## Relevant Files

### Backend/API
- `src/types/diagnosis.ts` - TypeScript interfaces for differential diagnosis data structures
- `src/api/clinical-engine/differential-diagnoses.ts` - API route for differential diagnosis generation
- `src/api/clinical-engine/reasoning.ts` - API route for final diagnosis synthesis
- `src/lib/icd11.ts` - ICD-11 code lookup and validation utilities
- `src/services/clinical-engine.ts` - Clinical engine service integration

### Frontend Components
- `src/components/diagnosis/DifferentialDiagnosisCard.tsx` - Individual diagnosis card component
- `src/components/diagnosis/DifferentialDiagnosesList.tsx` - List container for multiple diagnoses
- `src/components/diagnosis/LikelihoodIndicator.tsx` - Visual likelihood display component
- `src/components/diagnosis/EditableDiagnosis.tsx` - Editable diagnosis text component
- `src/components/diagnosis/DiagnosisLoadingState.tsx` - Loading state component

### Integration Points
- `src/app/consultation/[id]/components/ConsultationModal.tsx` - Consultation modal integration
- `src/app/patients/[id]/components/DiagnosisTab.tsx` - Patient workspace diagnosis section
- `src/contexts/ConsultationContext.tsx` - State management for consultation data
- `src/hooks/useDifferentialDiagnoses.ts` - Custom hook for differential diagnosis data management

### Styles
- `src/styles/diagnosis.css` - Specific styles for diagnosis components 