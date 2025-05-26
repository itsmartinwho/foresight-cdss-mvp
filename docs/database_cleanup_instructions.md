# Database Cleanup Instructions

## Overview

This document provides step-by-step instructions to complete the database cleanup and ensure the Foresight CDSS is fully aligned with the FHIR-based refactored architecture.

## Required Actions

### 1. Execute Database Cleanup Script

Run the comprehensive cleanup script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of scripts/database_cleanup_final.sql
-- This script will:
-- - Remove problematic views (admissions, test_data_summary)
-- - Drop deprecated columns from patients table
-- - Ensure proper FHIR-aligned column names
-- - Create differential_diagnoses table
-- - Add proper indexes and documentation
```

**Location:** `scripts/database_cleanup_final.sql`

### 2. Verify Database State

After running the cleanup script, verify the following:

#### Check Views Are Removed
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('admissions', 'test_data_summary');
-- Should return 0 rows
```

#### Check Deprecated Columns Are Removed
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'patients' 
  AND column_name IN ('primary_diagnosis_description', 'general_diagnosis_details');
-- Should return 0 rows
```

#### Check New Table Exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'differential_diagnoses';
-- Should return 1 row
```

### 3. Test Application Functionality

After database cleanup, test the following:

1. **Patient Loading**: Verify patients load correctly in the UI
2. **Encounter Display**: Check that encounters (not admissions) display properly
3. **Diagnosis Display**: Ensure diagnoses show from conditions table
4. **Clinical Engine**: Test AI analysis generates and saves differentials
5. **Lab Results**: Verify lab results display with proper formatting

### 4. Update Any Remaining Legacy References

Search for and update any remaining references to:
- `admissions` (should be `encounters`)
- `visits` (should be `encounters`)
- `primary_diagnosis_description` (should use conditions table)
- `general_diagnosis_details` (should use conditions table)

## Current Architecture Summary

### Database Tables (Post-Cleanup)

1. **patients** - FHIR-aligned demographics
2. **encounters** - Clinical encounters (formerly visits/admissions)
3. **conditions** - Diagnoses and medical conditions
4. **lab_results** - Laboratory observations
5. **differential_diagnoses** - AI-generated differential diagnoses

### Key Features Implemented

- ✅ FHIR-aligned database schema
- ✅ Differential diagnoses storage and retrieval
- ✅ Clinical engine integration with database
- ✅ Proper data normalization
- ✅ Legacy view removal
- ✅ Deprecated field cleanup

### Clinical Engine Workflow

1. Patient data loaded from normalized tables
2. Symptoms extracted from transcripts
3. Diagnostic plan generated and executed
4. Primary diagnosis and differentials synthesized
5. SOAP note and treatment plan created
6. Results saved to appropriate database tables
7. Differentials stored in dedicated table

## Troubleshooting

### If Views Still Exist

If the problematic views still exist after running the cleanup script:

```sql
-- Force drop views
DROP VIEW IF EXISTS public.admissions CASCADE;
DROP VIEW IF EXISTS public.test_data_summary CASCADE;
```

### If Deprecated Columns Remain

If deprecated columns still exist in the patients table:

```sql
-- Force drop columns
ALTER TABLE public.patients 
  DROP COLUMN IF EXISTS primary_diagnosis_description CASCADE,
  DROP COLUMN IF EXISTS general_diagnosis_details CASCADE;
```

### If Application Errors Occur

1. Check browser console for TypeScript errors
2. Verify Supabase connection is working
3. Check that all table names match in the code
4. Ensure foreign key relationships are intact

## Verification Checklist

- [ ] Database cleanup script executed successfully
- [ ] Problematic views removed
- [ ] Deprecated columns dropped
- [ ] Differential diagnoses table created
- [ ] Application loads without errors
- [ ] Patients display correctly
- [ ] Encounters (not admissions) work properly
- [ ] Diagnoses pull from conditions table
- [ ] Clinical engine saves differentials
- [ ] Lab results display with flags
- [ ] No console errors in browser
- [ ] All tests pass

## Next Steps

After completing the cleanup:

1. **Test with Real Data**: Verify the system works with actual patient data
2. **Performance Testing**: Ensure queries perform well with larger datasets
3. **Integration Testing**: Test the complete clinical workflow
4. **Documentation Review**: Update any remaining documentation
5. **User Training**: Brief users on any interface changes

## Support

If you encounter issues during cleanup:

1. Check the database logs for error messages
2. Verify foreign key constraints are not violated
3. Ensure all required tables exist before running queries
4. Contact the development team for assistance

This cleanup ensures the Foresight CDSS has a clean, FHIR-aligned architecture ready for production use and future EHR integration. 