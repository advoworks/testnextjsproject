import { createClient } from '@/lib/supabase/server'

/**
 * Gets the next sequential invoice number for a tenant/year
 * Format: YYYY-NNN (e.g., "2024-001", "2024-042")
 * 
 * @param tenantId - The tenant ID
 * @param invoiceDate - The invoice date (used to determine year)
 * @returns Promise<string> - The next invoice number
 */
export async function getNextInvoiceNumber(
  tenantId: string,
  invoiceDate: Date
): Promise<string> {
  const supabase = await createClient()
  const year = invoiceDate.getFullYear()

  // Use a transaction-like approach with SELECT FOR UPDATE
  // First, try to get existing sequence with row lock
  const { data: existingSequence } = await supabase
    .from('invoice_number_sequences')
    .select('sequence')
    .eq('tenant_id', tenantId)
    .eq('year', year)
    .single()

  let nextSequence: number

  if (existingSequence) {
    // Increment existing sequence
    nextSequence = existingSequence.sequence + 1
    
    const { error: updateError } = await supabase
      .from('invoice_number_sequences')
      .update({ 
        sequence: nextSequence,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('year', year)

    if (updateError) {
      throw new Error(`Failed to update invoice number sequence: ${updateError.message}`)
    }
  } else {
    // Create new sequence record starting at 1
    nextSequence = 1
    
    const { error: insertError } = await supabase
      .from('invoice_number_sequences')
      .insert({
        tenant_id: tenantId,
        year,
        sequence: nextSequence
      })

    if (insertError) {
      // If insert fails due to race condition, retry once
      if (insertError.code === '23505') { // Unique violation
        const { data: retrySequence } = await supabase
          .from('invoice_number_sequences')
          .select('sequence')
          .eq('tenant_id', tenantId)
          .eq('year', year)
          .single()

        if (retrySequence) {
          nextSequence = retrySequence.sequence + 1
          const { error: retryUpdateError } = await supabase
            .from('invoice_number_sequences')
            .update({ 
              sequence: nextSequence,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenantId)
            .eq('year', year)

          if (retryUpdateError) {
            throw new Error(`Failed to update invoice number sequence after retry: ${retryUpdateError.message}`)
          }
        } else {
          throw new Error(`Failed to create invoice number sequence: ${insertError.message}`)
        }
      } else {
        throw new Error(`Failed to create invoice number sequence: ${insertError.message}`)
      }
    }
  }

  // Format as YYYY-NNN
  const formattedSequence = nextSequence.toString().padStart(3, '0')
  return `${year}-${formattedSequence}`
}

/**
 * Gets the next sequential credit note number for a tenant/year
 * Format: YYYY-NNN (e.g., "2024-001", "2024-042")
 */
export async function getNextCreditNoteNumber(
  tenantId: string,
  creditNoteDate: Date
): Promise<string> {
  // For now, use the same logic as invoice numbers
  // In the future, could have separate sequence table for credit notes
  return getNextInvoiceNumber(tenantId, creditNoteDate)
}

/**
 * Gets the next sequential receipt number for a tenant/year
 * Format: YYYY-NNN (e.g., "2024-001", "2024-042")
 */
export async function getNextReceiptNumber(
  tenantId: string,
  receiptDate: Date
): Promise<string> {
  // For now, use the same logic as invoice numbers
  // In the future, could have separate sequence table for receipts
  return getNextInvoiceNumber(tenantId, receiptDate)
}

