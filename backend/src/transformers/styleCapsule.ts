/**
 * Style Capsule API Transformers
 * Transform database snake_case to API camelCase at the response boundary
 */

export function capsuleToApi(c: any) {
  if (!c) return null;
  
  return {
    id: c.id,
    name: c.name,
    type: c.type,

    libraryId: c.library_id,
    userId: c.user_id,

    exampleTextExcerpts: c.example_text_excerpts,
    styleLabels: c.style_labels,
    negativeConstraints: c.negative_constraints,
    freeformNotes: c.freeform_notes,

    designPillars: c.design_pillars,
    referenceImageUrls: c.reference_image_urls,
    descriptorStrings: c.descriptor_strings,

    isPreset: c.is_preset,
    isFavorite: c.is_favorite,

    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export function capsulesToApi(rows: any[] = []) {
  return rows.map(capsuleToApi);
}

export function libraryToApi(lib: any) {
  if (!lib) return null;

  return {
    id: lib.id,
    name: lib.name,
    description: lib.description,
    userId: lib.user_id,
    isPreset: lib.is_preset,
    createdAt: lib.created_at,
    updatedAt: lib.updated_at,
    // Keep nested style_capsules as-is or transform if needed
    style_capsules: lib.style_capsules,
  };
}

export function librariesToApi(rows: any[] = []) {
  return rows.map(libraryToApi);
}

