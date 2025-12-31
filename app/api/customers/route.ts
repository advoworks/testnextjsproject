import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateCustomer } from '@/lib/invoicing/validation'

export async function GET(request: Request) {
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customers: customers || [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  const authResult = await requireTenantForApi(request, body)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  const {
    name,
    email,
    phone,
    address_line1,
    address_line2,
    city,
    state_province,
    postal_code,
    country,
    tax_id,
    notes,
  } = body

  // Validate customer
  try {
    validateCustomer({
      name,
      email,
      phone,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid customer data' },
      { status: 400 }
    )
  }

  // Create customer
  const { data: customer, error: createError } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenantId,
      name,
      email: email || null,
      phone: phone || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city: city || null,
      state_province: state_province || null,
      postal_code: postal_code || null,
      country: country || null,
      tax_id: tax_id || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (createError || !customer) {
    return NextResponse.json(
      { error: createError?.message || 'Failed to create customer' },
      { status: 500 }
    )
  }

  return NextResponse.json({ customer }, { status: 201 })
}

