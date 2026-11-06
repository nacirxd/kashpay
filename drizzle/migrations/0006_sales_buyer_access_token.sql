ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS access_token text;
CREATE INDEX IF NOT EXISTS sales_access_token_idx ON public.sales (access_token);
CREATE INDEX IF NOT EXISTS sales_payment_phone_created_idx ON public.sales (payment_phone, created_at);
REVOKE SELECT (access_token) ON public.sales FROM anon, authenticated;