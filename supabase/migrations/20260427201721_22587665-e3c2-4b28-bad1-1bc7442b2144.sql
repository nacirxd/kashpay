
-- Currency on profile (seller)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MZN';

-- Currency on product (denormalized from seller at create time)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MZN';

-- Sales: gateway tracking fields
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS external_transaction_id text,
  ADD COLUMN IF NOT EXISTS mcx_entity text,
  ADD COLUMN IF NOT EXISTS mcx_reference text,
  ADD COLUMN IF NOT EXISTS gateway text;

CREATE INDEX IF NOT EXISTS idx_sales_external_tx ON public.sales(external_transaction_id);

-- Make sure 'failed' is a valid status (best-effort: drop existing check if any, recreate)
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.sales'::regclass AND contype = 'c' AND conname LIKE '%status%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sales DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_status_check
  CHECK (status IN ('pending','approved','failed','refunded','cancelled'));
