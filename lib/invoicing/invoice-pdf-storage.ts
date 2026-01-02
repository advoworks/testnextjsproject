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
  try {
    // First, fetch invoice to get tenant_id
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('id, tenant_id')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error(`Failed to fetch invoice for PDF generation: ${invoiceError?.message}`)
      return null
    }

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoiceId, supabaseClient)

    // Define storage path: {tenant_id}/invoices/{invoice_id}.pdf
    const filePath = `${invoice.tenant_id}/invoices/${invoiceId}.pdf`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists (for regeneration)
      })

    if (uploadError) {
      console.error(`Failed to upload PDF to storage: ${uploadError.message}`)
      return null
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('invoices')
      .createSignedUrl(filePath, 3600) // 1 hour = 3600 seconds

    if (signedUrlError || !signedUrlData) {
      console.error(`Failed to generate signed URL: ${signedUrlError?.message}`)
      return null
    }

    return signedUrlData.signedUrl
  } catch (error) {
    // Log error but don't throw - PDF generation is non-blocking
    console.error(`Error generating/uploading invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

