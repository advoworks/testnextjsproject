-- Invoice, Credit Note, and Receipt System Migration
-- Creates all tables for invoicing functionality with strict accounting rules

-- ============================================================================
-- 1. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT, -- ISO 3166-1 alpha-2
  tax_id TEXT, -- VAT/Tax identification number
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_number TEXT, -- year-prefixed, e.g., "2024-001", NULL for drafts
  status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'voided')) DEFAULT 'draft',
  invoice_date DATE NOT NULL,
  due_date DATE,
  currency TEXT NOT NULL, -- ISO 4217
  subtotal DECIMAL(10, 2) NOT NULL, -- sum of line items
  tax_amount DECIMAL(10, 2) DEFAULT 0, -- placeholder for future tax support
  total_amount DECIMAL(10, 2) NOT NULL, -- subtotal + tax_amount
  notes TEXT, -- internal notes, editable
  terms TEXT, -- payment terms shown on invoice
  voided_at TIMESTAMP WITH TIME ZONE,
  void_reason TEXT, -- required if voided
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL, -- quantity * unit_price, calculated
  sort_order INTEGER DEFAULT 0, -- for ordering line items
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. CREDIT NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  credit_note_number TEXT NOT NULL, -- sequential, year-prefixed
  amount DECIMAL(10, 2) NOT NULL, -- must be <= invoice outstanding amount
  reason TEXT NOT NULL,
  credit_note_date DATE NOT NULL,
  created_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, credit_note_number)
);

-- ============================================================================
-- 5. RECEIPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL, -- sequential, year-prefixed
  payment_date DATE NOT NULL,
  payment_method TEXT, -- cash, bank_transfer, credit_card, etc.
  payment_reference TEXT, -- transaction ID, check number, etc.
  amount DECIMAL(10, 2) NOT NULL, -- should match invoice total or partial payment
  notes TEXT,
  created_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, receipt_number)
);

-- ============================================================================
-- 6. DOCUMENT DELIVERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'credit_note', 'receipt')),
  document_id UUID NOT NULL, -- references invoices.id, credit_notes.id, or receipts.id
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('email', 'whatsapp', 'download')),
  recipient TEXT NOT NULL, -- email address or phone number
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  provider_message_id TEXT, -- WhatsApp/email provider message ID for tracking
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')) DEFAULT 'sent',
  error_message TEXT, -- error details if status = 'failed'
  created_by UUID REFERENCES tenant_users(id), -- who triggered the delivery
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. INVOICE NUMBER SEQUENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0, -- last used sequence number
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, year)
);

-- ============================================================================
-- 8. TENANT BUSINESS DETAILS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_business_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  logo_url TEXT, -- path in Supabase Storage
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT, -- ISO 3166-1 alpha-2
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT, -- VAT/Tax identification number
  registration_number TEXT, -- company registration number
  bank_name TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT, -- or SWIFT/BIC
  notes TEXT, -- terms and conditions, footer text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(tenant_id, invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_sort_order ON invoice_line_items(invoice_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant_id ON credit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_credit_note_number ON credit_notes(tenant_id, credit_note_number);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(tenant_id, receipt_number);

CREATE INDEX IF NOT EXISTS idx_document_deliveries_tenant_id ON document_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_deliveries_document ON document_deliveries(tenant_id, document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_document_deliveries_sent_at ON document_deliveries(tenant_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_document_deliveries_status ON document_deliveries(status);

CREATE INDEX IF NOT EXISTS idx_invoice_number_sequences_tenant_year ON invoice_number_sequences(tenant_id, year);

-- ============================================================================
-- PARTIAL UNIQUE INDEXES (for conditional uniqueness)
-- ============================================================================

-- Unique email per tenant (only when email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_email_unique 
ON customers(tenant_id, email) 
WHERE email IS NOT NULL;

-- Unique invoice number per tenant (only when invoice_number is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_invoice_number_unique 
ON invoices(tenant_id, invoice_number) 
WHERE invoice_number IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_number_sequences_updated_at BEFORE UPDATE ON invoice_number_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_business_details_updated_at BEFORE UPDATE ON tenant_business_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_business_details ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CUSTOMERS RLS POLICIES
-- ============================================================================

-- Admin users can access all customers
CREATE POLICY "Admin users can view all customers" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all customers" ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's customers
CREATE POLICY "Tenant users can view their customers" ON customers
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their customers" ON customers
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- INVOICES RLS POLICIES
-- ============================================================================

-- Admin users can access all invoices
CREATE POLICY "Admin users can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all invoices" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's invoices
CREATE POLICY "Tenant users can view their invoices" ON invoices
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their invoices" ON invoices
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- INVOICE LINE ITEMS RLS POLICIES
-- ============================================================================

-- Admin users can access all line items
CREATE POLICY "Admin users can view all invoice line items" ON invoice_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all invoice line items" ON invoice_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can access line items for their tenant's invoices
CREATE POLICY "Tenant users can view their invoice line items" ON invoice_line_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenant users can manage their invoice line items" ON invoice_line_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- CREDIT NOTES RLS POLICIES
-- ============================================================================

-- Admin users can access all credit notes
CREATE POLICY "Admin users can view all credit notes" ON credit_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all credit notes" ON credit_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's credit notes
CREATE POLICY "Tenant users can view their credit notes" ON credit_notes
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their credit notes" ON credit_notes
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- RECEIPTS RLS POLICIES
-- ============================================================================

-- Admin users can access all receipts
CREATE POLICY "Admin users can view all receipts" ON receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all receipts" ON receipts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's receipts
CREATE POLICY "Tenant users can view their receipts" ON receipts
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their receipts" ON receipts
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- DOCUMENT DELIVERIES RLS POLICIES
-- ============================================================================

-- Admin users can access all document deliveries
CREATE POLICY "Admin users can view all document deliveries" ON document_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all document deliveries" ON document_deliveries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's document deliveries
CREATE POLICY "Tenant users can view their document deliveries" ON document_deliveries
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their document deliveries" ON document_deliveries
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- INVOICE NUMBER SEQUENCES RLS POLICIES
-- ============================================================================

-- Admin users can access all sequences
CREATE POLICY "Admin users can view all invoice number sequences" ON invoice_number_sequences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all invoice number sequences" ON invoice_number_sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's sequences
CREATE POLICY "Tenant users can view their invoice number sequences" ON invoice_number_sequences
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their invoice number sequences" ON invoice_number_sequences
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- TENANT BUSINESS DETAILS RLS POLICIES
-- ============================================================================

-- Admin users can access all business details
CREATE POLICY "Admin users can view all business details" ON tenant_business_details
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all business details" ON tenant_business_details
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Tenant users can only access their tenant's business details
CREATE POLICY "Tenant users can view their business details" ON tenant_business_details
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can manage their business details" ON tenant_business_details
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE customers IS 'Customer/client information for invoicing. At least one contact method (email or phone) required at application level.';
COMMENT ON TABLE invoices IS 'Invoice records with state management and immutable invoice numbers. Status: draft, issued, sent, paid, voided.';
COMMENT ON TABLE invoice_line_items IS 'Line items for invoices with description, quantity, unit_price, and calculated line_total.';
COMMENT ON TABLE credit_notes IS 'Credit notes that reverse invoices the customer has seen. References original invoice.';
COMMENT ON TABLE receipts IS 'Payment receipts referencing invoices. Generated when payment is received.';
COMMENT ON TABLE document_deliveries IS 'Centralized tracking of all document delivery events (invoices, credit notes, receipts). Tracks delivery channel, recipient, status, and provider message IDs.';
COMMENT ON TABLE invoice_number_sequences IS 'Tracks sequential invoice numbers per tenant/year for atomic generation. Format: YYYY-NNN.';
COMMENT ON TABLE tenant_business_details IS 'Business information for invoice templates (logo, address, tax ID, bank details). One record per tenant.';

