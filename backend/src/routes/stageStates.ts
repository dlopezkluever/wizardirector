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
    const { content, status, regenerationGuidance } = req.body;

    console.log('🔄 PUT /api/projects/:projectId/stages/:stageNumber called:', {
      projectId,
      stageNumber,
      userId,
      contentKeys: content ? Object.keys(content) : 'null',
      status,
      regenerationGuidance
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
      .select('id, version')
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

    // Insert new version
    const insertData = {
      branch_id: project.active_branch_id,
      stage_number: stage,
      version: nextVersion,
      status: status || 'draft',
      content: content,
      regeneration_guidance: regenerationGuidance || '',
      created_by: userId,
      inherited_from_stage_id: existingState?.id || null
    };

    console.log('💾 Inserting stage state:', insertData);

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

    // Create a new version with locked status
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
      console.error('Error locking stage:', lockError);
      return res.status(500).json({ error: 'Failed to lock stage' });
    }

    res.json(lockedState);
  } catch (error) {
    console.error('Error in POST /api/projects/:projectId/stages/:stageNumber/lock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as stageStatesRouter };

