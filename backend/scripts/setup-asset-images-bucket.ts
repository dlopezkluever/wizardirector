import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const BUCKET_NAME = 'asset-images';
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

async function setupAssetImagesBucket() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('🗄️  Setting up asset-images bucket...');

    // Create bucket
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ALLOWED_FILE_TYPES,
        fileSizeLimit: MAX_FILE_SIZE_MB * 1024 * 1024
    });

    if (createError && createError.message !== 'Bucket already exists') {
        console.error('❌ Failed to create bucket:', createError);
        throw createError;
    }

    if (createError?.message === 'Bucket already exists') {
        console.log('ℹ️  Bucket already exists, skipping creation');
    } else {
        console.log('✅ Asset images bucket created successfully');
    }

    console.log('\n📁 Folder structure:');
    console.log('   asset-images/');
    console.log('     project_{projectId}/');
    console.log('       branch_{branchId}/');
    console.log('         master-assets/');
    console.log('         scene_{sceneId}/');
    console.log('           shot_{shotId}/');
    console.log('\n⚠️  IMPORTANT: Configure RLS policies via Supabase Dashboard:');
    console.log('   1. Upload: Backend service role only');
    console.log('   2. Read: Public access');
    console.log('   3. Update/Delete: Backend service role only');
    console.log('\nSee f-3.1-improved-plan.md Task 2 for SQL policy definitions');
}

setupAssetImagesBucket()
    .then(() => {
        console.log('\n✅ Setup complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });

