-- Make expenses.currency NOT NULL
-- First, update any existing NULL values to use tenant/user currency or fail if not available
-- This ensures data integrity before adding the constraint

-- Update expenses with NULL currency to use tenant currency
UPDATE expenses e
SET currency = (
  SELECT t.currency 
  FROM tenants t 
  WHERE t.id = e.tenant_id
)
WHERE e.currency IS NULL
AND EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = e.tenant_id AND t.currency IS NOT NULL
);

-- Check if there are still any NULL currencies - if so, fail the migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM expenses WHERE currency IS NULL) THEN
    RAISE EXCEPTION 'Cannot make currency NOT NULL: there are expenses with NULL currency. Please set currency for all expenses or update tenant currency preferences first.';
  END IF;
END $$;

-- Add NOT NULL constraint
ALTER TABLE expenses 
ALTER COLUMN currency SET NOT NULL;

-- Update comment
COMMENT ON COLUMN expenses.currency IS 'ISO 4217 currency code (e.g., "USD", "EUR", "GBP"). Required field - must be set for all expenses.';

