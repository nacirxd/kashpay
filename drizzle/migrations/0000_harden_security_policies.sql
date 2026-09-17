-- 1) Vendedores não podem alterar as suas vendas (status/valor). Apenas o servidor (service_role).
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
REVOKE UPDATE ON public.sales FROM authenticated;

-- 2) Perfil: o utilizador não pode alterar o estado de aprovação nem o dono da linha
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.status := OLD.status;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

-- 3) Saques: validar saldo disponível no servidor (vendas aprovadas há mais de 7 dias)
CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released numeric;
  taken numeric;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.valor IS NULL OR NEW.valor <= 0 THEN
    RAISE EXCEPTION 'Valor de saque inválido';
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO released
  FROM public.sales
  WHERE user_id = NEW.user_id
    AND status = 'approved'
    AND created_at <= now() - interval '7 days';

  SELECT COALESCE(SUM(valor), 0) INTO taken
  FROM public.withdrawals
  WHERE user_id = NEW.user_id
    AND status <> 'rejeitado';

  IF NEW.valor > (released - taken) THEN
    RAISE EXCEPTION 'Valor solicitado excede o saldo disponível';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_withdrawal_balance ON public.withdrawals;
CREATE TRIGGER validate_withdrawal_balance
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_balance();

-- 4) Produtos: visitantes anónimos só podem ler as colunas necessárias ao checkout
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, user_id, nome, descricao, preco, tipo, categoria, currency, status,
  image_url, delivery_type, external_url, file_url, payment_methods,
  meta_pixel_id, support_phone, support_email,
  upsell_url, downsell_url,
  order_bump_product_id, order_bump_price, order_bump_title, order_bump_description,
  created_at
) ON public.products TO anon;

-- 5) Não transmitir alterações de produtos por Realtime (evita fuga de colunas sensíveis)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.products';
  END IF;
END $$;