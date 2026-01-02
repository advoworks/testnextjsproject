-- Create invoices storage bucket
-- This migration creates the bucket if it doesn't exist
-- If bucket already exists, it will be skipped (idempotent)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false, -- private bucket
  52428800, -- 50MB file size limit (adjust as needed)
  ARRAY['application/pdf'] -- allowed file types (PDFs only for invoices)
)
ON CONFLICT (id) DO NOTHING;


-- if you ever need to update the bucket settings:
-- Update existing bucket settings if needed
-- UPDATE storage.buckets
-- SET 
--   public = false,
--   file_size_limit = 52428800,
--   allowed_mime_types = ARRAY['application/pdf']
-- WHERE id = 'invoices';

