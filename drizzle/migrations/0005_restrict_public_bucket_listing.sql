DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Users can view own product images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1]);