import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { streamlineBackfillService, StreamlineBackfillError } from '../services/streamlineBackfillService.js';
import { extractText, UnsupportedFileTypeError } from '../services/streamlineExtractionService.js';

const router = Router();

// Documents (not images) — screenplays and treatments can run long, so this
// cap is higher than the 5-10MB used by this codebase's image upload routes.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
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
    const { stageTransitions, assets, resolutions, resolutionEdits } = req.body;

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
    if (assets) payload.assets = assets;
    if (resolutions) payload.resolutions = resolutions;
    if (resolutionEdits) payload.resolution_edits = resolutionEdits;

    const { data: result, error: rpcError } = await supabase.rpc('streamline_commit', { payload });

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
 * start — Phase 2 ships a stubbed classification, Phase 3 fills it in on
 * this same endpoint rather than adding a second one.
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

    res.json({
      filename: req.file.originalname,
      text,
      classification: { type: 'unclassified', confidence: 0 },
    });
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error in POST /api/projects/:projectId/streamline/extract-file:', error);
    res.status(500).json({ error: 'Failed to extract text from file' });
  }
});

export { router as streamlineRouter };
