# Feature 3.1: Image Generation Service - Setup & Testing Guide

## Overview

This guide covers setup and testing of the Nano Banana image generation service with job-tracked architecture.

## Prerequisites

### 1. Dependencies
```bash
# Install backend dependencies
cd backend
npm install
```

### 2. Environment Variables

Create `backend/.env` with the following (see `._docs/environment-variables.md` for details):

```env
# Required for Feature 3.1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NANO_BANANA_API_KEY=your_api_key_here
NANO_BANANA_API_URL=https://api.nanobanana.ai/v1

# Other required vars
DATABASE_URL=postgresql://...
SESSION_SECRET=your_session_secret
```

**Note**: For testing, you can use placeholder values. The API will fail gracefully with invalid keys.

### 3. Database Setup

Run the migration to create the `image_generation_jobs` table:

```bash
cd backend
npm run migrate
```

Verify the table was created:
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'image_generation_jobs';

-- Check indexes were created
SELECT indexname FROM pg_indexes
WHERE tablename = 'image_generation_jobs';
```

### 4. Supabase Storage Setup

Create the asset images bucket:

```bash
cd backend
npm run setup:bucket
```

**Important**: Configure RLS policies in Supabase Dashboard:

1. Go to **Storage** → **asset-images** bucket
2. Go to **Policies** tab
3. Add these policies:

```sql
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
```

## Testing Instructions

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Wizardirector API server running on port 3001
✅ /api/images routes registered
```

### 2. Run Unit Tests

```bash
cd backend
npm test
```

Tests cover:
- ✅ Job creation returns immediately (< 500ms)
- ✅ State transition tracking
- ✅ Idempotency handling
- ✅ Error classification

### 3. API Testing with cURL

#### Create a Test Job

First, get an auth token (you'll need a valid session). For testing, you can create a test endpoint or use the frontend.

Example API call:

```bash
# Create a test job (replace with real project/branch IDs)
curl -X POST http://localhost:3001/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "projectId": "test-project-id",
    "branchId": "test-branch-id",
    "jobType": "master_asset",
    "prompt": "A beautiful sunset over mountains",
    "width": 512,
    "height": 512,
    "idempotencyKey": "test-key-123"
  }'
```

Expected response:
```json
{
  "jobId": "uuid-here",
  "status": "queued"
}
```

#### Poll Job Status

```bash
# Replace jobId with the one from above
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3001/api/images/jobs/{jobId}
```

Expected responses:
- **Processing**: `{"status": "processing"}`
- **Completed**: `{"status": "completed", "publicUrl": "https://..."}`
- **Failed**: `{"status": "failed", "error": {...}}`

### 4. Frontend Integration Testing

#### Update Frontend Environment

Create `.env.local` in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:3001
```

#### Test Image Generation

In your frontend application:

```typescript
import { imageService } from '@/lib/services/imageService';

// Test Stage 5 asset image key generation
const result = await imageService.generateAssetImageKey(
  'your-project-id',
  'A medieval knight in shining armor',
  'optional-visual-style-id'
);

console.log('Generated image URL:', result.imageUrl);
```

The frontend will:
1. Create job (immediate return)
2. Poll status every second for up to 60 seconds
3. Return public URL when complete

### 5. Database Verification

Monitor job progress in the database:

```sql
-- Watch job states
SELECT
  id,
  status,
  failure_stage,
  attempt_count,
  created_at,
  completed_at
FROM image_generation_jobs
ORDER BY created_at DESC
LIMIT 5;

-- Check cost tracking
SELECT
  job_type,
  status,
  cost_credits,
  estimated_cost
FROM image_generation_jobs
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### 6. Error Testing

Test error scenarios:

#### Invalid API Key
Set `NANO_BANANA_API_KEY=invalid` and create a job. Should fail with `AUTH_ERROR`.

#### Network Issues
Temporarily disconnect internet and create a job. Should retry and eventually fail with `TEMPORARY` error.

#### Idempotency
Send the same request twice with the same `idempotencyKey`. Should return the same job ID.

## Verification Checklist

### ✅ Backend Setup
- [ ] `npm install` completed without errors
- [ ] Environment variables configured
- [ ] Database migration ran successfully
- [ ] Storage bucket created
- [ ] RLS policies configured
- [ ] Server starts without errors

### ✅ API Testing
- [ ] `POST /api/images/generate` returns job ID immediately
- [ ] `GET /api/images/jobs/:id` returns status updates
- [ ] Job progresses through states: queued → processing → generating → uploading → completed
- [ ] Failed jobs include error details and failure stage

### ✅ Frontend Integration
- [ ] Frontend can create jobs
- [ ] Polling works correctly
- [ ] Completed jobs return public URLs
- [ ] Failed jobs show error messages

### ✅ Database Integrity
- [ ] Jobs stored with correct metadata
- [ ] Idempotency prevents duplicates
- [ ] Cost tracking works
- [ ] Indexes improve query performance

### ✅ Error Handling
- [ ] Invalid API keys fail gracefully
- [ ] Network errors trigger retries
- [ ] Storage failures recorded correctly
- [ ] Frontend handles all error states

## Troubleshooting

### Job Stuck in "queued" State
```sql
SELECT id, status, created_at FROM image_generation_jobs
WHERE status = 'queued' AND created_at < NOW() - INTERVAL '5 minutes';
```
- Check backend logs for errors
- Verify Nano Banana API key is set
- Restart backend server

### Storage Upload Failures
```sql
SELECT id, error_message, failure_stage FROM image_generation_jobs
WHERE failure_stage = 'uploading';
```
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check RLS policies are configured
- Ensure bucket exists and is public

### Polling Timeouts
- Increase `maxAttempts` in `pollJobStatus` method (currently 60)
- Check backend logs for job completion
- Verify job hasn't failed silently

### Test Failures
```bash
cd backend
npm run test -- --verbose
```
- Check test output for specific failures
- Verify environment variables are set for tests

## Performance Benchmarks

Expected performance:
- **Job creation**: < 500ms response time
- **API calls**: < 30 seconds for image generation
- **Polling overhead**: Minimal (1 request/second)
- **Storage upload**: < 5 seconds for typical images

## Next Steps

1. **Configure production API keys**
2. **Set up monitoring dashboards**
3. **Implement user-facing retry buttons**
4. **Add cost alerts and budgeting**
5. **Deploy background workers for scale**

## Files Created in This Implementation

### Backend
- `backend/migrations/006_image_generation_jobs.sql`
- `backend/scripts/setup-asset-images-bucket.ts`
- `backend/src/services/image-generation/ImageProviderInterface.ts`
- `backend/src/services/image-generation/NanoBananaClient.ts`
- `backend/src/services/image-generation/ImageGenerationService.ts`
- `backend/src/routes/images.ts`
- `backend/src/tests/image-generation.test.ts`

### Frontend
- `src/lib/services/imageService.ts` (updated)

### Documentation
- `._docs/environment-variables.md`
- `._docs/feature-3.1-implementation-guide.md`
- `._docs/feature-3.1-implementation-summary.md`

The implementation is **production-ready** for MVP deployment with seamless migration path to async execution at scale.
