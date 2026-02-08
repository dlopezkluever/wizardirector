import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  SceneHeading,
  Action,
  Transition,
  DialogueLine,
  DialogueLineDecorations
} from '@/lib/tiptap-extensions';
import {
  RefreshCw,
  Edit3,
  Lock,
  Loader2,
  AlertTriangle,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseScriptToTiptapJson, tiptapJsonToPlainText } from '@/lib/utils/screenplay-converter';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ScreenplayToolbar } from './ScreenplayToolbar';
import { useStageState } from '@/lib/hooks/useStageState';
import { stageStateService } from '@/lib/services/stageStateService';
import { scriptService, type Scene } from '@/lib/services/scriptService';
import { sceneService } from '@/lib/services/sceneService';
import type { Beat } from '@/lib/services/beatService';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Scene as SceneType } from '@/types/scene';

interface Stage4Content {
  formattedScript: string;
  tiptapDoc?: object;
  scenes: Scene[];
  syncStatus: 'synced' | 'out_of_date_with_beats';
  beatSheetSource?: {
    beats: Beat[];
    stageId: string;
  };
  langsmithTraceId?: string;
  _styleCapsuleMetadata?: any; // Temporary - extracted during save
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
    isSaving,
    save // Manual save for custom debouncing
  } = useStageState<Stage4Content>({
    projectId,
    stageNumber: 4,
    initialContent: {
      formattedScript: '',
      scenes: [],
      syncStatus: 'synced'
    },
    autoSave: false // Disabled - using custom debounced save
  });

  // Component state
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateGuidance, setRegenerateGuidance] = useState('');
  const [showSectionEditDialog, setShowSectionEditDialog] = useState(false);
  const [sectionEditRequest, setSectionEditRequest] = useState('');
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [beatPanelCollapsed, setBeatPanelCollapsed] = useState(false);
  const [projectParams, setProjectParams] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewScenes, setPreviewScenes] = useState<SceneType[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showDownstreamWarning, setShowDownstreamWarning] = useState(false);
  const [downstreamDataExists, setDownstreamDataExists] = useState(false);

  // Track if we're programmatically setting content to prevent cursor jumps
  const isProgrammaticUpdate = useRef(false);
  // Ref for debounced save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if auto-generation has been attempted to prevent repeated triggers
  const autoGenAttempted = useRef(false);


  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep default paragraph for compatibility
      }),
      Placeholder.configure({
        placeholder: 'Start writing your screenplay...',
      }),
      SceneHeading,
      Action,
      Transition,
      DialogueLine,
      DialogueLineDecorations,
    ],
    content: stageContent.tiptapDoc
      ? stageContent.tiptapDoc
      : stageContent.formattedScript
        ? parseScriptToTiptapJson(stageContent.formattedScript)
        : '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none p-6 focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      const tiptapDoc = editor.getJSON();
      const plainText = tiptapJsonToPlainText(tiptapDoc);

      // Update local state immediately for UI responsiveness (functional update to preserve all fields)
      setStageContent(prev => ({
        ...prev,
        formattedScript: plainText,
        tiptapDoc,
        scenes: scriptService.extractScenes(plainText)
      }));

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for 2-second debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        console.log('[STAGE 4] Auto-saving after 2s of inactivity...');
        try {
          await save({ status: 'draft' });
          console.log('[STAGE 4] Auto-save successful');
        } catch (error) {
          console.error('[STAGE 4] Auto-save failed:', error);
        }
      }, 2000);
    },
    onSelectionUpdate: ({ editor }) => {
      // Track selection state for "Edit Selection" button
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    },
  });

  // Set initial content flag on mount if there's existing content
  useEffect(() => {
    if (stageContent.formattedScript) {
      isProgrammaticUpdate.current = true;
    }
  }, []); // Only run once on mount

  // Update editor content when stage content loads from DB
  useEffect(() => {
    if (!editor || isLoading) {
      console.log('[STAGE 4] Skipping editor sync:', { hasEditor: !!editor, isLoading });
      return;
    }

    // Prefer tiptapDoc (native JSON) over formattedScript (plain text migration)
    if (stageContent.tiptapDoc) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(stageContent.tiptapDoc);

      if (currentJson !== newJson) {
        console.log('[STAGE 4] Syncing tiptapDoc to editor');
        editor.commands.setContent(stageContent.tiptapDoc);
      }
    } else if (stageContent.formattedScript) {
      // Migration path: convert plain text to TipTap JSON
      const tiptapDoc = parseScriptToTiptapJson(stageContent.formattedScript);
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(tiptapDoc);

      if (currentJson !== newJson) {
        console.log('[STAGE 4] Migrating formattedScript to tiptapDoc');
        editor.commands.setContent(tiptapDoc);
      }
    } else {
      console.log('[STAGE 4] No content to sync');
    }
  }, [stageContent.formattedScript, stageContent.tiptapDoc, editor, isLoading]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load Stage 3 beat sheet and project parameters
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        console.log('[STAGE 4] Loading Stage 3 beat sheet and project parameters...');

        // Fetch Stage 3 state
        const stage3State = await stageStateService.getStageState(projectId, 3);

        if (!stage3State || !stage3State.content.beats) {
          console.error('[STAGE 4] No beat sheet found in Stage 3');
          toast.error('Please complete Stage 3 (Beat Sheet) first');
          return;
        }

        console.log(`[STAGE 4] Loaded ${stage3State.content.beats.length} beats from Stage 3`);

        // Also get Stage 2 state to retrieve processedInput (includes writingStyleCapsuleId)
        const stage2State = await stageStateService.getStageState(projectId, 2);

        // Fetch project configuration (stored in projects table, not stage_states)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error('[STAGE 4] No auth session found');
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

        console.log('[STAGE 4] Project config:', {
          targetLength: project.targetLength,
          contentRating: project.contentRating,
          genres: project.genres,
          tonalPrecision: project.tonalPrecision
        });

        const params = {
          projectId,
          targetLengthMin: project.targetLength?.min || 180,
          targetLengthMax: project.targetLength?.max || 300,
          contentRating: project.contentRating || 'PG-13',
          genres: project.genres || [],
          tonalPrecision: project.tonalPrecision || '',
          // Include writingStyleCapsuleId from Stage 2 processedInput
          writingStyleCapsuleId: stage2State?.content?.processedInput?.projectParams?.writingStyleCapsuleId
        };

        setProjectParams(params);

        // Update stage content with beat sheet source (functional update to preserve existing content)
        setStageContent(prev => ({
          ...prev,
          beatSheetSource: {
            beats: stage3State.content.beats,
            stageId: stage3State.id
          }
        }));

      } catch (error) {
        console.error('[STAGE 4] Error loading dependencies:', error);
        toast.error('Failed to load dependencies');
      }
    };

    loadDependencies();
  }, [projectId]);

  // Generate initial script
  const handleGenerateScript = useCallback(async () => {
    if (!stageContent.beatSheetSource?.beats || !projectParams) {
      toast.error('Missing required data for script generation');
      return;
    }

    setIsGenerating(true);

    try {
      console.log('[STAGE 4] Generating master script...');

      const result = await scriptService.generateScript({
        beatSheet: stageContent.beatSheetSource.beats,
        projectParams
      });

      // Parse the generated script into TipTap JSON
      const tiptapDoc = parseScriptToTiptapJson(result.formattedScript);

      // Update stage content
      const updatedContent: Stage4Content = {
        formattedScript: result.formattedScript,
        tiptapDoc,
        scenes: result.scenes,
        syncStatus: 'synced',
        beatSheetSource: stageContent.beatSheetSource,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion,
        _styleCapsuleMetadata: result.styleCapsuleMetadata // Temporary - extracted during save
      };

      isProgrammaticUpdate.current = true; // Flag programmatic update
      setStageContent(updatedContent);

      toast.success(`Script generated with ${result.scenes.length} scenes`);

    } catch (error: any) {
      console.error('[STAGE 4] Script generation failed:', error);
      toast.error(error.message || 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  }, [stageContent.beatSheetSource, projectParams, setStageContent]);

  // Auto-generation: trigger script generation on first visit when dependencies are loaded
  useEffect(() => {
    const autoGenerate = async () => {
      if (
        !stageContent.formattedScript &&
        !stageContent.tiptapDoc &&
        !isGenerating &&
        !autoGenAttempted.current &&
        stageContent.beatSheetSource?.beats &&
        projectParams
      ) {
        autoGenAttempted.current = true;
        await handleGenerateScript();
      }
    };

    if (!isLoading) {
      autoGenerate();
    }
  }, [isLoading, stageContent.formattedScript, stageContent.tiptapDoc, isGenerating,
      stageContent.beatSheetSource, projectParams, handleGenerateScript]);

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
      console.log('[STAGE 4] Regenerating master script with guidance...');

      const result = await scriptService.regenerateScript({
        beatSheet: stageContent.beatSheetSource.beats,
        projectParams,
        guidance: regenerateGuidance
      });

      const tiptapDoc = parseScriptToTiptapJson(result.formattedScript);

      const updatedContent: Stage4Content = {
        formattedScript: result.formattedScript,
        tiptapDoc,
        scenes: result.scenes,
        syncStatus: 'synced',
        beatSheetSource: stageContent.beatSheetSource,
        langsmithTraceId: result.langsmithTraceId,
        promptTemplateVersion: result.promptTemplateVersion
      };

      isProgrammaticUpdate.current = true; // Flag programmatic update
      setStageContent(updatedContent);
      setRegenerateGuidance('');

      toast.success('Script regenerated successfully');

    } catch (error: any) {
      console.error('[STAGE 4] Script regeneration failed:', error);
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
      console.log('[STAGE 4] Regenerating selected section...');

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
      console.error('[STAGE 4] Section regeneration failed:', error);
      toast.error(error.message || 'Failed to regenerate section');
    } finally {
      setIsGenerating(false);
    }
  }, [editor, sectionEditRequest]);



  // Preview scenes (Phase A: Draft Phase)
  const handlePreviewScenes = useCallback(async () => {
    if (!editor) return;

    const plainText = tiptapJsonToPlainText(editor.getJSON());
    if (!plainText || plainText.trim().length === 0) {
      toast.error('Cannot preview scenes from an empty script');
      return;
    }

    setIsPreviewing(true);
    try {
      console.log('[STAGE 4] Previewing scenes (in-memory only)...');

      // Use sceneService.previewScenes for in-memory extraction
      const previewedScenes = await sceneService.previewScenes(plainText);

      if (previewedScenes.length === 0) {
        toast.warning('No scenes found in script. Make sure your script includes scene headings (INT./EXT.).');
        setIsPreviewing(false);
        return;
      }

      setPreviewScenes(previewedScenes);
      setShowPreviewDialog(true);

      // Optionally save preview to stage_states.content.scenes for persistence
      setStageContent(prev => ({
        ...prev,
        scenes: previewedScenes.map(s => ({
          id: s.id,
          sceneNumber: s.sceneNumber,
          slug: s.slug,
          heading: s.header,
          content: s.scriptExcerpt
        }))
      }));

      console.log(`[STAGE 4] Previewed ${previewedScenes.length} scenes`);
    } catch (error: any) {
      console.error('[STAGE 4] Failed to preview scenes:', error);
      toast.error(error.message || 'Failed to preview scenes');
    } finally {
      setIsPreviewing(false);
    }
  }, [editor, setStageContent]);

  // Check for downstream Phase B data
  const checkDownstreamData = useCallback(async (): Promise<boolean> => {
    try {
      // Check if any scenes exist with status beyond 'draft' (indicating Phase B has begun)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return false;
      }

      // Get project to find active branch
      const projectResponse = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!projectResponse.ok) {
        return false;
      }

      const project = await projectResponse.json();
      if (!project.active_branch_id) {
        return false;
      }

      // Check if any scenes have Phase B status (shot_list_ready, frames_locked, video_complete)
      const scenesResponse = await fetch(`/api/projects/${projectId}/scenes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!scenesResponse.ok) {
        return false;
      }

      const { scenes } = await scenesResponse.json();
      const hasDownstreamData = scenes?.some((scene: any) =>
        scene.status === 'shot_list_ready' ||
        scene.status === 'frames_locked' ||
        scene.status === 'video_complete'
      );

      return hasDownstreamData || false;
    } catch (error) {
      console.error('[STAGE 4] Error checking downstream data:', error);
      return false;
    }
  }, [projectId]);

  // Check if Stage 4 is locked
  const checkStage4Locked = useCallback(async (): Promise<boolean> => {
    try {
      const stageState = await stageStateService.getStageState(projectId, 4);
      return stageState !== null && stageState.status === 'locked';
    } catch (error) {
      console.error('[STAGE 4] Error checking stage 4 status:', error);
      // If stage doesn't exist, it's not locked
      return false;
    }
  }, [projectId]);

  // Proceed with approval after warnings
  const proceedWithApproval = useCallback(async (scenes: Scene[]) => {
    try {
      // Persist scenes to database (backend applies Scene ID Stability logic)
      await scriptService.persistScenes(projectId, scenes);

      // Lock the stage
      await stageStateService.lockStage(projectId, 4);

      toast.success(`Master Script approved! ${scenes.length} scenes extracted and ready for production.`);

      // Navigate to Stage 5
      onComplete();
    } catch (error: any) {
      console.error('[STAGE 4] Failed to proceed with approval:', error);
      toast.error(error.message || 'Failed to approve script');
    }
  }, [projectId, onComplete]);

  // Handler for proceeding after downstream warning
  const handleProceedAfterWarning = useCallback(async () => {
    if (!editor) {
      toast.error('Editor not available');
      return;
    }
    setShowDownstreamWarning(false);
    const plainText = tiptapJsonToPlainText(editor.getJSON());
    const scenes = scriptService.extractScenes(plainText);
    await proceedWithApproval(scenes);
  }, [editor, proceedWithApproval]);

  // Approve and lock script (Phase B: Commit Phase)
  const handleApproveScript = useCallback(async () => {
    if (!editor) return;

    const plainText = tiptapJsonToPlainText(editor.getJSON());
    if (!plainText || plainText.trim().length === 0) {
      toast.error('Cannot approve an empty script');
      return;
    }

    try {
      console.log('[STAGE 4] Approving master script...');

      // Extract scenes
      const scenes = scriptService.extractScenes(plainText);

      // Validate extracted scenes
      if (scenes.length === 0) {
        toast.error('No scenes found in script. Please add scene headings (INT./EXT.) before approving.');
        return;
      }

      // Validate scene content
      const emptyScenes = scenes.filter(s => !s.content || s.content.trim().length === 0);
      if (emptyScenes.length > 0) {
        toast.error(`${emptyScenes.length} scene(s) have no content. Please ensure all scenes have content.`);
        return;
      }

      // Check for downstream Phase B data (if Stage 4 is already locked)
      const isStage4Locked = await checkStage4Locked();
      if (isStage4Locked) {
        const hasDownstream = await checkDownstreamData();
        if (hasDownstream) {
          setDownstreamDataExists(true);
          setShowDownstreamWarning(true);
          return; // Wait for user confirmation
        }
      }

      // Proceed with extraction and locking
      await proceedWithApproval(scenes);

    } catch (error: any) {
      console.error('[STAGE 4] Failed to approve script:', error);
      toast.error(error.message || 'Failed to approve script');
    }
  }, [editor, projectId, checkStage4Locked, checkDownstreamData, proceedWithApproval]);

  // Scroll to beat
  const handleBeatClick = useCallback((beatIndex: number) => {
    setActiveBeatIndex(beatIndex);

    if (!editor || !stageContent.beatSheetSource?.beats) return;

    // Simple approach: divide script into beat-sized chunks
    const beats = stageContent.beatSheetSource.beats;
    const plainText = stageContent.formattedScript || '';
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
  }, [editor, stageContent.beatSheetSource, stageContent.formattedScript]);


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

  // Initial generation state — auto-gen in progress or waiting for dependencies
  if (!stageContent.formattedScript && !stageContent.tiptapDoc) {
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
            {isGenerating ? (
              <>
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Generating Your Master Script</h3>
                <p className="text-muted-foreground">
                  Transforming your beat sheet into a detailed, production-ready screenplay. This may take a moment...
                </p>
              </>
            ) : (
              <>
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
                  <Sparkles className="w-4 h-4" />
                  Generate Master Script
                </Button>
              </>
            )}
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
            onClick={handlePreviewScenes}
            disabled={isGenerating || isPreviewing}
            className="gap-2"
          >
            {isPreviewing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Preview Scenes
              </>
            )}
          </Button>
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

      {/* Preview Scenes Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Scene Preview</DialogTitle>
            <DialogDescription>
              Preview of {previewScenes.length} scene{previewScenes.length !== 1 ? 's' : ''} extracted from your script.
              This is a preview only and will not be saved to the database until you approve the script.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {previewScenes.map((scene) => (
              <div
                key={scene.id}
                className="p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                    {scene.sceneNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{scene.header || scene.slug}</h4>
                      <span className="text-xs text-muted-foreground font-mono">{scene.slug}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {scene.openingAction || scene.scriptExcerpt.substring(0, 150) + '...'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downstream Impact Warning Dialog */}
      <Dialog open={showDownstreamWarning} onOpenChange={setShowDownstreamWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Downstream Impact Warning
            </DialogTitle>
            <DialogDescription>
              Stage 4 is already locked and Phase B production has begun. Re-extracting scenes may affect existing work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-foreground">
                <strong>What this means:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Some scenes may get new IDs if their slugs change</li>
                <li>The Scene ID Stability system will preserve IDs where possible</li>
                <li>Deleted scenes will be marked as <code className="text-xs">continuity_broken</code></li>
                <li>Downstream work (shot lists, frames, videos) may be affected</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Branching functionality (to preserve existing work) will be available in Phase 10.
              For now, the system will attempt to preserve scene IDs where possible.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDownstreamWarning(false);
              setDownstreamDataExists(false);
            }}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleProceedAfterWarning}
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
