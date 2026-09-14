ALTER TABLE public.products ADD COLUMN IF NOT EXISTS zenofy_product_id text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS zenofy_checkout_id text;
CREATE INDEX IF NOT EXISTS sales_zenofy_checkout_id_idx ON public.sales (zenofy_checkout_id);