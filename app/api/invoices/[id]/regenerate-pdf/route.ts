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
  const timestamp = new Date().toISOString()
  const { id } = await params

  console.log(`[${timestamp}] [Regenerate PDF] 🚀 POST /api/invoices/${id}/regenerate-pdf called`)

  try {
    // Extract tenant_id from query parameters for service role key auth
    const { searchParams } = new URL(request.url)
    const tenantIdFromQuery = searchParams.get('tenant_id')
    const bodyForAuth = tenantIdFromQuery ? { tenant_id: tenantIdFromQuery } : undefined

    const authResult = await requireTenantForApi(request, bodyForAuth)
    if (authResult instanceof NextResponse) {
      console.log(`[${new Date().toISOString()}] [Regenerate PDF] ❌ Authentication failed for invoice ${id}`)
      return authResult
    }

    const { supabase, tenantId } = authResult
    console.log(`[${new Date().toISOString()}] [Regenerate PDF] ✅ Authenticated, tenant_id: ${tenantId}`)

    // Verify invoice exists and user has access
    console.log(`[${new Date().toISOString()}] [Regenerate PDF] 🔍 Fetching invoice ${id}...`)
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, tenant_id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !invoice) {
      console.log(`[${new Date().toISOString()}] [Regenerate PDF] ❌ Invoice not found: ${fetchError?.message || 'No invoice returned'}`)
      return NextResponse.json(
        { error: fetchError?.message || 'Invoice not found' },
        { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
      )
    }

    console.log(`[${new Date().toISOString()}] [Regenerate PDF] 📋 Invoice found: status=${invoice.status}, tenant_id=${invoice.tenant_id}`)

    // Only allow regeneration for draft invoices
    if (invoice.status !== 'draft') {
      console.log(`[${new Date().toISOString()}] [Regenerate PDF] ❌ Cannot regenerate PDF for ${invoice.status} invoice (only drafts allowed)`)
      return NextResponse.json(
        { 
          error: `Cannot regenerate PDF for ${invoice.status} invoices. PDF regeneration is only allowed for draft invoices to maintain audit integrity.` 
        },
        { status: 400 }
      )
    }

    // Generate and upload PDF
    console.log(`[${new Date().toISOString()}] [Regenerate PDF] 📄 Starting PDF generation for invoice ${id}...`)
    const pdfPath = await generateAndUploadInvoicePDF(id, supabase)

    if (!pdfPath) {
      console.log(`[${new Date().toISOString()}] [Regenerate PDF] ❌ PDF generation/upload failed for invoice ${id}`)
      return NextResponse.json(
        { error: 'Failed to generate or upload PDF' },
        { status: 500 }
      )
    }

    console.log(`[${new Date().toISOString()}] [Regenerate PDF] ✅ PDF generated and uploaded: ${pdfPath}`)

    // Update invoice with PDF path and generation timestamp
    console.log(`[${new Date().toISOString()}] [Regenerate PDF] 💾 Updating invoice record with PDF path...`)
    const pdfGeneratedAt = new Date().toISOString()
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({ 
        pdf_url: pdfPath,
        pdf_generated_at: pdfGeneratedAt
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updatedInvoice) {
      console.log(`[${new Date().toISOString()}] [Regenerate PDF] ❌ Failed to update invoice: ${updateError?.message || 'No invoice returned'}`)
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update invoice with PDF path' },
        { status: 500 }
      )
    }

    console.log(`[${new Date().toISOString()}] [Regenerate PDF] ✅ Successfully regenerated PDF for invoice ${id}`)
    return NextResponse.json({
      success: true,
      pdf_path: pdfPath,
      pdf_generated_at: updatedInvoice.pdf_generated_at,
      invoice: updatedInvoice,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Regenerate PDF] ❌ Unexpected error:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate PDF' },
      { status: 500 }
    )
  }
}

