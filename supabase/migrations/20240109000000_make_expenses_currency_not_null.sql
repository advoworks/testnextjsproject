-- Make expenses.currency NOT NULL
-- First, update any existing NULL values to use tenant currency or a default value
-- This ensures data integrity before adding the constraint

-- Step 1: Update expenses with NULL currency to use tenant currency (if tenant has currency)
UPDATE expenses e
SET currency = (
  SELECT t.currency 
  FROM tenants t 
  WHERE t.id = e.tenant_id AND t.currency IS NOT NULL
)
WHERE e.currency IS NULL
AND EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = e.tenant_id AND t.currency IS NOT NULL
);

-- Step 2: For any remaining NULL currencies, set a default currency (USD)
-- This handles cases where expenses exist but tenant doesn't have currency set
UPDATE expenses
SET currency = 'USD'
WHERE currency IS NULL;

-- Step 3: Verify no NULL currencies remain (should not happen after step 2, but safety check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM expenses WHERE currency IS NULL) THEN
    RAISE EXCEPTION 'Unexpected error: expenses still have NULL currency after migration. This should not happen.';
  END IF;
END $$;

-- Add NOT NULL constraint
ALTER TABLE expenses 
ALTER COLUMN currency SET NOT NULL;

-- Update comment
COMMENT ON COLUMN expenses.currency IS 'ISO 4217 currency code (e.g., "USD", "EUR", "GBP"). Required field - must be set for all expenses.';

