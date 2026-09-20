-- 1) Anonymous checkout visitors: read-only, and no access to deliverables or seller contacts
REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRUNCATE ON public.products FROM anon;
REVOKE SELECT (file_url, external_url, support_email, support_phone) ON public.products FROM anon;

-- Public policy: only products that are approved for sale
DROP POLICY IF EXISTS "Public can view checkout product fields" ON public.products;
CREATE POLICY "Public can view checkout product fields"
ON public.products
FOR SELECT
TO anon
USING (status = 'approved');

-- 2) SECURITY DEFINER trigger helpers must not be callable through the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_profile_admin_fields() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_withdrawal_balance() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_app_settings_updated_at() FROM anon, authenticated, public;