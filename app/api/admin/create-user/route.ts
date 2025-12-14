import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/utils'

export async function POST(request: Request) {
  await requireAdmin()
  
  const body = await request.json()
  const { email, password, fullName, tenantId } = body

  // Create auth user using admin client with service role key
  const adminClient = createAdminClient()
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
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: authData.user.id })
}

