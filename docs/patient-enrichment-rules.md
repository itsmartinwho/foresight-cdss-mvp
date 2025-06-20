# Patient Data Enrichment Rules for Foresight CDSS

## Overview
This document defines the enrichment logic for target patients in the Foresight CDSS system. The enrichment process should only apply to specific patients with existing encounter data that needs improvement.

## Target Patients
- **Maria Gomez** (ID: RUGOWDBR4X61) - 8 encounters
- **James Lee** (ID: VPQRFHNAHJYJ) - 3 encounters  
- **Priya Patel** (ID: JD2SWQJXSNW1) - 2 encounters
- **Alice Smith** (ID: TEST_HEALTHY_001) - 3 encounters

**IMPORTANT**: Only enrich encounters where `is_deleted = FALSE`

## Analysis Results Summary

### Overall Status
- **Patients analyzed**: 4/4
- **Patients needing enrichment**: 4/4 (100%)
- **Total encounters**: 16
- **Encounters needing work**: 15/16 (94%)

### Critical Issues Identified

#### 1. **Maria Gomez - Most Critical** ⚠️
- **Duplicate Reasons**: "Migraine with aura" appears 7 times out of 8 encounters
- **All encounters need work**: 8/8 require enrichment
- **Issues**: 5/5 criteria failing

#### 2. **Priya Patel - High Priority** 
- **SOAP in Transcript**: Content mixed between transcript and SOAP fields
- **All encounters need work**: 2/2 require enrichment  
- **Issues**: 4/5 criteria failing

#### 3. **James Lee & Alice Smith - Moderate Priority**
- **Mixed Content**: Some encounters working, others need enrichment
- **Issues**: 4/5 criteria failing each

## Enrichment Decision Tree

### Step 1: Patient Validation
```
IS patient IN [Maria Gomez, James Lee, Priya Patel, Alice Smith]?
├─ YES → Continue to Step 2
└─ NO → Skip (no enrichment)
```

### Step 2: Encounter Validation  
```
IS encounter.is_deleted = FALSE?
├─ YES → Continue to Step 3
└─ NO → Skip (soft deleted)
```

### Step 3: Issue Detection & Prioritization

#### Priority 1: Duplicate Reasons (Maria Gomez Specific)
```
ARE there repeated reason_display_text values?
├─ YES → Generate unique reasons based on encounter context
└─ NO → Continue to Priority 2
```

**Implementation**: For Maria Gomez, generate 7 unique reasons replacing "Migraine with aura"

#### Priority 2: Transcript Format Issues
```
IS transcript in conversational doctor-patient format?
AND does transcript NOT contain SOAP structured content?
AND is transcript length > 120 chars with > 20 words?
├─ NO to any → Transform transcript to conversational format
└─ YES → Continue to Priority 3
```

**Identified Issues**:
- **Maria Gomez**: 8/8 encounters have format issues
- **Priya Patel**: 2/2 encounters have SOAP content in transcript
- **James Lee**: 1/3 encounters problematic
- **Alice Smith**: 1/3 encounters problematic

#### Priority 3: SOAP Notes Structure
```
DOES encounter have properly structured SOAP notes?
AND are SOAP sections (S, O, A, P) properly separated?
AND is SOAP content NOT duplicated in transcript?
├─ NO → Create/restructure SOAP notes
└─ YES → Continue to Priority 4
```

**Pattern Detected**: Content often mixed between `transcript` and `soap_note` fields

#### Priority 4: Differential Diagnoses
```
DOES encounter have differential_diagnoses records?
AND do differentials have likelihood scores?
AND do differentials have rank_order?
├─ NO → Generate differential diagnoses
└─ YES → Continue to Priority 5
```

**Current State**: Most encounters missing differential diagnoses entirely

#### Priority 5: Rich Content Generation
```
DOES encounter have diagnosis_rich_content AND treatments_rich_content?
├─ NO → Generate rich content using clinical engine
└─ YES → Enrichment complete
```

**Current State**: 15/16 encounters missing rich content

## Implementation Priorities

### Phase 1: Critical Issues (Week 1)
1. **Maria Gomez Duplicate Reasons** - Generate 7 unique, contextually appropriate reasons
2. **Transcript Format Standardization** - Convert all to proper doctor-patient dialogue
3. **SOAP Content Separation** - Move SOAP content from transcripts to proper SOAP fields

### Phase 2: Clinical Content (Week 2)  
4. **Differential Diagnoses Generation** - Create clinical differentials for all encounters
5. **Rich Content Generation** - Generate formatted diagnosis and treatment content

### Phase 3: Validation (Week 3)
6. **Quality Assurance** - Verify all enriched content displays properly in UI
7. **Clinical Review** - Ensure medical accuracy of generated content

## Validation Rules

### Pre-Enrichment Checks
- Patient exists in target list
- Encounter is not soft-deleted (`is_deleted = FALSE`)
- Encounter has basic required fields (`patient_supabase_id`, `encounter_id`)

### Post-Enrichment Validation
- Transcript is conversational format (contains "doctor:", "patient:" or similar)
- SOAP notes have all 4 sections (S, O, A, P)
- Differential diagnoses exist with likelihood and ranking
- Rich content objects are valid JSON with required fields
- No duplicate content between transcript and SOAP fields

### Quality Metrics
- **Success Rate**: % of encounters successfully enriched
- **Content Quality**: Manual review of medical accuracy
- **UI Display**: Verify proper rendering in consultation interface
- **Data Integrity**: Ensure no data loss during transformation

## Risk Mitigation

### Backup Strategy
- Store original content in `extra_data.original_transcript` before modification
- Log all enrichment actions with timestamps
- Implement rollback capability

### Safety Measures
- **Never use destructive database operations** (DROP, TRUNCATE, DELETE with no WHERE clause)
- Always use specific WHERE clauses targeting individual records
- Test enrichment on single encounter before batch processing
- Maintain audit trail of all changes

## Success Criteria

An encounter is considered "successfully enriched" when:
1. ✅ Has unique, medically appropriate reason for visit
2. ✅ Transcript in proper conversational format  
3. ✅ SOAP notes properly structured in dedicated field
4. ✅ Has 3-5 differential diagnoses with likelihood scores
5. ✅ Has rich content for both diagnosis and treatments
6. ✅ Displays correctly in Foresight UI without errors 