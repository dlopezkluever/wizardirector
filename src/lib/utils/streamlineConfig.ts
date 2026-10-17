/**
 * Tunable thresholds for Streamline's script-confidence detector (spec §2.8).
 * Kept as named config rather than inline constants so they can be adjusted
 * without touching detector logic.
 */
export const MIN_SCENE_HEADINGS = 3;
export const MIN_DIALOGUE_LINES = 1;
