# Batch Clinical Engine Processing

## Overview

The batch clinical engine processing system identifies patients with clinical transcripts but minimal existing clinical results (short/missing differential diagnoses, encounter diagnoses, and treatment plans), then automatically generates comprehensive clinical results using the clinical engine API.

## Files Created

### 1. Main Processing Script
- **Location**: `scripts/batch_clinical_engine_processing.ts`
- **Purpose**: Main batch processing script that identifies target encounters and processes them through the clinical engine
- **Features**:
  - Rate limiting (1 second between API calls)
  - Retry logic (up to 3 attempts per encounter)
  - Progress tracking and detailed logging
  - Results verification
  - Comprehensive error handling

### 2. SQL Migration
- **Location**: `supabase/migrations/20241217_create_get_patients_for_clinical_engine_function.sql`
- **Purpose**: Creates the PostgreSQL function that identifies encounters needing clinical engine processing
- **Function**: `get_patients_for_clinical_engine()`

### 3. Test Script
- **Location**: `scripts/test_batch_script.ts`
- **Purpose**: Verifies that all dependencies and imports work correctly

## Prerequisites

### 1. Database Setup
The SQL function must be applied to your Supabase database:

```sql
-- Apply the migration
-- Option A: Using Supabase CLI (if configured)
npx supabase db push

-- Option B: Manual application via Supabase Dashboard
-- Copy the contents of supabase/migrations/20241217_create_get_patients_for_clinical_engine_function.sql
-- and run it in the SQL Editor of your Supabase Dashboard
```

### 2. Environment Variables
Create a `.env.local` file in the project root with:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
API_BASE_URL=your_production_vercel_url # IMPORTANT: Use your live deployment URL, not localhost
```

### 3. Dependencies
Ensure these packages are installed:
- `@supabase/supabase-js`
- `dotenv`
- `typescript`
- `ts-node`

## Patient Selection Criteria

The system identifies encounters that meet ALL of the following criteria:

1. **Has transcript data**: `transcript IS NOT NULL`
2. **Sufficient transcript length**: `length(transcript) > 100`
3. **Minimal clinical results** (either condition):
   - Less than 3 differential diagnoses: `COUNT(differential_diagnoses) < 3`
   - No primary encounter diagnosis: `COUNT(conditions WHERE category = 'encounter-diagnosis') = 0`

## Usage

### 1. Test the Setup
```bash
# Verify compilation and dependencies
npx ts-node scripts/test_batch_script.ts
```

### 2. Run the Batch Processing
```bash
# Execute the main batch processing script
npx ts-node scripts/batch_clinical_engine_processing.ts
```

### 3. Monitor Progress
The script provides detailed console output including:
- Number of encounters found and processed
- API call attempts and results
- Verification of created clinical data
- Final summary with counts and metrics

## Expected Results

For each successfully processed encounter, the clinical engine will create:

1. **Primary Diagnosis**: Records in `conditions` table with `category = 'encounter-diagnosis'`
2. **Differential Diagnoses**: Records in `differential_diagnoses` table
3. **Treatment Plans**: Additional clinical recommendations (varies by engine implementation)

## Safety Features

### Rate Limiting
- 1 second delay between API calls
- Prevents overwhelming the clinical engine or external APIs (e.g., OpenAI)

### Retry Logic
- Up to 3 attempts per failed API call
- 1 second delay between retry attempts
- Continues processing other encounters if one fails

### Data Validation
- Validates transcript length before processing
- Verifies clinical results were created after each API call
- Logs detailed information for troubleshooting

### Error Handling
- Graceful handling of API failures
- Detailed error logging with patient/encounter identifiers
- Continues processing remaining encounters on individual failures

## Monitoring and Verification

### Console Output
Monitor the script output for:
- Progress indicators (`Processing encounter X of Y`)
- API call success/failure messages
- Verification results for created clinical data
- Final summary statistics

### Database Verification
After running the script, check your Supabase dashboard:

1. **Conditions Table**: Look for new records with `category = 'encounter-diagnosis'`
2. **Differential Diagnoses Table**: Verify new differential diagnosis records
3. **Encounter IDs**: Cross-reference with the processed encounter UUIDs from the logs

### Success Metrics
The script tracks and reports:
- Total encounters matching criteria
- Encounters skipped (short transcripts)
- Successful API calls
- Verified clinical results created

## Troubleshooting

### Common Issues

1. **"Function get_patients_for_clinical_engine does not exist"**
   - Solution: Apply the SQL migration to your database

2. **"SUPABASE_URL and SUPABASE_ANON_KEY must be set"**
   - Solution: Create `.env.local` file with required environment variables

3. **API call failures**
   - Check API_BASE_URL is correct and accessible
   - Verify the clinical engine API is running
   - Check network connectivity

4. **No encounters found to process**
   - Verify your database has patients with transcripts
   - Check that encounters meet the selection criteria
   - Confirm the SQL function returns data when called manually

### Debug Mode
For additional debugging, you can:
1. Add `console.log` statements to track specific issues
2. Test the SQL function manually in Supabase dashboard
3. Verify API endpoints are accessible via curl or Postman

## Performance Considerations

- **Processing Time**: Approximately 1-2 seconds per encounter (including rate limiting)
- **API Limits**: Respects rate limits to avoid overwhelming external services
- **Memory Usage**: Processes encounters sequentially to minimize memory footprint
- **Scalability**: Can handle hundreds of encounters in a single run

## Future Enhancements

Potential improvements for future versions:
1. Parallel processing with configurable concurrency limits
2. Resume capability for interrupted processing
3. Filtering options (specific patients, date ranges, etc.)
4. Integration with job queues for large-scale processing
5. Real-time progress reporting via webhooks or database updates 