#!/usr/bin/env tsx

/**
 * Setup Supabase Storage Buckets for Style Capsule System
 *
 * This script creates and configures the necessary storage buckets for
 * visual style capsule reference images.
 *
 * Requirements:
 * - style-capsule-images bucket for reference images
 * - Public read access, authenticated write
 * - File size limits and type validation (PNG, JPG, WEBP)
 * - Max file size: 5MB
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'style-capsule-images';
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets for Style Capsule System...\n');

  try {
    // Check if bucket already exists
    console.log(`📦 Checking if bucket "${BUCKET_NAME}" exists...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Failed to list buckets:', listError);
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists.`);
    } else {
      // Create the bucket
      console.log(`📦 Creating bucket "${BUCKET_NAME}"...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Allow public read access
        allowedMimeTypes: ALLOWED_FILE_TYPES,
        fileSizeLimit: MAX_FILE_SIZE_MB * 1024 * 1024 // Convert MB to bytes
      });

      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        return;
      }

      console.log(`✅ Bucket "${BUCKET_NAME}" created successfully.`);
    }

    // Update bucket configuration
    console.log(`🔧 Configuring bucket "${BUCKET_NAME}"...`);

    // Set up RLS policies for the bucket
    // Note: Storage policies are managed through SQL, but we can update bucket settings

    // Get bucket info to verify configuration
    const { data: bucketInfo, error: infoError } = await supabase.storage.getBucket(BUCKET_NAME);

    if (infoError) {
      console.error('❌ Failed to get bucket info:', infoError);
      return;
    }

    console.log(`📊 Bucket Configuration:`);
    console.log(`   - Name: ${bucketInfo.name}`);
    console.log(`   - Public: ${bucketInfo.public}`);
    console.log(`   - Created: ${bucketInfo.created_at}`);
    console.log(`   - Max File Size: ${MAX_FILE_SIZE_MB}MB`);
    console.log(`   - Allowed Types: ${ALLOWED_FILE_TYPES.join(', ')}`);

    // Test bucket access
    console.log(`\n🧪 Testing bucket access...`);

    // Try to list objects (should work for public bucket)
    const { error: testError } = await supabase.storage.from(BUCKET_NAME).list();

    if (testError && testError.message !== 'The resource was not found') {
      // "The resource was not found" is expected for empty bucket
      console.error('❌ Bucket access test failed:', testError);
      return;
    }

    console.log(`✅ Bucket access test passed.`);

    // Create SQL for storage policies (to be run separately)
    console.log(`\n📋 Storage RLS Policies SQL (run this in Supabase SQL Editor):`);
    console.log(`\n-- Enable RLS on storage.objects for our bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can upload to style-capsule-images bucket
CREATE POLICY "Authenticated users can upload style capsule images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = '${BUCKET_NAME}' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can update their own uploaded images
CREATE POLICY "Users can update own style capsule images" ON storage.objects
FOR UPDATE USING (
  bucket_id = '${BUCKET_NAME}' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can delete their own uploaded images
CREATE POLICY "Users can delete own style capsule images" ON storage.objects
FOR DELETE USING (
  bucket_id = '${BUCKET_NAME}' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Everyone can view style capsule images (public read)
CREATE POLICY "Anyone can view style capsule images" ON storage.objects
FOR SELECT USING (bucket_id = '${BUCKET_NAME}');
`);

    console.log(`\n✅ Style Capsule storage setup completed!`);
    console.log(`\n📝 Next steps:`);
    console.log(`1. Run the SQL policies above in your Supabase SQL Editor`);
    console.log(`2. Run the seed script to create preset style capsules`);
    console.log(`3. Deploy the backend API routes`);
    console.log(`4. Deploy the frontend components`);

  } catch (error) {
    console.error('❌ Unexpected error during setup:', error);
    process.exit(1);
  }
}

// Run the setup
setupStorageBuckets();
