import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import { notFound, redirect } from 'next/navigation'
import InvoiceForm from '@/components/invoices/invoice-form'

export default async function EditInvoicePage({
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
      customer:customers(*)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  if (invoice.status !== 'draft') {
    redirect(`/invoices/${id}`)
  }

  async function handleSubmit(data: any) {
    'use server'
    const supabase = await createClient()
    const tenantUser = await requireTenantUser()

    // Calculate totals
    const subtotal = data.line_items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
    const taxAmount = invoice.tax_amount || 0
    const totalAmount = subtotal + taxAmount

    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        customer_id: data.customer_id,
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        subtotal,
        total_amount: totalAmount,
        notes: data.notes,
        terms: data.terms,
      })
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Delete existing line items
    await supabase.from('invoice_line_items').delete().eq('invoice_id', id)

    // Create new line items
    const lineItemsToInsert = data.line_items.map((item: any, index: number) => ({
      invoice_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      sort_order: item.sort_order !== undefined ? item.sort_order : index,
    }))

    const { error: insertError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsToInsert)

    if (insertError) {
      throw new Error(insertError.message)
    }

    redirect(`/invoices/${id}`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Edit Invoice
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Edit draft invoice details
        </p>
      </div>

      <InvoiceForm tenantId={tenantUser.tenant_id} invoice={invoice} onSubmit={handleSubmit} />
    </div>
  )
}

