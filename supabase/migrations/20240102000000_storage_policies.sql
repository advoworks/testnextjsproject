-- Storage policies for receipts bucket
-- Note: The 'receipts' bucket must exist before running this migration
-- If bucket doesn't exist, create it via Supabase Dashboard first

-- Allow tenants to upload receipts to their own folder
CREATE POLICY "Tenants can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow tenants to view their own receipts
CREATE POLICY "Tenants can view receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow tenants to delete their own receipts
CREATE POLICY "Tenants can delete receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tenants
    WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  )
);

-- Allow admin users to access all receipts
CREATE POLICY "Admin users can manage all receipts"
ON storage.objects FOR ALL
USING (
  bucket_id = 'receipts' AND
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);