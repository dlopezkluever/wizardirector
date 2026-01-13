-- Enable RLS on storage.objects for our bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can upload to style-capsule-images bucket
CREATE POLICY "Authenticated users can upload style capsule images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'style-capsule-images' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can update their own uploaded images
CREATE POLICY "Users can update own style capsule images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'style-capsule-images' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can delete their own uploaded images
CREATE POLICY "Users can delete own style capsule images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'style-capsule-images' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Everyone can view style capsule images (public read)
CREATE POLICY "Anyone can view style capsule images" ON storage.objects
FOR SELECT USING (bucket_id = 'style-capsule-images');