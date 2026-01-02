import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateInvoice } from '@/lib/invoicing/validation'
import { getEffectiveCurrency } from '@/lib/utils/locale'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'
import type { InvoiceLineItem } from '@/lib/db/types'

export async function GET(request: Request) {
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const customerId = searchParams.get('customer_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('invoice_date', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  if (startDate) {
    query = query.gte('invoice_date', startDate)
  }

  if (endDate) {
    query = query.lte('invoice_date', endDate)
  }

  const { data: invoices, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoices: invoices || [] })
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Invoice Creation] 🚀 POST /api/invoices called`)
  const body = await request.json()
  const bodyTimestamp = new Date().toISOString()
  console.log(`[${bodyTimestamp}] [Invoice Creation] 📝 Request body received:`, { customer_id: body.customer_id, invoice_date: body.invoice_date })
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId, userId, isServiceRole } = authResult

  const {
    customer_id,
    invoice_date,
    due_date,
    currency,
    line_items,
    notes,
    terms,
  } = body

  // Validate required fields
  if (!customer_id || !invoice_date || !currency || !line_items || line_items.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: customer_id, invoice_date, currency, and at least one line_item' },
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

  // Determine currency
  let finalCurrency = currency || null
  if (!finalCurrency && !isServiceRole && userId) {
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('currency, tenant:tenants(currency)')
      .eq('id', userId)
      .single()

    if (tenantUser) {
      let tenantCurrency: string | null = null
      if (tenantUser.tenant) {
        if (Array.isArray(tenantUser.tenant)) {
          tenantCurrency = tenantUser.tenant[0]?.currency || null
        } else {
          tenantCurrency = (tenantUser.tenant as { currency?: string | null })?.currency || null
        }
      }
      finalCurrency = getEffectiveCurrency(tenantUser.currency, tenantCurrency)
    }
  }

  if (!finalCurrency) {
    return NextResponse.json(
      { error: 'Currency is required. Please provide currency in the request or set your user/tenant currency preference.' },
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
  const taxAmount = 0 // Placeholder for future tax support
  const totalAmount = subtotal + taxAmount

  // Validate invoice data
  try {
    validateInvoice(
      {
        customer_id,
        invoice_date,
        due_date,
        currency: finalCurrency,
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

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      customer_id,
      invoice_date,
      due_date: due_date || null,
      currency: finalCurrency,
      status: 'draft',
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: notes || null,
      terms: terms || null,
      created_by: isServiceRole ? (body.created_by || null) : userId,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message || 'Failed to create invoice' }, { status: 500 })
  }

  // Create line items
  const lineItemsToInsert = processedLineItems.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }))

  const { error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .insert(lineItemsToInsert)

  if (lineItemsError) {
    // Rollback: delete the invoice
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return NextResponse.json({ error: `Failed to create line items: ${lineItemsError.message}` }, { status: 500 })
  }

  // Fetch complete invoice with line items
  const { data: completeInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select(`
      *,
      line_items:invoice_line_items(*)
    `)
    .eq('id', invoice.id)
    .single()

  if (fetchError) {
    const errorTimestamp = new Date().toISOString()
    console.error(`[${errorTimestamp}] [Invoice Creation] ❌ Failed to fetch complete invoice: ${fetchError.message}`)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const successTimestamp = new Date().toISOString()
  console.log(`[${successTimestamp}] [Invoice Creation] ✅ Invoice created successfully: ${invoice.id}`)
  const pdfStartTimestamp = new Date().toISOString()
  console.log(`[${pdfStartTimestamp}] [Invoice Creation] 📄 Starting PDF generation in background...`)

  // Generate and upload PDF (non-blocking - don't fail invoice creation if this fails)
  // pdf_url now stores the file path (e.g., "{tenant_id}/invoices/{invoice_id}.pdf")
  // The PDF can be accessed via /api/invoices/[id]/pdf which respects RLS
  const pdfGenerationPromise = (async () => {
    const asyncStartTimestamp = new Date().toISOString()
    console.log(`[${asyncStartTimestamp}] [Invoice Creation] 🔄 Async PDF generation STARTED for invoice ${invoice.id}`)
    try {
      const pdfPath = await generateAndUploadInvoicePDF(invoice.id, supabase)
      const completionTimestamp = new Date().toISOString()
      console.log(`[${completionTimestamp}] [Invoice Creation] ✅ PDF generation completed, pdfPath: ${pdfPath ? '✅ generated' : '❌ null'}`)
      if (pdfPath) {
        // Update invoice with PDF file path and generation timestamp
        try {
          const updateTimestamp = new Date().toISOString()
          const pdfGeneratedAt = new Date().toISOString()
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ 
              pdf_url: pdfPath,
              pdf_generated_at: pdfGeneratedAt
            })
            .eq('id', invoice.id)
          
          if (updateError) {
            console.error(`[${updateTimestamp}] [Invoice Creation] ❌ Failed to update PDF path:`, updateError)
          } else {
            console.log(`[${updateTimestamp}] [Invoice Creation] ✅ PDF path updated successfully for invoice ${invoice.id}: ${pdfPath}`)
          }
        } catch (error) {
          const exceptionTimestamp = new Date().toISOString()
          console.error(`[${exceptionTimestamp}] [Invoice Creation] ❌ Exception updating PDF path:`, error)
        }
      } else {
        const warnTimestamp = new Date().toISOString()
        console.warn(`[${warnTimestamp}] [Invoice Creation] ⚠️ PDF path is null, not updating invoice ${invoice.id}`)
      }
    } catch (error) {
      const exceptionTimestamp = new Date().toISOString()
      console.error(`[${exceptionTimestamp}] [Invoice Creation] ❌ PDF generation exception:`, error)
    }
  })()
  
  // Attach error handler to prevent unhandled promise rejection
  pdfGenerationPromise.catch((error) => {
    const rejectionTimestamp = new Date().toISOString()
    console.error(`[${rejectionTimestamp}] [Invoice Creation] ❌ Unhandled promise rejection in PDF generation:`, error)
  })

  // Keep reference to prevent garbage collection (Next.js might terminate the context)
  // Store it in a way that keeps it alive
  if (typeof globalThis !== 'undefined') {
    (globalThis as { __pendingPdfGeneration?: Promise<void> }).__pendingPdfGeneration = pdfGenerationPromise
  }

  const returnTimestamp = new Date().toISOString()
  console.log(`[${returnTimestamp}] [Invoice Creation] 📤 Returning response for invoice ${invoice.id}`)
  return NextResponse.json({ invoice: completeInvoice }, { status: 201 })
}

