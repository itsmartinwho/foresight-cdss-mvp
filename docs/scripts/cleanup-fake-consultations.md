# Fake Consultation Cleanup Tool

A comprehensive tool for identifying and cleaning up fake/empty consultation encounters that may have been created due to bugs or testing issues.

## Overview

The `cleanup-fake-consultations.js` script provides multiple strategies for identifying and removing fake encounters from the database. It combines functionality from several previous cleanup scripts into one comprehensive tool.

## Features

- **Multiple Cleanup Strategies**: Choose from different time windows and grouping criteria
- **Quality Analysis**: Analyze encounter data quality before cleanup
- **Conservative Approach**: Only removes encounters that are clearly fake and created in rapid succession
- **Dry Run Mode**: Preview what would be deleted before executing
- **Batch Processing**: Efficient deletion in batches to avoid database overload
- **Patient Name Resolution**: Better reporting with actual patient names
- **Flexible Targeting**: Target specific patients or use time-based strategies

## Cleanup Strategies

### VERY_RECENT
- **Time Window**: Last 10 minutes
- **Grouping Window**: Within 1 second
- **Use Case**: Clean up duplicates from immediate testing/debugging

### RECENT
- **Time Window**: Last 6 hours  
- **Grouping Window**: Within 10 seconds
- **Use Case**: Clean up artifacts from recent testing sessions

### CONSERVATIVE (Default)
- **Time Window**: Last 24 hours
- **Grouping Window**: Within 5 seconds  
- **Use Case**: Safe cleanup of recent fake encounters

### TARGETED
- **Time Window**: All time
- **Grouping Window**: Within 5 seconds
- **Use Case**: Clean up specific target patients defined in the script

## Usage

### Basic Usage

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

### Advanced Examples

```bash
# Quick cleanup of very recent duplicates
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=VERY_RECENT --execute

# Target specific patients for cleanup
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=TARGETED --execute

# Analyze quality of recent encounters
node scripts/synthetic-data/cleanup-fake-consultations.js --strategy=RECENT --analyze-only
```

## How It Works

### 1. Encounter Quality Assessment

The tool first analyzes encounters to determine if they're likely fake based on:

- **Transcript Length**: Must be >100 characters to be considered meaningful
- **SOAP Note Length**: Must be >50 characters to be considered meaningful  
- **Reason Code/Display**: Presence of visit reason information
- **Treatments**: Presence of treatment data
- **Observations**: Presence of clinical observations
- **Prior Auth**: Presence of prior authorization data

An encounter is considered "fake" if it has ≤1 meaningful fields populated.

### 2. Grouping Strategy

Fake encounters are grouped by:
- **Patient**: Same patient
- **Time Window**: Created within the strategy's grouping window (1-10 seconds)
- **Succession**: Must be part of a group of 2+ fake encounters

### 3. Conservative Deletion

The tool only deletes encounters that are:
- ✅ Identified as fake (minimal meaningful data)
- ✅ Part of a group (2+ fake encounters)  
- ✅ Created within seconds of each other
- ✅ Match the selected strategy criteria

**Isolated fake encounters are NOT deleted** for safety.

## Safety Features

### Dry Run Mode
- Default mode shows what would be deleted without making changes
- Must explicitly use `--execute` flag to perform actual deletions

### Conservative Grouping
- Only deletes encounters created in rapid succession (clear artifacts)
- Isolated fake encounters are preserved (may be legitimate edge cases)

### Batch Processing  
- Deletes in batches of 50 to avoid database overload
- Provides progress feedback during deletion

### Detailed Logging
- Shows exactly which encounters will be deleted
- Provides patient names and encounter details
- Reports success/failure for each batch

## Configuration

### Target Patients

The `TARGETED` strategy focuses on specific patients defined in the script:

```javascript
const TARGET_PATIENTS = [
  'Bob Jones',
  'James Lee', 
  'Dorothy Robinson',
  'Alice Smith',
  'Maria Gomez',
  'Justin Rodriguez'
];
```

To modify the target patients, edit this array in the script.

### Custom Strategies

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

## Output Examples

### Quality Analysis
```
🔍 Analyzing encounter data quality...

📊 Quality Analysis Results:
  Total encounters analyzed: 1000
  Likely fake encounters: 45 (5%)
  Likely real encounters: 955 (95%)

✅ Sample real encounter:
   Reason: Routine checkup
   Has Transcript: YES (2347 chars)
   Has SOAP: YES (456 chars)

🎭 Sample fake encounter:
   Reason: None
   Has Transcript: NO
   Has SOAP: NO
```

### Cleanup Report
```
📦 Group 1: 3 fake encounters created within 2s
      Created: 2024-01-15T10:30:15.123Z to 2024-01-15T10:30:17.456Z

📊 Total encounters to delete: 15

📋 Encounters that would be deleted:
   1. ID: ENC-123 | Created: 2024-01-15T10:30:15.123Z
      Reason: None
      Transcript: No
      SOAP: No
```

## Troubleshooting

### No Encounters Found
- Check if the time window includes the problematic encounters
- Verify target patients exist in the database
- Use `--analyze-only` to see overall encounter statistics

### Permission Errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify the service role has delete permissions on the encounters table

### Unexpected Results
- Always run in dry-run mode first to preview changes
- Use the most conservative strategy initially
- Check the encounter quality analysis before cleanup

## Related Scripts

This tool replaces several previous cleanup scripts:
- `cleanup_duplicate_encounters.js` ✅ Merged
- `cleanup-very-recent-duplicates.js` ✅ Merged  
- `conservative-cleanup.js` ✅ Merged
- `analyze-encounter-quality.js` ✅ Merged

## Environment Variables

Required environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# OR
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Best Practices

1. **Always start with analysis**: Use `--analyze-only` first
2. **Use dry run mode**: Preview changes before executing  
3. **Start conservative**: Begin with shorter time windows and tighter grouping
4. **Monitor results**: Check the deletion reports carefully
5. **Run iteratively**: May need multiple runs to catch all issues
6. **Backup first**: Consider database backups before major cleanups

## Exit Codes

- `0`: Success
- `1`: Error (missing environment variables, database errors, etc.) 