# Feature 3.1: Image Generation Service - Implementation Guide

## Overview

This guide covers the implementation of the Nano Banana image generation service with job-tracked architecture designed for async migration.

## Architecture

### Key Design Principles
- **Deferred execution**: HTTP requests create jobs and return immediately
- **Job persistence**: All generation requests tracked in database with comprehensive state transitions
- **Provider isolation**: Nano Banana-specific logic contained in dedicated client module
- **Async-ready design**: Job model supports future webhook/worker migration
- **Idempotency**: Duplicate requests handled gracefully

### State Machine

Jobs progress through the following states:

```
queued → processing → generating → uploading → completed
                                              → failed
```

Failed jobs track the `failure_stage` (generating, uploading, or persisting).

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `axios` - HTTP client for Nano Banana API
- `uuid` - Generate unique job IDs

### 2. Configure Environment Variables

Add to `backend/.env`:

```env
NANO_BANANA_API_KEY=your_api_key_here
NANO_BANANA_API_URL=https://api.nanobanana.ai/v1
```

See `._docs/environment-variables.md` for complete configuration.

### 3. Run Database Migration

```bash
cd backend
npm run migrate
```

This creates the `image_generation_jobs` table with:
- Granular state tracking
- Idempotency key support
- Cost tracking (estimated vs actual)
- Failure stage tracking

### 4. Set Up Supabase Storage Bucket

```bash
cd backend
npm run setup:bucket
```

This creates the `asset-images` bucket with public read access.

**Important**: After running the script, configure RLS policies via Supabase Dashboard:

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

### 5. Verify Installation

Start the backend server:

```bash
cd backend
npm run dev
```

Check the console for:
- ✅ No module import errors
- ✅ Server running on port 3001
- ✅ `/api/images/generate` route registered

## API Usage

### Generate Image

**Request**:

```typescript
POST /api/images/generate
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "projectId": "uuid",
  "branchId": "uuid",
  "jobType": "master_asset",
  "prompt": "A medieval knight in shining armor",
  "visualStyleCapsuleId": "uuid", // optional
  "width": 512,
  "height": 512,
  "assetId": "uuid", // optional
  "idempotencyKey": "unique_key" // optional
}
```

**Response** (immediate):

```json
{
  "jobId": "uuid",
  "status": "queued"
}
```

### Poll Job Status

**Request**:

```typescript
GET /api/images/jobs/{jobId}
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "jobId": "uuid",
  "status": "completed",
  "publicUrl": "https://...",
  "cost": {
    "estimated": 0.01,
    "actual": 0.0095
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "completedAt": "2024-01-01T00:00:15Z"
}
```

If failed:

```json
{
  "jobId": "uuid",
  "status": "failed",
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid API key",
    "failureStage": "generating"
  }
}
```

## Frontend Integration

The frontend `imageService` automatically:
1. Creates job with idempotency key
2. Polls status every second (max 60 seconds)
3. Returns public URL when complete
4. Logs style capsule application for audit trail

```typescript
import { imageService } from '@/lib/services/imageService';

const result = await imageService.generateAssetImageKey(
  projectId,
  'A medieval castle on a hill',
  visualStyleCapsuleId
);

console.log('Generated image:', result.imageUrl);
```

## Storage Structure

Images are stored in Supabase Storage with the following structure:

```
asset-images/
  project_{projectId}/
    branch_{branchId}/
      master-assets/
        {assetId}_{timestamp}_{random}.png
      scene_{sceneId}/
        shot_{shotId}/
          start_frame_{timestamp}_{random}.png
          end_frame_{timestamp}_{random}.png
```

## Testing

### Prerequisites

Install test dependencies:

```bash
cd backend
npm install --save-dev ts-jest @jest/globals
```

### Run Tests

```bash
cd backend
npm test
```

### Test Configuration

Tests use a comprehensive Jest setup:

- **ES Module Support**: Configured for TypeScript and ES modules
- **Environment Loading**: Auto-loads `.env` file for Supabase credentials
- **Integration Tests**: Creates real Supabase Auth users and database records
- **Automatic Cleanup**: Removes test data after each test

### Jest Configuration Files

**jest.config.js**:
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    '^.+\\.m?js$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid))'],
  // ... additional config
};
```

**jest.setup.ts**:
```typescript
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '.env') });
jest.setTimeout(30000); // 30 seconds for integration tests
```

### Test Coverage

**30 tests passing** with comprehensive coverage:
- Job creation and immediate return (< 2 seconds for integration tests)
- State transition tracking (queued → processing → generating → uploading → completed)
- Idempotency handling with unique keys
- Error classification (AUTH_ERROR, TEMPORARY, RATE_LIMIT, etc.)
- Storage path generation for all job types
- Multiple job type support (master_asset, start_frame, end_frame, inpaint)
- Artifact conversion (base64, URL, buffer)
- Token utility functions
- Prompt template service integration
- Cost calculation and tracking

### Integration Test Setup

Tests create real Supabase resources:
1. **Auth Users**: Created via `supabase.auth.admin.createUser()`
2. **Projects**: Inserted with correct schema (`title`, `project_type`, etc.)
3. **Branches**: Created with `is_main` flag
4. **Image Jobs**: Full end-to-end job lifecycle

**Automatic Cleanup**: All test data removed after each test run.

## Migration to Async Execution

The architecture is ready for async migration. To scale:

1. **Add webhook endpoint**: `POST /api/webhooks/nano-banana`
2. **Deploy background worker**: Poll `status='queued'` jobs
3. **Add message queue** (optional): Bull/BullMQ for distributed execution

**No schema changes needed** - the job table already supports all states.

## Troubleshooting

### Job stuck in "queued" state

- Check backend console for errors
- Verify `NANO_BANANA_API_KEY` is set correctly
- Check network connectivity

### Job fails with "AUTH_ERROR"

- Verify Nano Banana API key is valid
- Check API key has correct permissions

### Storage upload fails

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check RLS policies are configured correctly
- Ensure bucket exists and is public

### Frontend polling timeout

- Increase `maxAttempts` in `pollJobStatus` method
- Check backend logs for job status
- Verify job hasn't failed silently

## Cost Tracking

Jobs track both estimated and actual costs:

- **Estimated cost**: Calculated before generation based on resolution
- **Actual cost**: Reported by Nano Banana API after generation

Query costs:

```sql
SELECT 
  job_type,
  AVG(cost_credits) as avg_cost,
  SUM(cost_credits) as total_cost,
  COUNT(*) as job_count
FROM image_generation_jobs
WHERE status = 'completed'
GROUP BY job_type;
```

## Monitoring

Key metrics to monitor:

- Average job completion time
- Failure rate by error code
- Cost per job type
- Storage usage

Query job stats:

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_sec
FROM image_generation_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## Next Steps

1. **Configure production API keys** - Use separate keys for dev/prod
2. **Set up monitoring** - Track job completion rates and errors
3. **Implement retry logic** - Allow users to retry failed jobs
4. **Add cost alerts** - Notify when spending exceeds threshold
5. **Deploy background worker** - Move to async execution for scale

