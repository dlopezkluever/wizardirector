import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  SceneHeading,
  Character,
  Dialogue,
  Action,
  Parenthetical,
  Transition
} from '@/lib/tiptap-extensions';
import {
  Check,
  RefreshCw,
  Edit3,
  Lock,
  Loader2,
  AlertTriangle,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { plainTextToTiptap, tiptapToPlainText } from '@/lib/utils/screenplay-converter';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ScreenplayToolbar } from './ScreenplayToolbar';
import { useStageState } from '@/lib/hooks/useStageState';
import { stageStateService } from '@/lib/services/stageStateService';
import { scriptService, type Scene } from '@/lib/services/scriptService';
import type { Beat } from '@/lib/services/beatService';
import { supabase } from '@/lib/supabase';

interface Stage4Content {
  formattedScript: string;
  scenes: Scene[];
  syncStatus: 'synced' | 'out_of_date_with_beats';
  beatSheetSource?: {
    beats: Beat[];
    stageId: string;
  };
  langsmithTraceId?: string;
  promptTemplateVersion?: string;
}

interface Stage4MasterScriptProps {
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage4MasterScript({ projectId, onComplete, onBack }: Stage4MasterScriptProps) {
  // Use stage state for persistence
  const { 
    content: stageContent, 
    setContent: setStageContent, 
    isLoading, 
    isSaving 
  } = useStageState<Stage4Content>({
    projectId,
    stageNumber: 4,
    initialContent: {
      formattedScript: '',
      scenes: [],
      syncStatus: 'synced'
    },
    autoSave: true
  });

  // Component state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateGuidance, setRegenerateGuidance] = useState('');
  const [showSectionEditDialog, setShowSectionEditDialog] = useState(false);
  const [sectionEditRequest, setSectionEditRequest] = useState('');
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [beatPanelCollapsed, setBeatPanelCollapsed] = useState(false);
  const [projectParams, setProjectParams] = useState<any>(null);
  

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default paragraph behavior
        paragraph: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your screenplay...',
      }),
      SceneHeading,
      Character,
      Dialogue,
      Action,
      Parenthetical,
      Transition,
    ],
    content: stageContent.formattedScript ? plainTextToTiptap(stageContent.formattedScript) : '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none p-6 focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save on change
      const html = editor.getHTML();
      const plainText = tiptapToPlainText(html);

      const updatedContent: Stage4Content = {
        ...stageContent,
        formattedScript: plainText,
        scenes: scriptService.extractScenes(plainText)
      };
      setStageContent(updatedContent);
    },
    onSelectionUpdate: ({ editor }) => {
      // Track selection state for "Edit Selection" button
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    },
  });

  // Load Stage 3 beat sheet and project parameters
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        console.log('📥 [STAGE 4] Loading Stage 3 beat sheet and project parameters...');
        
        // Fetch Stage 3 state
        const stage3State = await stageStateService.getStageState(projectId, 3);
        
        if (!stage3State || !stage3State.content.beats) {
          console.error('❌ [STAGE 4] No beat sheet found in Stage 3');
          toast.error('Please complete Stage 3 (Beat Sheet) first');
          return;
        }

        console.log(`✅ [STAGE 4] Loaded ${stage3State.content.beats.length} beats from Stage 3`);

        // Fetch project configuration (stored in projects table, not stage_states)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('❌ [STAGE 4] No auth session found');
          toast.error('Authentication required');
          return;
        }

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project configuration');
        }

        const project = await response.json();
        
        console.log('📊 [STAGE 4] Project config:', {
          targetLength: project.targetLength,
          contentRating: project.contentRating,
          genres: project.genres,
          tonalPrecision: project.tonalPrecision
        });

        const params = {
          targetLengthMin: project.targetLength?.min || 180,
          targetLengthMax: project.targetLength?.max || 300,
          contentRating: project.contentRating || 'PG-13',
          genres: project.genres || [],
          tonalPrecision: project.tonalPrecision || ''
        };

        setProjectParams(params);

        // Update stage content with beat sheet source
        setStageContent({
          ...stageContent,
          beatSheetSource: {
            beats: stage3State.content.beats,
            stageId: stage3State.id
          }
        });

      } catch (error) {
        console.error('❌ [STAGE 4] Error loading dependencies:', error);
        toast.error('Failed to load dependencies');
      }
    };

    loadDependencies();
  }, [projectId]);

  // Sync local script with stage content
  useEffect(() => {
    if (editor && stageContent.formattedScript) {
      const html = plainTextToTiptap(stageContent.formattedScript);
      editor.commands.setContent(html);
    }
  }, [stageContent.formattedScript, editor]);

  // Generate initial script
  const handleGenerateScript = useCallback(async () => {
    if (!stageContent.beatSheetSource?.beats || !projectParams) {
      toast.error('Missing required data for script generation');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('🎬 [STAGE 4] Generating master script...');
      
      const result = await scriptService.generateScript({
        beatSheet: stageContent.beatSheetSource.beats,
        projectParams
      });

      // Update stage content
      const updatedContent: Stage4Content = {
        formattedScript: result.formattedScript,
        scenes: result.scenes,
        syncStatus: 'synced',
        beatSheetSource: stageContent.beatSheetSource,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion
      };

      setStageContent(updatedContent);

      toast.success(`Script generated with ${result.scenes.length} scenes`);
      
    } catch (error: any) {
      console.error('❌ [STAGE 4] Script generation failed:', error);
      toast.error(error.message || 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  }, [stageContent.beatSheetSource, projectParams, setStageContent]);

  // Full script regeneration
  const handleRegenerateScript = useCallback(async () => {
    if (regenerateGuidance.length < 10) {
      toast.error('Please provide at least 10 characters of guidance');
      return;
    }

    if (!stageContent.beatSheetSource?.beats || !projectParams) {
      toast.error('Missing required data for regeneration');
      return;
    }

    setIsGenerating(true);
    setShowRegenerateDialog(false);
    
    try {
      console.log('🔄 [STAGE 4] Regenerating master script with guidance...');
      
      const result = await scriptService.regenerateScript({
        beatSheet: stageContent.beatSheetSource.beats,
        projectParams,
        guidance: regenerateGuidance
      });

      const updatedContent: Stage4Content = {
        formattedScript: result.formattedScript,
        scenes: result.scenes,
        syncStatus: 'synced',
        beatSheetSource: stageContent.beatSheetSource,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion
      };

      setStageContent(updatedContent);
      setRegenerateGuidance('');
      
      toast.success('Script regenerated successfully');
      
    } catch (error: any) {
      console.error('❌ [STAGE 4] Script regeneration failed:', error);
      toast.error(error.message || 'Failed to regenerate script');
    } finally {
      setIsGenerating(false);
    }
  }, [regenerateGuidance, stageContent.beatSheetSource, projectParams, setStageContent]);

  // Section regeneration (highlight and rewrite)
  const handleRegenerateSection = useCallback(async () => {
    if (!editor || sectionEditRequest.length < 10) {
      toast.error('Please provide at least 10 characters of guidance');
      return;
    }

    setIsGenerating(true);
    setShowSectionEditDialog(false);

    try {
      console.log('✏️ [STAGE 4] Regenerating selected section...');

      // Get selected text from Tiptap
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      // Get context around the selection (500 chars before/after)
      const beforeText = editor.state.doc.textBetween(Math.max(0, from - 500), from);
      const afterText = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 500));

      const rewrittenSection = await scriptService.regenerateSection({
        scriptContext: {
          beforeText,
          highlightedText: selectedText,
          afterText
        },
        editRequest: sectionEditRequest
      });

      // Replace selection in Tiptap
      editor.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(rewrittenSection)
        .run();

      setSectionEditRequest('');

      toast.success('Section regenerated successfully');

    } catch (error: any) {
      console.error('❌ [STAGE 4] Section regeneration failed:', error);
      toast.error(error.message || 'Failed to regenerate section');
    } finally {
      setIsGenerating(false);
    }
  }, [editor, sectionEditRequest]);



  // Approve and lock script
  const handleApproveScript = useCallback(async () => {
    if (!editor) return;

    const plainText = tiptapToPlainText(editor.getHTML());
    if (!plainText || plainText.trim().length === 0) {
      toast.error('Cannot approve an empty script');
      return;
    }

    try {
      console.log('🔒 [STAGE 4] Approving master script...');

      // Extract scenes if not already done
      let scenes = stageContent.scenes;
      if (scenes.length === 0) {
        scenes = scriptService.extractScenes(plainText);
      }

      // Persist scenes to database
      await scriptService.persistScenes(projectId, scenes);

      // Lock the stage
      await stageStateService.lockStage(projectId, 4);

      toast.success(`Master Script approved! ${scenes.length} scenes extracted and ready for production.`);

      // Navigate to Stage 5
      onComplete();

    } catch (error: any) {
      console.error('❌ [STAGE 4] Failed to approve script:', error);
      toast.error(error.message || 'Failed to approve script');
    }
  }, [editor, stageContent.scenes, projectId, onComplete]);

  // Scroll to beat
  const handleBeatClick = useCallback((beatIndex: number) => {
    setActiveBeatIndex(beatIndex);

    if (!editor || !stageContent.beatSheetSource?.beats) return;

    // Simple approach: divide script into beat-sized chunks
    const beats = stageContent.beatSheetSource.beats;
    const plainText = tiptapToPlainText(editor.getHTML());
    const lines = plainText.split('\n');
    const linesPerBeat = Math.ceil(lines.length / beats.length);
    const targetLine = beatIndex * linesPerBeat;

    // Calculate approximate character position
    let charPosition = 0;
    for (let i = 0; i < targetLine && i < lines.length; i++) {
      charPosition += lines[i].length + 1; // +1 for newline
    }

    // Scroll Tiptap editor to position
    editor.commands.focus();
    editor.commands.setTextSelection(charPosition);
    // Scroll the editor container to the calculated position
    const editorElement = document.querySelector('.ProseMirror') as HTMLElement;
    if (editorElement) {
      const lineHeight = 20; // Approximate line height
      editorElement.scrollTop = targetLine * lineHeight;
    }
  }, [editor, stageContent.beatSheetSource]);


  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading master script...</p>
        </div>
      </div>
    );
  }

  // Initial generation state
  if (!stageContent.formattedScript) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />Back
            </Button>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Master Script</h2>
              <p className="text-sm text-muted-foreground">Generate production-ready screenplay</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Generate Your Script</h3>
            <p className="text-muted-foreground mb-6">
              Transform your beat sheet into a detailed, production-ready screenplay with rich visual descriptions.
            </p>
            <Button 
              onClick={handleGenerateScript} 
              disabled={isGenerating || !stageContent.beatSheetSource?.beats}
              className="gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Master Script
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Master Script</h2>
            <p className="text-sm text-muted-foreground">
              {stageContent.scenes.length} scenes • {isSaving ? 'Saving...' : 'Saved'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowRegenerateDialog(true)}
            disabled={isGenerating}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </Button>
          {hasSelection && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowSectionEditDialog(true)}
              disabled={isGenerating}
              className="gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Selection
            </Button>
          )}
          <Button 
            variant="gold" 
            size="sm" 
            onClick={handleApproveScript}
            disabled={isGenerating}
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            Approve Script
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Script Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Screenplay Toolbar */}
          <ScreenplayToolbar editor={editor} />

          {/* Tiptap Editor */}
          <div className="flex-1 overflow-auto bg-background">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Beat Alignment Panel */}
        <AnimatePresence>
          {!beatPanelCollapsed && stageContent.beatSheetSource?.beats && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-sm">Beat Alignment</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBeatPanelCollapsed(true)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="overflow-auto h-[calc(100%-57px)] p-4 space-y-2">
                {stageContent.beatSheetSource.beats.map((beat, index) => (
                  <button
                    key={beat.id}
                    onClick={() => handleBeatClick(index)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      activeBeatIndex === index
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0',
                        activeBeatIndex === index
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      )}>
                        {beat.order}
                      </div>
                      <p className="text-sm leading-relaxed">{beat.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed beat panel toggle */}
        {beatPanelCollapsed && (
          <div className="border-l border-border bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBeatPanelCollapsed(false)}
              className="h-full px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Full Regeneration Dialog */}
      <AnimatePresence>
        {showRegenerateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRegenerateDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Regenerate Master Script</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Provide guidance for how you want the script regenerated (minimum 10 characters).
              </p>
              
              <textarea
                value={regenerateGuidance}
                onChange={(e) => setRegenerateGuidance(e.target.value)}
                placeholder="E.g., Make the dialogue more snappy and witty..."
                className="w-full h-32 p-3 rounded-lg bg-secondary border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {regenerateGuidance.length} / 10 characters
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRegenerateDialog(false);
                      setRegenerateGuidance('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRegenerateScript}
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

      {/* Section Edit Dialog */}
      <AnimatePresence>
        {showSectionEditDialog && hasSelection && editor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSectionEditDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Edit Selected Section</h3>
              
              <div className="mb-4 p-3 bg-secondary rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-1">Selected text:</p>
                <p className="text-sm font-mono">
                  {(() => {
                    const { from, to } = editor.state.selection;
                    const selectedText = editor.state.doc.textBetween(from, to);
                    return selectedText.substring(0, 200) + (selectedText.length > 200 ? '...' : '');
                  })()}
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                What would you like to change? (minimum 10 characters)
              </p>
              
              <textarea
                value={sectionEditRequest}
                onChange={(e) => setSectionEditRequest(e.target.value)}
                placeholder="E.g., Make this description more atmospheric and add details about the lighting..."
                className="w-full h-32 p-3 rounded-lg bg-secondary border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {sectionEditRequest.length} / 10 characters
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSectionEditDialog(false);
                      setSectionEditRequest('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRegenerateSection}
                    disabled={sectionEditRequest.length < 10}
                  >
                    Regenerate Section
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
