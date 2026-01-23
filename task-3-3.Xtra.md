<!-- 6ae8ee7d-73f5-45ac-b6a1-436cb2da22d5 4b3c140e-cdef-4b38-a323-71f30668961e -->
# Asset Match Modal Implementation Plan

## Overview

Implement Task 3 from the plan: Create `AssetMatchModal.tsx` component that allows users to match global assets with extracted project assets using dropdowns, with description merging strategies and image regeneration options.

## Architecture

### Component Flow

```
AssetDrawer (Clone Button Click)
  ↓
Check if extracted assets exist
  ↓
Yes → Open AssetMatchModal
  ↓
User selects match + strategy
  ↓
Enhanced clone endpoint (with matching)
  ↓
Update/replace extracted asset
```

### Data Flow

```
Global Asset → Match Modal → User Selection → Enhanced Clone Endpoint
                                                      ↓
                                    Description Merger Service (if merge strategy)
                                                      ↓
                                    Image Generation Service (if regenerate)
                                                      ↓
                                    Update/Replace Project Asset
```

## Implementation Tasks

### 1. Create AssetMatchModal Component

**File:** `src/components/pipeline/AssetMatchModal.tsx`

**Features:**

- Display global asset preview (name, image, description)
- Dropdown to select extracted project asset to match with
- Description strategy selector (global/project/merge) - RadioGroup or Select
- Image regeneration toggle (Switch/Checkbox)
- "Clone Without Matching" button (existing behavior)
- "Match & Clone" button (new behavior)
- Loading states during clone operation

**Props:**

```typescript
interface AssetMatchModalProps {
  globalAsset: GlobalAsset;
  projectAssets: ProjectAsset[]; // Extracted assets only
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onMatched: (asset: ProjectAsset) => void; // Called after successful match
  onClonedWithoutMatch: (asset: ProjectAsset) => void; // Existing behavior
}
```

**UI Structure:**

- Dialog with two-column layout (or stacked on mobile)
- Left: Global asset preview card
- Right: Matching controls (dropdown, strategy selection, toggles, buttons)
- Group extracted assets by type in dropdown

### 2. Create Description Merger Service

**File:** `backend/src/services/assetDescriptionMerger.ts`

**Function:**

```typescript
export async function mergeDescriptions(
  globalDescription: string,
  projectDescription: string,
  strategy: 'global' | 'project' | 'merge'
): Promise<string>
```

**Implementation:**

- `'global'`: Return global description as-is
- `'project'`: Return project description as-is  
- `'merge'`: Use LLM (OpenAI/Anthropic) to intelligently combine descriptions
  - Prompt: "Combine these two descriptions. Use the global description as the base/primary definition, and incorporate relevant details from the project description as additions or modifications. Create a coherent, unified description."
  - Fallback: Simple concatenation if LLM fails

### 3. Enhance Clone Endpoint

**File:** `backend/src/routes/projectAssets.ts`

**Update:** `POST /api/projects/:projectId/assets/clone-from-global`

**New Request Body:**

```typescript
{
  globalAssetId: string;
  matchWithAssetId?: string; // Optional: ID of extracted asset to match/replace
  descriptionStrategy?: 'global' | 'project' | 'merge';
  regenerateImage?: boolean; // If true, regenerate using merged description
  overrideDescription?: string; // Manual override (existing, takes precedence)
  target_branch_id?: string; // Existing
}
```

**Logic:**

- If `matchWithAssetId` provided:
  - Fetch the extracted asset
  - Merge descriptions using `assetDescriptionMerger` based on `descriptionStrategy`
  - If `regenerateImage` is true:
    - Use global asset's image as reference
    - Generate new image with merged description (via ImageGenerationService)
  - If `regenerateImage` is false:
    - Localize global asset's image (existing behavior)
  - **Update** the extracted asset instead of creating new one
  - Set `global_asset_id` to link them
- If `matchWithAssetId` not provided:
  - Clone as new asset (existing behavior)

### 4. Update ImageGenerationService for Reference Images

**File:** `backend/src/services/image-generation/ImageGenerationService.ts`

**Enhancement:**

- Add optional `referenceImageUrl` parameter to generation methods
- Pass reference image to Nano Banana API (if supported) or include in prompt
- For merged assets: use global asset's image as reference, merged description as prompt

### 5. Update Frontend Service

**File:** `src/lib/services/projectAssetService.ts`

**Update:** `cloneFromGlobal` method signature:

```typescript
async cloneFromGlobal(
  projectId: string,
  globalAssetId: string,
  options?: {
    overrideDescription?: string;
    targetBranchId?: string;
    matchWithAssetId?: string;
    descriptionStrategy?: 'global' | 'project' | 'merge';
    regenerateImage?: boolean;
  }
): Promise<ProjectAsset>
```

### 6. Update AssetDrawer Integration

**File:** `src/components/pipeline/AssetDrawer.tsx`

**Changes:**

- Update `handleCloneAsset` to:

  1. Fetch extracted project assets using `projectAssetService.listAssets(projectId)`
  2. Filter to only extracted assets (those without `global_asset_id`)
  3. If extracted assets exist: open `AssetMatchModal` instead of directly cloning
  4. If no extracted assets: clone directly (existing behavior)

- Add state for modal (open/close, selected global asset)
- Pass extracted assets to modal

### 7. Add Type Definitions

**File:** `src/types/asset.ts`

**Add:**

```typescript
export interface AssetMatchResult {
  projectAsset: ProjectAsset;
  matched: boolean; // true if matched with existing, false if cloned new
}

export interface CloneAssetRequest {
  globalAssetId: string;
  overrideDescription?: string;
  target_branch_id?: string;
  matchWithAssetId?: string;
  descriptionStrategy?: 'global' | 'project' | 'merge';
  regenerateImage?: boolean;
}
```

## Files to Create/Modify

**New Files:**

- `src/components/pipeline/AssetMatchModal.tsx`
- `backend/src/services/assetDescriptionMerger.ts`

**Modified Files:**

- `src/components/pipeline/AssetDrawer.tsx` - Add modal integration
- `src/lib/services/projectAssetService.ts` - Update cloneFromGlobal signature
- `backend/src/routes/projectAssets.ts` - Enhance clone endpoint
- `backend/src/services/image-generation/ImageGenerationService.ts` - Add reference image support
- `src/types/asset.ts` - Add new types

## UI/UX Considerations

- Use shadcn/ui components: Dialog, Select, RadioGroup, Switch, Button
- Show loading states during clone/match operation
- Display preview of global asset (image, name, description)
- Group extracted assets by type in dropdown for easier selection
- Clear labels for description strategies
- Tooltips/help text explaining merge strategy
- Error handling with toast notifications

## Testing Considerations

- Test modal opens when extracted assets exist
- Test modal doesn't open when no extracted assets
- Test all description strategies (global/project/merge)
- Test image regeneration toggle
- Test "Clone Without Matching" option
- Test matching with existing extracted asset
- Test error handling (LLM failure, image generation failure)
- Test with assets that have no images

### To-dos

- [ ] Create AssetMatchModal.tsx component with dropdown matching interface, description strategy selection, and image regeneration toggle
- [ ] Create assetDescriptionMerger.ts service with LLM-based merging for merge strategy
- [ ] Update clone-from-global endpoint to support matchWithAssetId, descriptionStrategy, and regenerateImage parameters
- [ ] Add referenceImageUrl support to ImageGenerationService for merged asset regeneration
- [ ] Update projectAssetService.cloneFromGlobal to accept new matching options
- [ ] Update AssetDrawer to check for extracted assets and open AssetMatchModal when they exist
- [ ] Add AssetMatchResult and enhanced CloneAssetRequest types to asset.ts