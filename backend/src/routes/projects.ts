import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET /api/projects - List all projects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get projects with their active branch information
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        project_type,
        content_rating,
        genre,
        tonal_precision,
        target_length_min,
        target_length_max,
        created_at,
        updated_at,
        active_branch_id,
        branches!active_branch_id (
          name,
          commit_message
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    // Get stage states for all projects to calculate current stage and status
    const projectIds = projects.map(p => p.id);
    const { data: allStageStates, error: stagesError } = await supabase
      .from('stage_states')
      .select(`
        id,
        branch_id,
        stage_number,
        status,
        created_at,
        branches!inner (
          project_id
        )
      `)
      .in('branches.project_id', projectIds)
      .eq('branches.is_main', true) // Only consider main branch stages for now
      .order('stage_number', { ascending: false }); // Latest stage first

    if (stagesError) {
      console.error('Error fetching stage states:', stagesError);
      return res.status(500).json({ error: 'Failed to fetch stage states' });
    }

    // Group stage states by project
    const projectStages = new Map();
    allStageStates.forEach(state => {
      const projectId = state.branches.project_id;
      if (!projectStages.has(projectId)) {
        projectStages.set(projectId, []);
      }
      projectStages.get(projectId).push(state);
    });

    // Transform the data to match the frontend Project interface
    const transformedProjects = projects.map(project => {
      const stages = projectStages.get(project.id) || [];
      const lockedStages = stages.filter(s => s.status === 'locked');
      const highestLockedStage = lockedStages.length > 0 ? Math.max(...lockedStages.map(s => s.stage_number)) : 0;
      const currentStage = Math.min(highestLockedStage + 1, 5); // Cap at 5 for Phase A

      // Build stages array with status
      const stagesArray = [];
      for (let i = 1; i <= 5; i++) {
        const stageState = stages.find(s => s.stage_number === i);
        let status: 'locked' | 'active' | 'pending' | 'outdated' = 'pending';

        if (stageState) {
          if (stageState.status === 'locked') {
            status = 'locked';
          } else if (stageState.status === 'outdated') {
            status = 'outdated';
          } else if (stageState.status === 'draft' && i <= currentStage) {
            status = 'active';
          }
        } else if (i <= currentStage) {
          status = 'active';
        }

        stagesArray.push({
          stage: i,
          status,
          label: i === 1 ? 'Input' : i === 2 ? 'Treatment' : i === 3 ? 'Beat Sheet' : i === 4 ? 'Script' : 'Assets'
        });
      }

      return {
        id: project.id,
        title: project.title,
        description: project.tonal_precision || '',
        status: 'draft' as const,
        branch: project.branches?.[0]?.name || 'main',
        currentStage,
        stages: stagesArray,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        projectType: project.project_type,
        contentRating: project.content_rating,
        genres: project.genre || [],
        tonalPrecision: project.tonal_precision || '',
        targetLength: {
          min: project.target_length_min,
          max: project.target_length_max
        }
      };
    });

    res.json(transformedProjects);
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id - Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        project_type,
        content_rating,
        genre,
        tonal_precision,
        target_length_min,
        target_length_max,
        created_at,
        updated_at,
        active_branch_id,
        branches!active_branch_id (
          name,
          commit_message
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('Error fetching project:', error);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    // Transform the data
    const transformedProject = {
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const,
      branch: project.branches?.[0]?.name || 'main',
      currentStage: 1,
      stages: [],
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      projectType: project.project_type,
      contentRating: project.content_rating,
      genres: project.genre || [],
      tonalPrecision: project.tonal_precision || '',
      targetLength: {
        min: project.target_length_min,
        max: project.target_length_max
      }
    };

    res.json(transformedProject);
  } catch (error) {
    console.error('Error in GET /api/projects/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const { title } = req.body;

    console.log('🔄 Creating project:', { title, userId });

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: 'Title must be less than 255 characters' });
    }

    // Create the project with minimal data - Stage 1 will handle the rest
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title,
        // Use defaults for Stage 1 configuration - these will be overridden by Stage 1 data
        project_type: 'narrative',
        content_rating: 'PG',
        genre: [],
        tonal_precision: '',
        target_length_min: 180,
        target_length_max: 300
      })
      .select(`
        id,
        title,
        project_type,
        content_rating,
        genre,
        tonal_precision,
        target_length_min,
        target_length_max,
        created_at,
        updated_at,
        active_branch_id,
        branches!active_branch_id (
          name,
          commit_message
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creating project:', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }

    console.log('✅ Project created successfully:', project.id);

    // Transform the response
    const transformedProject = {
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const,
      branch: project.branches?.[0]?.name || 'main',
      currentStage: 1,
      stages: [],
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      projectType: project.project_type,
      contentRating: project.content_rating,
      genres: project.genre || [],
      targetLength: {
        min: project.target_length_min,
        max: project.target_length_max
      }
    };

    res.status(201).json(transformedProject);
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id - Update project configuration (Stage 1 data)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { 
      title,
      project_type,
      content_rating,
      genre,
      tonal_precision,
      target_length_min,
      target_length_max
    } = req.body;

    console.log('🔄 Updating project configuration:', { id, userId, title, project_type });

    // Validate project exists and user owns it
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('Error fetching project:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    // Build update object with only provided fields
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.length > 255) {
        return res.status(400).json({ error: 'Invalid title' });
      }
      updateData.title = title;
    }
    
    if (project_type !== undefined) {
      if (!['narrative', 'commercial', 'audio_visual'].includes(project_type)) {
        return res.status(400).json({ error: 'Invalid project type' });
      }
      updateData.project_type = project_type;
    }
    
    if (content_rating !== undefined) {
      if (!['G', 'PG', 'PG-13', 'M'].includes(content_rating)) {
        return res.status(400).json({ error: 'Invalid content rating' });
      }
      updateData.content_rating = content_rating;
    }
    
    if (genre !== undefined) {
      if (!Array.isArray(genre)) {
        return res.status(400).json({ error: 'Genre must be an array' });
      }
      updateData.genre = genre;
    }
    
    if (tonal_precision !== undefined) {
      if (typeof tonal_precision !== 'string') {
        return res.status(400).json({ error: 'Tonal precision must be a string' });
      }
      updateData.tonal_precision = tonal_precision;
    }
    
    if (target_length_min !== undefined) {
      if (typeof target_length_min !== 'number' || target_length_min < 30) {
        return res.status(400).json({ error: 'Invalid target length min' });
      }
      updateData.target_length_min = target_length_min;
    }
    
    if (target_length_max !== undefined) {
      if (typeof target_length_max !== 'number' || target_length_max < 60) {
        return res.status(400).json({ error: 'Invalid target length max' });
      }
      updateData.target_length_max = target_length_max;
    }

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        id,
        title,
        project_type,
        content_rating,
        genre,
        tonal_precision,
        target_length_min,
        target_length_max,
        created_at,
        updated_at,
        active_branch_id,
        branches!active_branch_id (
          name,
          commit_message
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error updating project:', updateError);
      return res.status(500).json({ error: 'Failed to update project' });
    }

    console.log('✅ Project updated successfully:', updatedProject.id);

    // Transform the response
    const transformedProject = {
      id: updatedProject.id,
      title: updatedProject.title,
      description: updatedProject.tonal_precision || '',
      status: 'draft' as const,
      branch: updatedProject.branches?.[0]?.name || 'main',
      currentStage: 1,
      stages: [],
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
      projectType: updatedProject.project_type,
      contentRating: updatedProject.content_rating,
      genres: updatedProject.genre || [],
      targetLength: {
        min: updatedProject.target_length_min,
        max: updatedProject.target_length_max
      }
    };

    res.json(transformedProject);
  } catch (error) {
    console.error('Error in PUT /api/projects/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/scenes - Fetch all scenes for a project's active branch
router.get('/:id/scenes', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    console.log(`📋 [SCENES] Fetching scenes for project ${id}...`);

    // Get the project to ensure user owns it
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      console.error('❌ Error fetching project:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.active_branch_id) {
      console.error('❌ Project has no active branch');
      return res.status(400).json({ error: 'Project has no active branch' });
    }

    // Fetch scenes for the active branch, ordered by scene_number
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('id, scene_number, slug, status, script_excerpt')
      .eq('branch_id', project.active_branch_id)
      .order('scene_number', { ascending: true });

    if (scenesError) {
      console.error('❌ Error fetching scenes:', scenesError);
      return res.status(500).json({ error: 'Failed to fetch scenes' });
    }

    // Transform scenes to match frontend Scene interface
    // Extract header (first line) and openingAction (lines after header) from script_excerpt
    const transformedScenes = (scenes || []).map((scene) => {
      const scriptExcerpt = scene.script_excerpt || '';
      const lines = scriptExcerpt.split('\n').filter(line => line.trim().length > 0);
      
      // First line is the header (scene heading)
      const header = lines.length > 0 ? lines[0].trim() : '';
      
      // Remaining lines are the opening action (first few lines after header)
      // Take first 3-5 lines of action for preview, or all if less
      const openingActionLines = lines.slice(1, Math.min(6, lines.length));
      const openingAction = openingActionLines.join('\n').trim();

      return {
        id: scene.id,
        sceneNumber: scene.scene_number,
        slug: scene.slug,
        status: scene.status,
        scriptExcerpt: scriptExcerpt,
        header: header,
        openingAction: openingAction,
        expectedCharacters: [], // Future enhancement
        expectedLocation: '', // Future enhancement
        shots: [],
        // Optional fields
        priorSceneEndState: undefined,
        endFrameThumbnail: undefined,
        continuityRisk: undefined
      };
    });

    console.log(`✅ [SCENES] Successfully fetched ${transformedScenes.length} scenes`);

    res.json({
      scenes: transformedScenes
    });
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes - Persist extracted scenes to database
router.put('/:id/scenes', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { scenes } = req.body;

    if (!scenes || !Array.isArray(scenes)) {
      return res.status(400).json({ error: 'Scenes array is required' });
    }

    console.log(`💾 [SCENES] Persisting ${scenes.length} scenes for project ${id}...`);

    // Get the project to ensure user owns it
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      console.error('❌ Error fetching project:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.active_branch_id) {
      console.error('❌ Project has no active branch');
      return res.status(400).json({ error: 'Project has no active branch' });
    }

    // Scene ID Stability: Fetch existing scenes to preserve IDs where possible
    const { data: existingScenes, error: fetchError } = await supabase
      .from('scenes')
      .select('id, scene_number, slug, status')
      .eq('branch_id', project.active_branch_id);

    if (fetchError) {
      console.error('❌ Error fetching existing scenes:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch existing scenes' });
    }

    // Create a map of existing scenes by slug + scene_number for matching
    const existingSceneMap = new Map<string, { id: string; status: string }>();
    (existingScenes || []).forEach((scene) => {
      const key = `${scene.slug}:${scene.scene_number}`;
      existingSceneMap.set(key, { id: scene.id, status: scene.status });
    });

    // Track which existing scenes are matched (to identify deleted scenes)
    const matchedExistingIds = new Set<string>();

    // Process each extracted scene: match or create
    const scenesToUpdate: Array<{ id: string; script_excerpt: string }> = [];
    const scenesToInsert: Array<{
      branch_id: string;
      scene_number: number;
      slug: string;
      script_excerpt: string;
      status: string;
    }> = [];
    const idMapping: Array<{ oldId?: string; newId: string; slug: string; sceneNumber: number }> = [];

    for (const scene of scenes) {
      const key = `${scene.slug}:${scene.sceneNumber}`;
      const existing = existingSceneMap.get(key);

      if (existing) {
        // Match found: preserve the existing scene ID and update script_excerpt
        matchedExistingIds.add(existing.id);
        scenesToUpdate.push({
          id: existing.id,
          script_excerpt: scene.scriptExcerpt
        });
        idMapping.push({
          oldId: existing.id,
          newId: existing.id,
          slug: scene.slug,
          sceneNumber: scene.sceneNumber
        });
        console.log(`🔄 [SCENES] Preserving ID for scene ${scene.sceneNumber} (${scene.slug}): ${existing.id}`);
      } else {
        // No match: create new scene
        scenesToInsert.push({
          branch_id: project.active_branch_id,
          scene_number: scene.sceneNumber,
          slug: scene.slug,
          script_excerpt: scene.scriptExcerpt,
          status: 'draft'
        });
      }
    }

    // Handle deleted scenes (scenes that existed but are not in new extraction)
    const deletedScenes = (existingScenes || []).filter(
      scene => !matchedExistingIds.has(scene.id)
    );

    if (deletedScenes.length > 0) {
      console.warn(`⚠️ [SCENES] ${deletedScenes.length} scenes were removed from script:`, 
        deletedScenes.map(s => `Scene ${s.scene_number} (${s.slug})`).join(', '));
      
      // Mark deleted scenes as continuity_broken to warn about downstream impact
      const deletedIds = deletedScenes.map(s => s.id);
      const { error: markError } = await supabase
        .from('scenes')
        .update({ status: 'continuity_broken' })
        .in('id', deletedIds);

      if (markError) {
        console.error('❌ Error marking deleted scenes:', markError);
        // Continue anyway - this is a warning, not a blocker
      } else {
        console.log(`⚠️ [SCENES] Marked ${deletedScenes.length} deleted scenes as continuity_broken`);
      }
    }

    // Update matched scenes
    for (const sceneUpdate of scenesToUpdate) {
      const { error: updateError } = await supabase
        .from('scenes')
        .update({ script_excerpt: sceneUpdate.script_excerpt })
        .eq('id', sceneUpdate.id);

      if (updateError) {
        console.error(`❌ Error updating scene ${sceneUpdate.id}:`, updateError);
        return res.status(500).json({ error: `Failed to update scene ${sceneUpdate.id}` });
      }
    }

    // Insert new scenes
    let insertedScenes: Array<{ id: string; scene_number: number; slug: string }> = [];
    if (scenesToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('scenes')
        .insert(scenesToInsert)
        .select('id, scene_number, slug');

      if (insertError) {
        console.error('❌ Error inserting new scenes:', insertError);
        return res.status(500).json({ error: 'Failed to insert new scenes' });
      }

      insertedScenes = inserted || [];

      // Add new scenes to ID mapping
      insertedScenes.forEach((scene) => {
        idMapping.push({
          newId: scene.id,
          slug: scene.slug,
          sceneNumber: scene.scene_number
        });
      });
    }

    const totalScenes = scenesToUpdate.length + insertedScenes.length;
    console.log(`✅ [SCENES] Successfully persisted ${totalScenes} scenes (${scenesToUpdate.length} updated, ${insertedScenes.length} created)`);

    // Build response with all scenes (updated and newly inserted)
    const allScenes = [
      ...scenesToUpdate.map(update => {
        const mapping = idMapping.find(m => m.newId === update.id);
        const scene = scenes.find(s => s.slug === mapping?.slug && s.sceneNumber === mapping?.sceneNumber);
        return {
          id: update.id,
          scene_number: scene?.sceneNumber || 0,
          slug: scene?.slug || ''
        };
      }),
      ...insertedScenes
    ];

    res.json({
      success: true,
      sceneCount: totalScenes,
      scenes: allScenes,
      idMapping: idMapping,
      deletedScenesCount: deletedScenes.length
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    console.log('🔄 Deleting project:', id, 'for user:', userId);

    // Validate project exists and user owns it
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.error('❌ Project not found:', id);
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('❌ Error fetching project:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    // Delete the project (cascade deletes will handle related data)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Error deleting project:', deleteError);
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    console.log('✅ Project deleted successfully:', id);

    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error in DELETE /api/projects/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as projectsRouter };
