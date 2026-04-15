ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mpesa_nome text DEFAULT '',
  ADD COLUMN IF NOT EXISTS mpesa_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emola_nome text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emola_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS banco_nome text DEFAULT '',
  ADD COLUMN IF NOT EXISTS banco_conta text DEFAULT '';