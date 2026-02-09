import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET /api/projects/:projectId/stages - Get all stage states for a project's active branch
router.get('/:projectId/stages', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // First, get the project and its active branch
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('Error fetching project:', projectError);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    if (!project.active_branch_id) {
      return res.json([]); // No active branch, return empty array
    }

    // Get all stage states for the active branch (latest version only)
    const { data: stageStates, error: statesError } = await supabase
      .from('stage_states')
      .select('*')
      .eq('branch_id', project.active_branch_id)
      .order('stage_number', { ascending: true })
      .order('version', { ascending: false });

    if (statesError) {
      console.error('Error fetching stage states:', statesError);
      return res.status(500).json({ error: 'Failed to fetch stage states' });
    }

    // Filter to get only the latest version of each stage
    const latestStageStates = new Map();
    stageStates.forEach(state => {
      if (!latestStageStates.has(state.stage_number)) {
        latestStageStates.set(state.stage_number, state);
      }
    });

    res.json(Array.from(latestStageStates.values()));
  } catch (error) {
    console.error('Error in GET /api/projects/:projectId/stages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:projectId/stages/:stageNumber - Get specific stage state
router.get('/:projectId/stages/:stageNumber', async (req, res) => {
  try {
    const { projectId, stageNumber } = req.params;
    const userId = req.user!.id;

    // Validate stage number
    const stage = parseInt(stageNumber);
    if (isNaN(stage) || stage < 1 || stage > 12) {
      return res.status(400).json({ error: 'Invalid stage number. Must be between 1 and 12' });
    }

    // Get the project and its active branch
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('Error fetching project:', projectError);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    if (!project.active_branch_id) {
      return res.status(404).json({ error: 'Project has no active branch' });
    }

    // Get the latest version of this stage
    const { data: stageState, error: stateError } = await supabase
      .from('stage_states')
      .select('*')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', stage)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stateError) {
      console.error('Error fetching stage state:', stateError);
      return res.status(500).json({ error: 'Failed to fetch stage state' });
    }

    // If no stage state exists, return null
    if (!stageState) {
      return res.json(null);
    }

    res.json(stageState);
  } catch (error) {
    console.error('Error in GET /api/projects/:projectId/stages/:stageNumber:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:projectId/stages/:stageNumber - Create or update stage state
router.put('/:projectId/stages/:stageNumber', async (req, res) => {
  try {
    const { projectId, stageNumber } = req.params;
    const userId = req.user!.id;
    const { content, status, regenerationGuidance, styleCapsuleMetadata } = req.body;

    console.log('🔄 PUT /api/projects/:projectId/stages/:stageNumber called:', {
      projectId,
      stageNumber,
      userId,
      contentKeys: content ? Object.keys(content) : 'null',
      providedStatus: status,
      regenerationGuidance,
      timestamp: new Date().toISOString()
    });

    // Validate stage number
    const stage = parseInt(stageNumber);
    if (isNaN(stage) || stage < 1 || stage > 12) {
      console.error('❌ Invalid stage number:', stageNumber);
      return res.status(400).json({ error: 'Invalid stage number. Must be between 1 and 12' });
    }

    // Validate content
    if (!content || typeof content !== 'object') {
      console.error('❌ Invalid content:', content);
      return res.status(400).json({ error: 'Content is required and must be an object' });
    }

    // Validate status if provided
    const validStatuses = ['draft', 'locked', 'invalidated', 'outdated'];
    if (status && !validStatuses.includes(status)) {
      console.error('❌ Invalid status:', status);
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get the project and its active branch
    console.log('🔍 Looking up project:', projectId, 'for user:', userId);
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id, user_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        console.error('❌ Project not found:', projectId);
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('❌ Error fetching project:', projectError);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    console.log('✅ Project found:', { id: project.id, active_branch_id: project.active_branch_id });

    if (!project.active_branch_id) {
      console.error('❌ Project has no active branch');
      return res.status(400).json({ error: 'Project has no active branch' });
    }

    // Check if a stage state already exists
    const { data: existingState, error: existingError } = await supabase
      .from('stage_states')
      .select('id, version, status')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', stage)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing state:', existingError);
      return res.status(500).json({ error: 'Failed to check existing state' });
    }

    let stageState;
    let nextVersion = 1;

    if (existingState) {
      // Update: Create a new version
      nextVersion = existingState.version + 1;
    }

    // Prevent status regression: Once locked, stages cannot revert to draft
    let finalStatus = status || 'draft';
    if (existingState?.status === 'locked' && finalStatus === 'draft') {
      console.warn('⚠️ Attempted to revert locked stage to draft - preserving locked status');
      console.warn('Call stack:', {
        stage,
        existingStatus: existingState.status,
        requestedStatus: status,
        finalStatus: 'locked (preserved)'
      });
      finalStatus = 'locked';
    }

    // Insert new version
    const insertData = {
      branch_id: project.active_branch_id,
      stage_number: stage,
      version: nextVersion,
      status: finalStatus,
      content: content,
      regeneration_guidance: regenerationGuidance || '',
      created_by: userId,
      inherited_from_stage_id: existingState?.id || null
    };

    console.log('💾 Inserting stage state:', {
      ...insertData,
      existingStatus: existingState?.status || 'none',
      requestedStatus: status,
      finalStatus: insertData.status,
      statusPreserved: existingState?.status === 'locked' && finalStatus === 'locked'
    });

    const { data: newState, error: insertError } = await supabase
      .from('stage_states')
      .insert(insertData)
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Error inserting stage state:', insertError);
      return res.status(500).json({ error: 'Failed to save stage state' });
    }

    console.log('✅ Stage state inserted successfully:', newState.id);
    stageState = newState;

    // Log style capsule application if metadata was provided
    if (styleCapsuleMetadata && styleCapsuleMetadata.styleCapsuleId) {
      try {
        const { data: applicationLog, error: logError } = await supabase
          .from('style_capsule_applications')
          .insert({
            stage_state_id: newState.id,
            style_capsule_id: styleCapsuleMetadata.styleCapsuleId,
            injection_context: styleCapsuleMetadata.injectionContext
          })
          .select('id')
          .single();

        if (logError) {
          console.error('❌ Failed to log style capsule application:', logError);
        } else {
          console.log(`✅ Logged style capsule application for stage ${stage}:`, applicationLog.id);
        }
      } catch (error) {
        console.error('❌ Error logging style capsule application:', error);
        // Don't fail the request if logging fails
      }
    }

    // Update project's updated_at timestamp
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);

    res.json(stageState);
  } catch (error) {
    console.error('Error in PUT /api/projects/:projectId/stages/:stageNumber:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/stages/:stageNumber/lock - Lock a stage
router.post('/:projectId/stages/:stageNumber/lock', async (req, res) => {
  try {
    const { projectId, stageNumber } = req.params;
    const userId = req.user!.id;

    console.log('🔒 POST /api/projects/:projectId/stages/:stageNumber/lock called:', {
      projectId,
      stageNumber,
      userId,
      timestamp: new Date().toISOString()
    });

    const stage = parseInt(stageNumber);
    if (isNaN(stage) || stage < 1 || stage > 12) {
      return res.status(400).json({ error: 'Invalid stage number' });
    }

    // Get the project and its active branch
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.active_branch_id) {
      return res.status(400).json({ error: 'Project has no active branch' });
    }

    // Get the current stage state
    const { data: currentState, error: stateError } = await supabase
      .from('stage_states')
      .select('*')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', stage)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stateError || !currentState) {
      return res.status(404).json({ error: 'Stage state not found' });
    }

    // Sequential locking validation: Check if previous stage is locked (except for stage 1)
    if (stage > 1) {
      const { data: previousStageState, error: previousError } = await supabase
        .from('stage_states')
        .select('id, status')
        .eq('branch_id', project.active_branch_id)
        .eq('stage_number', stage - 1)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousError) {
        console.error('Error checking previous stage:', previousError);
        return res.status(500).json({ error: 'Failed to validate stage prerequisites' });
      }

      if (!previousStageState || previousStageState.status !== 'locked') {
        return res.status(400).json({
          error: `Cannot lock stage ${stage}. Stage ${stage - 1} must be locked first.`,
          details: {
            requiredStage: stage - 1,
            requiredStatus: 'locked',
            currentStatus: previousStageState?.status || 'not found'
          }
        });
      }
    }

    // Create a new version with locked status
    console.log('💾 Creating locked stage state:', {
      stage,
      previousVersion: currentState.version,
      newVersion: currentState.version + 1,
      previousStatus: currentState.status
    });

    const { data: lockedState, error: lockError } = await supabase
      .from('stage_states')
      .insert({
        branch_id: project.active_branch_id,
        stage_number: stage,
        version: currentState.version + 1,
        status: 'locked',
        content: currentState.content,
        regeneration_guidance: currentState.regeneration_guidance,
        created_by: userId,
        inherited_from_stage_id: currentState.id
      })
      .select('*')
      .single();

    if (lockError) {
      console.error('❌ Error locking stage:', lockError);
      return res.status(500).json({ error: 'Failed to lock stage' });
    }

    console.log('✅ Stage locked successfully:', {
      id: lockedState.id,
      stage: lockedState.stage_number,
      version: lockedState.version,
      status: lockedState.status
    });

    res.json(lockedState);
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/stages/:stageNumber/lock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/stages/:stageNumber/unlock - Unlock a Phase A stage (1-5)
// Two-phase: without confirm returns impact; with confirm=true creates draft version + cascades outdated
router.post('/:projectId/stages/:stageNumber/unlock', async (req, res) => {
  try {
    const { projectId, stageNumber } = req.params;
    const { confirm = false } = req.body;
    const userId = req.user!.id;

    const stage = parseInt(stageNumber);
    if (isNaN(stage) || stage < 1 || stage > 5) {
      return res.status(400).json({ error: 'Invalid stage number. Must be between 1 and 5' });
    }

    // Get the project and its active branch
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

    // Get current stage state
    const { data: currentState, error: stateError } = await supabase
      .from('stage_states')
      .select('*')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', stage)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stateError || !currentState) {
      return res.status(404).json({ error: 'Stage state not found' });
    }

    if (currentState.status !== 'locked') {
      return res.status(400).json({ error: 'Stage is not locked' });
    }

    // Find downstream locked stages
    const { data: allStates, error: allError } = await supabase
      .from('stage_states')
      .select('stage_number, status, version')
      .eq('branch_id', project.active_branch_id)
      .gt('stage_number', stage)
      .lte('stage_number', 5)
      .order('stage_number', { ascending: true })
      .order('version', { ascending: false });

    if (allError) {
      return res.status(500).json({ error: 'Failed to check downstream stages' });
    }

    // Deduplicate to latest version per stage
    const downstreamStages: number[] = [];
    const seen = new Set<number>();
    for (const s of (allStates || [])) {
      if (!seen.has(s.stage_number)) {
        seen.add(s.stage_number);
        if (s.status === 'locked' || s.status === 'outdated') {
          downstreamStages.push(s.stage_number);
        }
      }
    }

    // Phase 1: Impact assessment
    if (!confirm) {
      return res.status(409).json({
        error: 'Unlocking will affect downstream stages',
        details: {
          stage,
          downstreamStages,
          message: downstreamStages.length > 0
            ? `Stages ${downstreamStages.join(', ')} will be marked as outdated.`
            : 'No downstream stages affected.'
        },
        requiresConfirmation: true
      });
    }

    // Phase 2: Create new draft version for this stage
    const { data: draftState, error: draftError } = await supabase
      .from('stage_states')
      .insert({
        branch_id: project.active_branch_id,
        stage_number: stage,
        version: currentState.version + 1,
        status: 'draft',
        content: currentState.content,
        regeneration_guidance: currentState.regeneration_guidance,
        created_by: userId,
        inherited_from_stage_id: currentState.id
      })
      .select('*')
      .single();

    if (draftError) {
      console.error('Failed to create draft version:', draftError);
      return res.status(500).json({ error: 'Failed to unlock stage' });
    }

    // Mark downstream stages as outdated
    for (const ds of downstreamStages) {
      const { data: dsState } = await supabase
        .from('stage_states')
        .select('*')
        .eq('branch_id', project.active_branch_id)
        .eq('stage_number', ds)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dsState) {
        await supabase
          .from('stage_states')
          .insert({
            branch_id: project.active_branch_id,
            stage_number: ds,
            version: dsState.version + 1,
            status: 'outdated',
            content: dsState.content,
            regeneration_guidance: dsState.regeneration_guidance,
            created_by: userId,
            inherited_from_stage_id: dsState.id
          });
      }
    }

    // Update project timestamp
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);

    res.json({
      success: true,
      stageState: draftState,
      outdatedStages: downstreamStages
    });
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/stages/:stageNumber/unlock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as stageStatesRouter };

