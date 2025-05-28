# Synthetic Data Management Scripts and Documentation

This folder contains consolidated, powerful scripts for managing synthetic clinical data in the Foresight CDSS MVP database. All functionality has been merged into two comprehensive tools that replace the previous collection of individual scripts.

## 🛠️ Consolidated Scripts

### `synthetic-data-manager.js` - Main Data Operations
Comprehensive tool for importing, cleaning, and processing synthetic data:
- **Data Import**: Full synthetic data processing with validation
- **Transcript Updates**: Specialized transcript-only imports
- **Data Cleaning**: Automatic JSON cleaning and patient name correction
- **Validation**: Post-import verification and integrity checks
- **Batch Processing**: Memory-efficient processing of large datasets

### `data-utilities.js` - Analysis and Maintenance
Powerful utilities for data analysis, investigation, and cleanup:
- **Quality Analysis**: Comprehensive encounter data quality assessment
- **Patient Investigation**: Deep-dive analysis of specific patients
- **Encounter Investigation**: Detailed analysis of individual encounters
- **Cleanup Operations**: Safe removal of fake/empty encounters
- **Orphan Data Repair**: Fix broken relationships in data

## 📁 Directory Structure

```
scripts/synthetic-data/
├── synthetic-data-manager.js     # Main data operations
├── data-utilities.js             # Analysis and maintenance tools
├── extract_subset.py             # Data extraction utility
├── data_export_query.sql         # Database query templates
├── docs/                         # Documentation and guides
│   ├── IMPORT_COMPLETION_SUMMARY.md
│   ├── synthetic_data_generation_guide.md
│   └── synthetic_data_import_process.md
└── legacy/                       # Archived one-time migration scripts
    ├── regenerate-lost-encounters.js
    ├── fix_patient_ids_and_redistribute_encounters.js
    └── generate_new_patient_ids.js
```

## 📅 Import History

- **May 26, 2025:** Initial successful import wave (11 records)
- **May 27, 2025:** Final wave import (synthetic-data11: 28 encounters, synthetic-data12: 63 transcript updates)
- **January 2025:** Script consolidation and optimization
- **Total:** 100+ encounters enriched with comprehensive clinical data

## 🚀 Quick Start Guide

### Standard Synthetic Data Import
```bash
# 1. Clean and import data in one step
node scripts/synthetic-data/synthetic-data-manager.js import your-file.json

# 2. Dry run first to see what would happen
node scripts/synthetic-data/synthetic-data-manager.js import your-file.json --dry-run

# 3. Import with detailed error logging
node scripts/synthetic-data/synthetic-data-manager.js import your-file.json --error-log errors.json

# 4. Validate results
node scripts/synthetic-data/synthetic-data-manager.js validate
```

### Advanced Data Processing
```bash
# Clean raw data manually
node scripts/synthetic-data/synthetic-data-manager.js clean raw-data.json cleaned-data.json

# Import with custom options
node scripts/synthetic-data/synthetic-data-manager.js import cleaned-data.json --skip-validation --error-log import-log.json

# Import transcript updates only
node scripts/synthetic-data/synthetic-data-manager.js transcript transcript-updates.json
```

### Data Analysis and Maintenance
```bash
# Analyze data quality
node scripts/synthetic-data/data-utilities.js analyze

# Investigate specific patients
node scripts/synthetic-data/data-utilities.js investigate-patients "Bob Jones" "Alice Smith"

# Investigate specific encounter
node scripts/synthetic-data/data-utilities.js investigate-encounter 12345678-1234-1234-1234-123456789012

# Clean up fake encounters (dry run first!)
node scripts/synthetic-data/data-utilities.js cleanup --strategy CONSERVATIVE --dry-run
node scripts/synthetic-data/data-utilities.js cleanup --strategy CONSERVATIVE --execute --delete-related

# Fix orphaned data
node scripts/synthetic-data/data-utilities.js fix-orphans --dry-run
node scripts/synthetic-data/data-utilities.js fix-orphans --execute
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

## 🔧 Command Reference

### Synthetic Data Manager Commands
- `import <file>` - Import synthetic data with full processing
- `transcript <file>` - Import transcript updates only
- `clean <input> <output>` - Clean raw data manually
- `validate` - Validate recent import results

### Data Utilities Commands
- `analyze` - Analyze encounter data quality
- `investigate-patients [names...]` - Investigate specific patients
- `investigate-encounter <id>` - Investigate specific encounter
- `cleanup --strategy <name>` - Clean up fake encounters
- `fix-orphans` - Fix orphaned data records

### Common Options
- `--dry-run` - Show what would be done without making changes
- `--execute` - Actually perform destructive operations
- `--skip-cleaning` - Skip data cleaning during import
- `--skip-validation` - Skip UUID validation during import
- `--error-log <file>` - Save detailed error log
- `--strategy <name>` - Cleanup strategy (VERY_RECENT, RECENT, CONSERVATIVE, TARGETED)
- `--delete-related` - Delete related conditions and lab results during cleanup

## 🔧 Common Issues and Solutions

### Interrupted JSON Files
The scripts automatically detect and handle incomplete JSON records. Only complete, valid records are imported.

### Patient-Encounter Mismatches
Validation errors for mismatched patient-encounter pairs are logged but don't stop the import process.

### Database Connection Issues
- Ensure your `.env.local` file has correct Supabase credentials
- Verify network connectivity to Supabase

### Fake/Empty Encounters from Testing
Use the comprehensive data utilities to identify and clean up empty encounters:
1. First analyze: `node data-utilities.js analyze`
2. Then cleanup: `node data-utilities.js cleanup --strategy CONSERVATIVE --dry-run`
3. Execute if satisfied: `node data-utilities.js cleanup --strategy CONSERVATIVE --execute`

## 📊 Expected Success Rates
- **Standard imports:** 90-100% success rate
- **Transcript imports:** 100% success rate (if properly formatted)
- **Validation errors:** 2-5% due to data mismatches (normal)

## 🧹 Cleanup After Import

After successful import, clean up temporary files:
```bash
# Remove synthetic data files from public/data/
rm public/data/synthetic-data*.json

# Remove import log files
rm scripts/synthetic-data/*errors*.log scripts/synthetic-data/*-cleaned.json

# Clean up any fake encounters from testing (if needed)
node scripts/synthetic-data/data-utilities.js cleanup --strategy RECENT --execute
```

## 🎯 Best Practices

1. **Always test with dry-run mode first**
2. **Backup database before large imports**
3. **Run validation scripts after import**
4. **Keep logs for troubleshooting**
5. **Clean up data files after successful import**
6. **Use appropriate cleanup strategies** (start conservative)
7. **Investigate before cleaning** to understand what will be affected

## 📚 Advanced Features

### Automatic Data Cleaning
The scripts automatically:
- Fix malformed JSON syntax
- Correct patient name inconsistencies in transcripts
- Validate and clean data structures
- Convert data types for database compatibility

### Intelligent Encounter Analysis
The data utilities can:
- Identify fake vs. real encounters based on content analysis
- Group encounters by creation time to find bulk testing artifacts
- Analyze patient data patterns and relationships
- Provide detailed investigations of individual records

### Safe Cleanup Operations
All cleanup operations:
- Default to dry-run mode for safety
- Provide detailed analysis before deletion
- Use soft-delete for encounters (mark as deleted vs. permanent removal)
- Allow related data cleanup (conditions, lab results)
- Support multiple cleanup strategies based on timeframes

## 🔄 For Future Development

When adding new synthetic data:
1. Follow the established JSON format patterns
2. Ensure FHIR compliance for medical codes
3. Include comprehensive patient narratives
4. Test with small batches first using dry-run mode
5. Validate results after import
6. Update this documentation with any new patterns discovered

## 📁 Legacy Script Migration

The following individual scripts have been consolidated and archived:

**Consolidated into `synthetic-data-manager.js`:**
- `import_synthetic_data.js` ✅ Deleted (fully integrated)
- `import_transcript_data.js` ✅ Deleted (fully integrated)
- `clean_synthetic_data.js` ✅ Deleted (fully integrated)
- `clean_transcript_data.js` ✅ Deleted (fully integrated)
- `correct_inconsistencies.js` ✅ Deleted (fully integrated)
- `validate_import_results.js` ✅ Deleted (fully integrated)
- `run_synthetic_data_import.js` ✅ Deleted (fully integrated)

**Consolidated into `data-utilities.js`:**
- `cleanup-fake-consultations.js` ✅ Deleted (fully integrated)
- `investigate_duplicate_encounters.js` ✅ Deleted (fully integrated)
- `fix_orphaned_encounters.js` ✅ Deleted (fully integrated)
- `fix_encounter_patient_links.js` ✅ Deleted (fully integrated)
- `test_specific_encounter.js` ✅ Deleted (fully integrated)
- `check_patient_name.js` ✅ Deleted (fully integrated)
- `delete_specific_encounter.js` ✅ Deleted (functionality in data-utilities)

**Archived in `legacy/` folder:**
- `regenerate-lost-encounters.js` 📁 Archived (one-time migration)
- `fix_patient_ids_and_redistribute_encounters.js` 📁 Archived (one-time migration)
- `generate_new_patient_ids.js` 📁 Archived (one-time migration)

**Organized in `docs/` folder:**
- `IMPORT_COMPLETION_SUMMARY.md` 📁 Moved to docs/
- `synthetic_data_generation_guide.md` 📁 Moved to docs/
- `synthetic_data_import_process.md` 📁 Moved to docs/

**Standalone utilities:**
- `extract_subset.py` - Data extraction utility
- `data_export_query.sql` - Database query templates

## 🎯 Quick Migration Guide

If you were using any of the old individual scripts, here are the new commands:

### Old vs New Command Reference

```bash
# OLD: node import_synthetic_data.js data.json
# NEW: 
node synthetic-data-manager.js import data.json

# OLD: node import_transcript_data.js transcripts.json  
# NEW:
node synthetic-data-manager.js transcript transcripts.json

# OLD: node cleanup-fake-consultations.js
# NEW:
node data-utilities.js cleanup --strategy CONSERVATIVE --dry-run

# OLD: node validate_import_results.js
# NEW:
node synthetic-data-manager.js validate

# OLD: node investigate_duplicate_encounters.js
# NEW: 
node data-utilities.js analyze
node data-utilities.js investigate-patients "Patient Name"
```

---

**Last Updated:** January 2025  
**Contact:** Development Team  
**Status:** Production Ready ✅ (Fully Consolidated & Organized) 