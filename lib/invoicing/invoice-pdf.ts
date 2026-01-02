import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateInvoiceHTML } from './pdf-generator'
import { convertHTMLToPDF } from './gotenberg-client'
import type { Invoice, Customer, TenantBusinessDetails, InvoiceLineItem } from '@/lib/db/types'

/**
 * Generates PDF for an invoice
 * Fetches all required data and generates PDF on-demand
 * 
 * @param invoiceId - The invoice ID
 * @param supabaseClient - Optional Supabase client (if not provided, creates a new one)
 * @returns Promise<Buffer> - The PDF buffer
 */
export async function generateInvoicePDF(
  invoiceId: string,
  supabaseClient?: SupabaseClient
): Promise<Buffer> {
  // Use provided client or create one (for backward compatibility)
  const supabase = supabaseClient || await createClient()

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invoiceError || !invoice) {
    throw new Error(`Invoice not found: ${invoiceError?.message || 'Unknown error'}`)
  }

  // Fetch line items
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  if (lineItemsError) {
    throw new Error(`Failed to fetch line items: ${lineItemsError.message}`)
  }

  if (!lineItems || lineItems.length === 0) {
    throw new Error('Invoice has no line items')
  }

  // Fetch customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', invoice.customer_id)
    .single()

  if (customerError || !customer) {
    throw new Error(`Customer not found: ${customerError?.message || 'Unknown error'}`)
  }

  // Fetch tenant business details
  const { data: tenantBusinessDetails, error: businessDetailsError } = await supabase
    .from('tenant_business_details')
    .select('*')
    .eq('tenant_id', invoice.tenant_id)
    .single()

  if (businessDetailsError || !tenantBusinessDetails) {
    // Business details are optional, create a minimal one if not found
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, email')
      .eq('id', invoice.tenant_id)
      .single()

    const minimalBusinessDetails: TenantBusinessDetails = {
      id: '',
      tenant_id: invoice.tenant_id,
      business_name: tenant?.name || 'Business',
      logo_url: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state_province: null,
      postal_code: null,
      country: null,
      phone: null,
      email: tenant?.email || null,
      website: null,
      tax_id: null,
      registration_number: null,
      bank_name: null,
      bank_account_number: null,
      bank_routing_number: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Generate HTML
    const html = await generateInvoiceHTML({
      invoice: invoice as Invoice,
      customer: customer as Customer,
      tenantBusinessDetails: minimalBusinessDetails,
      lineItems: lineItems as InvoiceLineItem[],
    })

    // Convert to PDF
    return convertHTMLToPDF(html)
  }

  // Generate HTML with all data
  const html = await generateInvoiceHTML({
    invoice: invoice as Invoice,
    customer: customer as Customer,
    tenantBusinessDetails: tenantBusinessDetails as TenantBusinessDetails,
    lineItems: lineItems as InvoiceLineItem[],
  })

  // Convert to PDF
  return convertHTMLToPDF(html)
}

