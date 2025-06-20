# Synthetic Data Import Process Documentation

## Overview

This document describes the process for importing synthetic clinical data into the Foresight CDSS MVP database. The import process enriches existing patient and encounter records with generated clinical content including diagnoses, lab results, transcripts, and treatment plans.

## ✅ IMPORT COMPLETED SUCCESSFULLY

**Date:** May 26, 2025  
**Status:** Complete  
**Records Processed:** 11/11  
**Errors:** 0  

### Import Results:
- **Encounter Updates:** 11 encounters enriched with reason codes, transcripts, SOAP notes, observations, and treatments
- **New Conditions:** 33 conditions added (encounter-diagnosis, problem-list-item, differential)
- **New Lab Results:** 24 lab results added with full FHIR compliance
- **Data Integrity:** All referential integrity checks passed

## Key Issue Resolved

### Observations Field Data Type Mismatch
**Problem:** The database had `observations` as `TEXT[]` (array) but our schema.sql showed `TEXT` (string).  
**Solution:** Updated import script to convert text observations to arrays by splitting on sentence boundaries.  
**Fix Applied:** Modified `importEncounterUpdates()` function to handle array conversion automatically.

## Prerequisites

1. **Environment Setup**
   - Node.js installed (v16 or higher)
   - Access to the Supabase database
   - `.env.local` file with required credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

2. **Database Schema**
   - Ensure the database schema matches `scripts/schema.sql`
   - All required FHIR-aligned columns must be present
   - **Note:** `observations` field is `TEXT[]` (array), not `TEXT`

3. **Synthetic Data File**
   - Located at `public/data/synthetic-data.json`
   - Generated using the synthetic data generation guide

## Import Scripts

### 1. `scripts/clean_synthetic_data.js`
Cleans and validates the synthetic data JSON file, fixing common issues:
- Malformed JSON syntax
- Invalid field values
- Missing required fields
- Outputs cleaned data to `public/data/synthetic-data-cleaned.json`

### 2. `scripts/import_synthetic_data.js`
Main import script that:
- Validates all UUIDs exist in the database
- Checks data type compliance
- **Converts text observations to arrays automatically**
- Imports data with transaction safety
- Generates detailed error logs
- Supports dry-run mode for testing

### 3. `scripts/run_synthetic_data_import.js`
Orchestration script that runs the complete import process:
- Executes data cleaning
- Runs the import (with optional dry-run)
- Provides summary and next steps

### 4. `scripts/validate_import_results.js`
Post-import validation script that:
- Verifies data integrity
- Checks referential integrity
- Provides import statistics
- Displays sample data

## Running the Import

### Step 1: Dry Run (Recommended)
First, perform a dry run to validate the data without making changes:

```bash
node scripts/run_synthetic_data_import.js --dry-run
```

This will:
- Clean the synthetic data
- Validate all records
- Report any errors without modifying the database

### Step 2: Review Errors
Check the generated `scripts/import_errors.log` for:
- Missing patient or encounter UUIDs
- Data validation failures
- Foreign key constraint issues

### Step 3: Live Import
Once the dry run passes successfully:

```bash
node scripts/run_synthetic_data_import.js
```

### Step 4: Validate Results
After import completion:

```bash
node scripts/validate_import_results.js
```

### Advanced Options

**Skip data cleaning** (if already cleaned):
```bash
node scripts/run_synthetic_data_import.js --skip-cleaning
```

**Run individual scripts**:
```bash
# Clean data only
node scripts/clean_synthetic_data.js

# Import with cleaned data
node scripts/import_synthetic_data.js --dry-run
```

## Data Structure

### Input Format
The synthetic data JSON contains an array of records with:
```json
{
  "synthetic_data": [
    {
      "patient_supabase_id": "uuid",
      "encounter_supabase_id": "uuid",
      "generated_encounter_updates": {
        "reason_code": "ICD-10 code",
        "reason_display_text": "Human readable reason",
        "transcript": "Clinical conversation",
        "soap_note": "SOAP format note",
        "observations": "Clinical observations text",
        "treatments": "[Array of treatment objects]"
      },
      "generated_conditions": [...],
      "generated_lab_results": [...]
    }
  ]
}
```

### Database Updates

1. **Encounters Table**: Updates existing records with:
   - reason_code, reason_display_text
   - transcript, soap_note
   - observations (converted to TEXT[] array)
   - treatments (JSON array)

2. **Conditions Table**: Inserts new records with:
   - ICD-10/SNOMED codes
   - Clinical and verification status
   - Categories (encounter-diagnosis, problem-list-item, differential)

3. **Lab Results Table**: Inserts new records with:
   - Test names and values
   - Reference ranges and interpretations
   - FHIR-compliant value types

## Error Handling

### Common Errors and Solutions

1. **Patient UUID not found**
   - Verify the patient exists in the database
   - Check for typos in the UUID

2. **Invalid clinical_status**
   - Must be one of: active, recurrence, relapse, inactive, remission, resolved
   - The cleaning script auto-corrects invalid values to 'active'

3. **Foreign key violations**
   - Ensure encounter belongs to the specified patient
   - Verify all UUIDs are valid

4. **Observations array format error** ✅ RESOLVED
   - Database expects TEXT[] but data was TEXT
   - Import script now automatically converts text to array format

### Error Log Format
```json
{
  "summary": {
    "totalRecords": 100,
    "processedRecords": 98,
    "successfulUpdates": 95,
    "failedUpdates": 3
  },
  "errors": [
    {
      "type": "VALIDATION",
      "patientId": "uuid",
      "encounterId": "uuid",
      "message": "Error description",
      "details": {},
      "timestamp": "2024-01-20T10:30:00Z"
    }
  ]
}
```

## Post-Import Validation

After successful import:

1. **Verify Data Integrity**
   ```sql
   -- Check encounter updates
   SELECT COUNT(*) FROM encounters 
   WHERE transcript IS NOT NULL 
   AND soap_note IS NOT NULL;

   -- Check new conditions
   SELECT COUNT(*) FROM conditions 
   WHERE created_at >= CURRENT_DATE;

   -- Check new lab results
   SELECT COUNT(*) FROM lab_results 
   WHERE created_at >= CURRENT_DATE;
   ```

2. **Application Testing**
   - Navigate to patient records in the application
   - Verify new data displays correctly
   - Test clinical decision support features

## Final Import Statistics

- **Total Records:** 11
- **Encounter Updates:** 11 (100% success)
- **New Conditions:** 33 (100% success)
- **New Lab Results:** 24 (100% success)
- **Errors:** 0
- **Data Integrity:** ✅ Verified

## Cleanup

The following temporary files can be removed after successful import:
- `public/data/synthetic-data-cleaned.json` (if desired)
- `scripts/import_errors.log` (if no longer needed)

## Lessons Learned

1. **Schema Alignment:** Always verify actual database schema matches documentation
2. **Data Type Handling:** PostgreSQL array types require special handling in Supabase
3. **Dry Run Testing:** Essential for catching data type mismatches before live import
4. **Validation Scripts:** Post-import validation provides confidence in data integrity

---

**Status:** ✅ COMPLETE - Synthetic data successfully imported and validated. 