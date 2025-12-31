import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'

export async function GET(request: Request) {
  const authResult = await requireTenantForApi(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const documentType = searchParams.get('document_type')
  const documentId = searchParams.get('document_id')
  const status = searchParams.get('status')
  const deliveryChannel = searchParams.get('delivery_channel')

  let query = supabase
    .from('document_deliveries')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })

  if (documentType) {
    query = query.eq('document_type', documentType)
  }

  if (documentId) {
    query = query.eq('document_id', documentId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (deliveryChannel) {
    query = query.eq('delivery_channel', deliveryChannel)
  }

  const { data: deliveries, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deliveries: deliveries || [] })
}

