# Foresight Clinical Decision Support System (CDSS)

## Overview

Foresight CDSS is a browser-based clinical decision support system designed to assist healthcare providers with diagnostic planning, treatment recommendations, and complex case identification for autoimmune and oncology conditions. The system integrates ambient voice transcription, clinical data analysis, AI diagnostic assistance, and automated documentation to streamline clinical workflows and improve patient care.

## Features

### 1. Ambient Voice Transcription and Note Generation
- Real-time transcription of doctor-patient conversations
- Automatic generation of SOAP notes from transcripts
- Editable clinical notes for physician review and finalization

### 2. Clinical Data Integration
- Patient demographic information display
- Medical history and previous diagnoses
- Laboratory results and admission records
- Identification of autoimmune and oncology cases

### 3. AI Diagnostic and Treatment Advisor
- Symptom-based diagnostic plan generation
- Step-by-step diagnostic process execution
- Evidence-based diagnostic results with confidence scores
- Treatment recommendations based on clinical guidelines
- Differential diagnosis suggestions

### 4. Real-time Clinical Co-pilot
- Context-aware clinical suggestions during consultations
- Recommended questions based on patient symptoms
- Test and medication recommendations
- Clinical guideline references

### 5. Complex Case Alerting
- Automatic detection of potential autoimmune cases
- Automatic detection of potential oncology cases
- Severity assessment and suggested actions
- Early identification of complex cases requiring specialist attention

### 6. Documentation Automation
- Prior authorization request generation
- Specialist referral letter creation
- Clinical justification for treatments and referrals
- Structured documentation for insurance and administrative purposes

### 7. Clinical Trial Matching
- Matching patients to relevant clinical trials
- Trial eligibility assessment
- Contact information for trial coordinators

## Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager

### Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Dashboard
The dashboard provides an overview of recent patients, autoimmune cases, and oncology cases. Use the navigation links to access different sections of the application.

### Patient List
View all patients in the system, search for specific patients, and access patient details or start consultations.

### Patient Detail
View comprehensive patient information including demographics, admission history, diagnoses, and laboratory results.

### Consultation
Start a new consultation with a patient, which includes:
- Voice transcription (simulated in the MVP)
- Clinical note generation
- Co-pilot suggestions
- Complex case alerts

### Diagnostic Advisor
Enter patient symptoms to generate a diagnostic plan, execute the plan to receive diagnostic results, and access treatment recommendations and clinical trial matches.

## Technical Architecture

### Frontend
- Next.js React framework
- TypeScript for type safety
- Tailwind CSS for styling

### Services
- Patient Data Service: Manages patient information
- Clinical Engine Service: Provides diagnostic and treatment recommendations
- Transcription Service: Handles voice transcription and note generation
- Alert Service: Detects complex cases and generates co-pilot suggestions

### Data Model
- Patient: Demographics and core information
- Admission: Hospital/clinic admission records
- Diagnosis: ICD-coded diagnoses
- LabResult: Laboratory test results
- Transcript: Voice transcription segments
- ClinicalNote: SOAP-formatted clinical notes
- DiagnosticPlan: Step-by-step diagnostic process
- DiagnosticResult: AI-generated diagnostic assessment

## Future Enhancements
- Integration with electronic health record (EHR) systems
- Real voice transcription using speech-to-text APIs
- Machine learning models for improved diagnostic accuracy
- Mobile application for on-the-go access
- Expanded coverage for additional medical specialties

## Support
For questions or support, please contact the Foresight CDSS team.

## Data Pipeline

### Data Sources
- **Raw input files** (used as input to the enrichment scripts, not used at runtime):
  - `data/100-patients/PatientCorePopulatedTable.txt`
  - `data/100-patients/AdmissionsCorePopulatedTable.txt`
  - `data/100-patients/AdmissionsDiagnosesCorePopulatedTable.txt`
  - `data/100-patients/LabsCorePopulatedTable.txt`

- **Enriched output files** (used by the application at runtime):
  - `public/data/100-patients/Enriched_Patients.tsv`
  - `public/data/100-patients/Enriched_Admissions.tsv`
  - `public/data/100-patients/AdmissionsDiagnosesCorePopulatedTable.txt`
  - `public/data/100-patients/LabsCorePopulatedTable.txt`

### Data Enrichment
To generate the enriched data files, run:

```sh
pnpm run build:data
```

This will execute the Python enrichment scripts in `scripts/`, which merge, enrich, and clean the raw data, producing the output files in `public/data/100-patients/`.

**Note:** Only the files in `public/data/100-patients/` are used by the application at runtime. Do not edit these files by hand; always regenerate them using the enrichment scripts.
