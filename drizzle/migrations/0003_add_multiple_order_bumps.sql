ALTER TABLE public.products ADD COLUMN IF NOT EXISTS order_bumps jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS bumps jsonb NOT NULL DEFAULT '[]'::jsonb;

GRANT SELECT (order_bumps) ON public.products TO anon;