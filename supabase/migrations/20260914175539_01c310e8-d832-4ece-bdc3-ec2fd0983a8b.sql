ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_bump_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_bump_price numeric,
  ADD COLUMN IF NOT EXISTS order_bump_title text,
  ADD COLUMN IF NOT EXISTS order_bump_description text;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS bump_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bump_valor numeric;