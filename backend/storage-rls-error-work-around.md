Solution 1: Use Supabase Dashboard (Recommended)
Instead of running raw SQL, use the Supabase Dashboard to create the storage policies:
Go to your Supabase project dashboard
Navigate to Storage in the sidebar
Click on your style-capsule-images bucket
Go to Policies tab
Create the following policies:
Policy 1 - Upload (INSERT):
bucket_id = 'style-capsule-images' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]
Policy 2 - Update (UPDATE):
bucket_id = 'style-capsule-images' AND auth.role()
Policy 3 - Delete (DELETE):
bucket_id = 'style-capsule-images' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]
Policy 4 - Select (SELECT):
bucket_id = 'style-capsule-images'
Solution 2: Use the Service Role (If you have access)
If you have service role access, you can run the SQL directly in the Supabase SQL Editor:
-- Enable RLS on storage.objects for our bucketALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;-- Policy: Authenticated users can upload to style-capsule-images bucketCREATE POLICY "Authenticated users can upload style capsule images" ON storage.objectsFOR INSERT WITH CHECK (  bucket_id = 'style-capsule-images' AND  auth.role() = 'authenticated' AND  auth.uid()::text = (storage.foldername(name))[1]);-- Policy: Authenticated users can update their own uploaded imagesCREATE POLICY "Users can update own style capsule images" ON storage.objectsFOR UPDATE USING (  bucket_id = 'style-capsule-images' AND  auth.role() = 'authenticated' AND  auth.uid()::text = (storage.foldername(name))[1]);-- Policy: Authenticated users can delete their own uploaded imagesCREATE POLICY "Users can delete own style capsule images" ON storage.objectsFOR DELETE USING (  bucket_id = 'style-capsule-images' AND  auth.role() = 'authenticated' AND  auth.uid()::text = (storage.foldername(name))[1]);-- Policy: Everyone can view style capsule images (public read)CREATE POLICY "Anyone can view style capsule images" ON storage.objectsFOR SELECT USING (bucket_id = 'style-capsule-images');
Solution 3: Alternative Approach (If above don't work)
If you can't create the policies through either method, we can modify the storage setup script to use a different approach. For now, you can proceed with testing the rest of the system - the image upload functionality will fail gracefully, and we can debug the storage policies separately.
Next Steps After Fixing Storage Policies
Once you have the storage policies set up (via dashboard or SQL), run:
# Test that the seed data was createdcd backendnpx supabase db inspect  # Check if tables exist
Then start your servers and test the UI:
# Backendcd backend && npm run dev# Frontend (new terminal)npm