import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  // Get expenses for tenant
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .order('expense_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expenses: expenses || [] })
}

export async function POST(request: Request) {
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

  const body = await request.json()
  const { description, amount, expense_date, receipt_url } = body

  if (!description || !amount || !expense_date) {
    return NextResponse.json(
      { error: 'Missing required fields: description, amount, expense_date' },
      { status: 400 }
    )
  }

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      tenant_id: tenantUser.tenant_id,
      description,
      amount: parseFloat(amount),
      expense_date,
      receipt_url: receipt_url || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expense }, { status: 201 })
}

