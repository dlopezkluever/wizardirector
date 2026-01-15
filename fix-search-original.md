Fix Search Original Plan:

Root Cause
Backend returns snake_case (example_text_excerpts), frontend expects camelCase (exampleTextExcerpts).

Solution: Add camelCase transformation in API response handler

Files to modify:

src/lib/services/styleCapsuleService.ts - Add transformer function:

// Add after imports
function transformCapsule(capsule: any): StyleCapsule {
  return {
    ...capsule,
    exampleTextExcerpts: capsule.example_text_excerpts,
    styleLabels: capsule.style_labels,
    negativeConstraints: capsule.negative_constraints,
    freeformNotes: capsule.freeform_notes,
    designPillars: capsule.design_pillars,
    referenceImageUrls: capsule.reference_image_urls,
    descriptorStrings: capsule.descriptor_strings,
    isPreset: capsule.is_preset,
    isFavorite: capsule.is_favorite,
    libraryId: capsule.library_id,
    userId: capsule.user_id,
    createdAt: capsule.created_at,
    updatedAt: capsule.updated_at
  };
}
Apply transformer in:

getCapsules() - line 48
getCapsule() - line 75
createCapsule() - line 103
updateCapsule() - line 131
toggleFavorite() - line 182
duplicateCapsule() - line 210
uploadImage() - line 240
removeImage() - line 267