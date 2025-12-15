-- Add mobile_number column to tenant_users table
ALTER TABLE tenant_users 
ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Create index for fast lookups by mobile number
CREATE INDEX IF NOT EXISTS idx_tenant_users_mobile_number 
ON tenant_users(mobile_number);

-- Add comment for documentation
COMMENT ON COLUMN tenant_users.mobile_number IS 'Mobile phone number for WhatsApp verification (format: +1234567890)';
