/**
 * Status Tag Categories & Semantic Styling
 * Feature 5.3: Categorize tags for consistent UI colors
 * Reference: ui-and-theme-rules.md for color palette
 */

export type StatusTagCategory =
  | 'condition' // Physical state (muddy, dirty, bloody)
  | 'damage' // Damage (torn, ripped, broken)
  | 'temporal' // Time-based (wet, dry, aged)
  | 'appearance' // Appearance (clean, polished, worn)
  | 'custom'; // User-defined

export interface StatusTagDefinition {
  name: string;
  category: StatusTagCategory;
  description?: string;
}

// Predefined common tags with categories
export const COMMON_STATUS_TAGS: StatusTagDefinition[] = [
  // Condition tags
  { name: 'muddy', category: 'condition', description: 'Covered in mud' },
  { name: 'bloody', category: 'condition', description: 'Blood visible' },
  { name: 'dirty', category: 'condition', description: 'Unclean or grimy' },
  { name: 'dusty', category: 'condition', description: 'Covered in dust' },
  { name: 'sweaty', category: 'condition', description: 'Perspiration visible' },

  // Damage tags
  { name: 'torn', category: 'damage', description: 'Fabric or material torn' },
  { name: 'ripped', category: 'damage', description: 'Severely damaged' },
  { name: 'broken', category: 'damage', description: 'Structurally damaged' },
  { name: 'cracked', category: 'damage', description: 'Surface cracked' },
  { name: 'shattered', category: 'damage', description: 'Completely broken' },

  // Temporal tags
  { name: 'wet', category: 'temporal', description: 'Recently wet or damp' },
  { name: 'dry', category: 'temporal', description: 'Dried out' },
  { name: 'aged', category: 'temporal', description: 'Shows signs of age' },
  { name: 'weathered', category: 'temporal', description: 'Exposed to elements' },

  // Appearance tags
  { name: 'clean', category: 'appearance', description: 'Pristine condition' },
  { name: 'polished', category: 'appearance', description: 'Shiny and maintained' },
  { name: 'worn', category: 'appearance', description: 'Used but intact' },
  { name: 'faded', category: 'appearance', description: 'Color diminished' },
];

// Category colors (aligned with ui-and-theme-rules.md)
export const TAG_CATEGORY_COLORS: Record<
  StatusTagCategory,
  {
    bg: string;
    text: string;
    border: string;
  }
> = {
  condition: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  damage: {
    bg: 'bg-destructive/20',
    text: 'text-destructive',
    border: 'border-destructive/30',
  },
  temporal: {
    bg: 'bg-info/20',
    text: 'text-info',
    border: 'border-info/30',
  },
  appearance: {
    bg: 'bg-success/20',
    text: 'text-success',
    border: 'border-success/30',
  },
  custom: {
    bg: 'bg-secondary',
    text: 'text-secondary-foreground',
    border: 'border-border',
  },
};

/**
 * Get category for a tag (returns 'custom' if not found)
 */
export function getTagCategory(tagName: string): StatusTagCategory {
  const found = COMMON_STATUS_TAGS.find((t) => t.name === tagName.toLowerCase());
  return found?.category ?? 'custom';
}

/**
 * Get color classes for a tag based on category
 */
export function getTagColors(tagName: string) {
  const category = getTagCategory(tagName);
  return TAG_CATEGORY_COLORS[category];
}

/**
 * Get autocomplete suggestions (lowercase tag names).
 * When projectTags is provided, tags already used in the current project/branch
 * are shown first to encourage consistency (e.g. avoid "muddy" vs "dirt-covered").
 */
export function getTagSuggestions(query: string, projectTags?: string[]): string[] {
  const q = query.toLowerCase();
  const fromCommon = !q
    ? COMMON_STATUS_TAGS.slice(0, 8).map((t) => t.name)
    : COMMON_STATUS_TAGS.filter(
        (t) => t.name.includes(q) || t.description?.toLowerCase().includes(q)
      )
        .slice(0, 8)
        .map((t) => t.name);
  if (!projectTags?.length) return fromCommon;
  const used = projectTags.filter((t) => !q || t.includes(q));
  const usedSet = new Set(used);
  const rest = fromCommon.filter((t) => !usedSet.has(t));
  return [...used, ...rest].slice(0, 8);
}
