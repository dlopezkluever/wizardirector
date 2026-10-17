import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { streamlineBackfillService, StreamlineBackfillError } from '../services/streamlineBackfillService.js';
import { extractText, UnsupportedFileTypeError } from '../services/streamlineExtractionService.js';
import { classifyFile } from '../services/streamlineClassificationService.js';
import { extractStandaloneAssetDraft } from '../services/streamlineStandaloneAssetService.js';
import { formatAsTreatment, formatAsBeatSheet } from '../services/streamlineFormattingService.js';
import { ImageAnalysisService } from '../services/imageAnalysisService.js';
import { analyzeBatch, type StreamlineBatchFile } from '../services/streamlineQuestionService.js';
import { reconcileDocuments, type StreamlineQAPair } from '../services/streamlineReconciliationService.js';

const router = Router();

// Documents (not images) — screenplays and treatments can run long, so this
// cap is higher than the 5-10MB used by this codebase's image upload routes.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Images (Task 3.6 review grid) — same 10MB cap and PNG/JPEG/WebP filter as
// this codebase's other image upload routes (e.g. projectAssets.ts).
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PNG, JPEG, and WebP are allowed.'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/projects/:projectId/streamline/commit
 *
 * Atomic commit — applies stage_transitions (Phase 1), and in later phases also
 * assets (Phase 3) and resolutions/resolution_edits (Phase 4), in one Postgres
 * transaction via the streamline_commit RPC. Ownership is checked here in Node;
 * the RPC re-validates the skip/lock invariants as the authoritative, race-safe
 * check and rolls back entirely on any violation.
 */
router.post('/:projectId/streamline/commit', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { stageTransitions, projectConfig, stage1Draft, assets, resolutions, resolutionEdits } = req.body;

    if (!stageTransitions || typeof stageTransitions !== 'object') {
      return res.status(400).json({ error: 'stageTransitions is required and must be an object' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const payload: Record<string, unknown> = {
      project_id: projectId,
      user_id: userId,
      stage_transitions: stageTransitions,
    };
    if (projectConfig) payload.project_config = projectConfig;
    if (stage1Draft) payload.stage_1_draft = stage1Draft;
    if (assets) payload.assets = assets;
    if (resolutions) payload.resolutions = resolutions;
    if (resolutionEdits) payload.resolution_edits = resolutionEdits;

    const { data: result, error: rpcError } = await supabase.rpc('streamline_commit_atomic', { payload });

    if (rpcError) {
      console.error('❌ streamline_commit RPC failed:', rpcError);
      return res.status(400).json({ error: rpcError.message || 'Streamline commit failed' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/streamline/commit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/streamline/backfill/:stageNumber
 *
 * "Generate from script" action on a skipped Stage 2 or 3 — generates content
 * from the already-locked Stage 4 script, then locks the stage directly
 * (skipped -> locked) with origin 'ai-generated'. Only stages 2 and 3 support
 * backfill (Stage 4 is what backfill generates *from*, never a backfill target).
 */
router.post('/:projectId/streamline/backfill/:stageNumber', async (req, res) => {
  try {
    const { projectId, stageNumber } = req.params;
    const userId = req.user!.id;

    const stage = parseInt(stageNumber);
    if (isNaN(stage) || ![2, 3].includes(stage)) {
      return res.status(400).json({ error: 'Only stages 2 and 3 support backfill from script' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.active_branch_id) {
      return res.status(400).json({ error: 'Project has no active branch' });
    }

    const branchId = project.active_branch_id;

    // Stage must currently be skipped — backfill is only for skipped stages.
    const { data: currentState, error: currentError } = await supabase
      .from('stage_states')
      .select('id, version, status')
      .eq('branch_id', branchId)
      .eq('stage_number', stage)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentError) {
      return res.status(500).json({ error: 'Failed to check stage state' });
    }

    if (!currentState || currentState.status !== 'skipped') {
      return res.status(400).json({ error: `Stage ${stage} is not currently skipped` });
    }

    const content = stage === 2
      ? await streamlineBackfillService.backfillTreatment(projectId, branchId, userId)
      : await streamlineBackfillService.backfillBeatSheet(projectId, branchId, userId);

    const nextVersion = currentState.version + 1;

    const { data: lockedState, error: insertError } = await supabase
      .from('stage_states')
      .insert({
        branch_id: branchId,
        stage_number: stage,
        version: nextVersion,
        status: 'locked',
        origin: 'ai-generated',
        content,
        regeneration_guidance: '',
        created_by: userId,
        inherited_from_stage_id: currentState.id,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Error locking backfilled stage:', insertError);
      return res.status(500).json({ error: 'Failed to save backfilled content' });
    }

    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);

    res.json(lockedState);
  } catch (error) {
    if (error instanceof StreamlineBackfillError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Error in POST /api/projects/:projectId/streamline/backfill/:stageNumber:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/streamline/extract-file
 *
 * Server-side text extraction, one file per call (spec §2.7) so partial-batch
 * failures can be retried/dropped per-file without re-touching the rest.
 * The response shape carries both extraction and classification from the
 * start — Phase 2 shipped a stubbed classification; Phase 3 fills it in on
 * this same endpoint rather than adding a second one (script detection is
 * free/deterministic, everything else runs one LLM call).
 */
router.post('/:projectId/streamline/extract-file', upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (expected multipart field "file")' });
    }

    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    const classification = await classifyFile(text, req.file.originalname);

    // Standalone note files (Task 3.5) have no scene to attach dependencies
    // to, so they get a lighter, separate mechanism: one extra LLM call here
    // pre-fills a Stage 5 asset draft for the review screen to show alongside
    // the classification, rather than a second round-trip endpoint.
    let assetDraft;
    if (classification.type === 'character_notes') {
      try {
        assetDraft = await extractStandaloneAssetDraft(text, req.file.originalname);
      } catch (error) {
        console.error('[Streamline] Standalone asset draft extraction failed (non-fatal):', error);
      }
    }

    res.json({
      filename: req.file.originalname,
      text,
      classification,
      ...(assetDraft && { assetDraft }),
    });
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error in POST /api/projects/:projectId/streamline/extract-file:', error);
    res.status(500).json({ error: 'Failed to extract text from file' });
  }
});

/**
 * POST /api/projects/:projectId/streamline/classify-image
 *
 * Task 3.6 — one round trip per image: stores it (so StreamlineImageReviewGrid
 * has a URL to display and, if accepted, hand to the commit RPC) and returns
 * a best-guess {name, type, description} classification. Fuzzy-matching the
 * guessed name against script-extracted entities (aggregatePreview) happens
 * on the frontend, which already has that entity list from Stage 5's flow.
 */
router.post('/:projectId/streamline/classify-image', uploadImage.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const fileExt = req.file.originalname.includes('.') ? req.file.originalname.slice(req.file.originalname.lastIndexOf('.')) : '';
    const fileName = `project/${projectId}/streamline-staging/${Date.now()}-${Math.random().toString(36).slice(2)}${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('asset-images')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) {
      console.error('[Streamline] Error uploading image:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage.from('asset-images').getPublicUrl(fileName);

    let classification;
    try {
      const imageAnalysisService = new ImageAnalysisService();
      classification = await imageAnalysisService.classifyUploadedImage(req.file.buffer, req.file.mimetype);
    } catch (error) {
      console.error('[Streamline] Image classification failed, returning unclassified guess:', error);
      classification = { name: 'Unnamed subject', type: 'character' as const, description: '', confidence: 0 };
    }

    res.json({
      imageUrl: urlData.publicUrl,
      filename: req.file.originalname,
      classification,
    });
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/streamline/classify-image:', error);
    res.status(500).json({ error: 'Failed to classify image' });
  }
});

/**
 * POST /api/projects/:projectId/streamline/format-file
 *
 * The "AI-format" per-file choice (Task 3.1/3.3) — reformats a submitted
 * file's text into the target stage's expected structure. Called only when
 * the user picks AI-format over as-is for a given file; script files never
 * hit this (they're always parsed deterministically on the frontend).
 */
router.post('/:projectId/streamline/format-file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { text, targetType } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required and must be a string' });
    }
    if (targetType !== 'treatment' && targetType !== 'beat_sheet') {
      return res.status(400).json({ error: 'targetType must be "treatment" or "beat_sheet"' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (targetType === 'treatment') {
      const formatted = await formatAsTreatment(text);
      return res.json({ targetType, treatment: formatted });
    }

    const formatted = await formatAsBeatSheet(text);
    res.json({ targetType, ...formatted });
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/streamline/format-file:', error);
    res.status(500).json({ error: 'Failed to reformat file' });
  }
});

/**
 * POST /api/projects/:projectId/streamline/analyze
 *
 * Ask Auteur question generation (Task 4.2) — runs once full-batch
 * classification completes (the frontend's StreamlineDropZone batch-settled
 * signal from Phase 3). Zero triggers means no session is offered — this
 * always returns 200 with an empty array in that case, never an error.
 */
router.post('/:projectId/streamline/analyze', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { files } = req.body as { files?: StreamlineBatchFile[] };

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files is required and must be a non-empty array' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const questions = await analyzeBatch(files);
    res.json({ questions });
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/streamline/analyze:', error);
    res.status(500).json({ error: 'Failed to analyze submitted material' });
  }
});

/**
 * POST /api/projects/:projectId/streamline/reconcile
 *
 * Reconciliation pass (Task 4.4) — takes the accumulated Q&A transcript and
 * returns reconciled document text + diff summaries + edit_scope per
 * affected document. Declining the session (empty qaPairs) short-circuits
 * to an empty result without an LLM call.
 */
router.post('/:projectId/streamline/reconcile', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { files, qaPairs } = req.body as { files?: StreamlineBatchFile[]; qaPairs?: StreamlineQAPair[] };

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files is required and must be a non-empty array' });
    }
    if (!Array.isArray(qaPairs)) {
      return res.status(400).json({ error: 'qaPairs is required and must be an array' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const reconciledDocuments = await reconcileDocuments(files, qaPairs);
    res.json({ reconciledDocuments });
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/streamline/reconcile:', error);
    res.status(500).json({ error: 'Failed to reconcile documents' });
  }
});

export { router as streamlineRouter };
