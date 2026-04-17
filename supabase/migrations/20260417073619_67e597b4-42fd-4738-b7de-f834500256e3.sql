ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT '';