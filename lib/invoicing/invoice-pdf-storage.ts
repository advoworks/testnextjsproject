import type { SupabaseClient } from '@supabase/supabase-js'
import { generateInvoicePDF } from './invoice-pdf'

/**
 * Generates PDF for an invoice and uploads it to Supabase Storage
 * Returns the storage file path (not a URL) for accessing the PDF via proxy endpoint
 * 
 * @param invoiceId - The invoice ID
 * @param supabaseClient - Authenticated Supabase client
 * @returns Promise<string | null> - Storage file path (e.g., "{tenant_id}/invoices/{invoice_id}.pdf"), or null if generation/upload failed
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

    console.log(`[PDF Storage] Upload successful, file path: ${filePath}`)
    // Return the file path instead of a signed URL
    // The path will be used to access the file via the proxy endpoint which respects RLS
    // Note: pdf_generated_at should be set by the caller when updating the invoice
    return filePath
  } catch (error) {
    // Log error but don't throw - PDF generation is non-blocking
    console.error(`[PDF Storage] Unexpected error:`, error)
    return null
  }
}

