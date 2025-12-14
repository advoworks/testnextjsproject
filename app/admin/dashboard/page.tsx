import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/utils'
import AdminStats from '@/components/admin/stats'
import TenantList from '@/components/admin/tenant-list'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, email, created_at, is_active')
    .order('created_at', { ascending: false })
    .limit(10)

  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  const { count: activeTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Manage tenants and monitor system activity
        </p>
      </div>

      <AdminStats totalTenants={totalTenants || 0} activeTenants={activeTenants || 0} />

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Recent Tenants</h2>
        <TenantList tenants={tenants || []} />
      </div>
    </div>
  )
}

