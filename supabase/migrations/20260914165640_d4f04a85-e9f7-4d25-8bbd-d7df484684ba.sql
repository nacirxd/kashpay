GRANT SELECT ON public.app_settings TO anon, authenticated;

CREATE POLICY "Public can read payment method flags"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('mpesa_enabled', 'emola_enabled'));