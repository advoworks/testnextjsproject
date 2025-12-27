import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/utils'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Check admin authorization (supports both service role key and cookie-based auth)
  const authResult = await requireAdminForApi(request)
  if (authResult instanceof NextResponse) {
    // Return error response if not authorized
    return authResult
  }

  const body = await request.json()
  const { email, password, fullName, tenantId, mobileNumber, country, timezone, currency } = body

  if (!email || !password || !fullName || !tenantId) {
    return NextResponse.json(
      { error: 'email, password, fullName, and tenantId are required' },
      { status: 400 }
    )
  }

  // Always use admin client for creating users (requires service role key)
  // This is necessary because auth.admin.createUser() only works with service role key
  const adminClient = createAdminClient()

  // Create auth user using admin client (requires service role key)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || 'Failed to create user' },
      { status: 500 }
    )
  }

  // Create tenant user using admin client (bypasses RLS)
  const { error: userError } = await adminClient.from('tenant_users').insert({
    id: authData.user.id,
    tenant_id: tenantId,
    email,
    full_name: fullName,
    role: 'owner',
    mobile_number: mobileNumber || null,
    country: country || null,
    timezone: timezone || null,
    currency: currency || null,
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: authData.user.id })
}

