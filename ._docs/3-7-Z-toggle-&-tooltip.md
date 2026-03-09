# Plan: "Use as Reference" Toggle for Stage 10, Stage 8 Generate, Stage 8 Transforms

## Context
Following the "Use as ref" toggle added to `EnhancedUploadModal` (Stage 5/8 upload flow, default ON), we're extending the same pattern to three more locations where image (re)generation happens. The toggle lets users opt-in to passing the current image as a style/composition reference when regenerating — keeping the output closer to what they already have.

**Consistent rule**: Toggle only appears when an image already exists (i.e., re-generation, not first generation). Default: **OFF** for all three locations.

---

## Location 1: Stage 10 Frame Regeneration

### Files to Modify

| File | Role |
|------|------|
| `src/components/pipeline/FramePanel.tsx` | UI: toggle + updated callback signatures |
| `src/components/pipeline/Stage10FrameGeneration.tsx` | Wiring: mutations accept optional referenceImageUrl |
| `src/lib/services/frameService.ts` | Frontend service: thread referenceImageUrl to POST body |
| `backend/src/routes/frames.ts` | Backend routes: extract from req.body, pass to service |
| `backend/src/services/frameGenerationService.ts` | Backend service: inject into refImages array |

### Changes

**A. `FramePanel.tsx` — UI + prop signatures**

Update callback prop types (lines 84-87):
```ts
onRegenerate: (options?: { referenceImageUrl?: string }) => void;
onRegenerateWithCorrection?: (correction: string, options?: { referenceImageUrl?: string }) => void;
onRegenerateWithEditedPrompt?: (prompt: string, options?: { referenceImageUrl?: string }) => void;
```

Add state:
```ts
const [useCurrentAsRef, setUseCurrentAsRef] = useState(false);
```

Add checkbox at top of regen options panel (line 806, inside the `showRegenOptions && canRegenerate` block), before the correction textarea:
```tsx
{frame?.imageUrl && (
  <div className="flex items-center gap-1.5 pb-1">
    <Checkbox id={`use-ref-${frameType}`} checked={useCurrentAsRef}
      onCheckedChange={(c) => setUseCurrentAsRef(c === true)} />
    <label htmlFor={`use-ref-${frameType}`}
      className="text-[10px] text-muted-foreground cursor-pointer select-none">
      Use current image as reference
    </label>
  </div>
)}
```

Update all three submit handlers to pass `referenceImageUrl` when toggle is on:
- `handleRegenClick` → "Re-roll" path (line 833): `onRegenerate(useCurrentAsRef && frame?.imageUrl ? { referenceImageUrl: frame.imageUrl } : undefined)`
- `handleCorrectionSubmit` (line 243): pass `options` as second arg
- `handleManualPromptSubmit` (line 251): pass `options` as second arg

Import `Checkbox` from `@/components/ui/checkbox` (Tooltip already imported in this file).

**B. `Stage10FrameGeneration.tsx` — mutation wiring**

Update `regenerateMutation` (line 232-238):
```ts
mutationFn: ({ frameId, referenceImageUrl }: { frameId: string; referenceImageUrl?: string }) =>
  frameService.regenerateFrame(projectId, sceneId, frameId, referenceImageUrl),
```

Update `regenerateWithCorrectionMutation` (line 267-273):
```ts
mutationFn: ({ frameId, correction, referenceImageUrl }: { frameId: string; correction: string; referenceImageUrl?: string }) =>
  frameService.regenerateWithCorrection(projectId, sceneId, frameId, correction, referenceImageUrl),
```

Update `regenerateWithPromptMutation` (line 276-282):
```ts
mutationFn: ({ frameId, prompt, referenceImageUrl }: { frameId: string; prompt: string; referenceImageUrl?: string }) =>
  frameService.regenerateWithPrompt(projectId, sceneId, frameId, prompt, referenceImageUrl),
```

Update FramePanel callback props (lines 959-975 for start frame, similar for end frame):
```tsx
onRegenerate={(options) =>
  selectedShot.startFrame &&
  regenerateMutation.mutate({ frameId: selectedShot.startFrame.id, referenceImageUrl: options?.referenceImageUrl })
}
onRegenerateWithCorrection={(correction, options) =>
  selectedShot.startFrame &&
  regenerateWithCorrectionMutation.mutate({
    frameId: selectedShot.startFrame.id, correction, referenceImageUrl: options?.referenceImageUrl
  })
}
onRegenerateWithEditedPrompt={(prompt, options) =>
  selectedShot.startFrame &&
  regenerateWithPromptMutation.mutate({
    frameId: selectedShot.startFrame.id, prompt, referenceImageUrl: options?.referenceImageUrl
  })
}
```

**C. `frameService.ts` — add optional param to all three methods**

`regenerateFrame` (line 195): add `referenceImageUrl?: string` param, include in POST body `{ referenceImageUrl }`.

`regenerateWithCorrection` (line 303): add `referenceImageUrl?: string` param, include in POST body `{ correction, referenceImageUrl }`.

`regenerateWithPrompt` (line 331): add `referenceImageUrl?: string` param, include in POST body `{ prompt, referenceImageUrl }`.

**D. `backend/src/routes/frames.ts` — extract and pass through**

Route `POST /:frameId/regenerate` (line 329): extract `const { referenceImageUrl } = req.body;`, pass as new 7th arg to `frameGenerationService.regenerateFrame()`.

Route `POST /:frameId/regenerate-with-correction` (line 670): extract `const { correction, referenceImageUrl } = req.body;`, pass to service.

Route `POST /:frameId/regenerate-with-prompt` (line 761): extract `const { prompt, referenceImageUrl } = req.body;`, pass to service.

**E. `backend/src/services/frameGenerationService.ts` — inject into refImages**

Update `regenerateFrame` signature (line 803):
```ts
async regenerateFrame(
    frameId: string,
    projectId: string,
    branchId: string,
    sceneId: string,
    visualStyleCapsuleId?: string,
    aspectRatio: string = '16:9',
    referenceImageUrl?: string  // NEW — 7th positional param
): Promise<Frame>
```

In the generic generation path (after line 989, where `refImages` is built), prepend the user's reference if provided:
```ts
if (referenceImageUrl) {
    refImages.unshift({ url: referenceImageUrl, role: 'style' as const });
}
```

This places it before identity refs, giving the image provider the composition reference with highest priority. Role `'style'` signals composition/style guidance, distinct from `'identity'` refs for character/prop consistency.

---

## Location 2: Stage 8 Scene Asset "Generate Image"

### Files to Modify

| File | Role |
|------|------|
| `src/components/pipeline/Stage8/VisualStateEditorPanel.tsx` | UI: toggle next to Generate Image button + updated prop |
| `src/components/pipeline/Stage8/Stage8VisualDefinition.tsx` | Wiring: pass referenceImageUrl to service |
| `src/lib/services/sceneAssetService.ts` | Frontend service: add param to generateSceneAssetImage |
| `backend/src/routes/sceneAssets.ts` | Backend route: extract referenceImageUrl from body |

### Changes

**A. `VisualStateEditorPanel.tsx` — UI + prop update**

Update `onGenerateImage` prop type (line 54):
```ts
onGenerateImage: (instanceId: string, referenceImageUrl?: string) => void;
```

Add state:
```ts
const [useCurrentAsRef, setUseCurrentAsRef] = useState(false);
```

Add toggle next to the "Generate Image" button (inside the flex row at line 504), only when `selectedAsset.image_key_url` exists:
```tsx
{selectedAsset.image_key_url && (
  <div className="flex items-center gap-1.5">
    <Checkbox id="use-ref-scene-gen" checked={useCurrentAsRef}
      onCheckedChange={(c) => setUseCurrentAsRef(c === true)} />
    <label htmlFor="use-ref-scene-gen"
      className="text-[10px] text-muted-foreground cursor-pointer select-none">
      Use as ref
    </label>
  </div>
)}
```

Update button onClick (line 508):
```tsx
onClick={() => onGenerateImage(
  selectedAsset.id,
  useCurrentAsRef ? selectedAsset.image_key_url : undefined
)}
```

Import `Checkbox` from `@/components/ui/checkbox`.

**B. `Stage8VisualDefinition.tsx` — wiring**

Update `handleGenerateImage` (around line 638) to accept and pass `referenceImageUrl`:
```ts
const handleGenerateImage = async (instanceId: string, referenceImageUrl?: string) => {
  // ...
  const { jobId } = await sceneAssetService.generateSceneAssetImage(projectId, sceneId, instanceId, referenceImageUrl);
  // ... (polling unchanged)
};
```

**C. `sceneAssetService.ts` — add param**

Update `generateSceneAssetImage` (around line 297):
```ts
async generateSceneAssetImage(
  projectId: string, sceneId: string, instanceId: string,
  referenceImageUrl?: string  // NEW
): Promise<{ jobId: string; status: string }>
```
Include in POST body: `body: JSON.stringify(referenceImageUrl ? { referenceImageUrl } : {})`.

**D. `backend/src/routes/sceneAssets.ts` — extract and use**

Route `POST /:instanceId/generate-image` (around line 350):
- Extract `const { referenceImageUrl } = req.body || {};`
- Pass to `imageService.createSceneAssetImageJob()` or add as explicit `referenceImageUrl` in the `createImageJob()` call (check which is used and thread accordingly)

---

## Location 3: Stage 8 Transformation Post-Image

### Files to Modify

| File | Role |
|------|------|
| `src/components/pipeline/Stage8/TransformationEventCard.tsx` | UI: toggle next to Generate Image button |
| `src/components/pipeline/Stage8/VisualStateEditorPanel.tsx` | Wiring: updated callback + handler |
| `src/lib/services/transformationEventService.ts` | Frontend service: add param |
| `backend/src/routes/sceneAssets.ts` | Backend route: extract referenceImageUrl |

### Changes

**A. `TransformationEventCard.tsx` — UI + prop update**

Update `onGeneratePostImage` prop (line 28):
```ts
onGeneratePostImage?: (eventId: string, referenceImageUrl?: string) => void;
```

Add state:
```ts
const [usePostImageAsRef, setUsePostImageAsRef] = useState(false);
```

Add toggle next to the "Generate Image" button (line 201-216), only when `event.post_image_key_url` exists:
```tsx
{event.post_image_key_url && (
  <div className="flex items-center gap-1.5">
    <Checkbox id={`use-ref-transform-${event.id}`} checked={usePostImageAsRef}
      onCheckedChange={(c) => setUsePostImageAsRef(c === true)} />
    <label htmlFor={`use-ref-transform-${event.id}`}
      className="text-[10px] text-muted-foreground cursor-pointer select-none">
      Use as ref
    </label>
  </div>
)}
```

Update button onClick (line 205):
```tsx
onClick={() => onGeneratePostImage(event.id, usePostImageAsRef ? event.post_image_key_url : undefined)}
```

Import `Checkbox` from `@/components/ui/checkbox`.

**B. `VisualStateEditorPanel.tsx` — wiring**

Update `handleGeneratePostImage` (line 200) to accept and pass `referenceImageUrl`:
```ts
const handleGeneratePostImage = useCallback(async (eventId: string, referenceImageUrl?: string) => {
  // ...
  const { jobId } = await transformationEventService.generatePostImage(projectId, sceneId, eventId, referenceImageUrl);
  // ...
}, [projectId, sceneId]);
```

Update the prop passed to TransformationEventCard (line 713):
```tsx
onGeneratePostImage={handleGeneratePostImage}
```
(Already passes the handler — signature change flows through automatically.)

**C. `transformationEventService.ts` — add param**

Update `generatePostImage` (around line 157):
```ts
async generatePostImage(
  projectId: string, sceneId: string, eventId: string,
  referenceImageUrl?: string  // NEW
): Promise<{ jobId: string; status: string }>
```
Include in POST body: `body: JSON.stringify(referenceImageUrl ? { referenceImageUrl } : {})`.

**D. `backend/src/routes/sceneAssets.ts` — extract and use**

Route `POST /:eventId/generate-post-image` (around line 1942):
- Extract `const { referenceImageUrl: userReferenceImageUrl } = req.body || {};`
- If `userReferenceImageUrl` is provided, use it as the reference in the `createImageJob()` call (it already passes `referenceImageUrl` at line 2028 — conditionally override with user-provided value)

---

## Testing

### Unit Tests
- **`src/components/pipeline/__tests__/FramePanel.test.tsx`** (if exists, otherwise create): test toggle visibility (hidden when no image, shown when image exists), default OFF, callback receives referenceImageUrl when toggled on
- **Backend**: no new test files needed (existing route tests cover param threading if they exist)

### Verification
1. `npm run lint` — no new errors in modified files
2. `npm test` — all frontend tests pass
3. `cd backend && npm test` — all backend tests pass
4. Manual verification:
   - Stage 10: generate a frame → click Regenerate → verify toggle appears → toggle ON → Regenerate with Correction → verify network request includes `referenceImageUrl`
   - Stage 8 scene asset: generate image → click Generate Image again → verify toggle appears
   - Stage 8 transformation: generate post image → click Generate Image again → verify toggle appears
   - All toggles default OFF
   - Toggles hidden when no image exists yet
