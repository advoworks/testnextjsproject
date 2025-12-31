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

  const { supabase, tenantId, userId, isServiceRole } = authResult

  const { delivery_channel, recipient, provider_message_id } = body

  // Validate required fields
  if (!delivery_channel || !recipient) {
    return NextResponse.json(
      { error: 'Missing required fields: delivery_channel and recipient' },
      { status: 400 }
    )
  }

  // Validate delivery channel
  if (!['email', 'whatsapp', 'download'].includes(delivery_channel)) {
    return NextResponse.json(
      { error: 'Invalid delivery_channel. Must be one of: email, whatsapp, download' },
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

  // Validate status
  if (invoice.status !== 'issued') {
    return NextResponse.json(
      { error: `Can only send issued invoices. Current status: ${invoice.status}` },
      { status: 400 }
    )
  }

  // Validate state transition
  try {
    validateInvoiceStateTransition(invoice.status, 'sent')
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid state transition' },
      { status: 400 }
    )
  }

  // Update invoice status
  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError || !updatedInvoice) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to mark invoice as sent' },
      { status: 500 }
    )
  }

  // Create delivery record
  const { error: deliveryError } = await supabase
    .from('document_deliveries')
    .insert({
      tenant_id: tenantId,
      document_type: 'invoice',
      document_id: id,
      delivery_channel,
      recipient,
      provider_message_id: provider_message_id || null,
      status: 'sent',
      created_by: isServiceRole ? (body.created_by || null) : userId,
    })

  if (deliveryError) {
    // Log error but don't fail the request - invoice is already marked as sent
    console.error('Failed to create delivery record:', deliveryError)
  }

  return NextResponse.json({ invoice: updatedInvoice })
}

