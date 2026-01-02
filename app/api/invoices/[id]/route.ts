import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateInvoice } from '@/lib/invoicing/validation'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'
import type { InvoiceLineItem } from '@/lib/db/types'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Fetch invoice with line items, customer, and related documents
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      line_items:invoice_line_items(*),
      customer:customers(*),
      credit_notes:credit_notes(*),
      receipts:receipts(*)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: invoiceError?.message || 'Invoice not found' },
      { status: invoiceError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ invoice })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const timestamp = new Date().toISOString()
  const { id } = await params
  console.log(`[${timestamp}] [Invoice Update] 🚀 PUT /api/invoices/${id} called`)
  const body = await request.json()
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Check if invoice exists and is a draft
  const fetchTimestamp = new Date().toISOString()
  console.log(`[${fetchTimestamp}] [Invoice Update] 🔍 Fetching invoice ${id}...`)
  const { data: existingInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('status, tax_amount, currency, notes, terms')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existingInvoice) {
    const errorTimestamp = new Date().toISOString()
    console.log(`[${errorTimestamp}] [Invoice Update] ❌ Invoice not found: ${fetchError?.message || 'No invoice returned'}`)
    return NextResponse.json(
      { error: fetchError?.message || 'Invoice not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  const foundTimestamp = new Date().toISOString()
  console.log(`[${foundTimestamp}] [Invoice Update] 📋 Invoice found: status=${existingInvoice.status}, tenant_id=${tenantId}`)

  if (existingInvoice.status !== 'draft') {
    const statusErrorTimestamp = new Date().toISOString()
    console.log(`[${statusErrorTimestamp}] [Invoice Update] ❌ Cannot update ${existingInvoice.status} invoice (only drafts can be edited)`)
    return NextResponse.json(
      { error: 'Can only edit draft invoices' },
      { status: 400 }
    )
  }

  const {
    customer_id,
    invoice_date,
    due_date,
    line_items,
    notes,
    terms,
  } = body

  // Validate required fields
  if (!customer_id || !invoice_date || !line_items || line_items.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: customer_id, invoice_date, and at least one line_item' },
      { status: 400 }
    )
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(invoice_date)) {
    return NextResponse.json(
      { error: 'Invalid invoice_date format. Expected YYYY-MM-DD' },
      { status: 400 }
    )
  }

  if (due_date && !dateRegex.test(due_date)) {
    return NextResponse.json(
      { error: 'Invalid due_date format. Expected YYYY-MM-DD' },
      { status: 400 }
    )
  }

  // Validate due_date >= invoice_date
  if (due_date && new Date(due_date) < new Date(invoice_date)) {
    return NextResponse.json(
      { error: 'Due date must be greater than or equal to invoice date' },
      { status: 400 }
    )
  }

  // Process line items
  const processedLineItems: InvoiceLineItem[] = line_items.map((item: { description?: string; quantity?: number; unit_price?: number; sort_order?: number }, index: number) => {
    const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 1)) || 1
    const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price || 0)) || 0
    const lineTotal = quantity * unitPrice

    return {
      description: item.description || '',
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      sort_order: item.sort_order !== undefined ? item.sort_order : index,
    }
  })

  // Calculate totals
  const subtotal = processedLineItems.reduce((sum, item) => sum + item.line_total, 0)
  const taxAmount = existingInvoice.tax_amount || 0
  const totalAmount = subtotal + taxAmount

  // Validate invoice data
  try {
    validateInvoice(
      {
        customer_id,
        invoice_date,
        due_date,
        currency: existingInvoice.currency,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      },
      processedLineItems
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid invoice data' },
      { status: 400 }
    )
  }

  // Update invoice
  const { data: invoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      customer_id,
      invoice_date,
      due_date: due_date || null,
      subtotal,
      total_amount: totalAmount,
      notes: notes !== undefined ? notes : existingInvoice.notes,
      terms: terms !== undefined ? terms : existingInvoice.terms,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError || !invoice) {
    return NextResponse.json({ error: updateError?.message || 'Failed to update invoice' }, { status: 500 })
  }

  // Delete existing line items
  const { error: deleteError } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', id)

  if (deleteError) {
    return NextResponse.json({ error: `Failed to delete old line items: ${deleteError.message}` }, { status: 500 })
  }

  // Create new line items
  const lineItemsToInsert = processedLineItems.map(item => ({
    invoice_id: id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }))

  const { error: insertError } = await supabase
    .from('invoice_line_items')
    .insert(lineItemsToInsert)

  if (insertError) {
    return NextResponse.json({ error: `Failed to create line items: ${insertError.message}` }, { status: 500 })
  }

  // Fetch complete invoice with line items
  const { data: completeInvoice, error: fetchCompleteError } = await supabase
    .from('invoices')
    .select(`
      *,
      line_items:invoice_line_items(*)
    `)
    .eq('id', id)
    .single()

  if (fetchCompleteError) {
    const fetchErrorTimestamp = new Date().toISOString()
    console.error(`[${fetchErrorTimestamp}] [Invoice Update] ❌ Failed to fetch complete invoice: ${fetchCompleteError.message}`)
    return NextResponse.json({ error: fetchCompleteError.message }, { status: 500 })
  }

  const updateSuccessTimestamp = new Date().toISOString()
  console.log(`[${updateSuccessTimestamp}] [Invoice Update] ✅ Invoice updated successfully: ${id}`)

  // Regenerate and upload PDF ONLY for draft invoices (non-blocking)
  // For issued/sent/paid invoices, PDF should not be regenerated (audit integrity)
  // pdf_url now stores the file path (e.g., "{tenant_id}/invoices/{invoice_id}.pdf")
  // The PDF can be accessed via /api/invoices/[id]/pdf which respects RLS
  if (existingInvoice.status === 'draft') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [Invoice Update] 📄 Starting async PDF regeneration for draft invoice ${id}`)
    
    // Use an async IIFE with proper error handling
    const pdfRegenerationPromise = (async () => {
      const asyncTimestamp = new Date().toISOString()
      console.log(`[${asyncTimestamp}] [Invoice Update] 🔄 Async PDF regeneration STARTED for invoice ${id}`)
      try {
        const pdfPath = await generateAndUploadInvoicePDF(id, supabase)
        const completionTimestamp = new Date().toISOString()
        console.log(`[${completionTimestamp}] [Invoice Update] ✅ PDF regeneration completed, pdfPath: ${pdfPath ? '✅ generated' : '❌ null'}`)
        
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
              console.error(`[${updateTimestamp}] [Invoice Update] ❌ Failed to update PDF path: ${updateError.message}`, updateError)
            } else {
              console.log(`[${updateTimestamp}] [Invoice Update] ✅ PDF path updated successfully for invoice ${id}: ${pdfPath}`)
            }
          } catch (error) {
            const errorTimestamp = new Date().toISOString()
            console.error(`[${errorTimestamp}] [Invoice Update] ❌ Exception updating PDF path: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
          }
        } else {
          const warnTimestamp = new Date().toISOString()
          console.warn(`[${warnTimestamp}] [Invoice Update] ⚠️ PDF path is null, not updating invoice ${id}`)
        }
      } catch (error) {
        const errorTimestamp = new Date().toISOString()
        console.error(`[${errorTimestamp}] [Invoice Update] ❌ PDF regeneration failed for invoice ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
        // Don't throw - invoice update succeeded, PDF regeneration is optional
      }
    })()
    
    // Attach error handler to prevent unhandled promise rejection
    pdfRegenerationPromise.catch((error) => {
      const errorTimestamp = new Date().toISOString()
      console.error(`[${errorTimestamp}] [Invoice Update] ❌ Unhandled promise rejection in PDF regeneration:`, error)
    })
    
    // Keep reference to prevent garbage collection (Next.js might terminate the context)
    if (typeof globalThis !== 'undefined') {
      (globalThis as { __pendingPdfRegeneration?: Promise<void> }).__pendingPdfRegeneration = pdfRegenerationPromise
    }
  } else {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [Invoice Update] ⏭️ Skipping PDF regeneration for ${existingInvoice.status} invoice ${id} (only drafts are regenerated)`)
  }

  return NextResponse.json({ invoice: completeInvoice })
}

