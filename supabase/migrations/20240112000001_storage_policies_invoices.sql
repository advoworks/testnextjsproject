-- Storage policies for invoices bucket
-- Note: The 'invoices' bucket must exist before running this migration
-- If bucket doesn't exist, create it via Supabase Dashboard first

-- Allow tenants to upload invoices to their own folder
-- Path format: {tenant_id}/invoices/{invoice_id}.pdf
CREATE POLICY "Tenants can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow tenants to view their own invoices
CREATE POLICY "Tenants can view invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow tenants to update their own invoices (for PDF regeneration)
CREATE POLICY "Tenants can update invoices"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow tenants to delete their own invoices
CREATE POLICY "Tenants can delete invoices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow admin users to access all invoices
CREATE POLICY "Admin users can manage all invoices"
ON storage.objects FOR ALL
USING (
  bucket_id = 'invoices' AND
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

