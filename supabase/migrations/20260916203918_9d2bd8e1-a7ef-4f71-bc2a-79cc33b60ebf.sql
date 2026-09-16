-- 1) Vendas: só o backend (service_role) pode criar vendas
DROP POLICY IF EXISTS "Anyone can create sales for approved products" ON public.sales;
REVOKE INSERT ON public.sales FROM anon;

-- 2) Substituir as funções SECURITY DEFINER públicas por leitura limitada a colunas seguras
DROP FUNCTION IF EXISTS public.get_checkout_product(uuid);
DROP FUNCTION IF EXISTS public.get_checkout_gtm(uuid);

REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, user_id, nome, descricao, preco, currency, image_url, delivery_type,
  status, categoria, tipo, payment_methods, meta_pixel_id, support_phone,
  upsell_url, downsell_url, order_bump_product_id, order_bump_price,
  order_bump_title, order_bump_description, created_at
) ON public.products TO anon;

CREATE POLICY "Public can view checkout product fields"
ON public.products FOR SELECT TO anon
USING (true);

REVOKE SELECT ON public.integrations FROM anon;
GRANT SELECT (id, user_id, tipo, config, ativo) ON public.integrations TO anon;

CREATE POLICY "Public can read active GTM integration"
ON public.integrations FOR SELECT TO anon
USING (tipo = 'gtm' AND ativo = true);

-- 3) Funções de trigger não devem ser invocáveis pela API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_app_settings_updated_at() FROM PUBLIC, anon, authenticated;