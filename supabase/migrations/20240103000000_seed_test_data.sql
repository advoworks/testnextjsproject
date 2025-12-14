-- Seed test data for development
-- IMPORTANT: You must create auth users first via Supabase Auth Dashboard
-- Then update the UUIDs below with the actual user IDs

-- Insert test tenants
INSERT INTO tenants (id, name, email, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme@example.com', true),
  ('00000000-0000-0000-0000-000000000002', 'Tech Startup Inc', 'tech@example.com', true),
  ('00000000-0000-0000-0000-000000000003', 'Local Bakery', 'bakery@example.com', true)
ON CONFLICT (id) DO NOTHING;

-- Insert test expenses (these will work once tenants exist)
INSERT INTO expenses (id, tenant_id, amount, description, expense_date)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 50.00, 'Office supplies', CURRENT_DATE - INTERVAL '5 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 120.00, 'Team lunch', CURRENT_DATE - INTERVAL '3 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 25.50, 'Coffee meeting', CURRENT_DATE - INTERVAL '1 day'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 200.00, 'Software subscription', CURRENT_DATE - INTERVAL '10 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 75.00, 'Marketing materials', CURRENT_DATE - INTERVAL '7 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 150.00, 'Ingredients purchase', CURRENT_DATE - INTERVAL '2 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 45.00, 'Equipment maintenance', CURRENT_DATE - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;