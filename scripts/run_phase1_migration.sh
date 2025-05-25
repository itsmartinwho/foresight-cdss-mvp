#!/bin/bash

# Phase 1 FHIR Migration Script
# This script runs the Phase 1 migration to align the database with FHIR resources

echo "Starting Phase 1 FHIR Migration..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Error: .env.local file not found. Please ensure it contains your Supabase connection details."
    exit 1
fi

# Extract Supabase URL and key from .env.local
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "Error: Could not extract Supabase credentials from .env.local"
    exit 1
fi

# Run the migration using psql (requires Supabase CLI or direct database connection)
# For now, we'll output instructions for manual execution

echo ""
echo "To run the migration, execute the following SQL script in your Supabase SQL editor:"
echo ""
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to the SQL Editor"
echo "3. Copy and paste the contents of scripts/phase1_fhir_migration.sql"
echo "4. Click 'Run' to execute the migration"
echo ""
echo "The migration will:"
echo "- Add ethnicity field to patients table"
echo "- Rename dob to birth_date"
echo "- Add status and is_deleted fields to visits"
echo "- Create new conditions and lab_results tables"
echo "- Migrate existing diagnosis data"
echo "- Add sample lab results for testing"
echo ""
echo "After running the migration, restart your Next.js development server to see the changes." 