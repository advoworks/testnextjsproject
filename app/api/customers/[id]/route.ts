import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { validateCustomer } from '@/lib/invoicing/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !customer) {
    return NextResponse.json(
      { error: error?.message || 'Customer not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ customer })
}

export async function PUT(
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

  // Fetch existing customer to merge with updates
  const { data: existingCustomer, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existingCustomer) {
    return NextResponse.json(
      { error: fetchError?.message || 'Customer not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  // Merge updates
  const updatedCustomer = {
    name: body.name !== undefined ? body.name : existingCustomer.name,
    email: body.email !== undefined ? body.email : existingCustomer.email,
    phone: body.phone !== undefined ? body.phone : existingCustomer.phone,
    address_line1: body.address_line1 !== undefined ? body.address_line1 : existingCustomer.address_line1,
    address_line2: body.address_line2 !== undefined ? body.address_line2 : existingCustomer.address_line2,
    city: body.city !== undefined ? body.city : existingCustomer.city,
    state_province: body.state_province !== undefined ? body.state_province : existingCustomer.state_province,
    postal_code: body.postal_code !== undefined ? body.postal_code : existingCustomer.postal_code,
    country: body.country !== undefined ? body.country : existingCustomer.country,
    tax_id: body.tax_id !== undefined ? body.tax_id : existingCustomer.tax_id,
    notes: body.notes !== undefined ? body.notes : existingCustomer.notes,
  }

  // Validate customer
  try {
    validateCustomer(updatedCustomer)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid customer data' },
      { status: 400 }
    )
  }

  // Update customer
  const { data: customer, error: updateError } = await supabase
    .from('customers')
    .update(updatedCustomer)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError || !customer) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to update customer' },
      { status: 500 }
    )
  }

  return NextResponse.json({ customer })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Check if customer is referenced by any invoices
  const { data: invoices, error: checkError } = await supabase
    .from('invoices')
    .select('id')
    .eq('customer_id', id)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (checkError) {
    return NextResponse.json(
      { error: `Failed to check customer references: ${checkError.message}` },
      { status: 500 }
    )
  }

  if (invoices && invoices.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete customer: customer is referenced by existing invoices' },
      { status: 400 }
    )
  }

  // Delete customer
  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Customer deleted successfully' })
}

