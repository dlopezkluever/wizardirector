import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Wand2,
  Layers,
  ScrollText,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InputMode, ProjectType, ContentRating, StageStatus, AspectRatio } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FileStagingArea, type UploadedFile } from './FileStagingArea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useStageState } from '@/lib/hooks/useStageState';
import { projectService } from '@/lib/services/projectService';
import { stageStateService } from '@/lib/services/stageStateService';
import { streamlineService } from '@/lib/services/streamlineService';
import { scriptService } from '@/lib/services/scriptService';
import { inputProcessingService, type ProcessedInput } from '@/lib/services/inputProcessingService';
import type { Project } from '@/types/project';
import { detectScriptConfidence } from '@/lib/utils/scriptConfidence';
import { computeStreamlineRouting, effectiveType, type StreamlineImageCard } from '@/lib/utils/streamlineRouting';
import { StreamlineDropZone, type StreamlineFile } from './streamline/StreamlineDropZone';
import { StreamlineReviewScreen } from './streamline/StreamlineReviewScreen';
import { StreamlineImageReviewGrid } from './streamline/StreamlineImageReviewGrid';
import { StyleCapsuleSelector } from '@/components/styleCapsules/StyleCapsuleSelector';
import { LockedStageHeader } from './LockedStageHeader';
import { StageInfoButton } from './StageInfoButton';

interface InputModeOption {
  id: InputMode;
  title: string;
  description: string;
  icon: React.ElementType;
  fileHint: string;
}

const inputModes: InputModeOption[] = [
  {
    id: 'expansion',
    title: 'Expansion',
    description: 'Start with a brief idea and expand into a full narrative',
    icon: Wand2,
    fileHint: 'Upload a 1-3 paragraph idea kernel or type directly',
  },
  {
    id: 'condensation',
    title: 'Condensation',
    description: 'Condense a large text into a cinematic narrative',
    icon: Layers,
    fileHint: 'Upload a novel, script, or 100+ page document',
  },
  {
    id: 'transformation',
    title: 'Transformation',
    description: 'Transform existing content with a creative twist',
    icon: ScrollText,
    fileHint: 'Upload source text + optional reference materials',
  },
  {
    id: 'script-skip',
    title: 'Script Skip',
    description: 'Upload a formatted screenplay directly',
    icon: FileText,
    fileHint: 'Upload a formatted screenplay file',
  },
  {
    id: 'streamline',
    title: 'Streamline',
    description: 'Already have a script or material? Drop it in — we classify it and skip you ahead.',
    icon: Sparkles,
    fileHint: 'Drop a script, treatment, or notes — .txt, .md, .pdf, .docx, .rtf',
  },
];

const projectTypes: { id: ProjectType; label: string; description: string }[] = [
  { id: 'narrative', label: 'Narrative Short Film', description: 'Traditional storytelling structure' },
  { id: 'commercial', label: 'Commercial / Trailer', description: 'High-impact promotional content' },
  { id: 'audio-visual', label: 'Video for Audio', description: 'Visual accompaniment for podcasts, audiobooks' },
];

const contentRatings: { id: ContentRating; label: string }[] = [
  { id: 'G', label: 'G - General Audiences' },
  { id: 'PG', label: 'PG - Parental Guidance' },
  { id: 'PG-13', label: 'PG-13 - Parents Strongly Cautioned' },
  { id: 'M', label: 'M - Mature Audiences' },
];

const genres = [
  'Drama', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 
  'Horror', 'Action', 'Documentary', 'Fantasy', 'Mystery'
];

interface Stage1InputModeProps {
  projectId: string;
  onComplete: () => void;
  stageStatus?: StageStatus;
  onNext?: () => void;
  onUnlock?: () => void;
  /**
   * Streamline's commit lands the project on a different stage than the
   * normal single-stage progression (e.g. Stage 4 with 2/3 skipped), so it
   * bypasses onComplete/handleStageComplete entirely and reports its own
   * target stage instead.
   */
  onStreamlineComplete?: (targetStage: number) => void;
}

interface Stage1Content {
  selectedMode: InputMode | null;
  selectedProjectType: ProjectType | null;
  selectedRating: ContentRating;
  selectedGenres: string[];
  selectedAspectRatio: AspectRatio;
  targetLength: [number, number];
  tonalPrecision: string;
  writingStyleCapsuleId?: string;
  uploadedFiles: UploadedFile[];
  ideaText: string;
  processedInput?: ProcessedInput;
}

export function Stage1InputMode({ projectId, onComplete, stageStatus, onNext, onUnlock, onStreamlineComplete }: Stage1InputModeProps) {
  const isStageLockedOrOutdated = stageStatus === 'locked' || stageStatus === 'outdated';
  
  // Use the stage state hook for persistence (auto-save disabled since we manually manage saving/locking)
  const { content, setContent, isLoading, isSaving } = useStageState<Stage1Content>({
    projectId,
    stageNumber: 1,
    autoSave: false, // Disabled to prevent race condition with manual lock operation
    initialContent: {
      selectedMode: null,
      selectedProjectType: null,
      selectedRating: 'PG-13',
      selectedGenres: [],
      selectedAspectRatio: '16:9',
      targetLength: [3, 5],
      tonalPrecision: '',
      writingStyleCapsuleId: undefined,
      uploadedFiles: [],
      ideaText: ''
    }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Helper function to update a single field in content
  const updateField = <K extends keyof Stage1Content>(field: K, value: Stage1Content[K]) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const toggleGenre = (genre: string) => {
    setContent(prev => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genre)
        ? prev.selectedGenres.filter(g => g !== genre)
        : [...prev.selectedGenres, genre]
    }));
  };

  const canProceed = content.selectedMode && content.selectedProjectType && content.tonalPrecision.length >= 10 && 
    (content.uploadedFiles.length > 0 || (content.selectedMode === 'expansion' && content.ideaText.length >= 20));

  const selectedModeData = inputModes.find(m => m.id === content.selectedMode);

  const handleComplete = async () => {
    if (!canProceed) return;

    // Validate input first
    const validation = inputProcessingService.validateInput({
      selectedMode: content.selectedMode!,
      selectedProjectType: content.selectedProjectType!,
      selectedRating: content.selectedRating,
      selectedGenres: content.selectedGenres,
      targetLength: content.targetLength,
      tonalPrecision: content.tonalPrecision,
      writingStyleCapsuleId: content.writingStyleCapsuleId,
      uploadedFiles: content.uploadedFiles,
      ideaText: content.ideaText
    });

    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      // Show validation errors to user
      return;
    }

    try {
      setIsCreatingProject(true);

      let project: Project;

      if (projectId === 'new') {
        // Create new project with configuration
        project = await projectService.createProject({
          title: `${content.selectedMode} Project - ${new Date().toLocaleDateString()}`
        });

        // Update the project with Stage 1 configuration
        project = await projectService.updateProject(project.id, {
          project_type: content.selectedProjectType!,
          content_rating: content.selectedRating,
          genre: content.selectedGenres,
          tonal_precision: content.tonalPrecision,
          target_length_min: content.targetLength[0] * 60, // Convert minutes to seconds
          target_length_max: content.targetLength[1] * 60,
          aspect_ratio: content.selectedAspectRatio
        });
      } else {
        // Update existing project configuration
        project = await projectService.updateProject(projectId, {
          project_type: content.selectedProjectType!,
          content_rating: content.selectedRating,
          genre: content.selectedGenres,
          tonal_precision: content.tonalPrecision,
          target_length_min: content.targetLength[0] * 60,
          target_length_max: content.targetLength[1] * 60,
          aspect_ratio: content.selectedAspectRatio
        });
      }

      // Process the input for Stage 2
      console.log('🔍 [DEBUG] Stage 1 - Processing input with:', {
        selectedMode: content.selectedMode,
        selectedProjectType: content.selectedProjectType,
        selectedRating: content.selectedRating,
        selectedGenres: content.selectedGenres,
        targetLength: content.targetLength,
        tonalPrecision: content.tonalPrecision,
        uploadedFilesCount: content.uploadedFiles?.length || 0,
        ideaTextLength: content.ideaText?.length || 0
      });

      const processedInput = inputProcessingService.processInput({
        selectedMode: content.selectedMode!,
        selectedProjectType: content.selectedProjectType!,
        selectedRating: content.selectedRating,
        selectedGenres: content.selectedGenres,
        targetLength: content.targetLength,
        tonalPrecision: content.tonalPrecision,
        writingStyleCapsuleId: content.writingStyleCapsuleId,
        uploadedFiles: content.uploadedFiles,
        ideaText: content.ideaText
      });

      console.log('🔍 [DEBUG] Stage 1 - Processed input result:', {
        mode: processedInput.mode,
        primaryContentLength: processedInput.primaryContent?.length || 0,
        contextFilesCount: processedInput.contextFiles?.length || 0,
        projectParams: processedInput.projectParams
      });

      // Store processed input in Stage 1 state for Stage 2 to use
      const updatedContent = {
        ...content,
        processedInput
      };
      
      console.log('🔍 [DEBUG] Stage 1 - Updated content keys:', Object.keys(updatedContent));

      // Save the stage state with processed input before completing
      // Note: We save as 'draft' here and let ProjectView's handleStageComplete handle the locking
      console.log('🔍 [DEBUG] Stage 1 - Saving stage state for project:', project.id);
      await stageStateService.saveStageState(project.id, 1, {
        content: updatedContent,
        status: 'draft'
      });
      console.log('🔍 [DEBUG] Stage 1 - Stage state saved successfully');

      // Cancel any pending auto-saves to prevent race condition with lock operation
      console.log('🔍 [DEBUG] Stage 1 - Cancelling pending auto-saves before completion');
      stageStateService.cancelAutoSave(project.id, 1);

      // Update local content after save (not before) to avoid triggering auto-save
      setContent(updatedContent);

      onComplete();
    } catch (error) {
      console.error('Failed to save project configuration:', error);
      // Handle error - maybe show a toast
    } finally {
      setIsCreatingProject(false);
    }
  };

  // ── Streamline intake (Phase 3: classification-driven routing) ─────────
  const [streamlineFiles, setStreamlineFiles] = useState<StreamlineFile[]>([]);
  const [streamlineImages, setStreamlineImages] = useState<StreamlineImageCard[]>([]);
  const [isStreamlineCommitting, setIsStreamlineCommitting] = useState(false);
  const [streamlineError, setStreamlineError] = useState<string | null>(null);
  // Phase 4 reads this to gate the Ask Auteur session behind full-batch
  // completion (spec §2.9.6) — a ref for now since nothing re-renders off it yet.
  const streamlineBatchSettledRef = useRef(false);

  const streamlineProjectConfigReady = !!content.selectedProjectType && content.tonalPrecision.length >= 10;
  const streamlineRouting = computeStreamlineRouting(streamlineFiles, streamlineImages, streamlineProjectConfigReady);
  const streamlineKnownEntityNames = streamlineFiles
    .filter(f => effectiveType(f) === 'character_notes' && f.assetDraft)
    .map(f => f.assetDraft!.name);

  const handleStreamlineCommit = async () => {
    if (!streamlineRouting.canConfirm || projectId === 'new') return;

    setIsStreamlineCommitting(true);
    setStreamlineError(null);
    try {
      // Persist project-level configuration (type, rating, genres, etc.) —
      // identical to the normal handleComplete path, just without creating
      // a new project (Streamline always runs against an existing project).
      await projectService.updateProject(projectId, {
        project_type: content.selectedProjectType!,
        content_rating: content.selectedRating,
        genre: content.selectedGenres,
        tonal_precision: content.tonalPrecision,
        target_length_min: content.targetLength[0] * 60,
        target_length_max: content.targetLength[1] * 60,
        aspect_ratio: content.selectedAspectRatio,
      });

      // The commit RPC's bare "locked" transition locks *existing* content —
      // save Stage 1 as a draft first so there's something for it to lock.
      await stageStateService.saveStageState(projectId, 1, {
        content,
        status: 'draft',
      });

      const assets = streamlineRouting.assetDrafts.map(draft => ({
        name: draft.name,
        asset_type: draft.type,
        description: draft.description,
        source: streamlineImages.some(img => img.id === draft.sourceFileId) ? 'streamline_import' : 'extracted',
        image_key_url: streamlineImages.find(img => img.id === draft.sourceFileId)?.imageUrl,
      }));

      await streamlineService.commit(projectId, {
        stageTransitions: streamlineRouting.stageTransitions,
        ...(assets.length > 0 && { assets }),
      });

      // Streamline's commit bypasses the normal Stage 4 lock flow, which is
      // what usually splits the script into scenes + persists scene
      // dependencies (extractManifest, zero LLM cost). Without this, Stage 5's
      // asset extraction would find no scenes to work from — replicate it here.
      const scriptFile = streamlineFiles.find(f => effectiveType(f) === 'script' && f.status === 'success' && f.text
        && detectScriptConfidence(f.text).confidence !== 'low');
      if (scriptFile?.text) {
        try {
          const scenes = scriptService.extractScenes(scriptFile.text);
          if (scenes.length > 0) {
            await scriptService.persistScenes(projectId, scenes, detectScriptConfidence(scriptFile.text).tiptapDoc);
          }
        } catch (sceneError) {
          console.error('Streamline: scene extraction/persistence failed (non-fatal, Stage 5 can still extract manually):', sceneError);
        }
      }

      // Land on whichever stage the routing actually filled — the first
      // stage without a transition is where the user picks up normally.
      const targetStage = ['1', '2', '3', '4'].every(k => streamlineRouting.stageTransitions[k])
        ? 5
        : [2, 3, 4].find(n => !streamlineRouting.stageTransitions[String(n)]) ?? 2;
      onStreamlineComplete?.(targetStage);
    } catch (error) {
      console.error('Streamline commit failed:', error);
      setStreamlineError(error instanceof Error ? error.message : 'Failed to process your material. Please try again.');
    } finally {
      setIsStreamlineCommitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading stage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {isStageLockedOrOutdated && (
        <LockedStageHeader
          stageNumber={1}
          title="Input"
          subtitle="Initialize Your Narrative"
          isLocked={stageStatus === 'locked'}
          isOutdated={stageStatus === 'outdated'}
          onNext={onNext}
          onUnlockAndEdit={onUnlock}
          lockAndProceedLabel="Confirm & Proceed"
        />
      )}
      <div className="flex-1 overflow-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-10"
      >
        {/* Header */}
        {!isStageLockedOrOutdated && (
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">
              Initialize Your Narrative
            </h2>
            <p className="text-muted-foreground">
              Configure the global parameters that will define your film's foundation
            </p>
          </div>
        )}

        {/* Input Mode Selection */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Select Input Mode
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inputModes.map((mode, index) => {
              const Icon = mode.icon;
              const isSelected = content.selectedMode === mode.id;

              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => updateField('selectedMode', mode.id)}
                  className={cn(
                    'relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200',
                    content.selectedMode === mode.id
                      ? 'border-primary bg-primary/10 shadow-gold'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-card/80'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {mode.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* File Upload / Text Input Section */}
        {content.selectedMode && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Input Content
              </h3>
              <p className="text-sm text-muted-foreground">
                {inputProcessingService.getModeInstructions(content.selectedMode)}
              </p>
              {inputProcessingService.getRecommendedFileTypes(content.selectedMode).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Recommended:</span>{' '}
                  {inputProcessingService.getRecommendedFileTypes(content.selectedMode).join(', ')}
                </div>
              )}
            </div>

            {content.selectedMode === 'expansion' ? (
              <div className="space-y-4">
                <textarea
                  value={content.ideaText}
                  onChange={(e) => updateField('ideaText', e.target.value)}
                  placeholder="Enter your story idea, concept, or initial premise here. Be as brief or detailed as you like - the AI will expand this into a full narrative treatment..."
                  className="w-full h-40 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{content.ideaText.length} characters</span>
                  <span>•</span>
                  <span>Minimum 20 characters required</span>
                </div>

                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Add supporting files (optional)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <FileStagingArea
                      files={content.uploadedFiles}
                      onFilesChange={(files) => updateField('uploadedFiles', files)}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : content.selectedMode === 'streamline' ? (
              <div className="space-y-6">
                <StreamlineDropZone
                  projectId={projectId}
                  files={streamlineFiles}
                  onFilesChange={setStreamlineFiles}
                  onBatchSettled={() => { streamlineBatchSettledRef.current = true; }}
                />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Reference images (optional)</h4>
                  <StreamlineImageReviewGrid
                    projectId={projectId}
                    images={streamlineImages}
                    onImagesChange={setStreamlineImages}
                    knownEntityNames={streamlineKnownEntityNames}
                  />
                </div>

                {(streamlineFiles.length > 0 || streamlineImages.length > 0) && (
                  <StreamlineReviewScreen
                    files={streamlineFiles}
                    routing={streamlineRouting}
                    onConfirm={handleStreamlineCommit}
                    isCommitting={isStreamlineCommitting}
                  />
                )}

                {streamlineError && (
                  <p className="text-sm text-destructive">{streamlineError}</p>
                )}
              </div>
            ) : (
              <FileStagingArea
                files={content.uploadedFiles}
                onFilesChange={(files) => updateField('uploadedFiles', files)}
              />
            )}
          </motion.section>
        )}

        {/* Project Type */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Project Type
          </h3>
          <div className="flex flex-wrap gap-3">
            {projectTypes.map((type) => (
              <Button
                key={type.id}
                variant={content.selectedProjectType === type.id ? 'stage-active' : 'stage'}
                onClick={() => updateField('selectedProjectType', type.id)}
                className="h-auto py-3 px-4 flex-col items-start gap-1"
              >
                <span className="font-medium">{type.label}</span>
                <span className="text-xs opacity-70">{type.description}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Aspect Ratio */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Aspect Ratio
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => updateField('selectedAspectRatio', '16:9')}
              className={cn(
                'relative flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200',
                content.selectedAspectRatio === '16:9'
                  ? 'border-primary bg-primary/10 shadow-gold'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className={cn(
                'w-10 h-6 rounded border-2',
                content.selectedAspectRatio === '16:9' ? 'border-primary bg-primary/20' : 'border-muted-foreground/40'
              )} />
              <div className="text-left">
                <span className="font-medium text-foreground">16:9</span>
                <span className="text-sm text-muted-foreground ml-2">Landscape</span>
              </div>
              {content.selectedAspectRatio === '16:9' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
            <button
              onClick={() => updateField('selectedAspectRatio', '9:16')}
              className={cn(
                'relative flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200',
                content.selectedAspectRatio === '9:16'
                  ? 'border-primary bg-primary/10 shadow-gold'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className={cn(
                'w-6 h-10 rounded border-2',
                content.selectedAspectRatio === '9:16' ? 'border-primary bg-primary/20' : 'border-muted-foreground/40'
              )} />
              <div className="text-left">
                <span className="font-medium text-foreground">9:16</span>
                <span className="text-sm text-muted-foreground ml-2">Portrait</span>
              </div>
              {content.selectedAspectRatio === '9:16' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Target Length */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Target Length
            </h3>
            <span className="text-primary font-medium">
              {content.targetLength[0]}:00 - {content.targetLength[1]}:00 min
            </span>
          </div>
          <Slider
            value={content.targetLength}
            onValueChange={(value) => updateField('targetLength', value as [number, number])}
            min={1}
            max={15}
            step={1}
            className="py-4"
          />
        </section>

        {/* Content Rating */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Content Rating
          </h3>
          <div className="flex flex-wrap gap-2">
            {contentRatings.map((rating) => (
              <Button
                key={rating.id}
                variant={content.selectedRating === rating.id ? 'stage-active' : 'stage'}
                size="sm"
                onClick={() => updateField('selectedRating', rating.id)}
              >
                {rating.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Genre Selection */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Genre / Tone
          </h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Button
                key={genre}
                variant={content.selectedGenres.includes(genre) ? 'stage-active' : 'stage'}
                size="sm"
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </Button>
            ))}
          </div>
        </section>

        {/* Tonal Precision */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Tonal Precision
            </h3>
            <span className={cn(
              'text-xs',
              content.tonalPrecision.length >= 10 ? 'text-success' : 'text-muted-foreground'
            )}>
              {content.tonalPrecision.length}/10 characters minimum
            </span>
          </div>
          <textarea
            value={content.tonalPrecision}
            onChange={(e) => updateField('tonalPrecision', e.target.value)}
            placeholder="Describe the specific tone and atmosphere you want (e.g., 'Dark and moody with moments of dry humor, reminiscent of early Coen Brothers films...')"
            className="w-full h-32 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </section>

        {/* Writing Style Capsule Selection */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Writing Style (Optional)
          </h3>
          <p className="text-sm text-muted-foreground">
            Select a writing style capsule to guide the AI's prose generation. You can change this later or leave it blank for a neutral style.
          </p>
          <StyleCapsuleSelector
            type="writing"
            value={content.writingStyleCapsuleId || ''}
            onChange={(capsuleId) => updateField('writingStyleCapsuleId', capsuleId || undefined)}
            placeholder="Choose a writing style capsule..."
            required={false}
            showPreview={true}
          />
        </section>

        {/* Proceed Button — Streamline's confirm action lives inside StreamlineReviewScreen instead */}
        {!isStageLockedOrOutdated && content.selectedMode !== 'streamline' && (
          <div className="flex justify-between items-center pt-6 border-t border-border">
            {projectId === 'new' ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>💡 Create a project first to enable auto-save</span>
              </div>
            ) : isSaving ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Save className="w-4 h-4 animate-pulse" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>All changes saved</span>
              </div>
            )}
            <Button
              variant="gold"
              size="lg"
              disabled={!canProceed || isCreatingProject}
              onClick={handleComplete}
              className="min-w-[200px]"
            >
              {isCreatingProject ? 'Creating Project...' : 'Continue to Treatment'}
            </Button>
          </div>
        )}
      </motion.div>
      </div>

      <StageInfoButton infoKey="stage-1" />
    </div>
  );
}
