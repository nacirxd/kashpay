-- Restore anonymous checkout read access on products, limited to checkout-safe columns.
-- Sensitive columns (meta_access_token, webhook_url, zenofy_product_id, categoria, tipo) stay hidden from anon.
GRANT SELECT (
  id, user_id, nome, descricao, preco, currency, status, image_url,
  delivery_type, external_url, file_url, payment_methods,
  meta_pixel_id, support_phone, support_email,
  upsell_url, downsell_url,
  order_bump_product_id, order_bump_price, order_bump_title, order_bump_description,
  created_at
) ON public.products TO anon;

GRANT SELECT ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;