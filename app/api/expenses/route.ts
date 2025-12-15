import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'

export async function GET(request: Request) {
  // Support both service role key and cookie-based auth
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Get expenses for tenant
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('expense_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expenses: expenses || [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  // Support both service role key and cookie-based auth
  // Pass body to requireTenantForApi so it can check for tenant_id if using service role key
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId, userId } = authResult

  const { description, amount, expense_date, receipt_url, created_by } = body

  if (!description || !amount || !expense_date) {
    return NextResponse.json(
      { error: 'Missing required fields: description, amount, expense_date' },
      { status: 400 }
    )
  }

  // Use provided created_by if using service role key, otherwise use authenticated user id
  const createdById = authResult.isServiceRole 
    ? (created_by || null) // Allow N8N to specify created_by, or leave null
    : userId // Use authenticated user id for browser requests

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      tenant_id: tenantId,
      description,
      amount: parseFloat(amount),
      expense_date,
      receipt_url: receipt_url || null,
      created_by: createdById,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expense }, { status: 201 })
}

