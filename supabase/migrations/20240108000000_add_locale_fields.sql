-- Add country, timezone, and currency to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Add country, timezone, and currency to tenant_users table
ALTER TABLE tenant_users 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tenants.country IS 'ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "SG"). Used for locale defaults and compliance.';
COMMENT ON COLUMN tenants.timezone IS 'IANA timezone string (e.g., "America/New_York", "Europe/London", "Asia/Singapore"). Used as fallback when tenant_user timezone is not set.';
COMMENT ON COLUMN tenants.currency IS 'ISO 4217 currency code (e.g., "USD", "EUR", "GBP"). Used as fallback when tenant_user currency is not set.';

COMMENT ON COLUMN tenant_users.country IS 'ISO 3166-1 alpha-2 country code. Primary preference, falls back to tenant.country if not set.';
COMMENT ON COLUMN tenant_users.timezone IS 'IANA timezone string. Primary preference, falls back to tenant.timezone if not set.';
COMMENT ON COLUMN tenant_users.currency IS 'ISO 4217 currency code. Primary preference, falls back to tenant.currency if not set.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country);
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON tenants(timezone);
CREATE INDEX IF NOT EXISTS idx_tenants_currency ON tenants(currency);
CREATE INDEX IF NOT EXISTS idx_tenant_users_country ON tenant_users(country);
CREATE INDEX IF NOT EXISTS idx_tenant_users_timezone ON tenant_users(timezone);
CREATE INDEX IF NOT EXISTS idx_tenant_users_currency ON tenant_users(currency);
