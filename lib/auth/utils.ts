import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getTenantUser() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return null

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('*, tenant:tenants(is_active)')
    .eq('id', user.id)
    .maybeSingle()

  return tenantUser
}

export async function getAdminUser() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return null

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return adminUser
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireTenantUser() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
    return null as never
  }

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('*, tenant:tenants(is_active)')
    .eq('id', user.id)
    .maybeSingle()

  if (!tenantUser) {
    redirect('/login')
    return null as never
  }

  // Check if tenant is active
  if (tenantUser.tenant && !tenantUser.tenant.is_active) {
    redirect('/login?error=deactivated')
    return null as never
  }

  return tenantUser
}

export async function requireAdmin() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    redirect('/login')
  }
  return adminUser
}

/**
 * Validates service role key from Authorization header.
 * Returns admin client if valid, or null if invalid/missing.
 */
function validateServiceRoleKey(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const providedKey = authHeader.substring(7).trim()
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // If service role key is not configured, skip this authentication method
  if (!expectedKey || expectedKey.trim() === '') {
    return null
  }

  // Compare the provided key with the expected service role key
  if (providedKey === expectedKey.trim()) {
    try {
      return createAdminClient()
    } catch (error) {
      // If creating admin client fails, return null to fall back to cookie auth
      console.error('Failed to create admin client:', error)
      return null
    }
  }

  return null
}

/**
 * API route version of requireAdmin that works with:
 * 1. Service role key in Authorization header (for N8N/automated tools)
 * 2. Cookie-based authentication (for browser requests)
 * 
 * Returns a NextResponse error if not authorized, instead of redirecting.
 */
export async function requireAdminForApi(request: Request) {
  // First, try service role key authentication (for N8N)
  const adminClientFromKey = validateServiceRoleKey(request)
  if (adminClientFromKey) {
    // Service role key is valid - return admin client
    // Note: We don't have a specific admin user here, but we have admin privileges
    return { adminUser: { id: 'service-role' }, supabase: adminClientFromKey, isServiceRole: true }
  }

  // Fall back to cookie-based authentication (for browser requests)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  return { adminUser, supabase, isServiceRole: false }
}

/**
 * API route version for tenant operations that works with:
 * 1. Service role key in Authorization header (for N8N/automated tools)
 *    - Requires tenant_id in request body
 * 2. Cookie-based authentication (for browser requests)
 *    - Gets tenant_id from authenticated user
 * 
 * Returns a NextResponse error if not authorized, instead of redirecting.
 */
export async function requireTenantForApi(request: Request, body?: { tenant_id?: string }) {
  // First, try service role key authentication (for N8N)
  const adminClientFromKey = validateServiceRoleKey(request)
  if (adminClientFromKey) {
    // Service role key is valid - require tenant_id in body
    const tenantId = body?.tenant_id
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required when using service role key authentication' },
        { status: 400 }
      )
    }

    // Verify tenant exists and is active
    const { data: tenant, error: tenantError } = await adminClientFromKey
      .from('tenants')
      .select('id, is_active')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (!tenant.is_active) {
      return NextResponse.json({ error: 'Tenant is not active' }, { status: 403 })
    }

    return {
      supabase: adminClientFromKey,
      tenantId,
      isServiceRole: true,
      userId: null, // No specific user when using service role key
    }
  }

  // Fall back to cookie-based authentication (for browser requests)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, tenant:tenants(is_active)')
    .eq('id', user.id)
    .maybeSingle()

  if (!tenantUser) {
    return NextResponse.json({ error: 'Forbidden: Tenant user access required' }, { status: 403 })
  }

  // Check if tenant is active
  // Note: When selecting specific fields with join, Supabase may return array
  const tenant = Array.isArray(tenantUser.tenant) ? tenantUser.tenant[0] : tenantUser.tenant
  if (tenant && !tenant.is_active) {
    return NextResponse.json({ error: 'Tenant is not active' }, { status: 403 })
  }

  return {
    supabase,
    tenantId: tenantUser.tenant_id,
    isServiceRole: false,
    userId: user.id,
  }
}

