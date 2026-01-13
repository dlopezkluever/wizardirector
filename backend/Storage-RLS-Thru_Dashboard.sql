-- style-capsule-images / [USER_ID] / my-style-image.png

CREATE POLICY "Allow Authenticated Uploads (Style Capsules) apn450_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'style-capsule-images' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]);

