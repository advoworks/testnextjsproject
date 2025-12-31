import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateInvoiceCanBeVoided, validateVoidInvoice, validateInvoiceStateTransition } from '@/lib/invoicing/validation'

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

  const { void_reason } = body

  // Validate void reason
  try {
    validateVoidInvoice(void_reason)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Void reason is required' },
      { status: 400 }
    )
  }

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

  // Validate invoice can be voided
  try {
    await validateInvoiceCanBeVoided(id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cannot void invoice' },
      { status: 400 }
    )
  }

  // Validate state transition
  try {
    validateInvoiceStateTransition(invoice.status, 'voided')
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
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError || !updatedInvoice) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to void invoice' },
      { status: 500 }
    )
  }

  return NextResponse.json({ invoice: updatedInvoice })
}

