CREATE POLICY "Public can read integrations for checkout"
ON public.integrations
FOR SELECT
TO anon
USING (true);