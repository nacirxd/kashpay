-- 1) Remove public read of products / integrations and public file downloads
DROP POLICY IF EXISTS "Public can view products for checkout" ON public.products;
DROP POLICY IF EXISTS "Public can read integrations for checkout" ON public.integrations;
DROP POLICY IF EXISTS "Public can download product files" ON storage.objects;

-- 2) Safe checkout product reader (no tokens, no delivery URLs)
CREATE OR REPLACE FUNCTION public.get_checkout_product(p_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  nome text,
  descricao text,
  preco numeric,
  currency text,
  image_url text,
  delivery_type text,
  status text,
  categoria text,
  tipo text,
  payment_methods text[],
  meta_pixel_id text,
  support_phone text,
  upsell_url text,
  downsell_url text,
  order_bump_product_id uuid,
  order_bump_price numeric,
  order_bump_title text,
  order_bump_description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.nome, p.descricao, p.preco, p.currency, p.image_url,
         p.delivery_type, p.status, p.categoria, p.tipo, p.payment_methods,
         p.meta_pixel_id, p.support_phone, p.upsell_url, p.downsell_url,
         p.order_bump_product_id, p.order_bump_price, p.order_bump_title, p.order_bump_description
  FROM public.products p
  WHERE p.id = p_id
$$;

REVOKE ALL ON FUNCTION public.get_checkout_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_checkout_product(uuid) TO anon, authenticated, service_role;

-- 3) Only the GTM container id is exposed publicly (no API keys / tokens)
CREATE OR REPLACE FUNCTION public.get_checkout_gtm(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (i.config->>'container_id')
  FROM public.integrations i
  WHERE i.user_id = p_user_id AND i.tipo = 'gtm' AND i.ativo = true
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_checkout_gtm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_checkout_gtm(uuid) TO anon, authenticated, service_role;

-- 4) Sales can only be created for approved products
DROP POLICY IF EXISTS "Anyone can create sales with valid product" ON public.sales;
CREATE POLICY "Anyone can create sales for approved products"
ON public.sales FOR INSERT TO anon, authenticated
WITH CHECK (
  valor >= 0 AND EXISTS (
    SELECT 1 FROM public.products pr
    WHERE pr.id = sales.product_id AND pr.status = 'approved'
  )
);