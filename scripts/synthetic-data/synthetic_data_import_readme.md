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

### Cleanup and Maintenance Scripts
7. **`cleanup-fake-consultations.js`** - Comprehensive tool for cleaning up fake/empty encounters
8. **`run_synthetic_data_import.js`** - Orchestration script for complete import process

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

### Cleanup Fake/Empty Encounters
```bash
# Analyze encounter quality
node scripts/synthetic-data/cleanup-fake-consultations.js --analyze-only

# Clean up recent duplicates (dry run)
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=CONSERVATIVE

# Execute cleanup
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=CONSERVATIVE --execute
```

## 🧹 Comprehensive Fake Consultation Cleanup Tool

The `cleanup-fake-consultations.js` script provides multiple strategies for identifying and removing fake encounters from the database. It combines functionality from several previous cleanup scripts into one comprehensive tool.

### Cleanup Strategies

#### VERY_RECENT
- **Time Window**: Last 10 minutes
- **Grouping Window**: Within 1 second
- **Use Case**: Clean up duplicates from immediate testing/debugging

#### RECENT
- **Time Window**: Last 6 hours  
- **Grouping Window**: Within 10 seconds
- **Use Case**: Clean up artifacts from recent testing sessions

#### CONSERVATIVE (Default)
- **Time Window**: Last 24 hours
- **Grouping Window**: Within 5 seconds  
- **Use Case**: Safe cleanup of recent fake encounters

#### TARGETED
- **Time Window**: All time
- **Grouping Window**: Within 5 seconds
- **Use Case**: Clean up specific target patients defined in the script

### Cleanup Tool Usage

#### Basic Commands
```bash
# Show help
node scripts/synthetic-data/cleanup-fake-consultations.js --help

# Analyze encounter quality only (no cleanup)
node scripts/synthetic-data/cleanup-fake-consultations.js --analyze-only

# Dry run with default conservative strategy
node scripts/synthetic-data/cleanup-fake-consultations.js

# Dry run with specific strategy
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=VERY_RECENT

# Execute cleanup (actually delete encounters)
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=CONSERVATIVE --execute
```

#### Advanced Examples
```bash
# Quick cleanup of very recent duplicates
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=VERY_RECENT --execute

# Target specific patients for cleanup
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=TARGETED --execute

# Analyze quality of recent encounters
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=RECENT --analyze-only
```

### How the Cleanup Tool Works

#### 1. Encounter Quality Assessment
The tool analyzes encounters to determine if they're likely fake based on:
- **Transcript Length**: Must be >100 characters to be considered meaningful
- **SOAP Note Length**: Must be >50 characters to be considered meaningful  
- **Reason Code/Display**: Presence of visit reason information
- **Treatments**: Presence of treatment data
- **Observations**: Presence of clinical observations
- **Prior Auth**: Presence of prior authorization data

An encounter is considered "fake" if it has ≤1 meaningful fields populated.

#### 2. Grouping Strategy
Fake encounters are grouped by:
- **Patient**: Same patient
- **Time Window**: Created within the strategy's grouping window (1-10 seconds)
- **Succession**: Must be part of a group of 2+ fake encounters

#### 3. Conservative Deletion
The tool only deletes encounters that are:
- ✅ Identified as fake (minimal meaningful data)
- ✅ Part of a group (2+ fake encounters)  
- ✅ Created within seconds of each other
- ✅ Match the selected strategy criteria

**Isolated fake encounters are NOT deleted** for safety.

### Safety Features
- **Dry Run Mode**: Default mode shows what would be deleted without making changes
- **Conservative Grouping**: Only deletes encounters created in rapid succession
- **Batch Processing**: Deletes in batches of 50 to avoid database overload
- **Detailed Logging**: Shows exactly which encounters will be deleted

### Configuration

#### Target Patients
The `TARGETED` strategy focuses on specific patients defined in the script:
```javascript
const TARGET_PATIENTS = [
  'Bob Jones', 'James Lee', 'Dorothy Robinson',
  'Alice Smith', 'Maria Gomez', 'Justin Rodriguez'
];
```

#### Custom Strategies
New cleanup strategies can be added to the `CLEANUP_STRATEGIES` object:
```javascript
const CLEANUP_STRATEGIES = {
  CUSTOM: {
    name: 'Custom Strategy',
    timeWindow: 2 * 60 * 60 * 1000, // 2 hours
    groupingWindow: 30 * 1000, // 30 seconds
    description: 'Custom cleanup for specific needs'
  }
};
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

### Fake/Empty Encounters from Testing
If you notice empty encounters created during testing or due to bugs:
1. Use the comprehensive cleanup tool: `cleanup-fake-consultations.js`
2. Start with analysis mode: `--analyze-only`
3. Choose appropriate strategy based on timeframe
4. Always run in dry-run mode first before executing cleanup

### Cleanup Tool Troubleshooting

#### No Encounters Found
- Check if the time window includes the problematic encounters
- Verify target patients exist in the database
- Use `--analyze-only` to see overall encounter statistics

#### Permission Errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify the service role has delete permissions on the encounters table

#### Unexpected Results
- Always run in dry-run mode first to preview changes
- Use the most conservative strategy initially
- Check the encounter quality analysis before cleanup

## 📊 Expected Success Rates
- **Standard imports:** 90-100% success rate
- **Transcript imports:** 100% success rate (if properly formatted)
- **Validation errors:** 2-5% due to data mismatches (normal)
- **Cleanup operations:** 95-100% success rate for identified fake encounters

## 🧹 Cleanup After Import

After successful import, clean up temporary files:
```bash
# Remove all synthetic data files from public/data/
rm public/data/synthetic-data*.json

# Remove import log files
rm scripts/import_errors*.log

# Clean up any fake encounters from testing (if needed)
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=RECENT --execute
```

## 📚 Related Documentation

- **Complete Process Guide:** `/docs/synthetic_data_import_process.md`
- **Generation Guide:** `/docs/synthetic_data_generation_guide.md`
- **Import History:** `/docs/IMPORT_COMPLETION_SUMMARY.md`
- **Database Schema:** `/scripts/schema.sql`

## 🎯 Best Practices

### Import Best Practices
1. **Always test with dry-run mode first** (if available in script)
2. **Backup database before large imports**
3. **Run validation scripts after import**
4. **Keep logs for troubleshooting**
5. **Clean up data files after successful import**

### Cleanup Best Practices
1. **Always start with analysis**: Use `--analyze-only` first
2. **Use dry run mode**: Preview changes before executing  
3. **Start conservative**: Begin with shorter time windows and tighter grouping
4. **Monitor results**: Check the deletion reports carefully
5. **Run iteratively**: May need multiple runs to catch all issues
6. **Backup first**: Consider database backups before major cleanups

## 🔄 For Future Development

When adding new synthetic data:
1. Follow the established JSON format patterns
2. Ensure FHIR compliance for medical codes
3. Include comprehensive patient narratives
4. Test with small batches first
5. Update this documentation with any new patterns or issues discovered

### Environment Variables

Required environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# OR
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📈 Script Evolution History

This documentation consolidates several previous cleanup scripts:
- `cleanup_duplicate_encounters.js` ✅ Merged into `cleanup-fake-consultations.js`
- `cleanup-very-recent-duplicates.js` ✅ Merged into `cleanup-fake-consultations.js`
- `conservative-cleanup.js` ✅ Merged into `cleanup-fake-consultations.js`
- `analyze-encounter-quality.js` ✅ Merged into `cleanup-fake-consultations.js`

---

**Last Updated:** May 27, 2025  
**Contact:** Development Team  
**Status:** Production Ready ✅ 