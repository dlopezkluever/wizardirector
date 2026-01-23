# Testing Visual Style Capsule Reference Image Influence

This guide explains how to test whether reference images from visual style capsules are properly influencing image generation.

## Prerequisites

1. **Backend server running**: `cd backend && npm run dev`
2. **Frontend running**: `npm run dev` (from root)
3. **A visual style capsule with reference images** (see Step 1 below)
4. **Authentication**: You need to be logged in

## Step 1: Find or Create a Visual Style Capsule with Reference Images

### Option A: Check Existing Capsules

1. Go to the Style Capsule Library in the UI (`/style-capsules`)
2. Look for visual style capsules that have reference images uploaded
3. Note the capsule ID (you can get this from the browser's developer tools or use the debug endpoint)

### Option B: Create a Test Capsule

1. Go to `/style-capsules` in the UI
2. Create a new Visual Style Capsule
3. Upload 2-3 reference images that have a distinctive style (e.g., cyberpunk, watercolor, film noir)
4. Add some text descriptors if desired
5. Save the capsule and note its ID

### Option C: Query Database Directly

```sql
-- Find visual style capsules with reference images
SELECT id, name, reference_image_urls, descriptors, design_pillars
FROM style_capsules
WHERE type = 'visual'
  AND reference_image_urls IS NOT NULL
  AND array_length(reference_image_urls, 1) > 0
LIMIT 5;
```

## Step 2: Use the Debug Endpoint

First, verify what data your capsule has:

```bash
# Get your auth token from browser dev tools (Application > Cookies > sb-<project>-auth-token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/images/debug-style-capsule/YOUR_CAPSULE_ID
```

This will show you:
- Whether reference images exist
- How many images
- What text descriptors/pillars are available
- Diagnostic information about what will be used

**Expected output:**
```json
{
  "capsuleId": "...",
  "name": "My Test Capsule",
  "hasReferenceImages": true,
  "referenceImageCount": 2,
  "referenceImageUrls": ["https://..."],
  "diagnostic": {
    "textContextAvailable": true,
    "imageContextAvailable": true,
    "willUseImages": true
  }
}
```

## Step 3: Test Using the Test Script

The automated test script generates images and compares results:

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npx tsx backend/scripts/test-style-capsule-influence.ts YOUR_CAPSULE_ID "A futuristic robot character"
```

**What it does:**
1. Fetches the capsule data
2. Generates an image using the capsule (with reference images)
3. Shows you the job ID and final image URL
4. Saves results to a JSON file

**Expected output:**
```
🧪 Visual Style Capsule Influence Test
=====================================

Capsule ID: abc-123...
Test Prompt: A futuristic robot character

📊 Capsule Analysis:
  Name: Cyberpunk Style
  Has Text Descriptors: true (3 items)
  Has Design Pillars: true (2 items)
  Has Reference Images: true (2 images)

🔄 Test 1: Generating with reference images (NEW implementation)...
  ✅ Job created: job-123...
  📝 Polling for completion...
  ✅ Completed! URL: https://...
```

## Step 4: Manual Testing - Stage 5 Asset Generation

1. **Create or open a project** and navigate to Stage 5 (Assets)
2. **Select a visual style capsule** that has reference images
3. **Generate an image** for an asset (character, prop, or location)
4. **Check the backend logs** for these messages:

```
[ImageService] Style capsule abc-123 data: {
  hasReferenceImages: true,
  referenceImageCount: 2,
  referenceImageUrls: ['https://...']
}
[ImageService] Found 2 reference image(s) - will be sent to API
[NanoBanana] Processing 2 reference image(s)...
[NanoBanana] Successfully processed reference image 1/2: https://...
[NanoBanana] Successfully processed reference image 2/2: https://...
[NanoBanana] Reference image processing complete: 2 succeeded, 0 failed
[NanoBanana] API Request Details: {
  hasReferenceImages: true,
  referenceImageCount: 2,
  successfullyProcessedImages: 2,
  finalPrompt: "Generate an image that matches the visual style..."
}
```

5. **Compare the generated image** with the reference images - it should show similar:
   - Color palette
   - Art style (e.g., painterly, photorealistic, animated)
   - Mood/atmosphere
   - Lighting style

## Step 5: Manual Testing - Global Asset Library

1. **Go to the Asset Library** (create or edit a global asset)
2. **Select a visual style capsule** with reference images
3. **Click "Generate Image"**
4. **Check the same backend logs** as in Step 4
5. **Compare the result** with the reference images

## Step 6: Verify Logs Show Reference Images Are Being Sent

### Key Log Messages to Look For:

✅ **Good signs (working correctly):**
```
[ImageService] Found 2 reference image(s) - will be sent to API
[NanoBanana] Processing 2 reference image(s)...
[NanoBanana] Successfully processed reference image 1/2: ...
[NanoBanana] Reference image processing complete: 2 succeeded, 0 failed
[NanoBanana] API Request Details: {
  successfullyProcessedImages: 2,
  finalPrompt: "Generate an image that matches the visual style..."
}
```

❌ **Bad signs (not working):**
```
[ImageService] WARNING: Style capsule has 2 reference image(s) but they are NOT being sent to the API
[NanoBanana] API Request Details: {
  hasReferenceImages: false,
  referenceImageCount: 0,
  successfullyProcessedImages: 0
}
```

## Step 7: Test Edge Cases

### Test 1: Capsule with No Reference Images
- Use a capsule with only text descriptors
- Should fall back to text-only style context
- Logs should show: `hasReferenceImages: false`

### Test 2: Capsule with Broken Image URLs
- Create a capsule with invalid image URLs
- Should gracefully handle errors and continue with text context
- Logs should show: `Reference image processing complete: 0 succeeded, 2 failed`

### Test 3: Capsule with Both Images and Text
- Use a capsule with both reference images AND text descriptors
- Should use both: images sent to API + text in prompt
- Logs should show both image processing AND text context

## Step 8: Visual Comparison

The most important test is visual comparison:

1. **Look at the reference images** in your style capsule
2. **Generate an asset image** using that capsule
3. **Compare side-by-side:**
   - Do the colors match?
   - Does the art style match?
   - Does the mood/atmosphere match?
   - Does the lighting style match?

**If the generated image looks similar to the reference images**, the system is working correctly!

## Troubleshooting

### Issue: Reference images not being processed

**Check:**
1. Are the image URLs accessible? (Try opening them in a browser)
2. Are the URLs public? (Supabase storage URLs need to be public)
3. Check backend logs for download errors

**Fix:**
- Ensure image URLs are publicly accessible
- Check that images are uploaded to Supabase storage correctly
- Verify the URLs in the database match the actual storage paths

### Issue: Images processed but generation doesn't match style

**Possible causes:**
1. Prompt construction might need improvement
2. Gemini API might need more explicit instructions
3. Reference images might not be distinctive enough

**Next steps:**
- Check the final prompt in logs - does it emphasize style matching?
- Try with more distinctive reference images
- Consider adding more explicit style descriptors

### Issue: Test script fails

**Check:**
1. Is the backend server running?
2. Is the Supabase connection configured?
3. Do you have a valid capsule ID?

**Fix:**
- Ensure backend is running: `cd backend && npm run dev`
- Check `.env` file has correct Supabase credentials
- Verify capsule ID exists in database

## Success Criteria

✅ **The implementation is working if:**
1. Backend logs show reference images are being downloaded and processed
2. API request logs show `successfullyProcessedImages > 0`
3. Generated images show visual similarity to reference images
4. No errors in processing reference images
5. Both Stage 5 and global asset generation work

## Next Steps After Testing

1. **Document findings**: Note which capsules work best
2. **Refine prompts**: If style matching isn't strong enough, adjust prompt construction
3. **Test with different styles**: Try various visual styles to ensure it works broadly
4. **Performance testing**: Test with many reference images (5+) to check performance


Yes—the improvements apply to both Stage 5 project asset generation and global asset generation.
Both code paths use the same updated logic:
Stage 5 (Project Assets) — Uses executeJobInBackground() which:
Calls getVisualStyleContext() (now fetches reference images)
Passes referenceImages to provider.generateImage()
Global Assets — Uses executeGlobalAssetJobInBackground() which:
Calls the same getVisualStyleContext() method
Passes referenceImages to provider.generateImage()
Both call the same getVisualStyleContext() method that:
Fetches reference_image_urls from the database
Returns both text context and reference images
Passes them to NanoBananaClient.generateImage()
So when you generate images in Stage 5 for project assets, the reference images from the visual style capsule should be sent to the Gemini API, just like with global assets.
To verify Stage 5, generate an asset image in Stage 5 and check the backend logs for the same messages:
[ImageService] Found X reference image(s) - will be sent to API
[NanoBanana] Processing X reference image(s)...
[NanoBanana] Successfully processed reference image...
Both paths should now show stronger style influence.