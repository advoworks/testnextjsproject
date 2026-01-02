-- Add pdf_url column to invoices table for storing PDF file URLs
-- PDFs are stored in Supabase Storage and accessed via signed URLs

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comment
COMMENT ON COLUMN invoices.pdf_url IS 'Signed URL to the PDF file stored in Supabase Storage. Path format: {tenant_id}/invoices/{invoice_id}.pdf';

