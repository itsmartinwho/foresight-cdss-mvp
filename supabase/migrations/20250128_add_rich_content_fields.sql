-- Migration: Add rich content fields for diagnosis and treatments
-- Date: 2025-01-28
-- Description: Adds diagnosis_rich_content and treatments_rich_content JSONB fields to encounters table
--              to support charts, tables, decision trees, and enhanced formatting

-- Add new columns to encounters table
ALTER TABLE public.encounters 
ADD COLUMN IF NOT EXISTS diagnosis_rich_content JSONB,
ADD COLUMN IF NOT EXISTS treatments_rich_content JSONB;

-- Add comments for the new columns
COMMENT ON COLUMN public.encounters.diagnosis_rich_content IS 'Rich content for diagnosis including charts, tables, decision trees, and formatted text.';
COMMENT ON COLUMN public.encounters.treatments_rich_content IS 'Rich content for treatments including charts, tables, decision trees, and formatted text.';

-- Create indexes for the new JSONB fields to improve query performance
CREATE INDEX IF NOT EXISTS idx_encounters_diagnosis_rich_content ON public.encounters USING GIN (diagnosis_rich_content);
CREATE INDEX IF NOT EXISTS idx_encounters_treatments_rich_content ON public.encounters USING GIN (treatments_rich_content);

-- Update trigger to handle new fields
-- The existing trigger_set_timestamp function will automatically handle these new fields
-- No additional trigger setup needed as it operates on the entire row

-- Optional: Initialize rich content fields for existing records that have content
-- This maintains backward compatibility by populating rich content with existing text where available
DO $$
BEGIN
  -- Update diagnosis_rich_content for encounters that have soap_note content
  UPDATE public.encounters 
  SET diagnosis_rich_content = jsonb_build_object(
    'content_type', 'text/plain',
    'text_content', COALESCE(soap_note, ''),
    'rich_elements', '[]'::jsonb,
    'created_at', now(),
    'version', '1.0'
  )
  WHERE soap_note IS NOT NULL 
    AND soap_note != '' 
    AND diagnosis_rich_content IS NULL;
  
  -- Update treatments_rich_content for encounters that have treatments data
  UPDATE public.encounters 
  SET treatments_rich_content = jsonb_build_object(
    'content_type', 'application/json',
    'text_content', CASE 
      WHEN treatments IS NOT NULL THEN treatments::text 
      ELSE '' 
    END,
    'rich_elements', COALESCE(treatments, '[]'::jsonb),
    'created_at', now(),
    'version', '1.0'
  )
  WHERE treatments IS NOT NULL 
    AND treatments != 'null'::jsonb 
    AND treatments_rich_content IS NULL;
    
  RAISE NOTICE 'Rich content fields initialized for existing encounters';
END $$; 