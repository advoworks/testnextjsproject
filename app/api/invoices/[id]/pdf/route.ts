import { NextResponse } from 'next/server'
import { requireTenantForApi } from '@/lib/auth/utils'
import { generateInvoicePDF } from '@/lib/invoicing/invoice-pdf'

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
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json(
      { error: fetchError?.message || 'Invoice not found' },
      { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
    )
  }

  try {
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(id)

    // Return PDF with proper headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

