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

  // Fetch receipt with invoice details
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select(`
      *,
      invoice:invoices(*)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !receipt) {
    return NextResponse.json(
      { error: error?.message || 'Receipt not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ receipt })
}

