import type { Invoice, InvoiceLineItem, InvoiceStatus, Customer, CreditNote, Receipt } from '@/lib/db/types'
import { createClient } from '@/lib/supabase/server'

/**
 * Validates invoice data
 */
export function validateInvoice(
  invoice: Partial<Invoice>,
  lineItems: InvoiceLineItem[]
): void {
  if (!invoice.customer_id) {
    throw new Error('Customer is required')
  }

  if (!invoice.invoice_date) {
    throw new Error('Invoice date is required')
  }

  if (!invoice.currency) {
    throw new Error('Currency is required')
  }

  if (!lineItems || lineItems.length === 0) {
    throw new Error('At least one line item is required')
  }

  // Validate line items
  for (const item of lineItems) {
    if (!item.description || item.description.trim() === '') {
      throw new Error('Line item description is required')
    }

    if (item.quantity <= 0) {
      throw new Error('Line item quantity must be greater than 0')
    }

    if (item.unit_price < 0) {
      throw new Error('Line item unit price must be greater than or equal to 0')
    }
  }

  // Validate due date
  if (invoice.due_date && invoice.invoice_date) {
    const invoiceDate = new Date(invoice.invoice_date)
    const dueDate = new Date(invoice.due_date)
    
    if (dueDate < invoiceDate) {
      throw new Error('Due date must be greater than or equal to invoice date')
    }
  }

  // Validate totals
  const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)
  const taxAmount = invoice.tax_amount || 0
  const calculatedTotal = calculatedSubtotal + taxAmount

  if (invoice.subtotal !== undefined && Math.abs(invoice.subtotal - calculatedSubtotal) > 0.01) {
    throw new Error(`Subtotal mismatch: expected ${calculatedSubtotal}, got ${invoice.subtotal}`)
  }

  if (invoice.total_amount !== undefined && Math.abs(invoice.total_amount - calculatedTotal) > 0.01) {
    throw new Error(`Total amount mismatch: expected ${calculatedTotal}, got ${invoice.total_amount}`)
  }
}

/**
 * Validates invoice state transition
 */
export function validateInvoiceStateTransition(
  currentStatus: InvoiceStatus,
  newStatus: InvoiceStatus
): void {
  const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ['issued', 'voided'],
    issued: ['sent', 'voided'],
    sent: ['paid'],
    paid: [], // Paid is terminal
    voided: [], // Voided is terminal
  }

  const allowedStatuses = validTransitions[currentStatus]

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(
      `Invalid state transition: cannot change from ${currentStatus} to ${newStatus}`
    )
  }
}

/**
 * Validates that invoice can be voided
 */
export async function validateInvoiceCanBeVoided(
  invoiceId: string
): Promise<void> {
  const supabase = await createClient()

  // Check if invoice has been delivered
  const { data: deliveries } = await supabase
    .from('document_deliveries')
    .select('id, status')
    .eq('document_type', 'invoice')
    .eq('document_id', invoiceId)
    .eq('status', 'sent')

  if (deliveries && deliveries.length > 0) {
    throw new Error('Cannot void invoice: invoice has been sent to customer')
  }

  // Check invoice status
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status === 'sent' || invoice.status === 'paid') {
    throw new Error(`Cannot void invoice: invoice status is ${invoice.status}`)
  }
}

/**
 * Validates void invoice request
 */
export function validateVoidInvoice(voidReason: string | null | undefined): void {
  if (!voidReason || voidReason.trim() === '') {
    throw new Error('Void reason is required when voiding an invoice')
  }
}

/**
 * Checks if document has been delivered
 */
export async function hasDocumentBeenDelivered(
  documentType: 'invoice' | 'credit_note' | 'receipt',
  documentId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: deliveries } = await supabase
    .from('document_deliveries')
    .select('id')
    .eq('document_type', documentType)
    .eq('document_id', documentId)
    .eq('status', 'sent')

  return deliveries !== null && deliveries.length > 0
}

/**
 * Validates credit note
 */
export async function validateCreditNote(
  creditNote: Partial<CreditNote>
): Promise<void> {
  if (!creditNote.invoice_id) {
    throw new Error('Invoice ID is required for credit note')
  }

  if (!creditNote.amount || creditNote.amount <= 0) {
    throw new Error('Credit note amount must be greater than 0')
  }

  if (!creditNote.reason || creditNote.reason.trim() === '') {
    throw new Error('Credit note reason is required')
  }

  if (!creditNote.credit_note_date) {
    throw new Error('Credit note date is required')
  }

  // Check invoice status and get total amount
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, status')
    .eq('id', creditNote.invoice_id)
    .single()

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Check if invoice was sent or paid (either by status or delivery record)
  if (invoice.status !== 'sent' && invoice.status !== 'paid') {
    // Also check if invoice has been delivered (might be issued but delivered)
    const hasBeenDelivered = await hasDocumentBeenDelivered('invoice', creditNote.invoice_id)
    if (!hasBeenDelivered) {
      throw new Error('Credit note can only be created for invoices that have been sent or paid')
    }
  }

  // Get total credit notes for this invoice
  const { data: existingCreditNotes } = await supabase
    .from('credit_notes')
    .select('amount')
    .eq('invoice_id', creditNote.invoice_id)

  const totalCredits = existingCreditNotes?.reduce((sum, cn) => sum + cn.amount, 0) || 0
  const outstandingAmount = invoice.total_amount - totalCredits

  if (creditNote.amount && creditNote.amount > outstandingAmount) {
    throw new Error(
      `Credit note amount (${creditNote.amount}) exceeds outstanding invoice amount (${outstandingAmount})`
    )
  }
}

/**
 * Validates receipt
 */
export async function validateReceipt(
  receipt: Partial<Receipt>
): Promise<void> {
  if (!receipt.invoice_id) {
    throw new Error('Invoice ID is required for receipt')
  }

  if (!receipt.payment_date) {
    throw new Error('Payment date is required')
  }

  if (!receipt.amount || receipt.amount <= 0) {
    throw new Error('Receipt amount must be greater than 0')
  }

  // Check if invoice exists and is paid
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status, total_amount')
    .eq('id', receipt.invoice_id)
    .single()

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status !== 'paid') {
    throw new Error('Receipt can only be created for paid invoices')
  }
}

/**
 * Validates customer
 */
export function validateCustomer(customer: Partial<Customer>): void {
  if (!customer.name || customer.name.trim() === '') {
    throw new Error('Customer name is required')
  }

  if (!customer.email && !customer.phone) {
    throw new Error('At least one contact method (email or phone) is required')
  }
}

