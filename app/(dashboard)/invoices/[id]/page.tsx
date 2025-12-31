import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import { notFound } from 'next/navigation'
import InvoiceDetail from '@/components/invoices/invoice-detail'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenantUser = await requireTenantUser()
  const supabase = await createClient()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      line_items:invoice_line_items(*),
      customer:customers(*),
      credit_notes:credit_notes(*),
      receipts:receipts(*)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <InvoiceDetail invoice={invoice} />
    </div>
  )
}

