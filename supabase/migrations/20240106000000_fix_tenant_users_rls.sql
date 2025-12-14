-- Fix infinite recursion in tenant_users RLS policies
-- The issue: SELECT policy queries tenant_users, causing recursion when inserting

-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenant users can view users in their tenant" ON tenant_users;

-- Create a security definer function that checks tenant membership without triggering RLS
-- This function bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_users WHERE id = user_id LIMIT 1;
$$;

-- Recreate the SELECT policy using the function (avoids recursion)
CREATE POLICY "Tenant users can view users in their tenant" ON tenant_users
  FOR SELECT USING (
    tenant_id = get_user_tenant_id(auth.uid())
  );

-- Add INSERT policy for admin users (this was missing, causing issues when creating tenant users)
CREATE POLICY "Admin users can insert tenant users" ON tenant_users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Add UPDATE policy for admin users (for completeness)
CREATE POLICY "Admin users can update tenant users" ON tenant_users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Add DELETE policy for admin users (for completeness)
CREATE POLICY "Admin users can delete tenant users" ON tenant_users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

