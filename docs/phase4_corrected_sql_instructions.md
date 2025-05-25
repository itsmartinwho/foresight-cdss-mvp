# Phase 4 SQL Script - Corrected Version

## Important Notes

The Phase 4 SQL script has been corrected to match the actual database schema. The following fields do **NOT** exist in the database and have been removed from the script:

### Fields that don't exist:
- `patients.phone`
- `patients.email`
- `patients.address`
- `encounters.date_time` (use `scheduled_start_datetime`)
- `encounters.encounter_class` (not used; `admission_type` covers this)

### Correct field names & usage:
- Use `birth_date` not `dob` (already renamed in Phase 1)
- Use `admission_type` for the type of encounter (e.g., 'consultation').
- Use `reason_code` for the coded reason (e.g., 'R05').
- Use `reason_display_text` for the human-readable text (e.g., 'Cough - mild upper respiratory symptoms').
- Use `scheduled_start_datetime` for encounter timing.

## Running the Script

1. **First, run the DROP COLUMN statements** to remove deprecated fields:
```sql
ALTER TABLE public.patients 
  DROP COLUMN IF EXISTS primary_diagnosis_description,
  DROP COLUMN IF EXISTS general_diagnosis_details;
```

2. **Then run the test data insertion** from `scripts/phase4_final_cleanup.sql`

3. **Alternatively, use the TypeScript loader** which has also been corrected:
```bash
npx ts-node scripts/phase4_test_data_loader.ts
```

## Test Data Created

The script creates 5 test patients:
- **TEST_HEALTHY_001**: Alice Smith - Healthy adult with simple URI
- **TEST_CHRONIC_001**: Bob Jones - Multiple chronic conditions (diabetes, HTN, hyperlipidemia)
- **TEST_MINIMAL_001**: Charlie Brown - Minimal data (no race/ethnicity)
- **TEST_PEDS_001**: Diana Wilson - Pediatric patient with fever
- **TEST_ELDERLY_001**: Eleanor Thompson - Elderly with AFib, CKD, dementia

## Verification

After running the script, verify:
1. Test patients appear in the UI
2. Encounters show with separate `reason_code` and `reason_display_text`.
3. Lab results and conditions are properly linked
4. AI analysis can run on these test patients

## Schema Alignment Status

The system now has:
- ✅ FHIR-aligned patient demographics (with `birth_date`, `race`, `ethnicity`)
- ✅ FHIR-aligned encounters (with `status`, `is_deleted` for soft deletes)
- ✅ Separate `conditions` table for diagnoses
- ✅ Separate `lab_results` table for observations
- ✅ Removed deprecated diagnosis fields from patients table
- ✅ Clean, minimal schema without unnecessary fields

The schema is ready for future FHIR integration while maintaining MVP functionality. 