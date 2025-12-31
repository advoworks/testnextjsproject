import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'

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

  const { data: delivery, error } = await supabase
    .from('document_deliveries')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !delivery) {
    return NextResponse.json(
      { error: error?.message || 'Delivery not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ delivery })
}

