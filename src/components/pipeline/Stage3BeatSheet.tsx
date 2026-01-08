import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  RefreshCw,
  Lock,
  Loader2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStageState } from '@/lib/hooks/useStageState';
import { beatService, type Beat } from '@/lib/services/beatService';
import { stageStateService } from '@/lib/services/stageStateService';

interface Stage3Content {
  beats: Beat[];
  totalEstimatedRuntime: number;
  narrativeStructure: string;
  treatmentSource?: {
    content: string;
    variantId: string;
  };
  langsmithTraceId?: string;
  promptTemplateVersion?: string;
}

// Sortable Beat Item Component
interface SortableBeatItemProps {
  beat: Beat;
  isEditing: boolean;
  onEdit: (beatId: string) => void;
  onContentChange: (beatId: string, content: string) => void;
  onToggleExpand: (beatId: string) => void;
  onBrainstorm: (beatId: string) => void;
  onAddAfter: (beatId: string) => void;
  onDelete: (beatId: string) => void;
  disabled?: boolean;
}

function SortableBeatItem({
  beat,
  isEditing,
  onEdit,
  onContentChange,
  onToggleExpand,
  onBrainstorm,
  onAddAfter,
  onDelete,
  disabled = false
}: SortableBeatItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-xl border transition-all duration-200',
        isDragging ? 'opacity-50 scale-105 shadow-lg' : '',
        isEditing
          ? 'bg-primary/10 border-primary shadow-gold'
          : 'bg-card border-border hover:border-primary/30'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg cursor-grab active:cursor-grabbing shrink-0 mt-0.5',
            disabled ? 'cursor-not-allowed opacity-50' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          )}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Beat Number */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold text-sm shrink-0">
          {beat.order}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              value={beat.text}
              onChange={(e) => onContentChange(beat.id, e.target.value)}
              onBlur={() => onEdit('')}
              autoFocus
              disabled={disabled}
              className="w-full min-h-[80px] p-2 rounded-lg bg-secondary border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          ) : (
            <p 
              onClick={() => !disabled && onEdit(beat.id)}
              className={cn(
                'text-foreground cursor-text hover:bg-secondary/50 p-2 -m-2 rounded-lg transition-colors',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {beat.text}
            </p>
          )}

          {/* Treatment Excerpt (expandable) */}
          {beat.originalTreatmentExcerpt && (
            <div className="mt-2">
              <button
                onClick={() => onToggleExpand(beat.id)}
                disabled={disabled}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {beat.isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                View original treatment context
              </button>
              <AnimatePresence>
                {beat.isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground overflow-hidden"
                  >
                    {beat.originalTreatmentExcerpt}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Beat Metadata */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{beat.estimatedScreenTimeSeconds}s</span>
            {beat.rationale && (
              <>
                <span>•</span>
                <span>{beat.rationale}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={cn(
          'flex items-center gap-1 transition-opacity',
          disabled ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onBrainstorm(beat.id)}
            disabled={disabled}
            title="Brainstorm alternatives"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onAddAfter(beat.id)}
            disabled={disabled}
            title="Add beat after"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(beat.id)}
            disabled={disabled}
            title="Delete beat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mock beat data
const mockBeats: Beat[] = [
  { id: '1', number: 1, content: 'James Callahan, retired astronaut, receives terminal diagnosis. Six months to live.', isExpanded: false },
  { id: '2', number: 2, content: 'James finds an unopened letter from his estranged daughter Elena, dated five years ago.', isExpanded: false },
  { id: '3', number: 3, content: 'Flashback: The day Elena cut ties - her mother\'s funeral, James arriving late from a mission debrief.', isExpanded: false },
  { id: '4', number: 4, content: 'James decides to find Elena. Packs a single bag, leaves his medals behind.', isExpanded: false },
  { id: '5', number: 5, content: 'Cross-country journey begins. Each mile triggers memories of missed moments.', isExpanded: false },
  { id: '6', number: 6, content: 'Elena in Seattle, successful but hollow. Her marriage is failing. Her son Marcus is distant.', isExpanded: false },
  { id: '7', number: 7, content: 'James arrives at Elena\'s home. She sees him through the window but doesn\'t answer the door.', isExpanded: false },
  { id: '8', number: 8, content: 'Marcus, curious about the stranger, sneaks out to meet his grandfather.', isExpanded: false },
  { id: '9', number: 9, content: 'Marcus and James connect over astronomy. James sees his own patterns repeating.', isExpanded: false },
  { id: '10', number: 10, content: 'Elena confronts her father. Years of anger pour out. James doesn\'t defend himself.', isExpanded: false },
  { id: '11', number: 11, content: 'James reveals the truth: Maria asked him to stay away. She was protecting Elena from his radiation sickness.', isExpanded: false },
  { id: '12', number: 12, content: 'Elena\'s walls crack. She reads her mother\'s hidden letters, finally understanding.', isExpanded: false },
  { id: '13', number: 13, content: 'Father and daughter watch the sunset together. They don\'t speak. They don\'t need to.', isExpanded: false },
  { id: '14', number: 14, content: 'Time jump: Three months later. James in hospice, but not alone. Elena and Marcus at his bedside.', isExpanded: false },
  { id: '15', number: 15, content: 'Final scene: Marcus on a rooftop, telescope pointed at Mars. He whispers "Goodnight, grandpa."', isExpanded: false },
];

interface Stage3BeatSheetProps {
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage3BeatSheet({ projectId, onComplete, onBack }: Stage3BeatSheetProps) {
  // Use stage state for persistence
  const { content: stageContent, setContent: setStageContent, isLoading, isSaving } = useStageState<Stage3Content>({
    projectId,
    stageNumber: 3,
    initialContent: {
      beats: [],
      totalEstimatedRuntime: 0,
      narrativeStructure: ''
    },
    autoSave: true
  });

  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateGuidance, setRegenerateGuidance] = useState('');
  const [selectedBeatForBrainstorm, setSelectedBeatForBrainstorm] = useState<string | null>(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize beats on component mount
  useEffect(() => {
    const initializeBeats = async () => {
      // If we don't have beats yet, generate them from Stage 2 treatment
      if (stageContent.beats.length === 0 && !isGenerating) {
        await generateInitialBeats();
      }
    };

    if (!isLoading) {
      initializeBeats();
    }
  }, [isLoading, stageContent.beats.length]);

  const generateInitialBeats = async () => {
    try {
      setIsGenerating(true);
      toast.info('Generating beat sheet...', {
        description: 'Extracting structural beats from your treatment'
      });

      console.log('🔍 [STAGE3] Fetching Stage 2 treatment data...');
      
      // Get Stage 2 treatment data
      const stage2State = await stageStateService.getStageState(projectId, 2);
      
      if (!stage2State?.content?.variations || stage2State.content.variations.length === 0) {
        throw new Error('No treatment found from Stage 2. Please complete Stage 2 first.');
      }

      const activeVariationIndex = stage2State.content.activeVariation || 0;
      const selectedTreatment = stage2State.content.variations[activeVariationIndex];
      
      console.log('🔍 [STAGE3] Stage 2 data retrieved:', {
        variationsCount: stage2State.content.variations.length,
        activeVariation: activeVariationIndex,
        treatmentContentLength: selectedTreatment.content.length,
        hasProcessedInput: !!stage2State.content.processedInput
      });

      const treatmentData = {
        treatmentProse: selectedTreatment.content,
        selectedVariantId: selectedTreatment.id,
        projectParams: stage2State.content.processedInput?.projectParams || {
          targetLengthMin: 180,
          targetLengthMax: 300,
          genres: ['Drama'],
          tonalPrecision: 'Emotional and contemplative'
        }
      };

      console.log('🔍 [STAGE3] Calling beatService.generateBeats with actual treatment data');
      const result = await beatService.generateBeats(treatmentData);

      // Validate beats have string text fields
      const validatedBeats = result.beats.map((beat, index) => ({
        ...beat,
        text: typeof beat.text === 'string' ? beat.text : JSON.stringify(beat.text)
      }));

      console.log('🔍 [STAGE3 UI] Validated beats:', {
        count: validatedBeats.length,
        firstBeatTextType: typeof validatedBeats[0]?.text,
        firstBeatTextLength: validatedBeats[0]?.text?.length
      });

      setStageContent(prev => ({
        ...prev,
        beats: validatedBeats,
        totalEstimatedRuntime: result.totalEstimatedRuntime,
        narrativeStructure: result.narrativeStructure,
        treatmentSource: {
          content: treatmentData.treatmentProse,
          variantId: treatmentData.selectedVariantId
        },
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion
      }));

      toast.success(`Generated ${result.beats.length} beats`);
    } catch (error) {
      console.error('Failed to generate beats:', error);
      toast.error('Failed to generate beats. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stageContent.beats.findIndex(beat => beat.id === active.id);
      const newIndex = stageContent.beats.findIndex(beat => beat.id === over.id);

      const reorderedBeats = arrayMove(stageContent.beats, oldIndex, newIndex).map((beat, index) => ({
        ...beat,
        order: index + 1,
      }));

      setStageContent(prev => ({
        ...prev,
        beats: reorderedBeats
      }));

      toast.success('Beat order updated');
    }
  }, [stageContent.beats, setStageContent]);

  const handleBeatContentChange = useCallback((beatId: string, newContent: string) => {
    setStageContent(prev => ({
      ...prev,
      beats: prev.beats.map(beat => 
        beat.id === beatId ? { ...beat, text: newContent } : beat
      )
    }));
  }, [setStageContent]);

  const toggleBeatExpand = useCallback((beatId: string) => {
    setStageContent(prev => ({
      ...prev,
      beats: prev.beats.map(beat => 
        beat.id === beatId ? { ...beat, isExpanded: !beat.isExpanded } : beat
      )
    }));
  }, [setStageContent]);

  const addBeatAfter = useCallback((afterBeatId: string) => {
    const index = stageContent.beats.findIndex(b => b.id === afterBeatId);
    const newBeat: Beat = {
      id: `beat-${Date.now()}`,
      order: index + 2,
      text: 'New beat - describe what happens here...',
      estimatedScreenTimeSeconds: 20,
      isExpanded: false,
    };
    
    const newBeats = [
      ...stageContent.beats.slice(0, index + 1),
      newBeat,
      ...stageContent.beats.slice(index + 1).map(b => ({ ...b, order: b.order + 1 })),
    ];
    
    setStageContent(prev => ({
      ...prev,
      beats: newBeats
    }));
    
    setEditingBeatId(newBeat.id);
    toast.success('New beat added');
  }, [stageContent.beats, setStageContent]);

  const deleteBeat = useCallback((beatId: string) => {
    if (stageContent.beats.length <= 3) {
      toast.error('Minimum 3 beats required');
      return;
    }
    
    const newBeats = stageContent.beats
      .filter(b => b.id !== beatId)
      .map((b, i) => ({ ...b, order: i + 1 }));
    
    setStageContent(prev => ({
      ...prev,
      beats: newBeats
    }));
    
    toast.success('Beat removed');
  }, [stageContent.beats, setStageContent]);

  const handleBrainstorm = useCallback(async (beatId: string) => {
    const beat = stageContent.beats.find(b => b.id === beatId);
    if (!beat) return;

    try {
      setSelectedBeatForBrainstorm(beatId);
      toast.info('Brainstorming alternatives...', {
        description: 'AI is generating 3 alternative versions of this beat'
      });

      const alternatives = await beatService.brainstormBeatAlternatives(
        projectId,
        beat,
        stageContent.beats
      );

      // For now, just show the alternatives in a toast
      // TODO: Implement proper alternative selection UI
      toast.success(`Generated ${alternatives.length} alternatives`, {
        description: 'Alternative versions created'
      });
    } catch (error) {
      console.error('Failed to brainstorm alternatives:', error);
      toast.error('Failed to generate alternatives. Please try again.');
    } finally {
      setSelectedBeatForBrainstorm(null);
    }
  }, [stageContent.beats, projectId]);

  const handleConfirmAndLock = useCallback(() => {
    if (stageContent.beats.some(b => b.text.length < 10)) {
      toast.error('All beats must have at least 10 characters');
      return;
    }
    
    if (stageContent.beats.length < 3) {
      toast.error('At least 3 beats are required');
      return;
    }
    
    toast.success('Beat sheet confirmed and locked');
    onComplete();
  }, [stageContent.beats, onComplete]);

  const handleFullRegenerate = useCallback(async () => {
    if (regenerateGuidance.length < 10) {
      toast.error('Please provide at least 10 characters of guidance');
      return;
    }

    if (!stageContent.treatmentSource) {
      toast.error('No treatment source available for regeneration');
      return;
    }

    try {
      setIsRegenerating(true);
      toast.info('Regenerating beat sheet...', {
        description: regenerateGuidance
      });

      const result = await beatService.regenerateBeats(
        projectId,
        {
          treatmentProse: stageContent.treatmentSource.content,
          selectedVariantId: stageContent.treatmentSource.variantId,
          projectParams: {
            targetLengthMin: 180, // TODO: Get from project config
            targetLengthMax: 300,
            genres: ['Drama'],
            tonalPrecision: 'Emotional and contemplative'
          }
        },
        regenerateGuidance
      );

      // Validate beats have string text fields
      const validatedBeats = result.beats.map((beat) => ({
        ...beat,
        text: typeof beat.text === 'string' ? beat.text : JSON.stringify(beat.text)
      }));

      setStageContent(prev => ({
        ...prev,
        beats: validatedBeats,
        totalEstimatedRuntime: result.totalEstimatedRuntime,
        narrativeStructure: result.narrativeStructure,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion
      }));

      toast.success(`Regenerated ${result.beats.length} beats`);
      setShowRegenerateDialog(false);
      setRegenerateGuidance('');
    } catch (error) {
      console.error('Failed to regenerate beats:', error);
      toast.error('Failed to regenerate beats. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateGuidance, stageContent.treatmentSource, projectId, setStageContent]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading beat sheet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            ← Back
          </Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Beat Sheet
            </h2>
            <p className="text-sm text-muted-foreground">
              Structural anchor for your narrative • {stageContent.beats.length} beats
              {stageContent.totalEstimatedRuntime > 0 && (
                <span> • {Math.round(stageContent.totalEstimatedRuntime / 60)}m estimated</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOutdated && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-warning border-warning/50"
            >
              <AlertTriangle className="w-4 h-4" />
              Sync with Script
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={isRegenerating || isGenerating}
            className="gap-2"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Regenerate All
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={handleConfirmAndLock}
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            Confirm & Lock
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Drag to reorder</span> • 
          Click to edit • 
          <Sparkles className="w-3 h-3 inline mx-1" /> to brainstorm alternatives
        </p>
      </div>

      {/* Beat List */}
      <div className="flex-1 overflow-auto p-6">
        {isGenerating && stageContent.beats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <div>
                <h3 className="font-medium text-foreground mb-2">Generating Beat Sheet</h3>
                <p className="text-sm text-muted-foreground">
                  Extracting structural beats from your treatment...
                </p>
              </div>
            </div>
          </div>
        ) : stageContent.beats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">No Beat Sheet Generated</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate beats from your Stage 2 treatment to continue.
                </p>
                <Button onClick={generateInitialBeats} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Beat Sheet
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={stageContent.beats.map(beat => beat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {stageContent.beats.map((beat) => (
                    <SortableBeatItem
                      key={beat.id}
                      beat={beat}
                      isEditing={editingBeatId === beat.id}
                      onEdit={setEditingBeatId}
                      onContentChange={handleBeatContentChange}
                      onToggleExpand={toggleBeatExpand}
                      onBrainstorm={handleBrainstorm}
                      onAddAfter={addBeatAfter}
                      onDelete={deleteBeat}
                      disabled={isRegenerating || isGenerating}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Beat at End */}
            {stageContent.beats.length > 0 && (
              <Button
                variant="outline"
                onClick={() => addBeatAfter(stageContent.beats[stageContent.beats.length - 1].id)}
                disabled={isRegenerating || isGenerating}
                className="w-full mt-4 gap-2 border-dashed"
              >
                <Plus className="w-4 h-4" />
                Add Beat
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Regeneration Dialog */}
      <AnimatePresence>
        {showRegenerateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowRegenerateDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-xl bg-card border border-border shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Regeneration Guidance
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Provide guidance for how you want the beat sheet to be regenerated.
              </p>
              <textarea
                value={regenerateGuidance}
                onChange={(e) => setRegenerateGuidance(e.target.value)}
                placeholder="e.g., 'Add more tension in the middle section. Include a twist at beat 10...'"
                className="w-full h-32 px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-between mt-4">
                <span className={cn(
                  'text-xs',
                  regenerateGuidance.length >= 10 ? 'text-success' : 'text-muted-foreground'
                )}>
                  {regenerateGuidance.length}/10 minimum
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowRegenerateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    disabled={regenerateGuidance.length < 10 || isRegenerating}
                    onClick={handleFullRegenerate}
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      'Regenerate'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
