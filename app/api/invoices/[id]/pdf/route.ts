import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { generateInvoicePDF } from '@/lib/invoicing/invoice-pdf'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'

/**
 * GET /api/invoices/[id]/pdf
 * 
 * Serves invoice PDFs via proxy endpoint that respects RLS policies.
 * 
 * Flow:
 * 1. Authenticates user (via JWT in cookies or Authorization header)
 * 2. Verifies user has access to the invoice (RLS enforced)
 * 3. Checks if PDF exists in storage (using pdf_url/path from database)
 * 4. If exists: Downloads from storage and serves (RLS enforced via authenticated client)
 * 5. If not exists: Generates PDF on-demand, uploads to storage, then serves
 * 
 * This approach:
 * - Uses RLS policies for security (enforced via JWT)
 * - Provides permanent URLs (no expiration)
 * - Works for authenticated users indefinitely
 * - Better security than signed URLs
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Extract tenant_id from query parameters for GET requests
  // This is needed when using service role key authentication (N8N/automated tools)
  // because service role key doesn't identify a specific user/tenant
  // For cookie-based auth, tenant_id is automatically determined from the authenticated user
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
  // The query requires BOTH conditions to match:
  // 1. Invoice ID matches the requested ID
  // 2. Invoice tenant_id matches the authenticated tenant
  // This ensures multi-tenant isolation - even with service role key,
  // you can only access invoices belonging to the specified tenant
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, tenant_id, pdf_url')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json(
      { error: fetchError?.message || 'Invoice not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  // pdf_url now stores the file path (e.g., "{tenant_id}/invoices/{invoice_id}.pdf")
  // If it exists, try to download from storage first
  if (invoice.pdf_url) {
    try {
      // Download PDF from storage (RLS is enforced via authenticated Supabase client)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('invoices')
        .download(invoice.pdf_url)

      if (!downloadError && fileData) {
        // Convert Blob to ArrayBuffer, then to Uint8Array
        const arrayBuffer = await fileData.arrayBuffer()
        return new NextResponse(new Uint8Array(arrayBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
            'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
          },
        })
      }

      // If download fails, log and fall through to generate on-demand
      console.warn(`[PDF Endpoint] Failed to download PDF from storage: ${downloadError?.message}, generating on-demand`)
    } catch (error) {
      console.error(`[PDF Endpoint] Error downloading PDF:`, error)
      // Fall through to generate on-demand
    }
  }

  // PDF doesn't exist in storage or download failed - generate on-demand
  try {
    console.log(`[PDF Endpoint] Generating PDF on-demand for invoice ${id}`)
    const pdfBuffer = await generateInvoicePDF(id, supabase)

    // Upload to storage (non-blocking - don't fail the request if upload fails)
    ;(async () => {
      try {
        const filePath = await generateAndUploadInvoicePDF(id, supabase)
        if (filePath) {
          // Update invoice with file path and generation timestamp
          try {
            await supabase
              .from('invoices')
              .update({ 
                pdf_url: filePath,
                pdf_generated_at: new Date().toISOString()
              })
              .eq('id', id)
            console.log(`[PDF Endpoint] PDF path updated for invoice ${id}`)
          } catch (error) {
            console.error(`[PDF Endpoint] Failed to update PDF path:`, error)
          }
        }
      } catch (error) {
        console.error(`[PDF Endpoint] Failed to upload PDF:`, error)
      }
    })()

    // Return PDF with proper headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

