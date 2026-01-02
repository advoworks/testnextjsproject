import type { SupabaseClient } from '@supabase/supabase-js'
import { generateInvoicePDF } from './invoice-pdf'

/**
 * Generates PDF for an invoice and uploads it to Supabase Storage
 * Returns a signed URL for accessing the PDF (valid for 1 hour)
 * 
 * @param invoiceId - The invoice ID
 * @param supabaseClient - Authenticated Supabase client
 * @returns Promise<string | null> - Signed URL to the PDF, or null if generation/upload failed
 */
export async function generateAndUploadInvoicePDF(
  invoiceId: string,
  supabaseClient: SupabaseClient
): Promise<string | null> {
  console.log(`[PDF Storage] Starting PDF generation for invoice ${invoiceId}`)
  try {
    // First, fetch invoice to get tenant_id
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('id, tenant_id')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error(`[PDF Storage] Failed to fetch invoice: ${invoiceError?.message}`, invoiceError)
      return null
    }

    console.log(`[PDF Storage] Invoice fetched, tenant_id: ${invoice.tenant_id}`)

    // Generate PDF buffer
    console.log(`[PDF Storage] Generating PDF buffer...`)
    const pdfBuffer = await generateInvoicePDF(invoiceId, supabaseClient)
    console.log(`[PDF Storage] PDF generated, size: ${pdfBuffer.length} bytes`)

    // Define storage path: {tenant_id}/invoices/{invoice_id}.pdf
    const filePath = `${invoice.tenant_id}/invoices/${invoiceId}.pdf`
    console.log(`[PDF Storage] Uploading to path: ${filePath}`)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists (for regeneration)
      })

    if (uploadError) {
      console.error(`[PDF Storage] Upload failed:`, uploadError)
      return null
    }

    console.log(`[PDF Storage] Upload successful, generating signed URL...`)

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('invoices')
      .createSignedUrl(filePath, 3600) // 1 hour = 3600 seconds

    if (signedUrlError || !signedUrlData) {
      console.error(`[PDF Storage] Failed to generate signed URL:`, signedUrlError)
      return null
    }

    console.log(`[PDF Storage] Signed URL generated successfully: ${signedUrlData.signedUrl.substring(0, 50)}...`)
    return signedUrlData.signedUrl
  } catch (error) {
    // Log error but don't throw - PDF generation is non-blocking
    console.error(`[PDF Storage] Unexpected error:`, error)
    return null
  }
}

