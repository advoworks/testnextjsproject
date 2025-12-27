import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/utils'

export async function POST(request: Request) {
  // Check admin authorization (supports both service role key and cookie-based auth)
  const authResult = await requireAdminForApi(request)
  if (authResult instanceof NextResponse) {
    // Return error response if not authorized
    return authResult
  }
  
  const { supabase } = authResult

  const body = await request.json()
  const { name, email, country, timezone, currency } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Create tenant using the authenticated supabase client
  // If service role key was used, this bypasses RLS
  // If cookie-based auth was used, RLS policies apply
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name,
      email,
      country: country || null,
      timezone: timezone || null,
      currency: currency || null,
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: tenantError?.message || 'Failed to create tenant' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, tenant })
}

