-- Add pdf_url column to invoices table for storing PDF file URLs
-- PDFs are stored in Supabase Storage and accessed via signed URLs

DO $$
BEGIN
  -- Add pdf_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;
EXCEPTION 
  WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
  WHEN OTHERS THEN NULL; -- Ignore other errors
END $$;

-- Add comment (with error handling)
DO $$
BEGIN
  COMMENT ON COLUMN invoices.pdf_url IS 'Signed URL to the PDF file stored in Supabase Storage. Path format: {tenant_id}/invoices/{invoice_id}.pdf';
EXCEPTION 
  WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
  WHEN OTHERS THEN NULL;
END $$;

