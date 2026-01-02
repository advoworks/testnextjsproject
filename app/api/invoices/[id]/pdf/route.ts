import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { generateInvoicePDF } from '@/lib/invoicing/invoice-pdf'
import { generateAndUploadInvoicePDF } from '@/lib/invoicing/invoice-pdf-storage'

// Disable caching for this route - PDFs can be regenerated and should always be fresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
 * 
 * Cache Control:
 * - Uses ETag based on pdf_generated_at timestamp
 * - Supports conditional requests (If-None-Match)
 * - Short cache time (60s) with must-revalidate for draft invoices
 * - Ensures browsers fetch fresh PDFs after regeneration
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
    .select('id, tenant_id, pdf_url, pdf_generated_at')
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
        
        // Create cache headers with ETag and Last-Modified based on pdf_generated_at
        // This allows browsers to revalidate when PDF is regenerated
        const headers: HeadersInit = {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
        }
        
        // Add ETag, Last-Modified, and cache control for proper cache validation
        if (invoice.pdf_generated_at) {
          // Use pdf_generated_at as ETag (wrapped in quotes as per HTTP spec)
          const etag = `"${invoice.pdf_generated_at}"`
          headers['ETag'] = etag
          
          // Add Last-Modified header for additional cache validation
          const lastModified = new Date(invoice.pdf_generated_at).toUTCString()
          headers['Last-Modified'] = lastModified
          
          // Check if client has matching ETag (304 Not Modified)
          const ifNoneMatch = request.headers.get('If-None-Match')
          if (ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304, headers })
          }
          
          // Check If-Modified-Since header
          const ifModifiedSince = request.headers.get('If-Modified-Since')
          if (ifModifiedSince) {
            const clientDate = new Date(ifModifiedSince)
            const serverDate = new Date(invoice.pdf_generated_at)
            if (serverDate <= clientDate) {
              return new NextResponse(null, { status: 304, headers })
            }
          }
          
          // Use short cache with must-revalidate to ensure fresh PDFs after regeneration
          headers['Cache-Control'] = 'private, must-revalidate, max-age=60' // 1 minute cache, must revalidate
        } else {
          // No pdf_generated_at means PDF might be stale, use no-cache
          headers['Cache-Control'] = 'private, no-cache, must-revalidate'
        }
        
        return new NextResponse(new Uint8Array(arrayBuffer), { headers })
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
    const headers: HeadersInit = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
      'Cache-Control': 'private, no-cache, must-revalidate', // No cache for on-demand generated PDFs
    }
    
    // If invoice has pdf_generated_at, add ETag
    if (invoice.pdf_generated_at) {
      headers['ETag'] = `"${invoice.pdf_generated_at}"`
    }
    
    return new NextResponse(new Uint8Array(pdfBuffer), { headers })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

