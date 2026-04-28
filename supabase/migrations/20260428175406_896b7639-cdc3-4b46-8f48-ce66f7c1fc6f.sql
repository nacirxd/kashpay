ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS upsell_url text,
ADD COLUMN IF NOT EXISTS downsell_url text;