-- Simple migration to add rich content fields to encounters table
-- Date: 2025-01-29
-- Description: Adds diagnosis_rich_content and treatments_rich_content JSONB fields

-- Add new columns to encounters table if they don't exist
DO $$
BEGIN
    -- Add diagnosis_rich_content column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'encounters' 
        AND column_name = 'diagnosis_rich_content'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.encounters 
        ADD COLUMN diagnosis_rich_content JSONB;
        
        COMMENT ON COLUMN public.encounters.diagnosis_rich_content IS 'Rich content for diagnosis including charts, tables, decision trees, and formatted text.';
    END IF;

    -- Add treatments_rich_content column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'encounters' 
        AND column_name = 'treatments_rich_content'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.encounters 
        ADD COLUMN treatments_rich_content JSONB;
        
        COMMENT ON COLUMN public.encounters.treatments_rich_content IS 'Rich content for treatments including charts, tables, decision trees, and formatted text.';
    END IF;
END $$;

-- Create indexes for the new JSONB fields if they don't exist
CREATE INDEX IF NOT EXISTS idx_encounters_diagnosis_rich_content ON public.encounters USING GIN (diagnosis_rich_content);
CREATE INDEX IF NOT EXISTS idx_encounters_treatments_rich_content ON public.encounters USING GIN (treatments_rich_content);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Rich content fields added successfully to encounters table';
END $$; 