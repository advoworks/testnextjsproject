import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Get tenant_id from query params if using service role key
  const url = new URL(request.url)
  const tenantIdFromQuery = url.searchParams.get('tenant_id')
  const body = tenantIdFromQuery ? { tenant_id: tenantIdFromQuery } : undefined

  // Support both service role key and cookie-based auth
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Get expense and verify it belongs to tenant
  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  return NextResponse.json({ expense })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // Support both service role key and cookie-based auth
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Verify expense belongs to tenant
  const { data: existingExpense } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existingExpense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const { description, amount, expense_date, receipt_url } = body

  const updateData: Record<string, unknown> = {}
  if (description !== undefined) updateData.description = description
  if (amount !== undefined) updateData.amount = parseFloat(amount)
  if (expense_date !== undefined) updateData.expense_date = expense_date
  if (receipt_url !== undefined) updateData.receipt_url = receipt_url

  const { data: expense, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expense })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get tenant_id from query params if using service role key
  const url = new URL(request.url)
  const tenantIdFromQuery = url.searchParams.get('tenant_id')
  const body = tenantIdFromQuery ? { tenant_id: tenantIdFromQuery } : undefined

  // Support both service role key and cookie-based auth
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Verify expense belongs to tenant
  const { data: existingExpense } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existingExpense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

