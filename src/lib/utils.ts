import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormattedSceneHeader {
  /** Full format: "Exterior Construction Site - Day" */
  formatted: string;
  /** Short format: "Ext. Construction Site - Day" */
  formattedShort: string;
  prefix: string;
  prefixFull: string;
  prefixShort: string;
  location: string;
  timeOfDay: string;
}

const PREFIX_MAP: Record<string, { full: string; short: string }> = {
  ext: { full: 'Exterior', short: 'Ext.' },
  int: { full: 'Interior', short: 'Int.' },
  'int/ext': { full: 'Interior/Exterior', short: 'Int./Ext.' },
  'ext/int': { full: 'Exterior/Interior', short: 'Ext./Int.' },
  'i/e': { full: 'Interior/Exterior', short: 'Int./Ext.' },
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
  const empty: FormattedSceneHeader = { formatted: slug ?? '', formattedShort: slug ?? '', prefix: '', prefixFull: '', prefixShort: '', location: '', timeOfDay: '' };
  if (!slug || typeof slug !== 'string') return empty;

  const segments = slug.split('-').filter(Boolean);
  if (segments.length === 0) return { ...empty, formatted: slug, formattedShort: slug };

  // Strip trailing number (scene index like "-1", "-2")
  const lastSeg = segments[segments.length - 1];
  if (/^\d+$/.test(lastSeg)) {
    segments.pop();
  }

  if (segments.length === 0) return { ...empty, formatted: slug, formattedShort: slug };

  // Detect prefix: int, ext, int/ext, etc.
  let prefix = '';
  let prefixFull = '';
  let prefixShort = '';
  const firstLower = segments[0].toLowerCase();

  // Check for compound prefix like "int/ext" encoded as two segments
  if (segments.length >= 2) {
    const compoundKey = `${firstLower}/${segments[1].toLowerCase()}`;
    if (PREFIX_MAP[compoundKey]) {
      prefix = compoundKey;
      prefixFull = PREFIX_MAP[compoundKey].full;
      prefixShort = PREFIX_MAP[compoundKey].short;
      segments.splice(0, 2);
    }
  }

  if (!prefix && PREFIX_MAP[firstLower]) {
    prefix = firstLower;
    prefixFull = PREFIX_MAP[firstLower].full;
    prefixShort = PREFIX_MAP[firstLower].short;
    segments.splice(0, 1);
  }

  if (segments.length === 0) {
    return { formatted: prefixFull || slug, formattedShort: prefixShort || slug, prefix, prefixFull, prefixShort, location: '', timeOfDay: '' };
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

  // Build formatted strings (full + short)
  let formatted = '';
  let formattedShort = '';
  if (prefixFull) formatted += prefixFull + ' ';
  if (prefixShort) formattedShort += prefixShort + ' ';
  formatted += location;
  formattedShort += location;
  if (timeOfDay) {
    formatted += ' - ' + timeOfDay;
    formattedShort += ' - ' + timeOfDay;
  }

  return {
    formatted: formatted.trim() || slug,
    formattedShort: formattedShort.trim() || slug,
    prefix,
    prefixFull,
    prefixShort,
    location,
    timeOfDay,
  };
}
