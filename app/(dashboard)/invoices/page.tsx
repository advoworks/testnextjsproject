import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import Link from 'next/link'
import InvoiceList from '@/components/invoices/invoice-list'

export default async function InvoicesPage() {
  const tenantUser = await requireTenantUser()
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .order('invoice_date', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your invoices and track payments
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Invoice
        </Link>
      </div>

      <InvoiceList invoices={invoices || []} />
    </div>
  )
}

