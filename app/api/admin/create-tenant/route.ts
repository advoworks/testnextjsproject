import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/utils'

export async function POST(request: Request) {
  await requireAdmin()
  const supabase = await createClient()

  const body = await request.json()
  const { name, email } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name,
      email,
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

