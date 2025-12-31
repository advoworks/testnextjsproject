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

  // Fetch credit note with invoice details
  const { data: creditNote, error } = await supabase
    .from('credit_notes')
    .select(`
      *,
      invoice:invoices(*)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !creditNote) {
    return NextResponse.json(
      { error: error?.message || 'Credit note not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ credit_note: creditNote })
}

