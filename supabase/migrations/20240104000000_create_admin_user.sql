-- Insert admin user (replace USER_UUID_HERE with actual user ID from auth.users)
-- You must create the user via Supabase Auth Dashboard first, then update the UUID below
-- or just manually insert into admin_users.... up to you

-- The below will outright fail anyway since u need to create in Supabase Auth Dashboard first
-- INSERT INTO admin_users (id, email, full_name)
-- VALUES ('USER_UUID_HERE', 'admin@example.com', 'Admin User')
-- ON CONFLICT (id) DO NOTHING;