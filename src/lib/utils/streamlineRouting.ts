import { detectScriptConfidence } from './scriptConfidence';
import type { StreamlineFile } from '@/components/pipeline/streamline/StreamlineDropZone';
import type { StreamlineFileType, StageTransition } from '@/lib/services/streamlineService';

export interface StreamlineImageCard {
  id: string;
  imageUrl: string;
  name: string;
  type: 'character' | 'prop' | 'location';
  description: string;
  accepted: boolean;
}

export interface StreamlineAssetDraft {
  sourceFileId: string;
  name: string;
  type: 'character' | 'prop' | 'location';
  description: string;
}

export interface StreamlineRoutingResult {
  stageTransitions: Record<string, StageTransition>;
  assetDrafts: StreamlineAssetDraft[];
  lines: string[];
  creditEstimate: string;
  canConfirm: boolean;
  blockedReason?: string;
}

/** A file's effective type: user override wins, else the server classification, else unclassified. */
export function effectiveType(file: StreamlineFile): StreamlineFileType {
  return file.typeOverride ?? file.classification?.type ?? 'unclassified';
}

function isUsableScript(file: StreamlineFile): boolean {
  if (!file.text) return false;
  // A manual type selection is an explicit user decision. The confidence
  // detector is intentionally conservative for automatic classification, but
  // it must not silently override the user's choice in the review screen.
  if (file.typeOverride === 'script') return true;
  return detectScriptConfidence(file.text).confidence !== 'low';
}

/**
 * Computes what Streamline's commit will do given the batch's classified
 * files (spec Task 3.3) — the single source of truth the review screen
 * displays and the confirm button acts on. Stage 4 stays free of the
 * "AI-format" choice (scripts always parse deterministically); Stages 2/3
 * use whatever content was already produced (as-is text or the AI-formatted
 * result) by the time this runs — this function only decides routing, not
 * formatting itself.
 */
export function computeStreamlineRouting(
  files: StreamlineFile[],
  images: StreamlineImageCard[],
  projectConfigReady: boolean
): StreamlineRoutingResult {
  const successFiles = files.filter(f => f.status === 'success' && f.text);
  const acceptedImages = images.filter(img => img.accepted);

  if (successFiles.length === 0 && acceptedImages.length === 0) {
    return {
      stageTransitions: {},
      assetDrafts: [],
      lines: ['Add at least one file to see what Streamline will do with it.'],
      creditEstimate: 'Free — nothing to process yet',
      canConfirm: false,
    };
  }

  if (!projectConfigReady) {
    return {
      stageTransitions: {},
      assetDrafts: [],
      lines: ['Finish Project Type and Tonal Precision below before confirming.'],
      creditEstimate: 'Free — nothing to process yet',
      canConfirm: false,
      blockedReason: 'Select a project type and provide at least 10 characters of tonal precision.',
    };
  }

  const scriptFile = successFiles.find(f => effectiveType(f) === 'script' && isUsableScript(f));
  const treatmentFile = successFiles.find(f => effectiveType(f) === 'treatment');
  const beatSheetFile = successFiles.find(f => effectiveType(f) === 'beat_sheet');
  const characterNotesFiles = successFiles.filter(f => effectiveType(f) === 'character_notes');

  const assetDrafts: StreamlineAssetDraft[] = [
    ...characterNotesFiles
      .filter(f => f.assetDraft)
      .map(f => ({ sourceFileId: f.id, ...f.assetDraft! })),
    ...acceptedImages.map(img => ({ sourceFileId: img.id, name: img.name, type: img.type, description: img.description })),
  ];

  const lines: string[] = [];
  const stageTransitions: Record<string, StageTransition> = { '1': 'locked' };

  if (scriptFile) {
    stageTransitions['2'] = treatmentFile
      ? { status: 'locked', content: buildTreatmentContent(treatmentFile), origin: 'imported' }
      : 'skip';
    stageTransitions['3'] = beatSheetFile
      ? { status: 'locked', content: buildBeatSheetContent(beatSheetFile), origin: 'imported' }
      : 'skip';
    stageTransitions['4'] = { status: 'locked', content: buildScriptContent(scriptFile), origin: 'imported' };

    lines.push(`"${scriptFile.name}" looks like a usable screenplay — Stage 4 will be filled in and locked from it.`);
    lines.push(treatmentFile ? `Stage 2 will be filled from "${treatmentFile.name}".` : 'Stage 2 (Treatment) will be marked SKIPPED.');
    lines.push(beatSheetFile ? `Stage 3 will be filled from "${beatSheetFile.name}".` : 'Stage 3 (Beat Sheet) will be marked SKIPPED.');
  } else if (beatSheetFile) {
    stageTransitions['2'] = treatmentFile
      ? { status: 'locked', content: buildTreatmentContent(treatmentFile), origin: 'imported' }
      : 'skip';
    stageTransitions['3'] = { status: 'locked', content: buildBeatSheetContent(beatSheetFile), origin: 'imported' };

    lines.push(treatmentFile ? `Stage 2 will be filled from "${treatmentFile.name}".` : 'Stage 2 (Treatment) will be marked SKIPPED.');
    lines.push(`Stage 3 will be filled from "${beatSheetFile.name}".`);
  } else if (treatmentFile) {
    stageTransitions['2'] = { status: 'locked', content: buildTreatmentContent(treatmentFile), origin: 'imported' };
    lines.push(`Stage 2 will be filled from "${treatmentFile.name}". You'll land on Stage 3 to continue normally.`);
  }

  if (characterNotesFiles.length > 0) {
    lines.push(`${characterNotesFiles.length} character/location note file(s) will pre-fill Stage 5 asset drafts for you to confirm.`);
  }
  if (acceptedImages.length > 0) {
    lines.push(`${acceptedImages.length} accepted image(s) will become Stage 5 asset drafts.`);
  }

  const hasNarrativeMaterial = !!(scriptFile || treatmentFile || beatSheetFile);
  const hasAnyRoutableMaterial = hasNarrativeMaterial || assetDrafts.length > 0;

  if (!hasAnyRoutableMaterial) {
    return {
      stageTransitions: {},
      assetDrafts: [],
      lines: ["We couldn't identify anything usable in these files yet — override a file's type below, or try Condensation/Transformation instead."],
      creditEstimate: 'Free — nothing to process yet',
      canConfirm: false,
      blockedReason: 'Choose the correct type for the uploaded file, or add a screenplay, treatment, beat sheet, notes file, or reference image.',
    };
  }

  const creditEstimateParts: string[] = [];
  if (characterNotesFiles.length > 0) {
    creditEstimateParts.push(`${characterNotesFiles.length} standalone asset draft(s) already extracted`);
  }
  if (assetDrafts.length > 0) {
    creditEstimateParts.push(`full visual-distillation cost for ${assetDrafts.length} asset(s) is determined when you generate images at Stage 5`);
  }
  const creditEstimate = creditEstimateParts.length > 0
    ? `Script/treatment/beat-sheet routing is free — ${creditEstimateParts.join('; ')}.`
    : 'Free — script, treatment, and beat sheet routing are all deterministic, no AI generation used.';

  return { stageTransitions, assetDrafts, lines, creditEstimate, canConfirm: true };
}

function buildScriptContent(file: StreamlineFile) {
  const confidence = detectScriptConfidence(file.text!);
  return {
    formattedScript: file.text,
    tiptapDoc: confidence.tiptapDoc,
    scenes: [],
    syncStatus: 'synced' as const,
  };
}

function buildTreatmentContent(file: StreamlineFile) {
  const content = file.formattedText ?? file.text ?? '';
  return {
    variations: [{ id: `sf-${file.id}`, content, structuralEmphasis: 'balanced', estimatedRuntimeSeconds: 0, createdAt: new Date().toISOString() }],
    activeVariation: 0,
  };
}

function buildBeatSheetContent(file: StreamlineFile) {
  if (file.formattedBeats) {
    return {
      beats: file.formattedBeats.beats,
      totalEstimatedRuntime: file.formattedBeats.totalEstimatedRuntime,
      narrativeStructure: 'derived_from_streamline_intake',
    };
  }
  // As-is: no structured beats were generated — a single beat carrying the raw text
  // lets the stage still open sensibly; the user can split/expand normally from there.
  return {
    beats: [{ id: `sf-${file.id}`, order: 1, text: file.text ?? '', estimatedScreenTimeSeconds: 0 }],
    totalEstimatedRuntime: 0,
    narrativeStructure: 'imported_as_single_beat',
  };
}
