-- Add currency column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Add comment for documentation
COMMENT ON COLUMN expenses.currency IS 'ISO 4217 currency code (e.g., "USD", "EUR", "GBP"). If not set, falls back to tenant/user currency preference.';

-- Create index for currency lookups (useful for filtering/reporting)
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);
