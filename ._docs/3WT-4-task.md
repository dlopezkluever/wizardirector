
  Worktree: WT-4
  Tasks (sequential within): 3A.2 → 3A.3  → 3A.6
  Files: Stage 5 files
  Rationale: Natural chain: deferal → manual add  → delete image -> ditching "locking" & add caraousel option. All modify Stage5Assets.tsx + projectAssets.ts


#### 3A.2 — Sidelined Assets System
**Ticket**: 5.4
**Priority**: HIGH

**Purpose**: Make asset removal have the option for non-destructive deferal; — "defer" not deleted.

**Problem/Context**: Removing an asset in Stage 5 currently deletes it, which is dangerous for items . Sidelined assets should be hidden from the Stage 5 workflow but maintained in the database with their scene info preserved. They remain available for use in later stages (Stage 8, 10) where the LLM generates them on-the-fly from script context. Users should be able to retrieve sidelined assets if they change their mind.

**Core Features:**
- [ ] Add `defer` boolean flag to assets (or status field)
- [ ] Hide defered assets from Stage 5 active workflow
- [ ] Preserve all scene info and metadata for defer assets
- [ ] "Restore" action to bring sidelined assets back
- [ ] Allow Stage 8/10 to access sidelined asset data for context

**Dependencies**: 3A.1 (filter modal provides the primary UI for sidelining).

Possible Deferal method: Maybe in the Pop up asset extraction modal (that appears in stage 5 after pressing extract assets), we could have 3 options (think like there columns):
1. Keep/select
2. DEFER (meaning, the asset is real, but I don't want to worry about it yet)
3. DELETE (meaning, this asset is incorrect, something in the extraction process went wrong OR it's such a minor detail,)

All assets should start defaulted as Keep; and the user needs to move to either defer or delete an asset.
(maybe add a little section in the ui that lists the "Defered" assets (with thier scenes next to it as well))

These defered assets should appear in stage 8, but if it's the first time scene, then they will obviously have no master reference (the scenes afterwhich should show the scene instance images generated/uploaded from the past scenes it was in)

---

#### 3A.3 — Manual Asset Addition
**Ticket**: 5.5
**Priority**: HIGH

**Purpose**: Allow users to add assets that extraction missed.

**Problem/Context**: Automated extraction will inevitably miss some assets. Users need the ability to manually add characters, props, or locations that are important to their story.

**Core Features:**
- [ ] "Add Asset" button/form in Stage 5
- [ ] Support all asset types (character, prop, location)
- [ ] Manual assets integrate seamlessly with extracted assets
- [ ] Manual assets appear in scene dependency mappings
- [ ] Manual additions preserved across re-extraction (cache invalidation shouldn't delete them)

**Dependencies**: 3A.1 (extraction system should be in place first).

---

#### 3A.6 — Delete Uploaded Image for an Asset
**Ticket**: 5.12
**Priority**: LOW

**Purpose**: Allow users to remove a predetermined uploaded image.

**Problem/Context**: If a user uploads an image but later decides they don't want to predetermine that asset's appearance, there's no way to remove the uploaded image.

**Core Features:**
- [ ] "Remove Image" action on assets with uploaded images
- [ ] Revert asset to description-only state
- [ ] Clean up storage for removed images

*Note*: if a user uploads an image to an asset, they can choose to delete it is all im saying, for any and all of the images uploaded (if we do the carousel, which we should- So
We also need to be able to replicate the same carousel functionality for assets as stage 8. Users Can generate and upload images, and they stored. Users get up to say 4. (obviously they are to be encouraged to delete any image geenerated that doesn't sit riht with them; is totally off the mark) (This could be especially key for characters / assets that undergo massive change throughout the story. )


## Let's Also Do this: 

Additionally, get rid of such the permenant locking of stage 5 assets, in that, there's no need to have them be locked and then it's totally impossible to edit them. 


Task: 3A.2  Primary Files: projectAssets.ts, Stage5Assets.tsx, asset.ts, DB migration

Task: 3A.3 Primary Files: projectAssets.ts, Stage5Assets.tsx, projectAssetService.ts

Task: 3A.6:  Primary Files: projectAssets.ts, Stage5Assets.tsx, projectAssetService.ts
