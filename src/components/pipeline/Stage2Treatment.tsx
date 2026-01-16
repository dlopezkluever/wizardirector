import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MessageSquare,
  Loader2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useStageState } from '@/lib/hooks/useStageState';
import { treatmentService, type TreatmentVariation } from '@/lib/services/treatmentService';
import { stageStateService } from '@/lib/services/stageStateService';
import { inputProcessingService, type ProcessedInput } from '@/lib/services/inputProcessingService';

interface Stage2Content {
  variations: TreatmentVariation[];
  activeVariation: number;
  processedInput?: ProcessedInput;
  langsmithTraceId?: string;
  promptTemplateVersion?: string;
  _styleCapsuleMetadata?: any; // Temporary - extracted during save
}

// Mock treatment data for demonstration
const mockTreatments: TreatmentVariation[] = [
  {
    id: '1',
    content: `The story opens on JAMES CALLAHAN (65), a retired astronaut, sitting alone in his modest suburban home. The walls are adorned with faded photographs of his glory days - handshakes with presidents, the iconic shot of him planting the flag on Mars. But the man before us is a shadow of that hero, diminished by time and illness.

His doctor's words echo: "Six months, maybe less." James receives this news with the stoic acceptance of a man who has stared into the void of space. But something shifts when he finds an old letter - unopened, from his daughter ELENA (38), dated five years ago.

Elena, we learn, cut ties after her mother's death. She blamed James for being absent, for choosing the stars over his family. Now a successful architect in Seattle, she has built walls as carefully as she builds buildings.

James makes a decision. He will find Elena. He will tell her the truth about her mother's last days - a truth he has carried like a stone in his chest. The journey takes him across the country, each mile a meditation on regret and hope.

Meanwhile, Elena struggles with her own crossroads. Her marriage is crumbling. Her teenage son MARCUS (16) is pulling away, eerily mirroring her own relationship with James. When she sees her father at her doorstep, twenty pounds lighter and trembling, her carefully constructed walls begin to crack.`,
    createdAt: new Date(),
  },
  {
    id: '2',
    content: `We begin not with JAMES CALLAHAN, but with the Mars mission itself - 2003, the moment everything changed. Through fragmented news footage and mission control audio, we experience the glory and the price. Young James, triumphant, unaware that back home, his wife MARIA is covering for him with their daughter ELENA (10), making excuses for another missed birthday.

Cut to present day. James (65) sits in a hospice facility, not his home. The terminal diagnosis came months ago, and he's chosen to face it alone. Until a package arrives - Elena's childhood drawings, sent by a lawyer handling Maria's estate. Maria, we realize, kept everything. Every letter James never sent, every photo, every apology drafted and abandoned.

The structure splits: past and present, father and daughter, Earth and the infinite black of space. We follow Elena (38) as she discovers the same package has been duplicated - Maria's final gift, ensuring both would receive it.

Elena is not an architect here but an astronomer, the irony not lost on her. She studies the same stars that stole her father. Her own daughter LUNA (14) watches her mother trace constellations, not knowing that the man who walked among them is dying sixty miles away.

The collision course is set. Maria, even in death, orchestrating the reunion she couldn't achieve in life.`,
    createdAt: new Date(),
  },
  {
    id: '3',
    content: `Silence. That's how THE LAST SUNSET begins - with the profound silence of space, broken only by the rhythmic breathing of JAMES CALLAHAN (65) in a spacesuit, floating against the backdrop of Earth. But this isn't a memory. This is now. This is his final journey.

Through a series of purchased favors and a small fortune, James has arranged an impossible farewell: one last trip to orbit, a private mission for a dying man to see the planet one final time before leaving it forever.

On Earth, his daughter ELENA (38) doesn't know. She hasn't spoken to him in seven years. She's in therapy, still unpacking the abandonment, still explaining to her own children why they don't have a grandfather.

But James has left something for her - a video diary, to be delivered upon his death. In it, he narrates everything: the missions, the marriages (three, all failed), the daughter he loved but couldn't reach. He speaks directly to camera, directly to her, from the cramped quarters of the commercial spacecraft.

As James watches his final sunset from 250 miles up - the thin blue line of atmosphere, the darkness waiting beyond - Elena receives an early notification. A glitch. The message arrives while he's still alive, still floating.

And she has a choice: let him die alone among the stars, or race against time to say goodbye.`,
    createdAt: new Date(),
  },
];

interface Stage2TreatmentProps {
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage2Treatment({ projectId, onComplete, onBack }: Stage2TreatmentProps) {
  // Use stage state for persistence
  const { content: stageContent, setContent: setStageContent, isLoading, isSaving } = useStageState<Stage2Content>({
    projectId,
    stageNumber: 2,
    initialContent: {
      variations: [],
      activeVariation: 0
    },
    autoSave: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [selectedText, setSelectedText] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateGuidance, setRegenerateGuidance] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current treatment content for editing
  const [editableContent, setEditableContent] = useState('');

  // Initialize treatments on component mount
  useEffect(() => {
    const initializeTreatments = async () => {
      // If we don't have variations yet, generate them from Stage 1 input
      if (stageContent.variations.length === 0 && !isGenerating) {
        await generateInitialTreatments();
      } else if (stageContent.variations.length > 0) {
        // Set editable content from current variation
        const currentVariation = stageContent.variations[stageContent.activeVariation];
        if (currentVariation) {
          // Validate that content is a string, not an object
          const content = typeof currentVariation.content === 'string' 
            ? currentVariation.content 
            : JSON.stringify(currentVariation.content);
          
          console.log('🔍 [STAGE2 UI] Setting editable content:', {
            isString: typeof currentVariation.content === 'string',
            contentType: typeof currentVariation.content,
            contentLength: content.length
          });
          
          setEditableContent(content);
        }
      }
    };

    if (!isLoading) {
      initializeTreatments();
    }
  }, [isLoading, stageContent.variations.length]);

  const generateInitialTreatments = async () => {
    try {
      setIsGenerating(true);

      console.log('🔍 [DEBUG] Starting generateInitialTreatments for projectId:', projectId);

      // Get Stage 1 processed input
      console.log('🔍 [DEBUG] Fetching Stage 1 state...');
      const stage1State = await stageStateService.getStageState(projectId, 1);
      
      console.log('🔍 [DEBUG] Stage 1 state received:', {
        exists: !!stage1State,
        id: stage1State?.id,
        stageNumber: stage1State?.stage_number,
        version: stage1State?.version,
        status: stage1State?.status,
        contentKeys: stage1State?.content ? Object.keys(stage1State.content) : 'no content',
        hasProcessedInput: !!stage1State?.content?.processedInput,
        processedInputKeys: stage1State?.content?.processedInput ? Object.keys(stage1State.content.processedInput) : 'no processedInput'
      });

      if (!stage1State?.content?.processedInput) {
        console.error('❌ [DEBUG] No processed input found from Stage 1');
        throw new Error('No processed input found from Stage 1. Please complete Stage 1 first.');
      }

      console.log('🔍 [DEBUG] Stage 1 processed input details:', {
        mode: stage1State.content.processedInput.mode,
        primaryContentLength: stage1State.content.processedInput.primaryContent?.length || 0,
        contextFilesCount: stage1State.content.processedInput.contextFiles?.length || 0,
        projectParams: stage1State.content.processedInput.projectParams
      });
      
      toast.info('Generating treatment variations...', {
        description: 'This may take a few moments'
      });

      console.log('🔍 [DEBUG] Calling treatmentService.generateTreatments with:', {
        processedInput: stage1State.content.processedInput,
        projectId
      });

      const result = await treatmentService.generateTreatments({
        processedInput: stage1State.content.processedInput,
        projectId
      });

      setStageContent(prev => ({
        ...prev,
        variations: result.variations,
        processedInput: stage1State.content.processedInput,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion,
        _styleCapsuleMetadata: result.styleCapsuleMetadata // Temporary - extracted during save
      }));

      if (result.variations.length > 0) {
        // Validate that content is a string before setting
        const firstVariation = result.variations[0];
        const content = typeof firstVariation.content === 'string'
          ? firstVariation.content
          : JSON.stringify(firstVariation.content);
        
        console.log('🔍 [STAGE2 UI] Initial variation content:', {
          isString: typeof firstVariation.content === 'string',
          contentType: typeof firstVariation.content,
          contentLength: content.length
        });
        
        setEditableContent(content);
      }

      toast.success(`Generated ${result.variations.length} treatment variations`);
    } catch (error) {
      console.error('Failed to generate treatments:', error);
      toast.error('Failed to generate treatments. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVariationSelect = useCallback((index: number) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Switch anyway?')) return;
    }
    
    setStageContent(prev => ({ ...prev, activeVariation: index }));
    
    // Validate content type before setting
    const selectedVariation = stageContent.variations[index];
    if (selectedVariation) {
      const content = typeof selectedVariation.content === 'string'
        ? selectedVariation.content
        : JSON.stringify(selectedVariation.content);
      setEditableContent(content);
    } else {
      setEditableContent('');
    }
    
    setHasUnsavedChanges(false);
  }, [stageContent.variations, hasUnsavedChanges, setStageContent]);

  const handleContentChange = useCallback((newContent: string) => {
    setEditableContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const handleTextSelection = useCallback(() => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    if (selectionStart !== selectionEnd) {
      setSelectedText({
        start: selectionStart,
        end: selectionEnd,
        text: editableContent.substring(selectionStart, selectionEnd),
      });
    } else {
      setSelectedText(null);
    }
  }, [editableContent]);

  const handleTargetedRegenerate = useCallback(async () => {
    if (!selectedText) return;

    const guidance = prompt('How would you like to change this section?');
    if (!guidance) return;

    try {
      setIsRegenerating(true);
      toast.info('Regenerating selected text...', {
        description: `"${selectedText.text.substring(0, 50)}..."`
      });

      const newText = await treatmentService.regenerateSection(
        projectId,
        editableContent,
        selectedText.text,
        guidance
      );

      // Replace the selected text with the new text
      const newContent = editableContent.substring(0, selectedText.start) + 
                        newText + 
                        editableContent.substring(selectedText.end);
      
      setEditableContent(newContent);
      setHasUnsavedChanges(true);
      setSelectedText(null);
      
      toast.success('Section regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate section:', error);
      toast.error('Failed to regenerate section. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  }, [selectedText, editableContent, projectId]);

  const handleFullRegenerate = useCallback(async () => {
    if (regenerateGuidance.length < 10) {
      toast.error('Please provide at least 10 characters of guidance');
      return;
    }

    if (!stageContent.processedInput) {
      toast.error('No input data available for regeneration');
      return;
    }

    try {
      setIsRegenerating(true);
      toast.info('Regenerating all treatments...', {
        description: regenerateGuidance
      });

      const result = await treatmentService.regenerateTreatments({
        projectId,
        guidance: regenerateGuidance,
        processedInput: stageContent.processedInput
      });

      setStageContent(prev => ({
        ...prev,
        variations: result.variations,
        activeVariation: 0,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion,
        _styleCapsuleMetadata: result.styleCapsuleMetadata // Temporary - extracted during save
      }));

      if (result.variations.length > 0) {
        // Validate content type
        const firstVariation = result.variations[0];
        const content = typeof firstVariation.content === 'string'
          ? firstVariation.content
          : JSON.stringify(firstVariation.content);
        setEditableContent(content);
      }

      toast.success(`Regenerated ${result.variations.length} treatment variations`);
      setShowRegenerateDialog(false);
      setRegenerateGuidance('');
    } catch (error) {
      console.error('Failed to regenerate treatments:', error);
      toast.error('Failed to regenerate treatments. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateGuidance, stageContent.processedInput, projectId, setStageContent]);

  const handleSaveChanges = useCallback(() => {
    if (stageContent.variations.length === 0) return;

    const updatedVariations = [...stageContent.variations];
    updatedVariations[stageContent.activeVariation] = {
      ...updatedVariations[stageContent.activeVariation],
      content: editableContent,
    };

    setStageContent(prev => ({
      ...prev,
      variations: updatedVariations
    }));
    
    setHasUnsavedChanges(false);
    toast.success('Changes saved');
  }, [stageContent.variations, stageContent.activeVariation, editableContent, setStageContent]);

  const handleRetroactiveRevise = useCallback(() => {
    toast.info('Retroactive revision triggered');
    setIsOutdated(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading treatment data...</p>
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
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Treatment Generation
            </h2>
            <p className="text-sm text-muted-foreground">
              High-level prose story treatment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOutdated && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetroactiveRevise}
              className="gap-2 text-warning border-warning/50"
            >
              <AlertTriangle className="w-4 h-4" />
              Sync with Beat Sheet
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
            Full Regenerate
          </Button>

          {hasUnsavedChanges && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveChanges}
            >
              Save Changes
            </Button>
          )}

          <Button
            variant="gold"
            size="sm"
            onClick={onComplete}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Approve & Continue
          </Button>
        </div>
      </div>

      {/* Variation Gallery */}
      {stageContent.variations.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">Variations:</span>
          <div className="flex gap-2">
            {stageContent.variations.map((variation, index) => (
              <Button
                key={variation.id}
                variant={stageContent.activeVariation === index ? 'stage-active' : 'stage'}
                size="sm"
                onClick={() => handleVariationSelect(index)}
                disabled={isGenerating || isRegenerating}
              >
                Version {index + 1}
              </Button>
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 ml-auto"
            onClick={generateInitialTreatments}
            disabled={isGenerating || isRegenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate New Variation
          </Button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {isGenerating && stageContent.variations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <div>
                <h3 className="font-medium text-foreground mb-2">Generating Treatments</h3>
                <p className="text-sm text-muted-foreground">
                  Creating 3 unique treatment variations based on your input...
                </p>
              </div>
            </div>
          </div>
        ) : stageContent.variations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">No Treatments Generated</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate treatment variations from your Stage 1 input to continue.
                </p>
                <Button onClick={generateInitialTreatments} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Treatments
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto">
              {/* Editing Mode Toggle */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isEditing ? 'stage-active' : 'ghost'}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                    disabled={isRegenerating}
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? 'Editing' : 'Edit Mode'}
                  </Button>
                  {selectedText && (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={handleTargetedRegenerate}
                      disabled={isRegenerating}
                      className="gap-2"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                      Regenerate Selection
                    </Button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {editableContent.length} characters • {editableContent.split(/\s+/).length} words
                </span>
              </div>

              {/* Content */}
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editableContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onSelect={handleTextSelection}
                  className="w-full min-h-[600px] p-6 rounded-xl bg-card border border-border text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-sans"
                  placeholder="Your treatment will appear here..."
                  disabled={isRegenerating}
                />
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 rounded-xl bg-card border border-border"
                  >
                    {editableContent.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 last:mb-0 text-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </motion.div>

                  {/* Structural Emphasis Section */}
                  {stageContent.variations[stageContent.activeVariation]?.structuralEmphasis && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <span className="text-primary">●</span>
                        Structural Emphasis
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {stageContent.variations[stageContent.activeVariation].structuralEmphasis}
                      </p>
                    </motion.div>
                  )}
                </>
              )}
            </div>
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
                Provide guidance for how you want the treatment to be regenerated. 
                This will be saved as the commit message for this version.
              </p>
              <textarea
                value={regenerateGuidance}
                onChange={(e) => setRegenerateGuidance(e.target.value)}
                placeholder="e.g., 'Make the tone darker and more suspenseful. Focus more on Elena's perspective...'"
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
                  <Button
                    variant="ghost"
                    onClick={() => setShowRegenerateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    onClick={handleFullRegenerate}
                    disabled={regenerateGuidance.length < 10}
                  >
                    Regenerate
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
