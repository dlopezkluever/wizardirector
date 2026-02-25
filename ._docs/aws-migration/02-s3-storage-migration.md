# Phase 1: S3 Storage Migration

> **Prerequisites:** Phase 0 complete (AWS account, CLI configured)
> **Time:** 3-4 hours (+ time to migrate existing files)
> **Risk:** Low — storage is isolated from auth and database. The app continues working on Supabase DB + Auth throughout.
> **Rollback:** Revert 3 service files and redeploy backend (~30 minutes)

In this phase we:
1. Create 3 S3 buckets to replace Supabase Storage buckets
2. Update 3 backend service files to use the AWS SDK
3. Run a migration script to copy existing files from Supabase to S3
4. Verify new uploads land in S3

The database and auth still use Supabase after this phase.

---

## What We're Replacing

| Supabase Bucket | Used In | S3 Bucket |
|-----------------|---------|-----------|
| `asset-images` | `backend/src/services/assetImageLocalizer.ts` | `aiuteur-asset-images` |
| `images` | `backend/src/services/ImageGenerationService.ts` | `aiuteur-images` |
| `videos` | `backend/src/services/video-generation/Veo3Provider.ts` | `aiuteur-videos` |

**Operations being replaced:**
- `supabase.storage.from(bucket).upload(path, buffer, opts)` → S3 `PutObjectCommand`
- `supabase.storage.from(bucket).getPublicUrl(path)` → public S3 URL or pre-signed URL

---

## Step 1: Create S3 Buckets

### 1a. Create the Buckets

Run these AWS CLI commands (replace `us-east-1` if you chose a different region):

```bash
# Videos bucket (private — use pre-signed URLs for access)
aws s3api create-bucket \
  --bucket aiuteur-videos \
  --region us-east-1

# Images bucket (public-read — frame images displayed in the app)
aws s3api create-bucket \
  --bucket aiuteur-images \
  --region us-east-1

# Asset images bucket (public-read — character/prop/location images)
aws s3api create-bucket \
  --bucket aiuteur-asset-images \
  --region us-east-1
```

> **Note:** S3 bucket names must be globally unique across ALL AWS accounts. If `aiuteur-videos` is taken, use `aiuteur-videos-yourname` and update the env vars accordingly.

### 1b. Disable Block Public Access for Images Buckets

By default, S3 blocks all public access. We need to allow public-read for images (so the app can display them via direct URL). Videos stay private.

```bash
# For images bucket (public-read needed)
aws s3api put-public-access-block \
  --bucket aiuteur-images \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# For asset-images bucket (public-read needed)
aws s3api put-public-access-block \
  --bucket aiuteur-asset-images \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Videos bucket stays fully private (no change needed — default is blocked)
```

### 1c. Set Bucket Policies (Public Read for Images)

```bash
# Public read policy for images bucket
aws s3api put-bucket-policy --bucket aiuteur-images --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aiuteur-images/*"
    }
  ]
}'

# Public read policy for asset-images bucket
aws s3api put-bucket-policy --bucket aiuteur-asset-images --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aiuteur-asset-images/*"
    }
  ]
}'
```

### 1d. Configure CORS (for browser uploads, if any)

```bash
aws s3api put-bucket-cors --bucket aiuteur-images --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

aws s3api put-bucket-cors --bucket aiuteur-asset-images --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

aws s3api put-bucket-cors --bucket aiuteur-videos --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

### 1e. Verify Buckets

```bash
aws s3 ls
# Should show all 3 buckets listed
```

---

## Step 2: Create an IAM Role for Backend S3 Access

Instead of hardcoding AWS credentials in `.env`, we create an IAM role that the backend uses. For local development, we use access keys. For ECS production (Phase 4), the ECS task role handles this automatically.

### Create a dedicated IAM user for S3 (development only)

```bash
# Create IAM user for local backend development
aws iam create-user --user-name aiuteur-backend-s3

# Attach S3 permissions
aws iam put-user-policy \
  --user-name aiuteur-backend-s3 \
  --policy-name aiuteur-s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:HeadObject"],
        "Resource": [
          "arn:aws:s3:::aiuteur-videos/*",
          "arn:aws:s3:::aiuteur-images/*",
          "arn:aws:s3:::aiuteur-asset-images/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": "s3:ListBucket",
        "Resource": [
          "arn:aws:s3:::aiuteur-videos",
          "arn:aws:s3:::aiuteur-images",
          "arn:aws:s3:::aiuteur-asset-images"
        ]
      }
    ]
  }'

# Create access keys for this user
aws iam create-access-key --user-name aiuteur-backend-s3
```

**Save the output** — it contains `AccessKeyId` and `SecretAccessKey`. You will not be able to retrieve the secret key again.

---

## Step 3: Install AWS SDK in the Backend

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Step 4: Create the S3 Client Config

Create a new file `backend/src/config/s3.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.AWS_REGION) throw new Error('AWS_REGION is required');
if (!process.env.AWS_ACCESS_KEY_ID) throw new Error('AWS_ACCESS_KEY_ID is required');
if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error('AWS_SECRET_ACCESS_KEY is required');

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKETS = {
  videos: process.env.S3_VIDEOS_BUCKET || 'aiuteur-videos',
  images: process.env.S3_IMAGES_BUCKET || 'aiuteur-images',
  assetImages: process.env.S3_ASSET_IMAGES_BUCKET || 'aiuteur-asset-images',
} as const;

export function getPublicUrl(bucket: string, key: string): string {
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
```

---

## Step 5: Update Backend Environment Variables

Add to `backend/.env`:

```env
# AWS S3 Storage (replaces Supabase Storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-key-here...
AWS_SECRET_ACCESS_KEY=your-secret-key-here
S3_VIDEOS_BUCKET=aiuteur-videos
S3_IMAGES_BUCKET=aiuteur-images
S3_ASSET_IMAGES_BUCKET=aiuteur-asset-images
```

---

## Step 6: Update the Three Storage Service Files

### 6a. Update `backend/src/services/assetImageLocalizer.ts`

Find the upload section (around line 75-90). Replace the Supabase upload and getPublicUrl calls:

**Before:**
```typescript
const { data, error } = await supabase.storage
  .from('asset-images')
  .upload(storagePath, imageBuffer, { contentType, upsert: false });

const { data: urlData } = supabase.storage
  .from('asset-images')
  .getPublicUrl(storagePath);

return urlData.publicUrl;
```

**After:**
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKETS, getPublicUrl } from '../config/s3.js';

// ... (inside the function)
await s3Client.send(new PutObjectCommand({
  Bucket: S3_BUCKETS.assetImages,
  Key: storagePath,
  Body: imageBuffer,
  ContentType: contentType,
}));

return getPublicUrl(S3_BUCKETS.assetImages, storagePath);
```

> **Storage path format stays the same.** The path `project_{projectId}/branch_{branchId}/master-assets/{assetId}_{timestamp}_{random}{ext}` is used as the S3 object key directly. No changes needed to how paths are constructed.

### 6b. Update `backend/src/services/ImageGenerationService.ts`

Find where it uploads to Supabase Storage after image generation. Replace with S3:

**Before:**
```typescript
const { data, error } = await supabase.storage
  .from('images')
  .upload(storagePath, imageBuffer, { contentType: 'image/png' });

const { data: urlData } = supabase.storage.from('images').getPublicUrl(storagePath);
publicUrl = urlData.publicUrl;
```

**After:**
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKETS, getPublicUrl } from '../config/s3.js';

// ... (inside the function)
await s3Client.send(new PutObjectCommand({
  Bucket: S3_BUCKETS.images,
  Key: storagePath,
  Body: imageBuffer,
  ContentType: 'image/png',
}));
publicUrl = getPublicUrl(S3_BUCKETS.images, storagePath);
```

### 6c. Update `backend/src/services/video-generation/Veo3Provider.ts`

Find the video upload section after successful Veo3 generation. Replace with S3:

**Before:**
```typescript
const { error: uploadError } = await supabase.storage
  .from('videos')
  .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: false });

const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath);
videoUrl = urlData.publicUrl;
```

**After:**
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKETS, getPublicUrl } from '../../config/s3.js';

// ... (inside the function)
await s3Client.send(new PutObjectCommand({
  Bucket: S3_BUCKETS.videos,
  Key: storagePath,
  Body: videoBuffer,
  ContentType: 'video/mp4',
}));

// Videos are private — generate a long-lived signed URL for playback
// Or store the S3 key and generate signed URLs on demand from the API
videoUrl = getPublicUrl(S3_BUCKETS.videos, storagePath);
// Note: For production, consider using pre-signed URLs instead of public URLs for videos
```

> **On video URLs:** Unlike images, videos contain user-generated content and may be private. Two options:
> - **Public S3 URL** (simpler): Store and serve like images. Fine for early stage.
> - **Pre-signed URLs** (more secure): Generate a URL valid for 1 hour when the user requests playback. Implement this in the video serving route.

---

## Step 7: Add `backend/src/config/s3.ts` (ES Module Import Fix)

Ensure all imports use `.js` extension (required for ESM in this project):

In `assetImageLocalizer.ts`:
```typescript
import { s3Client, S3_BUCKETS, getPublicUrl } from '../config/s3.js';
```

In `ImageGenerationService.ts`:
```typescript
import { s3Client, S3_BUCKETS, getPublicUrl } from '../config/s3.js';
```

In `Veo3Provider.ts`:
```typescript
import { s3Client, S3_BUCKETS, getPublicUrl } from '../../config/s3.js';
```

---

## Step 8: Migrate Existing Files from Supabase Storage to S3

Run this migration script to copy all existing files. This uses the Supabase service role key to list and download files, then re-uploads to S3.

Create a temporary script `backend/scripts/migrate-storage-to-s3.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const BUCKET_MAPPINGS = [
  { supabaseBucket: 'asset-images', s3Bucket: 'aiuteur-asset-images' },
  { supabaseBucket: 'images', s3Bucket: 'aiuteur-images' },
  { supabaseBucket: 'videos', s3Bucket: 'aiuteur-videos' },
];

async function listAllFiles(bucket: string, folder = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
    offset: 0,
  });

  if (error) throw error;
  if (!data) return [];

  const files: string[] = [];
  for (const item of data) {
    if (item.id) {
      // It's a file
      files.push(folder ? `${folder}/${item.name}` : item.name);
    } else {
      // It's a folder — recurse
      const subFiles = await listAllFiles(bucket, folder ? `${folder}/${item.name}` : item.name);
      files.push(...subFiles);
    }
  }
  return files;
}

async function migrateFile(supabaseBucket: string, s3Bucket: string, filePath: string) {
  // Download from Supabase
  const { data, error } = await supabase.storage.from(supabaseBucket).download(filePath);
  if (error) {
    console.error(`  ERROR downloading ${filePath}:`, error.message);
    return false;
  }

  // Upload to S3
  const buffer = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || 'application/octet-stream';

  await s3.send(new PutObjectCommand({
    Bucket: s3Bucket,
    Key: filePath,
    Body: buffer,
    ContentType: contentType,
  }));

  return true;
}

async function main() {
  for (const { supabaseBucket, s3Bucket } of BUCKET_MAPPINGS) {
    console.log(`\nMigrating ${supabaseBucket} → ${s3Bucket}`);

    const files = await listAllFiles(supabaseBucket);
    console.log(`  Found ${files.length} files`);

    let success = 0;
    let failed = 0;

    for (const file of files) {
      process.stdout.write(`  Copying ${file}...`);
      const ok = await migrateFile(supabaseBucket, s3Bucket, file);
      if (ok) { success++; console.log(' ✓'); }
      else { failed++; console.log(' ✗'); }
    }

    console.log(`  Done: ${success} succeeded, ${failed} failed`);
  }

  console.log('\nMigration complete! Check failed files above and retry if needed.');
}

main().catch(console.error);
```

Run the script:
```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npx tsx scripts/migrate-storage-to-s3.ts
```

> **Note:** This may take a while depending on how many files are in Supabase Storage. For large collections, run in batches or on a weekend.

### Update Database Records with New S3 URLs

After migration, existing database records still point to Supabase Storage URLs. You need to update them to point to S3.

This SQL script updates all URL columns. **Run this against your Supabase database** (via Supabase SQL Editor) AFTER verifying all files are in S3:

```sql
-- Replace 'gdnurgghtmauclfkkvif.supabase.co' with your Supabase project ref
-- Replace 'aiuteur-images.s3.us-east-1.amazonaws.com' with your actual S3 bucket URL

-- Update image_key_url in global_assets
UPDATE global_assets
SET image_key_url = REPLACE(
  image_key_url,
  'https://gdnurgghtmauclfkkvif.supabase.co/storage/v1/object/public/asset-images/',
  'https://aiuteur-asset-images.s3.us-east-1.amazonaws.com/'
)
WHERE image_key_url LIKE '%supabase.co/storage%';

-- Update image_key_url in project_assets
UPDATE project_assets
SET image_key_url = REPLACE(
  image_key_url,
  'https://gdnurgghtmauclfkkvif.supabase.co/storage/v1/object/public/asset-images/',
  'https://aiuteur-asset-images.s3.us-east-1.amazonaws.com/'
)
WHERE image_key_url LIKE '%supabase.co/storage%';

-- Update image_url in frames
UPDATE frames
SET image_url = REPLACE(
  image_url,
  'https://gdnurgghtmauclfkkvif.supabase.co/storage/v1/object/public/images/',
  'https://aiuteur-images.s3.us-east-1.amazonaws.com/'
)
WHERE image_url LIKE '%supabase.co/storage%';

-- Update video_url in video_generation_jobs
UPDATE video_generation_jobs
SET video_url = REPLACE(
  video_url,
  'https://gdnurgghtmauclfkkvif.supabase.co/storage/v1/object/public/videos/',
  'https://aiuteur-videos.s3.us-east-1.amazonaws.com/'
)
WHERE video_url LIKE '%supabase.co/storage%';
```

> **Important:** Run these SQL statements in the Supabase Dashboard → SQL Editor. Do NOT run `npm run migrate` — never run automatic migrations.

---

## Step 9: Lint and Test

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm run lint
```

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm test
```

Fix any lint errors before proceeding.

---

## Step 10: Verify the Migration

1. **Start the backend** (with new S3 env vars): `npm run dev`
2. **Test file upload**: Generate a new image (Stage 5 or Stage 10 in the app) and verify:
   - The new image URL contains `s3.amazonaws.com` (not `supabase.co`)
   - The image displays correctly in the browser
3. **Test existing files**: Open an existing project and verify old images still display (they should, after the DB URL update script)
4. **Check S3 buckets**: `aws s3 ls s3://aiuteur-images/` — should show uploaded files

---

## Phase 1 Rollback

If something goes wrong:
1. Revert the 3 service files to use `supabase.storage`
2. Remove the `S3_*` env vars from `backend/.env`
3. Restart the backend

New files uploaded during the S3 period need to be manually copied back to Supabase Storage if you rollback (the migration script above can be run in reverse).

---

## Phase 1 Checklist

- [ ] 3 S3 buckets created (`aiuteur-videos`, `aiuteur-images`, `aiuteur-asset-images`)
- [ ] Public read policy applied to `aiuteur-images` and `aiuteur-asset-images`
- [ ] CORS configured on all 3 buckets
- [ ] IAM user `aiuteur-backend-s3` created with scoped S3 permissions
- [ ] `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` installed
- [ ] `backend/src/config/s3.ts` created
- [ ] `backend/.env` updated with `AWS_*` and `S3_*` vars
- [ ] `assetImageLocalizer.ts` updated to use S3
- [ ] `ImageGenerationService.ts` updated to use S3
- [ ] `Veo3Provider.ts` updated to use S3
- [ ] Existing Supabase Storage files migrated to S3
- [ ] Database URL columns updated to S3 URLs (via SQL Editor)
- [ ] Lint passes
- [ ] Tests pass
- [ ] New image upload verified to land in S3
- [ ] Existing images still display in the app

---

## Next Step

Proceed to **Phase 2:** [03-rds-database-migration.md](./03-rds-database-migration.md)
