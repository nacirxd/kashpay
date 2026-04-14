
-- Add delivery columns to products
ALTER TABLE public.products
ADD COLUMN delivery_type text NOT NULL DEFAULT 'link',
ADD COLUMN file_url text,
ADD COLUMN external_url text;

-- Create storage bucket for product files
INSERT INTO storage.buckets (id, name, public) VALUES ('product-files', 'product-files', false);

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload product files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own product files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public download via signed URLs (anon can read)
CREATE POLICY "Public can download product files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'product-files');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own product files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-files' AND auth.uid()::text = (storage.foldername(name))[1]);
