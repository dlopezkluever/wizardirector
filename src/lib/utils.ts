import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormattedSceneHeader {
  formatted: string;
  prefix: string;
  prefixFull: string;
  location: string;
  timeOfDay: string;
}

const PREFIX_MAP: Record<string, string> = {
  ext: 'Exterior',
  int: 'Interior',
  'int/ext': 'Interior/Exterior',
  'ext/int': 'Exterior/Interior',
  'i/e': 'Interior/Exterior',
};

const TIME_OF_DAY_TOKENS = new Set([
  'day', 'night', 'dawn', 'dusk', 'evening', 'morning', 'later', 'continuous',
  'sunset', 'sunrise', 'noon', 'afternoon', 'twilight',
]);

/**
 * Parses a scene slug like `ext-construction-site-day-1` into a human-readable
 * formatted header: "Exterior Construction Site - Day"
 */
export function formatSceneHeader(slug: string): FormattedSceneHeader {
  if (!slug || typeof slug !== 'string') {
    return { formatted: slug ?? '', prefix: '', prefixFull: '', location: '', timeOfDay: '' };
  }

  const segments = slug.split('-').filter(Boolean);
  if (segments.length === 0) {
    return { formatted: slug, prefix: '', prefixFull: '', location: '', timeOfDay: '' };
  }

  // Strip trailing number (scene index like "-1", "-2")
  const lastSeg = segments[segments.length - 1];
  if (/^\d+$/.test(lastSeg)) {
    segments.pop();
  }

  if (segments.length === 0) {
    return { formatted: slug, prefix: '', prefixFull: '', location: '', timeOfDay: '' };
  }

  // Detect prefix: int, ext, int/ext, etc.
  let prefix = '';
  let prefixFull = '';
  const firstLower = segments[0].toLowerCase();

  // Check for compound prefix like "int/ext" encoded as two segments
  if (segments.length >= 2) {
    const compoundKey = `${firstLower}/${segments[1].toLowerCase()}`;
    if (PREFIX_MAP[compoundKey]) {
      prefix = compoundKey;
      prefixFull = PREFIX_MAP[compoundKey];
      segments.splice(0, 2);
    }
  }

  if (!prefix && PREFIX_MAP[firstLower]) {
    prefix = firstLower;
    prefixFull = PREFIX_MAP[firstLower];
    segments.splice(0, 1);
  }

  if (segments.length === 0) {
    return { formatted: prefixFull || slug, prefix, prefixFull, location: '', timeOfDay: '' };
  }

  // Detect time of day from last segment
  let timeOfDay = '';
  const lastLower = segments[segments.length - 1].toLowerCase();
  if (TIME_OF_DAY_TOKENS.has(lastLower)) {
    timeOfDay = segments.pop()!;
    timeOfDay = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1).toLowerCase();
  }

  // Remaining segments are the location — title-case each
  const location = segments
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');

  // Build formatted string
  let formatted = '';
  if (prefixFull) formatted += prefixFull + ' ';
  formatted += location;
  if (timeOfDay) formatted += ' - ' + timeOfDay;

  return {
    formatted: formatted.trim() || slug,
    prefix,
    prefixFull,
    location,
    timeOfDay,
  };
}
