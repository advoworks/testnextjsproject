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
 * Formats currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
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
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: #fff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo {
      max-width: 150px;
      max-height: 80px;
      object-fit: contain;
    }
    .business-info {
      text-align: right;
    }
    .business-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #111;
    }
    .business-details {
      font-size: 12px;
      color: #666;
      line-height: 1.8;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 40px;
      color: #111;
    }
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .invoice-info, .customer-info {
      flex: 1;
    }
    .info-section {
      margin-bottom: 20px;
    }
    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 14px;
      color: #111;
      font-weight: 500;
    }
    .customer-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background-color: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .total-row.subtotal {
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 8px;
    }
    .total-row.tax {
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }
    .total-row.total {
      border-top: 2px solid #111;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 18px;
      font-weight: bold;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
      line-height: 1.8;
    }
    .voided-banner {
      background-color: #fee2e2;
      color: #991b1b;
      padding: 16px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 20px;
      border: 2px solid #fecaca;
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
    
    <div class="header">
      <div>
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : ''}
      </div>
      <div class="business-info">
        <div class="business-name">${tenantBusinessDetails.business_name || 'Business Name'}</div>
        <div class="business-details">
          ${tenantBusinessDetails.address_line1 ? `${tenantBusinessDetails.address_line1}<br>` : ''}
          ${tenantBusinessDetails.address_line2 ? `${tenantBusinessDetails.address_line2}<br>` : ''}
          ${tenantBusinessDetails.city && tenantBusinessDetails.state_province ? `${tenantBusinessDetails.city}, ${tenantBusinessDetails.state_province} ${tenantBusinessDetails.postal_code || ''}<br>` : ''}
          ${tenantBusinessDetails.country ? `${tenantBusinessDetails.country}<br>` : ''}
          ${tenantBusinessDetails.phone ? `<br>Phone: ${tenantBusinessDetails.phone}` : ''}
          ${tenantBusinessDetails.email ? `<br>Email: ${tenantBusinessDetails.email}` : ''}
          ${tenantBusinessDetails.tax_id ? `<br>Tax ID: ${tenantBusinessDetails.tax_id}` : ''}
        </div>
      </div>
    </div>

    <div class="invoice-title">INVOICE</div>

    <div class="invoice-details">
      <div class="invoice-info">
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
      </div>

      <div class="customer-info">
        <div class="customer-name">Bill To:</div>
        <div class="business-details">
          ${customer.name}<br>
          ${customer.address_line1 ? `${customer.address_line1}<br>` : ''}
          ${customer.address_line2 ? `${customer.address_line2}<br>` : ''}
          ${customer.city && customer.state_province ? `${customer.city}, ${customer.state_province} ${customer.postal_code || ''}<br>` : ''}
          ${customer.country ? `${customer.country}<br>` : ''}
          ${customer.tax_id ? `<br>Tax ID: ${customer.tax_id}` : ''}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.unit_price, invoice.currency)}</td>
          <td class="text-right">${formatCurrency(item.line_total, invoice.currency)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row subtotal">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal, invoice.currency)}</span>
      </div>
      ${invoice.tax_amount > 0 ? `
      <div class="total-row tax">
        <span>Tax</span>
        <span>${formatCurrency(invoice.tax_amount, invoice.currency)}</span>
      </div>
      ` : ''}
      <div class="total-row total">
        <span>Total</span>
        <span>${formatCurrency(invoice.total_amount, invoice.currency)}</span>
      </div>
    </div>

    ${invoice.terms || tenantBusinessDetails.notes ? `
    <div class="footer">
      ${invoice.terms ? `<div style="margin-bottom: 12px;"><strong>Payment Terms:</strong><br>${invoice.terms}</div>` : ''}
      ${tenantBusinessDetails.notes ? `<div>${tenantBusinessDetails.notes}</div>` : ''}
    </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim()

  return html
}

