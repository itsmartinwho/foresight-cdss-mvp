# Synthetic Data Import Scripts and Instructions

This folder contains all the necessary scripts and documentation for importing synthetic clinical data into the Foresight CDSS MVP database.

## 📅 Import History

- **May 26, 2025:** Initial successful import wave (11 records)
- **May 27, 2025:** Final wave import (synthetic-data11: 28 encounters, synthetic-data12: 63 transcript updates)
- **Total:** 100+ encounters enriched with comprehensive clinical data

## 🛠️ Available Scripts

### Core Import Scripts
1. **`import_synthetic_data.js`** - Main import script for standard synthetic data
2. **`import_transcript_data.js`** - Specialized script for transcript-only updates
3. **`clean_synthetic_data.js`** - Data cleaning and validation
4. **`clean_transcript_data.js`** - Transcript data cleaning
5. **`correct_inconsistencies.js`** - Patient name correction and data consistency
6. **`validate_import_results.js`** - Post-import validation and verification

### Utility Scripts
7. **`run_synthetic_data_import.js`** - Orchestration script for complete import process

## 🚀 Quick Start Guide

### Standard Synthetic Data Import
```bash
# 1. Place your synthetic data file in public/data/
cp your-file.json public/data/

# 2. Clean the data
node scripts/synthetic-data/clean_synthetic_data.js public/data/your-file.json public/data/your-file-cleaned.json

# 3. Correct inconsistencies (patient names, etc.)
node scripts/synthetic-data/correct_inconsistencies.js public/data/your-file-cleaned.json public/data/your-file-corrected.json

# 4. Import to database
node scripts/synthetic-data/import_synthetic_data.js public/data/your-file-corrected.json

# 5. Validate results
node scripts/synthetic-data/validate_import_results.js
```

### Transcript-Only Import
```bash
# 1. Clean transcript data
node scripts/synthetic-data/clean_transcript_data.js public/data/transcript-file.json public/data/transcript-file-cleaned.json

# 2. Import transcript updates
node scripts/synthetic-data/import_transcript_data.js public/data/transcript-file-cleaned.json
```

## 📋 Data Format Requirements

### Standard Synthetic Data Format
```json
{
  "synthetic_data": [
    {
      "patient_supabase_id": "uuid",
      "encounter_supabase_id": "uuid",
      "generated_encounter_updates": {
        "reason_code": "ICD-10 code",
        "reason_display_text": "Description",
        "transcript": "Full conversation transcript",
        "soap_note": "Structured SOAP note",
        "observations": "Clinical observations",
        "treatments": [...]
      },
      "generated_conditions": [...],
      "generated_lab_results": [...]
    }
  ]
}
```

### Transcript Update Format
```json
{
  "synthetic_transcript_updates": [
    {
      "encounter_supabase_id": "uuid",
      "new_transcript": "Updated transcript content",
      "other_field_updates": {
        "reason_code": "ICD-10 code",
        "reason_display_text": "Description",
        "soap_note": "SOAP note",
        "observations": "Observations"
      }
    }
  ]
}
```

## 🔧 Common Issues and Solutions

### Interrupted JSON Files
If your JSON file was interrupted during generation:
1. The scripts automatically detect incomplete records
2. Only complete, valid records are imported
3. No manual intervention required

### Patient-Encounter Mismatches
- Validation errors for mismatched patient-encounter pairs are expected
- These are logged but don't stop the import process
- Check logs for details if needed

### Database Connection Issues
- Ensure your `.env.local` file has correct Supabase credentials
- Verify network connectivity to Supabase

## 📊 Expected Success Rates
- **Standard imports:** 90-100% success rate
- **Transcript imports:** 100% success rate (if properly formatted)
- **Validation errors:** 2-5% due to data mismatches (normal)

## 🧹 Cleanup After Import

After successful import, clean up temporary files:
```bash
# Remove all synthetic data files from public/data/
rm public/data/synthetic-data*.json

# Remove import log files
rm scripts/import_errors*.log
```

## 📚 Related Documentation

- **Complete Process Guide:** `/docs/synthetic_data_import_process.md`
- **Generation Guide:** `/docs/synthetic_data_generation_guide.md`
- **Import History:** `/docs/IMPORT_COMPLETION_SUMMARY.md`
- **Database Schema:** `/scripts/schema.sql`

## 🎯 Best Practices

1. **Always test with dry-run mode first** (if available in script)
2. **Backup database before large imports**
3. **Run validation scripts after import**
4. **Keep logs for troubleshooting**
5. **Clean up data files after successful import**

## 🔄 For Future Development

When adding new synthetic data:
1. Follow the established JSON format patterns
2. Ensure FHIR compliance for medical codes
3. Include comprehensive patient narratives
4. Test with small batches first
5. Update this documentation with any new patterns or issues discovered

---

**Last Updated:** May 27, 2025  
**Contact:** Development Team  
**Status:** Production Ready ✅ 