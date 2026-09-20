ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upsell_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

GRANT SELECT (upsell_urls) ON public.products TO anon;