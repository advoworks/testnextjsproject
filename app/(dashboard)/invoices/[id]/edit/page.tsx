import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import { notFound, redirect } from 'next/navigation'
import InvoiceForm from '@/components/invoices/invoice-form'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'

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

    // Regenerate PDF for draft invoices (non-blocking)
    // This runs asynchronously and updates the invoice with pdf_url when complete
    if (invoice.status === 'draft') {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [Invoice Edit Server Action] 📄 Starting async PDF regeneration for draft invoice ${id}`)
      
      // Use an async IIFE with proper error handling
      const pdfRegenerationPromise = (async () => {
        const asyncTimestamp = new Date().toISOString()
        console.log(`[${asyncTimestamp}] [Invoice Edit Server Action] 🔄 Async PDF regeneration STARTED for invoice ${id}`)
        try {
          const pdfPath = await generateAndUploadInvoicePDF(id, supabase)
          const completionTimestamp = new Date().toISOString()
          console.log(`[${completionTimestamp}] [Invoice Edit Server Action] ✅ PDF regeneration completed, pdfPath: ${pdfPath ? '✅ generated' : '❌ null'}`)
          
          if (pdfPath) {
            // Update invoice with new PDF file path and generation timestamp
            try {
              const updateTimestamp = new Date().toISOString()
              const pdfGeneratedAt = new Date().toISOString()
              const { error: updateError } = await supabase
                .from('invoices')
                .update({ 
                  pdf_url: pdfPath,
                  pdf_generated_at: pdfGeneratedAt
                })
                .eq('id', id)
              
              if (updateError) {
                console.error(`[${updateTimestamp}] [Invoice Edit Server Action] ❌ Failed to update PDF path: ${updateError.message}`, updateError)
              } else {
                console.log(`[${updateTimestamp}] [Invoice Edit Server Action] ✅ PDF path updated successfully for invoice ${id}: ${pdfPath}`)
              }
            } catch (error) {
              const errorTimestamp = new Date().toISOString()
              console.error(`[${errorTimestamp}] [Invoice Edit Server Action] ❌ Exception updating PDF path: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
            }
          } else {
            const warnTimestamp = new Date().toISOString()
            console.warn(`[${warnTimestamp}] [Invoice Edit Server Action] ⚠️ PDF path is null, not updating invoice ${id}`)
          }
        } catch (error) {
          const errorTimestamp = new Date().toISOString()
          console.error(`[${errorTimestamp}] [Invoice Edit Server Action] ❌ PDF regeneration failed for invoice ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
          // Don't throw - invoice update succeeded, PDF regeneration is optional
        }
      })()
      
      // Attach error handler to prevent unhandled promise rejection
      pdfRegenerationPromise.catch((error) => {
        const errorTimestamp = new Date().toISOString()
        console.error(`[${errorTimestamp}] [Invoice Edit Server Action] ❌ Unhandled promise rejection in PDF regeneration:`, error)
      })
      
      // Keep reference to prevent garbage collection
      // Note: In Server Actions, the promise will complete even after redirect
      // but we attach the handler to prevent unhandled rejections
    } else {
      const skipTimestamp = new Date().toISOString()
      console.log(`[${skipTimestamp}] [Invoice Edit Server Action] ⏭️ Skipping PDF regeneration for ${invoice.status} invoice ${id} (only drafts are regenerated)`)
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

