import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateReceipt } from '@/lib/invoicing/validation'
import { getNextReceiptNumber } from '@/lib/invoicing/number-generator'

export async function GET(request: Request) {
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('invoice_id')

  let query = supabase
    .from('receipts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false })

  if (invoiceId) {
    query = query.eq('invoice_id', invoiceId)
  }

  const { data: receipts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ receipts: receipts || [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId, userId, isServiceRole } = authResult

  const { invoice_id, payment_date, payment_method, payment_reference, amount, notes } = body

  // Validate required fields
  if (!invoice_id || !payment_date || !amount) {
    return NextResponse.json(
      { error: 'Missing required fields: invoice_id, payment_date, amount' },
      { status: 400 }
    )
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(payment_date)) {
    return NextResponse.json(
      { error: 'Invalid payment_date format. Expected YYYY-MM-DD' },
      { status: 400 }
    )
  }

  // Validate amount
  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: 'Amount must be a positive number' },
      { status: 400 }
    )
  }

  // Validate receipt
  try {
    await validateReceipt({
      tenant_id: tenantId,
      invoice_id,
      payment_date,
      payment_method,
      payment_reference,
      amount: parsedAmount,
      notes,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid receipt data' },
      { status: 400 }
    )
  }

  // Generate receipt number
  let receiptNumber: string
  try {
    receiptNumber = await getNextReceiptNumber(tenantId, new Date(payment_date))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate receipt number' },
      { status: 500 }
    )
  }

  // Create receipt
  const { data: receipt, error: createError } = await supabase
    .from('receipts')
    .insert({
      tenant_id: tenantId,
      invoice_id,
      receipt_number: receiptNumber,
      payment_date,
      payment_method: payment_method || null,
      payment_reference: payment_reference || null,
      amount: parsedAmount,
      notes: notes || null,
      created_by: isServiceRole ? (body.created_by || null) : userId,
    })
    .select()
    .single()

  if (createError || !receipt) {
    return NextResponse.json(
      { error: createError?.message || 'Failed to create receipt' },
      { status: 500 }
    )
  }

  return NextResponse.json({ receipt }, { status: 201 })
}

