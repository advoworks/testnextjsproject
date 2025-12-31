import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import { notFound, redirect } from 'next/navigation'
import CustomerForm from '@/components/invoices/customer-form'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenantUser = await requireTenantUser()
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (error || !customer) {
    notFound()
  }

  async function handleSubmit(data: Partial<typeof customer>) {
    'use server'
    const supabase = await createClient()
    const tenantUser = await requireTenantUser()

    const { error: updateError } = await supabase
      .from('customers')
      .update(data)
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    redirect(`/customers/${id}`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {customer.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Customer details
        </p>
      </div>

      <CustomerForm tenantId={tenantUser.tenant_id} customer={customer} onSubmit={handleSubmit} />
    </div>
  )
}

