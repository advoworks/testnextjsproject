import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'

/**
 * POST /api/invoices/[id]/regenerate-pdf
 * 
 * Manually regenerates the PDF for a draft invoice.
 * Only works for draft invoices - issued/sent/paid invoices cannot be regenerated (audit integrity).
 * 
 * This endpoint:
 * 1. Verifies invoice is a draft
 * 2. Generates new PDF
 * 3. Uploads to storage (overwrites existing)
 * 4. Updates pdf_url and pdf_generated_at
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Extract tenant_id from query parameters for service role key auth
  const { searchParams } = new URL(request.url)
  const tenantIdFromQuery = searchParams.get('tenant_id')
  const bodyForAuth = tenantIdFromQuery ? { tenant_id: tenantIdFromQuery } : undefined

  const authResult = await requireTenantForApi(request, bodyForAuth)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase, tenantId } = authResult

  // Verify invoice exists and user has access
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, tenant_id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json(
      { error: fetchError?.message || 'Invoice not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  // Only allow regeneration for draft invoices
  if (invoice.status !== 'draft') {
    return NextResponse.json(
      { 
        error: `Cannot regenerate PDF for ${invoice.status} invoices. PDF regeneration is only allowed for draft invoices to maintain audit integrity.` 
      },
      { status: 400 }
    )
  }

  // Generate and upload PDF
  const pdfPath = await generateAndUploadInvoicePDF(id, supabase)

  if (!pdfPath) {
    return NextResponse.json(
      { error: 'Failed to generate or upload PDF' },
      { status: 500 }
    )
  }

  // Update invoice with PDF path and generation timestamp
  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({ 
      pdf_url: pdfPath,
      pdf_generated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updatedInvoice) {
    return NextResponse.json(
      { error: updateError?.message || 'Failed to update invoice with PDF path' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    pdf_path: pdfPath,
    pdf_generated_at: updatedInvoice.pdf_generated_at,
    invoice: updatedInvoice,
  })
}

