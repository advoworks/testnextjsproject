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
  const { email, password, fullName, tenantId, mobileNumber } = body

  if (!email || !password || !fullName || !tenantId) {
    return NextResponse.json(
      { error: 'email, password, fullName, and tenantId are required' },
      { status: 400 }
    )
  }

  // Use the authenticated supabase client (which is an admin client if service role key was used)
  // This allows us to create users and bypass RLS
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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

  // Create tenant user (bypasses RLS if service role key was used)
  const { error: userError } = await supabase.from('tenant_users').insert({
    id: authData.user.id,
    tenant_id: tenantId,
    email,
    full_name: fullName,
    role: 'owner',
    mobile_number: mobileNumber || null,
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: authData.user.id })
}

