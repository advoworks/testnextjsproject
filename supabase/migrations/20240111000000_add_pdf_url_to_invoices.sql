-- Add pdf_url column to invoices table for storing PDF file paths
-- PDFs are stored in Supabase Storage and accessed via proxy endpoint /api/invoices/[id]/pdf
-- The proxy endpoint respects RLS policies and provides permanent URLs for authenticated users

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
  COMMENT ON COLUMN invoices.pdf_url IS 'File path to the PDF stored in Supabase Storage (e.g., "{tenant_id}/invoices/{invoice_id}.pdf"). PDFs are accessed via /api/invoices/[id]/pdf endpoint which respects RLS policies. NULL if PDF has not been generated yet.';
EXCEPTION 
  WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
  WHEN OTHERS THEN NULL;
END $$;

