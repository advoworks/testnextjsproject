export type Tenant = {
  id: string
  name: string
  email: string
  country: string | null
  timezone: string | null
  currency: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export type AdminUser = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export type TenantUser = {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: string
  mobile_number: string | null
  country: string | null
  timezone: string | null
  currency: string | null
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  tenant_id: string
  amount: number
  description: string
  expense_date: string
  receipt_url: string | null
  currency: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string | null
  tax_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'voided'

export type Invoice = {
  id: string
  tenant_id: string
  customer_id: string
  invoice_number: string | null
  status: InvoiceStatus
  invoice_date: string
  due_date: string | null
  currency: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes: string | null
  terms: string | null
  pdf_url: string | null
  voided_at: string | null
  void_reason: string | null
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type InvoiceLineItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type CreditNote = {
  id: string
  tenant_id: string
  invoice_id: string
  credit_note_number: string
  amount: number
  reason: string
  credit_note_date: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Receipt = {
  id: string
  tenant_id: string
  invoice_id: string
  receipt_number: string
  payment_date: string
  payment_method: string | null
  payment_reference: string | null
  amount: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DocumentType = 'invoice' | 'credit_note' | 'receipt'
export type DeliveryChannel = 'email' | 'whatsapp' | 'download'
export type DeliveryStatus = 'sent' | 'failed'

export type DocumentDelivery = {
  id: string
  tenant_id: string
  document_type: DocumentType
  document_id: string
  delivery_channel: DeliveryChannel
  recipient: string
  sent_at: string
  provider_message_id: string | null
  status: DeliveryStatus
  error_message: string | null
  created_by: string | null
  created_at: string
}

export type InvoiceNumberSequence = {
  id: string
  tenant_id: string
  year: number
  sequence: number
  created_at: string
  updated_at: string
}

export type TenantBusinessDetails = {
  id: string
  tenant_id: string
  business_name: string
  logo_url: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  tax_id: string | null
  registration_number: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_routing_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

