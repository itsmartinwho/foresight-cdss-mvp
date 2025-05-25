    -- Migration Script: Rename "visits" to "admissions" throughout the database
    -- This script updates table names, column names, and all references
    -- Run this script in your Supabase SQL editor

    -- 1. Rename the visits table to admissions
    ALTER TABLE public.visits RENAME TO admissions;

    -- 2. Rename the reason_for_visit column to reason_for_admission
    ALTER TABLE public.admissions RENAME COLUMN reason_for_visit TO reason_for_admission;

    -- 3. Update foreign key constraints in conditions table
    ALTER TABLE public.conditions 
    DROP CONSTRAINT IF EXISTS conditions_encounter_id_fkey;

    ALTER TABLE public.conditions
    ADD CONSTRAINT conditions_encounter_id_fkey 
    FOREIGN KEY (encounter_id) 
    REFERENCES public.admissions(id);

    -- 4. Update foreign key constraints in lab_results table
    ALTER TABLE public.lab_results 
    DROP CONSTRAINT IF EXISTS lab_results_encounter_id_fkey;

    ALTER TABLE public.lab_results
    ADD CONSTRAINT lab_results_encounter_id_fkey 
    FOREIGN KEY (encounter_id) 
    REFERENCES public.admissions(id);

    -- 5. Update any views or functions that reference the old table name
    -- (Add any custom views or functions here if they exist)

    -- 6. Verify the changes
    SELECT 
    'Table renamed successfully' as status,
    table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admissions';

    -- Check column rename
    SELECT 
    'Column renamed successfully' as status,
    column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admissions' 
    AND column_name = 'reason_for_admission';

    -- List all foreign keys referencing the admissions table
    SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
    FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'admissions'; 