import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { getNextInvoiceNumber } from '@/lib/invoicing/number-generator'
import { validateInvoiceStateTransition } from '@/lib/invoicing/validation'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Fetch invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json(
      { error: fetchError?.message || 'Invoice not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  // Validate status
  if (invoice.status !== 'draft') {
    return NextResponse.json(
      { error: `Can only issue draft invoices. Current status: ${invoice.status}` },
      { status: 400 }
    )
  }

  // Validate state transition
  try {
    validateInvoiceStateTransition(invoice.status, 'issued')
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid state transition' },
      { status: 400 }
    )
  }

  // Generate invoice number
  let invoiceNumber: string
  try {
    invoiceNumber = await getNextInvoiceNumber(tenantId, new Date(invoice.invoice_date))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate invoice number' },
      { status: 500 }
    )
  }

  // Update invoice
  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      invoice_number: invoiceNumber,
      status: 'issued',
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError || !updatedInvoice) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to issue invoice' },
      { status: 500 }
    )
  }

  return NextResponse.json({ invoice: updatedInvoice })
}

