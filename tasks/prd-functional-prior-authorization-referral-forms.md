# Product Requirements Document: Functional Prior Authorization and Referral Forms

## Introduction/Overview

This PRD outlines the development of functional Prior Authorization and Referral forms within the Foresight CDSS patient workspace. Currently, these forms exist as mock sections with limited functionality. The goal is to transform them into fully functional, data-driven forms that auto-populate from encounter data, provide editable fields, and generate downloadable PDFs in FHIR 6.1 compliant format.

The feature addresses the critical need to save healthcare provider administrative time by pre-filling authorization and referral forms with existing encounter data, while maintaining the flexibility for manual input and generating professional documentation for EHR system integration.

## Goals

1. **Reduce Administrative Burden**: Automatically populate prior authorization and referral forms with existing encounter data to save provider time
2. **Improve Accuracy**: Minimize manual data entry errors by leveraging structured encounter information
3. **Enhance Workflow Efficiency**: Provide seamless form completion and PDF generation within the patient workspace
4. **Ensure Data Compliance**: Generate forms in FHIR 6.1 compliant format for future EHR integration
5. **Maintain Flexibility**: Allow manual editing of auto-populated fields and completion of missing information

## User Stories

1. **As a healthcare provider**, I want prior authorization forms to auto-populate with patient demographics, diagnoses, and treatments from the current encounter so that I can quickly complete authorization requests without manual data entry.

2. **As a nurse practitioner**, I want to edit pre-filled form fields when the auto-populated data needs clarification or updates so that the final authorization accurately reflects the clinical situation.

3. **As a physician**, I want a dedicated referral section separate from prior authorization so that I can easily distinguish between and manage different types of administrative tasks.

4. **As a healthcare administrator**, I want to download completed forms as professionally formatted PDFs so that I can submit them to insurance companies or EHR systems.

5. **As a care coordinator**, I want forms to save automatically as I work on them so that I don't lose progress if I need to switch between patients or tasks.

6. **As a specialist**, I want referral forms to include comprehensive clinical information from the encounter so that I have sufficient context for patient evaluation.

## Functional Requirements

### Prior Authorization Forms

1. **Form Type Selection**: Implement a dropdown selector with FHIR resource types (default: Claim) that dynamically adjusts form fields based on selection
2. **Auto-Population**: Automatically fill form fields with data from the current encounter including:
   - Patient demographics (name, DOB, gender, insurance status)
   - Primary diagnosis (description and ICD-10 code)
   - Requested medication/treatment from encounter treatments
   - Clinical justification from existing priorAuthJustification field
   - Provider information (where available)
3. **Manual Input Fields**: Provide editable placeholder fields for data not available in the system:
   - Provider name and NPI
   - Insurance authorization numbers
   - Additional clinical documentation
   - Service codes and duration
4. **Field Validation**: Ensure required fields are completed before PDF generation
5. **Real-time Saving**: Save form data automatically as users edit fields
6. **PDF Generation**: Create downloadable PDF with Foresight branding (logo in top-left corner)

### Referral Forms

7. **Dedicated Section**: Create a new dedicated referral section in the patient workspace below prior authorization
8. **FHIR Resource Selection**: Implement dropdown with common referral types (default: ServiceRequest) with field customization
9. **Auto-Population**: Fill referral forms with encounter data including:
   - Patient information and demographics
   - Referring provider details
   - Diagnosis and clinical reasoning
   - Current medications and allergies
   - Recent lab results and vital signs
   - SOAP notes and clinical observations
10. **Specialist Selection**: Provide fields for specialist type and facility information
11. **Clinical Context**: Include comprehensive clinical information section with:
    - History of present illness
    - Relevant past medical history
    - Physical examination findings
    - Recent diagnostic results
12. **Evaluation Requests**: Allow specification of requested evaluations or procedures

### User Interface

13. **Workspace Integration**: Maintain current prior authorization section position, add referral section below it
14. **Remove Redundancy**: Remove existing "Generate Referral" button from prior authorization section
15. **Consistent Design**: Match existing patient workspace visual design and interaction patterns
16. **Form Validation**: Provide clear visual indicators for required vs optional fields
17. **Progress Indication**: Show form completion status and validation errors

### Technical Implementation

18. **FHIR Compliance**: Structure form data to align with FHIR 6.1 core resources and best practices
19. **Data Persistence**: Store form data in the database with proper versioning and audit trails
20. **PDF Generation**: Implement professional PDF formatting with proper layout, typography, and branding
21. **Error Handling**: Gracefully handle missing data and provide appropriate fallbacks

## Non-Goals (Out of Scope)

1. **Real-time EHR Integration**: Direct submission to external EHR systems or payers (will be handled via downloadable PDFs)
2. **Advanced Workflow Routing**: Approval workflows or multi-user collaboration features
3. **Insurance Verification**: Real-time insurance eligibility checking or benefit verification
4. **Template Customization**: User-configurable form templates or layouts
5. **Role-based Permissions**: Different access levels for different user types (implementing universal access initially)
6. **Multi-encounter Data**: Aggregating data from multiple encounters (focus on current encounter only)

## Design Considerations

### UI/UX Requirements
- Maintain consistency with existing ConsolidatedConsultationTab design patterns
- Use Card components for visual organization similar to other sections
- Implement EditableTextField components for consistent editing experience
- Follow existing color scheme and typography (neon accents, glassmorphism effects)
- Ensure responsive design for various screen sizes

### Data Flow
- Leverage existing encounter data structure and field relationships
- Integrate with current updateField mechanisms for data persistence
- Use existing patient and encounter context loading patterns

### PDF Formatting
- Professional medical document layout with proper margins and spacing
- Clear section headers and field labels
- Foresight logo placement in top-left corner
- Appropriate font choices for medical documentation
- Print-friendly formatting and pagination

## Technical Considerations

### FHIR Resource Mapping
- **Prior Authorization**: Primarily use Claim resource with Coverage and ServiceRequest references
- **Referrals**: Use ServiceRequest resource with appropriate Task and DocumentReference relationships
- **Patient Data**: Leverage existing Patient, Encounter, and Condition resources
- **Provider Information**: Utilize Practitioner and PractitionerRole resources where available

### Database Schema
- Extend existing encounter table to include form-specific fields
- Create dedicated tables for form data if needed to support versioning
- Ensure proper foreign key relationships and data integrity

### Integration Points
- Build upon existing EditableTextField and Card components
- Integrate with current patient workspace state management
- Leverage existing supabaseDataService for data persistence
- Use established error handling and notification patterns

## Success Metrics

1. **Time Savings**: Reduce prior authorization form completion time by 60% through auto-population
2. **Data Accuracy**: Achieve 95%+ accuracy in auto-populated fields vs manual entry
3. **User Adoption**: 80% of providers use the new forms within 30 days of release
4. **Form Completion**: 90% of forms completed and downloaded within the interface
5. **Error Reduction**: 50% reduction in form submission errors due to missing or incorrect data
6. **User Satisfaction**: Average rating of 4.0+ on usability surveys

## Open Questions

1. **Provider Information**: How should we handle missing provider NPI and contact information in the system?
2. **Insurance Integration**: What level of insurance information validation should we implement initially?
3. **PDF Security**: Do we need any specific security features for the generated PDFs (encryption, digital signatures)?
4. **Form Versioning**: How should we handle updates to form templates while maintaining historical records?
5. **Bulk Operations**: Should we support batch generation of multiple forms simultaneously?
6. **Mobile Optimization**: What level of mobile device support is required for form completion?
7. **Accessibility**: What specific accessibility requirements must be met for the forms interface?
8. **Performance**: What are the acceptable response times for form auto-population and PDF generation? 