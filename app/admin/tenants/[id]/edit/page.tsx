import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/utils'
import { notFound } from 'next/navigation'
import TenantForm from '@/components/admin/tenant-form'
import { updateTenant } from './actions'

export default async function EditTenantPage({
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


  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Edit Tenant
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Update tenant information
        </p>
      </div>

      <TenantForm
        tenant={tenant}
        onSubmit={updateTenant}
        cancelUrl={`/admin/tenants/${id}`}
      />
    </div>
  )
}

