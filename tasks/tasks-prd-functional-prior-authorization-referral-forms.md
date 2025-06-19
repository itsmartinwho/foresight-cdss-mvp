# Task List: Functional Prior Authorization and Referral Forms

Based on PRD: `prd-functional-prior-authorization-referral-forms.md`

## Relevant Files
- `src/components/patient-workspace-tabs/ConsolidatedConsultationTab.tsx` - Main component containing prior auth section, needs referral section addition
- `src/components/forms/PriorAuthorizationForm.tsx` - New component for enhanced prior authorization form functionality
- `src/components/forms/ReferralForm.tsx` - New component for dedicated referral form
- `src/components/ui/FHIRResourceSelector.tsx` - New dropdown component for FHIR resource type selection
- `src/lib/forms/priorAuthService.ts` - Service for prior authorization form logic and PDF generation
- `src/lib/forms/referralService.ts` - Service for referral form logic and PDF generation
- `src/lib/forms/pdfGenerator.ts` - PDF generation utility with Foresight branding
- `src/lib/types.ts` - Extended types for form data structures
- `src/app/api/forms/prior-auth/route.ts` - API endpoint for prior authorization form operations
- `src/app/api/forms/referral/route.ts` - API endpoint for referral form operations
- `src/app/api/forms/pdf/route.ts` - API endpoint for PDF generation

## Tasks

- [ ] 1.0 Create Enhanced Prior Authorization Form Component
  - [x] 1.1 Create PriorAuthorizationForm component with FHIR resource selector
  - [ ] 1.2 Implement auto-population logic from encounter data
  - [ ] 1.3 Add editable fields for missing provider/insurance information
  - [ ] 1.4 Integrate form validation and real-time saving
  - [ ] 1.5 Add PDF generation button with Foresight branding

- [ ] 2.0 Create Dedicated Referral Form Component  
  - [ ] 2.1 Create ReferralForm component with ServiceRequest as default
  - [ ] 2.2 Implement comprehensive auto-population from encounter data
  - [ ] 2.3 Add specialist selection and clinical context fields
  - [ ] 2.4 Integrate form validation and auto-saving functionality
  - [ ] 2.5 Add PDF generation with comprehensive clinical information

- [ ] 3.0 Develop Form Services and PDF Generation
  - [ ] 3.1 Create prior authorization service with FHIR compliance
  - [ ] 3.2 Create referral service with clinical data mapping
  - [ ] 3.3 Implement PDF generation utility with professional formatting
  - [ ] 3.4 Add form data persistence and validation logic

- [ ] 4.0 Integrate Forms into Patient Workspace
  - [ ] 4.1 Update ConsolidatedConsultationTab with enhanced prior auth section
  - [ ] 4.2 Add dedicated referral section below prior authorization
  - [ ] 4.3 Remove redundant "Generate Referral" button from prior auth
  - [ ] 4.4 Implement consistent design patterns and error handling
  - [ ] 4.5 Add comprehensive frontend and backend testing 