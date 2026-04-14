
DROP POLICY "Anyone can create sales" ON public.sales;
CREATE POLICY "Anyone can create sales with valid product" ON public.sales FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE id = product_id));
