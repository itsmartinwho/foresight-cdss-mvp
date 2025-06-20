# Patient Data Enrichment Rules for Foresight CDSS

## Overview
This document defines the enrichment logic for target patients in the Foresight CDSS system. The enrichment process should only apply to specific patients with existing encounter data that needs improvement.

## Target Patients
- Maria Gomez
- James Lee 
- Priya Patel
- Alice Smith

**IMPORTANT**: Only enrich encounters where `is_deleted = FALSE`

## Identified Issues

### 1. Maria Gomez Issues
- **Duplicate Reason for Visit**: All encounters have the same reason_display_text
- **Solution**: Generate unique, realistic reasons for each encounter based on demographic patterns

### 2. Priya Patel Issues
- **Missing Clinical Data**: Some encounters have only short transcripts without SOAP notes, differentials, or treatments
- **Misplaced Content**: Transcript content contains SOAP-like information, but actual SOAP notes field has incorrect structure
- **SOAP Structure Problem**: All content bundled in Subjective section instead of proper S/O/A/P format

### 3. General Data Quality Issues
- **Stub Encounters**: Encounters with transcripts < 120 characters or < 20 words
- **Missing Rich Content**: Encounters lacking proper clinical depth

## Enrichment Decision Tree

```
START: For each target patient
├── Step 1: Patient Validation
│   ├── Is patient in target list? (Maria Gomez, James Lee, Priya Patel, Alice Smith)
│   │   ├── YES → Continue to Step 2
│   │   └── NO → Skip patient
│   └── Patient exists in database?
│       ├── YES → Continue to Step 2  
│       └── NO → Log warning and skip
│
├── Step 2: Encounter Filtering
│   ├── Load all patient encounters where is_deleted = FALSE
│   ├── For each encounter, check:
│   │   ├── Is encounter soft deleted? (is_deleted = TRUE)
│   │   │   ├── YES → Skip encounter
│   │   │   └── NO → Continue to Step 3
│   │   └── Does encounter need enrichment?
│   │       ├── Check enrichment criteria (Step 3)
│   │       └── Apply appropriate enrichment strategy (Step 4)
│
├── Step 3: Enrichment Criteria Assessment
│   ├── A. Content Quality Issues
│   │   ├── Stub Transcript (< 120 chars OR < 20 words)
│   │   │   └── ACTION: Generate full realistic transcript
│   │   ├── Missing SOAP Notes (soap_note is NULL or empty)
│   │   │   └── ACTION: Generate complete SOAP note
│   │   ├── Missing Treatments (treatments is NULL, empty array, or stub)
│   │   │   └── ACTION: Generate realistic treatment plan
│   │   ├── Missing Observations (observations is NULL or empty)
│   │   │   └── ACTION: Generate clinical observations
│   │   └── Missing Reason (reason_display_text is generic or missing)
│   │       └── ACTION: Generate specific, realistic reason
│   │
│   ├── B. Structural Issues  
│   │   ├── SOAP Misplacement (transcript contains SOAP-like content)
│   │   │   ├── Extract SOAP content from transcript
│   │   │   ├── Clean transcript to contain only conversation
│   │   │   └── Properly structure SOAP in soap_note field
│   │   ├── Malformed SOAP (all content in one section)
│   │   │   └── ACTION: Redistribute content across S/O/A/P sections
│   │   └── Duplicate Content (same content across multiple fields)
│   │       └── ACTION: Differentiate and specialize content per field
│   │
│   ├── C. Patient-Specific Issues
│   │   ├── Maria Gomez: Duplicate Reasons
│   │   │   ├── Identify encounters with identical reason_display_text
│   │   │   └── Generate unique reasons based on:
│   │   │       ├── Patient demographics (age, gender, race)
│   │   │       ├── Encounter dates (seasonal patterns)
│   │   │       ├── Encounter types (outpatient, inpatient, emergency)
│   │   │       └── Previous encounter history (progression/follow-ups)
│   │   │
│   │   ├── Priya Patel: Missing Clinical Depth
│   │   │   ├── Focus on generating comprehensive clinical assessments
│   │   │   ├── Ensure differential diagnoses are present
│   │   │   └── Generate detailed treatment plans
│   │   │
│   │   ├── James Lee: [To be determined based on data analysis]
│   │   └── Alice Smith: [To be determined based on data analysis]
│   │
│   └── D. Rich Content Requirements
│       ├── Missing diagnosis_rich_content
│       │   └── ACTION: Generate rich content with charts, decision trees
│       └── Missing treatments_rich_content  
│           └── ACTION: Generate rich treatment plans with visual elements
│
└── Step 4: Enrichment Strategies

    A. TRANSCRIPT ENRICHMENT
    ├── Input: Patient demographics, encounter type, reason
    ├── Generate: Natural patient-clinician conversation
    ├── Requirements:
    │   ├── Use patient's actual first name (not generic names)
    │   ├── Match encounter type and reason
    │   ├── Include realistic medical dialogue
    │   ├── Length: 200-800 characters for realistic depth
    │   └── Format: "Doctor: ... \nPatient: ... \nDoctor: ..."
    
    B. SOAP NOTE ENRICHMENT  
    ├── Input: Transcript, patient history, encounter reason
    ├── Generate: Structured clinical note
    ├── Requirements:
    │   ├── S: Subjective (patient-reported symptoms)
    │   ├── O: Objective (vital signs, physical exam findings)
    │   ├── A: Assessment (clinical diagnosis/impression)
    │   ├── P: Plan (treatment plan, follow-up)
    │   └── Each section must contain relevant, specific content
    
    C. TREATMENTS ENRICHMENT
    ├── Input: Assessment, patient conditions, medical history
    ├── Generate: JSONB array of treatment objects
    ├── Requirements:
    │   ├── medication: Include drug name, dosage, route, frequency
    │   ├── procedure: Include procedure name, instructions
    │   ├── lifestyle: Include behavior modifications
    │   ├── patient_education: Include educational instructions
    │   └── follow_up: Include next steps and monitoring
    
    D. REASON DIVERSIFICATION (Maria Gomez specific)
    ├── Input: Encounter date, type, patient demographics
    ├── Logic: Generate varied reasons based on:
    │   ├── Primary care patterns (annual wellness, follow-ups)
    │   ├── Acute conditions (seasonal illnesses, injuries)
    │   ├── Chronic disease management (diabetes, hypertension)
    │   ├── Preventive care (screenings, immunizations)
    │   └── Specialty referrals (based on patient age/gender)
    
    E. CLINICAL OBSERVATIONS ENRICHMENT
    ├── Input: Encounter type, patient presentation, assessment
    ├── Generate: Array of clinical observations
    ├── Requirements:
    │   ├── Physical exam findings
    │   ├── Vital signs abnormalities
    │   ├── Diagnostic test results
    │   ├── Patient behavior/appearance notes
    │   └── Clinical decision rationale
    
    F. RICH CONTENT GENERATION
    ├── Diagnosis Rich Content:
    │   ├── Clinical decision trees
    │   ├── Diagnostic charts and graphs
    │   ├── Risk assessment tables
    │   └── Educational diagrams
    ├── Treatment Rich Content:
    │   ├── Medication comparison tables
    │   ├── Treatment timeline charts
    │   ├── Progress tracking visualizations
    │   └── Patient instruction infographics
```

## Validation Rules

### Pre-Enrichment Validation
1. Patient must exist in target list
2. Patient must exist in database
3. Encounter must not be soft deleted (`is_deleted = FALSE`)
4. Encounter must meet enrichment criteria

### Post-Enrichment Validation
1. All generated content must be medically plausible
2. Patient names in transcripts must match database records
3. SOAP notes must have content in all four sections
4. Treatments must be relevant to assessment
5. Rich content must follow established schema structure

### Data Consistency Rules
1. **Temporal Consistency**: All encounter dates must align with generated content
2. **Medical Consistency**: Treatments must match diagnoses
3. **Patient Consistency**: Content must be appropriate for patient demographics
4. **Encounter Consistency**: Content must match encounter type and setting

## Implementation Priority

### Phase 1: Critical Fixes
1. Fix Maria Gomez duplicate reasons (highest visibility issue)
2. Fix Priya Patel SOAP structure issues
3. Generate missing SOAP notes for stub encounters

### Phase 2: Content Enhancement  
1. Enrich all stub transcripts
2. Generate missing treatments and observations
3. Add differential diagnoses where missing

### Phase 3: Rich Content
1. Generate diagnosis_rich_content for all enriched encounters
2. Generate treatments_rich_content for all enriched encounters
3. Validate rich content rendering in frontend

## Error Handling

### Skip Conditions
- Patient not in target list
- Patient not found in database  
- Encounter is soft deleted
- Encounter already has high-quality content

### Rollback Conditions
- Generated content fails medical validation
- Generated content breaks database constraints
- Generated content causes frontend rendering errors

### Logging Requirements
- Log all enrichment decisions
- Track content generation metrics
- Record validation failures
- Maintain audit trail for all changes 