import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

