import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/utils'
import { notFound } from 'next/navigation'
import TenantDetail from '@/components/admin/tenant-detail'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tenant) {
    notFound()
  }

  // Get tenant users
  const { data: users } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('tenant_id', id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <TenantDetail tenant={tenant} users={users || []} />
    </div>
  )
}

