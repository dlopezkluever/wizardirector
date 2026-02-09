-- Upload: Backend service role only
CREATE POLICY "Service role can upload asset images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'asset-images' AND auth.role() = 'service_role');

-- Read: Public access
CREATE POLICY "Public read access to asset images"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-images');

-- Update/Delete: Backend service role only
CREATE POLICY "Service role can update asset images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'asset-images' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete asset images"
ON storage.objects FOR DELETE
USING (bucket_id = 'asset-images' AND auth.role() = 'service_role');
