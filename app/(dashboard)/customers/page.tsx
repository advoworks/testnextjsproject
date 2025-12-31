import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import Link from 'next/link'
import CustomerList from '@/components/invoices/customer-list'

export default async function CustomersPage() {
  const tenantUser = await requireTenantUser()
  const supabase = await createClient()

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching customers:', error)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Customers
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your customers and client information
          </p>
        </div>
        <Link
          href="/customers/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Customer
        </Link>
      </div>

      <CustomerList customers={customers || []} />
    </div>
  )
}

