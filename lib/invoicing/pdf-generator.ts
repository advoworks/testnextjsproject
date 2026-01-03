import type { Invoice, Customer, TenantBusinessDetails, InvoiceLineItem } from '@/lib/db/types'
import { createClient } from '@/lib/supabase/server'

type InvoiceData = {
  invoice: Invoice
  customer: Customer
  tenantBusinessDetails: TenantBusinessDetails
  lineItems: InvoiceLineItem[]
  logoBase64?: string | null
}

/**
 * Fetches logo from Supabase Storage and converts to base64
 */
async function getLogoAsBase64(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null

  try {
    const supabase = await createClient()
    
    // Extract path from logo_url (format: tenant_id/logos/filename)
    const { data, error } = await supabase.storage
      .from('receipts') // Using receipts bucket, could be separate logos bucket
      .download(logoUrl)

    if (error || !data) {
      console.error('Failed to fetch logo:', error)
      return null
    }

    // Convert blob to base64
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mimeType = data.type || 'image/png'
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Error converting logo to base64:', error)
    return null
  }
}

/**
 * Formats currency amount (without currency symbol)
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Gets currency symbol for display
 */
function getCurrencySymbol(currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    SGD: 'S$',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    NZD: 'NZ$',
    HKD: 'HK$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
  }
  return currencySymbols[currency] || currency
}

/**
 * Formats date
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Generates invoice HTML template
 */
export async function generateInvoiceHTML(data: InvoiceData): Promise<string> {
  const { invoice, customer, tenantBusinessDetails, lineItems } = data
  
  // Get logo as base64 if available
  const logoBase64 = data.logoBase64 || await getLogoAsBase64(tenantBusinessDetails.logo_url)

  // Status badge colors
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    draft: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    issued: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    sent: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    paid: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    voided: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  }
  const statusConfig = statusColors[invoice.status] || statusColors.draft
  const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)

  // Full business address
  const businessAddressParts = [
    tenantBusinessDetails.address_line1,
    tenantBusinessDetails.address_line2,
    tenantBusinessDetails.city && tenantBusinessDetails.state_province 
      ? `${tenantBusinessDetails.city}, ${tenantBusinessDetails.state_province} ${tenantBusinessDetails.postal_code || ''}`.trim()
      : tenantBusinessDetails.city || tenantBusinessDetails.state_province,
    tenantBusinessDetails.country,
  ].filter(Boolean)

  // Full customer address
  const customerAddressParts = [
    customer.address_line1,
    customer.address_line2,
    customer.city && customer.state_province 
      ? `${customer.city}, ${customer.state_province} ${customer.postal_code || ''}`.trim()
      : customer.city || customer.state_province,
    customer.country,
  ].filter(Boolean)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number || 'Draft'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #333;
      padding: 24px;
      background: #fff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .row-1 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .row-1-left {
      display: flex;
      align-items: flex-start;
    }
    .logo {
      max-width: 150px;
      max-height: 80px;
      object-fit: contain;
    }
    .row-1-right {
      text-align: right;
    }
    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      color: #111;
      margin-bottom: 16px;
    }
    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 20px;
    }
    .business-details-section, .customer-details-section {
      font-size: 12px;
      line-height: 1.6;
      color: #333;
    }
    .business-name, .customer-name {
      font-size: 16px;
      font-weight: bold;
      color: #111;
      margin-bottom: 8px;
    }
    .business-address, .customer-address {
      color: #666;
      margin-bottom: 6px;
    }
    .business-contact, .customer-contact {
      color: #666;
      margin-bottom: 6px;
    }
    .business-ids, .customer-ids {
      color: #666;
      margin-top: 6px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: ${statusConfig.bg};
      color: ${statusConfig.text};
      border: 1px solid ${statusConfig.border};
    }
    .invoice-details-section {
      text-align: right;
    }
    .info-section {
      margin-bottom: 10px;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 3px;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      color: #111;
      font-weight: 500;
    }
    .status-section {
      margin-top: 12px;
    }
    .status-label-text {
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    thead {
      background-color: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    th {
      padding: 10px 8px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    th:first-child {
      padding-left: 12px;
    }
    th:last-child {
      padding-right: 12px;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    td:first-child {
      padding-left: 12px;
    }
    td:last-child {
      padding-right: 12px;
    }
    .text-right {
      text-align: right;
    }
    tfoot {
      background-color: #f9fafb;
    }
    tfoot td {
      border-top: 2px solid #e5e7eb;
      border-bottom: none;
      padding: 12px 8px;
      font-weight: 500;
    }
    tfoot td:first-child {
      text-align: right;
      padding-right: 12px;
    }
    tfoot td:last-child {
      padding-right: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
    }
    .total-row.subtotal {
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 4px;
    }
    .total-row.tax {
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
    }
    .total-row.total {
      border-top: 2px solid #111;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 16px;
      font-weight: bold;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #666;
      line-height: 1.6;
    }
    .footer-section {
      margin-bottom: 12px;
    }
    .footer-title {
      font-weight: 600;
      color: #111;
      margin-bottom: 4px;
    }
    .payment-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    .currency-label {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #666;
      font-style: italic;
    }
    .voided-banner {
      background-color: #fee2e2;
      color: #991b1b;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 16px;
      border: 2px solid #fecaca;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${invoice.status === 'voided' ? `
    <div class="voided-banner">
      ⚠️ THIS INVOICE HAS BEEN VOIDED
      ${invoice.void_reason ? `<br><small>Reason: ${invoice.void_reason}</small>` : ''}
    </div>
    ` : ''}
    
    <!-- Row 1: Logo (left) | Invoice Title + Details + Status (right) -->
    <div class="row-1">
      <div class="row-1-left">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : ''}
      </div>
      <div class="row-1-right">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-details-section">
          <div class="info-section">
            <div class="info-label">Invoice Number</div>
            <div class="info-value">${invoice.invoice_number || 'Draft'}</div>
          </div>
          <div class="info-section">
            <div class="info-label">Invoice Date</div>
            <div class="info-value">${formatDate(invoice.invoice_date)}</div>
          </div>
          ${invoice.due_date ? `
          <div class="info-section">
            <div class="info-label">Due Date</div>
            <div class="info-value">${formatDate(invoice.due_date)}</div>
          </div>
          ` : ''}
          <div class="status-section">
            <div class="status-label-text">Invoice Status</div>
            <div class="status-badge">${statusLabel}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Business Details (left) | Customer Details (right) -->
    <div class="row-2">
      <div class="business-details-section">
        <div class="business-name">${tenantBusinessDetails.business_name || 'Business Name'}</div>
        <div class="business-address">
          ${businessAddressParts.map(part => `${part}`).join('<br>')}
        </div>
        <div class="business-contact">
          ${tenantBusinessDetails.phone ? `Phone: ${tenantBusinessDetails.phone}` : ''}
          ${tenantBusinessDetails.phone && tenantBusinessDetails.email ? '<br>' : ''}
          ${tenantBusinessDetails.email ? `Email: ${tenantBusinessDetails.email}` : ''}
          ${(tenantBusinessDetails.phone || tenantBusinessDetails.email) && tenantBusinessDetails.website ? '<br>' : ''}
          ${tenantBusinessDetails.website ? `Website: ${tenantBusinessDetails.website}` : ''}
        </div>
        <div class="business-ids">
          ${tenantBusinessDetails.tax_id ? `Tax ID: ${tenantBusinessDetails.tax_id}` : ''}
          ${tenantBusinessDetails.tax_id && tenantBusinessDetails.registration_number ? '<br>' : ''}
          ${tenantBusinessDetails.registration_number ? `Registration: ${tenantBusinessDetails.registration_number}` : ''}
        </div>
      </div>

      <div class="customer-details-section">
        <div class="customer-name">Bill To:</div>
        <div class="customer-name" style="margin-top: 0; margin-bottom: 8px;">${customer.name}</div>
        <div class="customer-address">
          ${customerAddressParts.map(part => `${part}`).join('<br>')}
        </div>
        <div class="customer-contact">
          ${customer.phone ? `Phone: ${customer.phone}` : ''}
          ${customer.phone && customer.email ? '<br>' : ''}
          ${customer.email ? `Email: ${customer.email}` : ''}
        </div>
        <div class="customer-ids">
          ${customer.tax_id ? `Tax ID: ${customer.tax_id}` : ''}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 45%;">Description</th>
          <th class="text-right" style="width: 12%;">Quantity</th>
          <th class="text-right" style="width: 18%;">Unit Price</th>
          <th class="text-right" style="width: 20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.unit_price, invoice.currency)}</td>
          <td class="text-right">${formatCurrency(item.line_total, invoice.currency)}</td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"></td>
          <td class="text-right"><strong>Subtotal</strong></td>
          <td class="text-right"><strong>${formatCurrency(invoice.subtotal, invoice.currency)}</strong></td>
        </tr>
        ${invoice.tax_amount > 0 ? `
        <tr>
          <td colspan="3"></td>
          <td class="text-right"><strong>Tax</strong></td>
          <td class="text-right"><strong>${formatCurrency(invoice.tax_amount, invoice.currency)}</strong></td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="3"></td>
          <td class="text-right" style="font-size: 15px; padding-top: 16px;"><strong>Total</strong></td>
          <td class="text-right" style="font-size: 15px; padding-top: 16px;"><strong>${formatCurrency(invoice.total_amount, invoice.currency)}</strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="footer">
      ${invoice.terms ? `
      <div class="footer-section">
        <div class="footer-title">Payment Terms</div>
        <div>${invoice.terms}</div>
      </div>
      ` : ''}
      
      ${tenantBusinessDetails.bank_name || tenantBusinessDetails.bank_account_number ? `
      <div class="footer-section">
        <div class="footer-title">Payment Instructions</div>
        <div class="payment-details">
          ${tenantBusinessDetails.bank_name ? `
          <div>
            <strong>Bank:</strong> ${tenantBusinessDetails.bank_name}<br>
            ${tenantBusinessDetails.bank_account_number ? `<strong>Account:</strong> ${tenantBusinessDetails.bank_account_number}<br>` : ''}
            ${tenantBusinessDetails.bank_routing_number ? `<strong>Routing:</strong> ${tenantBusinessDetails.bank_routing_number}` : ''}
          </div>
          ` : ''}
          ${tenantBusinessDetails.email || tenantBusinessDetails.phone ? `
          <div>
            ${tenantBusinessDetails.email ? `<strong>Email:</strong> ${tenantBusinessDetails.email}<br>` : ''}
            ${tenantBusinessDetails.phone ? `<strong>Phone:</strong> ${tenantBusinessDetails.phone}` : ''}
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      ${tenantBusinessDetails.tax_id || tenantBusinessDetails.registration_number ? `
      <div class="footer-section">
        <div>
          ${tenantBusinessDetails.tax_id ? `<strong>Tax ID:</strong> ${tenantBusinessDetails.tax_id}` : ''}
          ${tenantBusinessDetails.tax_id && tenantBusinessDetails.registration_number ? ' • ' : ''}
          ${tenantBusinessDetails.registration_number ? `<strong>Registration:</strong> ${tenantBusinessDetails.registration_number}` : ''}
        </div>
      </div>
      ` : ''}
      
      ${tenantBusinessDetails.notes ? `
      <div class="footer-section">
        <div>${tenantBusinessDetails.notes}</div>
      </div>
      ` : ''}
      
      <div class="currency-label">
        All amounts are in ${invoice.currency} (${getCurrencySymbol(invoice.currency)})
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  return html
}

