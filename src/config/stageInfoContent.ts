export interface StageInfo {
  title: string;
  tips: string[];
}

export const stageInfoContent: Record<string, StageInfo> = {
  dashboard: {
    title: 'Dashboard',
    tips: [
      'Create projects with different input modes — expand a logline, condense a full script, or transform existing material.',
      'Each project follows a 12-stage pipeline from concept to final video.',
      'Use branches to explore alternative creative directions without losing your work.',
    ],
  },
  'stage-1': {
    title: 'Input & Tone',
    tips: [
      '4 input modes: expand a logline, condense a script, transform existing material, or skip to manual.',
      'Tonal precision sets the emotional feel of your project — be specific (min 10 characters).',
      'Style capsules apply a consistent creative voice across all generated content.',
    ],
  },
  'stage-2': {
    title: 'Treatment',
    tips: [
      '3 treatment variations are generated — pick the one closest to your vision.',
      'Select text to get targeted alternative suggestions for specific passages.',
      '"Full Regenerate" reshapes the entire treatment from scratch.',
    ],
  },
  'stage-3': {
    title: 'Beat Sheet',
    tips: [
      'Beats are the structural narrative moments that shape your story.',
      'Drag beats to reorder pacing and dramatic flow.',
      'The sparkle icon brainstorms alternative beats — minimum 3 beats required.',
    ],
  },
  'stage-4': {
    title: 'Master Script',
    tips: [
      'Industry-standard screenplay formatting is applied automatically.',
      'Scenes are extracted from the script for use in production stages.',
      'Lock the script to proceed — this becomes your source of truth.',
    ],
  },
  'stage-5': {
    title: 'Asset Library',
    tips: [
      'Characters, locations, and props are catalogued here.',
      'Assets carry through to all later stages for consistency.',
      'Merge or split assets to keep your library organized.',
    ],
  },
  'stage-6': {
    title: 'Script Hub',
    tips: [
      'Scene lifecycle: Draft → Shot List → Frames → Complete.',
      'Continuity risk indicators show cross-scene impact of changes.',
      'Deferred scenes are skipped until you\'re ready to work on them.',
    ],
  },
  'stage-7': {
    title: 'Shot List',
    tips: [
      'Each scene is broken into individual camera shots.',
      'Drag shots to reorder — split or merge for better pacing.',
      'Lock the shot list when you\'re satisfied with the breakdown.',
    ],
  },
  'stage-8': {
    title: 'Visual Definition',
    tips: [
      'Define visual assets at the start of each scene.',
      'AI detection identifies assets automatically, or add them manually.',
      'Assets inherit from prior scenes for visual continuity.',
    ],
  },
  'stage-9': {
    title: 'Prompt Segmentation',
    tips: [
      'Frame prompts are read-only by default to preserve AI-generated precision.',
      'Video prompts are always editable for audio and dialogue tuning.',
      'Use bulk templates to assign assets across multiple shots at once.',
    ],
  },
  'stage-10': {
    title: 'Frame Generation',
    tips: [
      'Start and end frame images are generated for each shot.',
      'Approve frames with the checkmark — use inpainting to fix specific areas.',
      'Consistent framing across shots ensures smooth video transitions.',
    ],
  },
  'stage-11': {
    title: 'Confirmation',
    tips: [
      'Final review before committing credits to video generation.',
      'Fast model is cheaper and quicker; standard model produces higher quality.',
      'No edits are possible after confirming — review carefully.',
    ],
  },
  'stage-12': {
    title: 'Video Generation',
    tips: [
      'Videos render in the background — you can navigate away and come back.',
      'Retry failed shots individually without re-rendering the whole scene.',
      'Use the timeline to scrub through the full scene playback.',
    ],
  },
};
