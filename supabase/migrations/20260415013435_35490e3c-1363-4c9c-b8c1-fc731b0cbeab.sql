ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS buyer_whatsapp text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_phone text DEFAULT NULL;