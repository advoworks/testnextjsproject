import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateCreditNote } from '@/lib/invoicing/validation'
import { getNextCreditNoteNumber } from '@/lib/invoicing/number-generator'

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
    .from('credit_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('credit_note_date', { ascending: false })

  if (invoiceId) {
    query = query.eq('invoice_id', invoiceId)
  }

  const { data: creditNotes, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ credit_notes: creditNotes || [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId, userId, isServiceRole } = authResult

  const { invoice_id, amount, reason, credit_note_date } = body

  // Validate required fields
  if (!invoice_id || !amount || !reason || !credit_note_date) {
    return NextResponse.json(
      { error: 'Missing required fields: invoice_id, amount, reason, credit_note_date' },
      { status: 400 }
    )
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(credit_note_date)) {
    return NextResponse.json(
      { error: 'Invalid credit_note_date format. Expected YYYY-MM-DD' },
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

  // Validate credit note
  try {
    await validateCreditNote({
      tenant_id: tenantId,
      invoice_id,
      amount: parsedAmount,
      reason,
      credit_note_date,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid credit note data' },
      { status: 400 }
    )
  }

  // Generate credit note number
  let creditNoteNumber: string
  try {
    creditNoteNumber = await getNextCreditNoteNumber(tenantId, new Date(credit_note_date))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate credit note number' },
      { status: 500 }
    )
  }

  // Create credit note
  const { data: creditNote, error: createError } = await supabase
    .from('credit_notes')
    .insert({
      tenant_id: tenantId,
      invoice_id,
      credit_note_number: creditNoteNumber,
      amount: parsedAmount,
      reason,
      credit_note_date,
      created_by: isServiceRole ? (body.created_by || null) : userId,
    })
    .select()
    .single()

  if (createError || !creditNote) {
    return NextResponse.json(
      { error: createError?.message || 'Failed to create credit note' },
      { status: 500 }
    )
  }

  return NextResponse.json({ credit_note: creditNote }, { status: 201 })
}

