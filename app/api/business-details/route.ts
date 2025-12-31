import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  const { data: businessDetails, error } = await supabase
    .from('tenant_business_details')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    // If not found, return empty object (business details are optional)
    if (error.code === 'PGRST116') {
      return NextResponse.json({ business_details: null })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ business_details: businessDetails })
}

export async function PUT(request: Request) {
  // Handle FormData for file uploads
  const formData = await request.formData()
  const business_name = formData.get('business_name') as string
  const logo = formData.get('logo') as File | null
  const tenant_id = formData.get('tenant_id') as string | null
  
  // Create a body object for requireTenantForApi (it expects tenant_id for service role key auth)
  const bodyForAuth = tenant_id ? { tenant_id } : undefined
  const authResult = await requireTenantForApi(request, bodyForAuth)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Validate required fields
  if (!business_name) {
    return NextResponse.json(
      { error: 'business_name is required' },
      { status: 400 }
    )
  }

  // Handle logo upload if provided
  let logoUrl: string | null = null
  if (logo && logo.size > 0) {
    const fileExt = logo.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${tenantId}/logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('receipts') // Using receipts bucket, could be separate logos bucket
      .upload(filePath, logo)

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload logo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    logoUrl = filePath
  }

  // Get existing logo URL if not uploading new one
  const { data: existing } = await supabase
    .from('tenant_business_details')
    .select('logo_url')
    .eq('tenant_id', tenantId)
    .single()

  if (existing && !logoUrl) {
    logoUrl = existing.logo_url
  }

  const address_line1 = formData.get('address_line1') as string
  const address_line2 = formData.get('address_line2') as string
  const city = formData.get('city') as string
  const state_province = formData.get('state_province') as string
  const postal_code = formData.get('postal_code') as string
  const country = formData.get('country') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const website = formData.get('website') as string
  const tax_id = formData.get('tax_id') as string
  const registration_number = formData.get('registration_number') as string
  const bank_name = formData.get('bank_name') as string
  const bank_account_number = formData.get('bank_account_number') as string
  const bank_routing_number = formData.get('bank_routing_number') as string
  const notes = formData.get('notes') as string

  // Check if business details already exist (we already fetched logo_url above)
  const { data: existingCheck } = await supabase
    .from('tenant_business_details')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  let businessDetails

  if (existingCheck) {
    // Update existing
    const { data, error: updateError } = await supabase
      .from('tenant_business_details')
      .update({
        business_name,
        logo_url: logoUrl !== undefined ? logoUrl : undefined,
        address_line1: address_line1 !== undefined ? address_line1 : undefined,
        address_line2: address_line2 !== undefined ? address_line2 : undefined,
        city: city !== undefined ? city : undefined,
        state_province: state_province !== undefined ? state_province : undefined,
        postal_code: postal_code !== undefined ? postal_code : undefined,
        country: country !== undefined ? country : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        website: website !== undefined ? website : undefined,
        tax_id: tax_id !== undefined ? tax_id : undefined,
        registration_number: registration_number !== undefined ? registration_number : undefined,
        bank_name: bank_name !== undefined ? bank_name : undefined,
        bank_account_number: bank_account_number !== undefined ? bank_account_number : undefined,
        bank_routing_number: bank_routing_number !== undefined ? bank_routing_number : undefined,
        notes: notes !== undefined ? notes : undefined,
      })
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update business details' },
        { status: 500 }
      )
    }

    businessDetails = data
  } else {
    // Create new
    const { data, error: createError } = await supabase
      .from('tenant_business_details')
      .insert({
        tenant_id: tenantId,
        business_name,
        logo_url: logoUrl,
        address_line1: address_line1 || null,
        address_line2: address_line2 || null,
        city: city || null,
        state_province: state_province || null,
        postal_code: postal_code || null,
        country: country || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        tax_id: tax_id || null,
        registration_number: registration_number || null,
        bank_name: bank_name || null,
        bank_account_number: bank_account_number || null,
        bank_routing_number: bank_routing_number || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (createError || !data) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create business details' },
        { status: 500 }
      )
    }

    businessDetails = data
  }

  return NextResponse.json({ business_details: businessDetails })
}

