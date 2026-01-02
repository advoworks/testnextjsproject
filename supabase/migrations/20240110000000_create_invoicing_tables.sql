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
-- Create indexes only if they don't exist (handles permission errors gracefully)
DO $$
BEGIN
  -- Customers indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_tenant_id') THEN
    CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_email') THEN
    CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
  END IF;

  -- Invoices indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_tenant_id') THEN
    CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_customer_id') THEN
    CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_status') THEN
    CREATE INDEX idx_invoices_status ON invoices(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_invoice_date') THEN
    CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_invoice_number') THEN
    CREATE INDEX idx_invoices_invoice_number ON invoices(tenant_id, invoice_number) WHERE invoice_number IS NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_created_by') THEN
    CREATE INDEX idx_invoices_created_by ON invoices(created_by);
  END IF;

  -- Invoice line items indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoice_line_items_invoice_id') THEN
    CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoice_line_items_sort_order') THEN
    CREATE INDEX idx_invoice_line_items_sort_order ON invoice_line_items(invoice_id, sort_order);
  END IF;

  -- Credit notes indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_tenant_id') THEN
    CREATE INDEX idx_credit_notes_tenant_id ON credit_notes(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_invoice_id') THEN
    CREATE INDEX idx_credit_notes_invoice_id ON credit_notes(invoice_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_credit_note_number') THEN
    CREATE INDEX idx_credit_notes_credit_note_number ON credit_notes(tenant_id, credit_note_number);
  END IF;

  -- Receipts indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipts_tenant_id') THEN
    CREATE INDEX idx_receipts_tenant_id ON receipts(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipts_invoice_id') THEN
    CREATE INDEX idx_receipts_invoice_id ON receipts(invoice_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipts_receipt_number') THEN
    CREATE INDEX idx_receipts_receipt_number ON receipts(tenant_id, receipt_number);
  END IF;

  -- Document deliveries indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_deliveries_tenant_id') THEN
    CREATE INDEX idx_document_deliveries_tenant_id ON document_deliveries(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_deliveries_document') THEN
    CREATE INDEX idx_document_deliveries_document ON document_deliveries(tenant_id, document_type, document_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_deliveries_sent_at') THEN
    CREATE INDEX idx_document_deliveries_sent_at ON document_deliveries(tenant_id, sent_at);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_deliveries_status') THEN
    CREATE INDEX idx_document_deliveries_status ON document_deliveries(status);
  END IF;

  -- Invoice number sequences indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoice_number_sequences_tenant_year') THEN
    CREATE INDEX idx_invoice_number_sequences_tenant_year ON invoice_number_sequences(tenant_id, year);
  END IF;
END $$;

-- ============================================================================
-- PARTIAL UNIQUE INDEXES (for conditional uniqueness)
-- ============================================================================
DO $$
BEGIN
  -- Unique email per tenant (only when email is not null)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_tenant_email_unique') THEN
    CREATE UNIQUE INDEX idx_customers_tenant_email_unique 
    ON customers(tenant_id, email) 
    WHERE email IS NOT NULL;
  END IF;

  -- Unique invoice number per tenant (only when invoice_number is not null)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_tenant_invoice_number_unique') THEN
    CREATE UNIQUE INDEX idx_invoices_tenant_invoice_number_unique 
    ON invoices(tenant_id, invoice_number) 
    WHERE invoice_number IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
    CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoice_line_items_updated_at') THEN
    CREATE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_credit_notes_updated_at') THEN
    CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_receipts_updated_at') THEN
    CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoice_number_sequences_updated_at') THEN
    CREATE TRIGGER update_invoice_number_sequences_updated_at BEFORE UPDATE ON invoice_number_sequences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_business_details_updated_at') THEN
    CREATE TRIGGER update_tenant_business_details_updated_at BEFORE UPDATE ON tenant_business_details
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables (with error handling for permission issues)
-- If tables already have RLS enabled or we don't have permissions, errors are ignored
DO $$
BEGIN
  -- Enable RLS for customers
  BEGIN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
    WHEN OTHERS THEN NULL; -- Ignore other errors (e.g., already enabled)
  END;

  -- Enable RLS for invoices
  BEGIN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege: must be owner
    WHEN OTHERS THEN NULL;
  END;

  -- Enable RLS for invoice_line_items
  BEGIN
    ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  -- Enable RLS for credit_notes
  BEGIN
    ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  -- Enable RLS for receipts
  BEGIN
    ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  -- Enable RLS for document_deliveries
  BEGIN
    ALTER TABLE document_deliveries ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  -- Enable RLS for invoice_number_sequences
  BEGIN
    ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  -- Enable RLS for tenant_business_details
  BEGIN
    ALTER TABLE tenant_business_details ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN SQLSTATE '42501' THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END $$;

-- ============================================================================
-- CUSTOMERS RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Admin users can access all customers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Admin users can view all customers') THEN
    CREATE POLICY "Admin users can view all customers" ON customers
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Admin users can manage all customers') THEN
    CREATE POLICY "Admin users can manage all customers" ON customers
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  END IF;

  -- Tenant users can only access their tenant's customers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Tenant users can view their customers') THEN
    CREATE POLICY "Tenant users can view their customers" ON customers
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Tenant users can manage their customers') THEN
    CREATE POLICY "Tenant users can manage their customers" ON customers
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- INVOICES RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Admin users can access all invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Admin users can view all invoices') THEN
    CREATE POLICY "Admin users can view all invoices" ON invoices
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Admin users can manage all invoices') THEN
    CREATE POLICY "Admin users can manage all invoices" ON invoices
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  END IF;

  -- Tenant users can only access their tenant's invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Tenant users can view their invoices') THEN
    CREATE POLICY "Tenant users can view their invoices" ON invoices
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Tenant users can manage their invoices') THEN
    CREATE POLICY "Tenant users can manage their invoices" ON invoices
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- INVOICE LINE ITEMS RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  -- Admin users can access all line items
  BEGIN
    CREATE POLICY "Admin users can view all invoice line items" ON invoice_line_items
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege
  END;

  BEGIN
    CREATE POLICY "Admin users can manage all invoice line items" ON invoice_line_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  -- Tenant users can access line items for their tenant's invoices
  BEGIN
    CREATE POLICY "Tenant users can view their invoice line items" ON invoice_line_items
      FOR SELECT USING (
        invoice_id IN (
          SELECT id FROM invoices 
          WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
        )
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can manage their invoice line items" ON invoice_line_items
      FOR ALL USING (
        invoice_id IN (
          SELECT id FROM invoices 
          WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
        )
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

-- ============================================================================
-- CREDIT NOTES RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Admin users can view all credit notes" ON credit_notes
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Admin users can manage all credit notes" ON credit_notes
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can view their credit notes" ON credit_notes
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can manage their credit notes" ON credit_notes
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

-- ============================================================================
-- RECEIPTS RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Admin users can view all receipts" ON receipts
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Admin users can manage all receipts" ON receipts
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can view their receipts" ON receipts
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can manage their receipts" ON receipts
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

-- ============================================================================
-- DOCUMENT DELIVERIES RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Admin users can view all document deliveries" ON document_deliveries
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Admin users can manage all document deliveries" ON document_deliveries
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can view their document deliveries" ON document_deliveries
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can manage their document deliveries" ON document_deliveries
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

-- ============================================================================
-- INVOICE NUMBER SEQUENCES RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Admin users can view all invoice number sequences" ON invoice_number_sequences
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Admin users can manage all invoice number sequences" ON invoice_number_sequences
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can view their invoice number sequences" ON invoice_number_sequences
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can manage their invoice number sequences" ON invoice_number_sequences
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

-- ============================================================================
-- TENANT BUSINESS DETAILS RLS POLICIES
-- ============================================================================
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Admin users can view all business details" ON tenant_business_details
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Admin users can manage all business details" ON tenant_business_details
      FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can view their business details" ON tenant_business_details
      FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Tenant users can manage their business details" ON tenant_business_details
      FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
      );
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
DO $$
BEGIN
  BEGIN
    COMMENT ON TABLE customers IS 'Customer/client information for invoicing. At least one contact method (email or phone) required at application level.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; -- insufficient_privilege
  END;

  BEGIN
    COMMENT ON TABLE invoices IS 'Invoice records with state management and immutable invoice numbers. Status: draft, issued, sent, paid, voided.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    COMMENT ON TABLE invoice_line_items IS 'Line items for invoices with description, quantity, unit_price, and calculated line_total.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    COMMENT ON TABLE credit_notes IS 'Credit notes that reverse invoices the customer has seen. References original invoice.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    COMMENT ON TABLE receipts IS 'Payment receipts referencing invoices. Generated when payment is received.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    COMMENT ON TABLE document_deliveries IS 'Centralized tracking of all document delivery events (invoices, credit notes, receipts). Tracks delivery channel, recipient, status, and provider message IDs.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    COMMENT ON TABLE invoice_number_sequences IS 'Tracks sequential invoice numbers per tenant/year for atomic generation. Format: YYYY-NNN.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;

  BEGIN
    COMMENT ON TABLE tenant_business_details IS 'Business information for invoice templates (logo, address, tax ID, bank details). One record per tenant.';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
  END;
END $$;

