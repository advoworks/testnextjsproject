import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
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
  if (invoice.status !== 'sent') {
    return NextResponse.json(
      { error: `Can only mark sent invoices as paid. Current status: ${invoice.status}` },
      { status: 400 }
    )
  }

  // Validate state transition
  try {
    validateInvoiceStateTransition(invoice.status, 'paid')
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid state transition' },
      { status: 400 }
    )
  }

  // Update invoice
  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError || !updatedInvoice) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to mark invoice as paid' },
      { status: 500 }
    )
  }

  return NextResponse.json({ invoice: updatedInvoice })
}

