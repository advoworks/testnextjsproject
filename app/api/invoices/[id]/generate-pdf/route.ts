import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Extract tenant_id from query parameters for GET requests
  // This is needed when using service role key authentication (N8N/automated tools)
  const { searchParams } = new URL(request.url)
  const tenantIdFromQuery = searchParams.get('tenant_id')

  // Create a body-like object for requireTenantForApi
  // - If tenant_id is in query params: pass it (for service role key auth)
  // - If not in query params: pass undefined (will use cookie-based auth)
  const bodyForAuth = tenantIdFromQuery ? { tenant_id: tenantIdFromQuery } : undefined

  const authResult = await requireTenantForApi(request, bodyForAuth)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Verify invoice exists and user has access
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json(
      { error: fetchError?.message || 'Invoice not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  // Generate and upload PDF
  const pdfUrl = await generateAndUploadInvoicePDF(id, supabase)

  if (!pdfUrl) {
    return NextResponse.json(
      { error: 'Failed to generate or upload PDF' },
      { status: 500 }
    )
  }

  // Update invoice with PDF URL
  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({ pdf_url: pdfUrl })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updatedInvoice) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to update invoice with PDF URL' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    pdf_url: pdfUrl,
    invoice: updatedInvoice,
  })
}

