ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS meta_pixel_id text DEFAULT '',
ADD COLUMN IF NOT EXISTS meta_access_token text DEFAULT '';