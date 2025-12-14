-- Allow any authenticated user to check if they are an admin
-- This is needed for the login flow to determine user role
CREATE POLICY "Users can check their own admin status"
ON admin_users FOR SELECT
USING (id = auth.uid());

