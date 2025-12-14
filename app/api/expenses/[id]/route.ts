import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get expense
  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify expense belongs to tenant
  const { data: existingExpense } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (!existingExpense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const body = await request.json()
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify expense belongs to tenant
  const { data: existingExpense } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
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

