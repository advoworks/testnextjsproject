-- Add pdf_generated_at column to invoices table for tracking when PDF was generated
-- This helps with UX to show users when the PDF was created

DO $$
BEGIN
  -- Add pdf_generated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'pdf_generated_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_generated_at TIMESTAMP WITH TIME ZONE;
  END IF;
EXCEPTION 
  WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
  WHEN OTHERS THEN NULL; -- Ignore other errors
END $$;

-- Add comment (with error handling)
DO $$
BEGIN
  COMMENT ON COLUMN invoices.pdf_generated_at IS 'Timestamp when the PDF was generated and uploaded to storage. NULL if PDF has not been generated yet.';
EXCEPTION 
  WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
  WHEN OTHERS THEN NULL;
END $$;

