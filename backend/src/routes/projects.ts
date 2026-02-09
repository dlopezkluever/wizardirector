import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { sceneDependencyExtractionService } from '../services/sceneDependencyExtraction.js';
import { ShotExtractionService } from '../services/shotExtractionService.js';
import { ShotSplitService } from '../services/shotSplitService.js';
import { ShotMergeService } from '../services/shotMergeService.js';
import { shotValidationService } from '../services/shotValidationService.js';
import { promptGenerationService, type ShotData, type SceneAssetInstanceData } from '../services/promptGenerationService.js';

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

    // Get stage states for all projects using active_branch_id (matches pipeline graphic source)
    const activeBranchIds = projects
      .map(p => p.active_branch_id)
      .filter((id): id is string => !!id);

    let allStageStates: Array<{ id: string; branch_id: string; stage_number: number; status: string; version: number; created_at: string }> = [];

    if (activeBranchIds.length > 0) {
      const { data, error: stagesError } = await supabase
        .from('stage_states')
        .select('id, branch_id, stage_number, status, version, created_at')
        .in('branch_id', activeBranchIds)
        .order('stage_number', { ascending: true })
        .order('version', { ascending: false });

      if (stagesError) {
        console.error('Error fetching stage states:', stagesError);
        return res.status(500).json({ error: 'Failed to fetch stage states' });
      }
      allStageStates = data || [];
    }

    // Group stage states by project, deduplicate to latest version per stage
    // (matches how GET /:projectId/stages works for the pipeline graphic)
    const branchToProject = new Map<string, string>();
    projects.forEach(p => {
      if (p.active_branch_id) branchToProject.set(p.active_branch_id, p.id);
    });

    const projectStages = new Map<string, typeof allStageStates>();
    allStageStates.forEach(state => {
      const projectId = branchToProject.get(state.branch_id);
      if (!projectId) return;
      if (!projectStages.has(projectId)) projectStages.set(projectId, []);

      const bucket = projectStages.get(projectId)!;
      // Only keep latest version per stage_number (data is ordered version DESC)
      const alreadyHas = bucket.some(s => s.stage_number === state.stage_number);
      if (!alreadyHas) {
        bucket.push(state);
      }
    });

    type StageStateRow = { status: string; stage_number: number };

    // Batch-fetch scenes for ALL projects that have an active branch
    // (scenes existing = project is in production, regardless of stage lock status)
    const sceneProgressMap = new Map<string, {
      totalScenes: number;
      completedScenes: number;
      currentSceneNumber: number | null;
      currentSceneStage: number | null;
      currentSceneStatus: string | null;
      latestSceneUpdate: string | null;
    }>();

    if (activeBranchIds.length > 0) {
      const { data: allScenes } = await supabase
        .from('scenes')
        .select('id, branch_id, scene_number, status, updated_at')
        .in('branch_id', activeBranchIds)
        .order('scene_number', { ascending: true });

      // Group scenes by project
      const projectScenes = new Map<string, Array<{ scene_number: number; status: string; updated_at: string }>>();
      (allScenes || []).forEach((scene: any) => {
        const projId = branchToProject.get(scene.branch_id);
        if (!projId) return;
        if (!projectScenes.has(projId)) projectScenes.set(projId, []);
        projectScenes.get(projId)!.push({
          scene_number: scene.scene_number,
          status: scene.status,
          updated_at: scene.updated_at,
        });
      });

      // Compute summary per project
      const statusToStage: Record<string, number> = {
        draft: 7,
        shot_list_ready: 8,
        frames_locked: 11,
        video_complete: 12,
      };

      for (const [projId, scenes] of projectScenes) {
        const totalScenes = scenes.length;
        const completedScenes = scenes.filter(s => s.status === 'video_complete').length;
        const firstIncomplete = scenes.find(s => s.status !== 'video_complete');
        // Latest scene update timestamp (for accurate "Updated Xm ago")
        const latestSceneUpdate = scenes.reduce((latest, s) => {
          return s.updated_at > latest ? s.updated_at : latest;
        }, '');

        sceneProgressMap.set(projId, {
          totalScenes,
          completedScenes,
          currentSceneNumber: firstIncomplete?.scene_number ?? null,
          currentSceneStage: firstIncomplete ? (statusToStage[firstIncomplete.status] ?? 7) : null,
          currentSceneStatus: firstIncomplete?.status ?? null,
          latestSceneUpdate: latestSceneUpdate || null,
        });
      }
    }

    // Transform the data to match the frontend Project interface
    const transformedProjects = projects.map(project => {
      const stages = (projectStages.get(project.id) || []) as StageStateRow[];
      const lockedStages = stages.filter((s: StageStateRow) => s.status === 'locked');
      const draftStages = stages.filter((s: StageStateRow) => s.status === 'draft');
      const highestLockedStage = lockedStages.length > 0 ? Math.max(...lockedStages.map((s: StageStateRow) => s.stage_number)) : 0;
      const highestDraftStage = draftStages.length > 0 ? Math.max(...draftStages.map((s: StageStateRow) => s.stage_number)) : 0;
      const currentStage = highestDraftStage > 0
        ? highestDraftStage
        : Math.min(highestLockedStage + 1, 5);

      // Build stages array with status
      const stagesArray = [];
      for (let i = 1; i <= 5; i++) {
        const stageState = stages.find((s: StageStateRow) => s.stage_number === i);
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

      // Use the latest timestamp across project edits and scene edits
      const sceneProgress = sceneProgressMap.get(project.id);
      let updatedAt = project.updated_at;
      if (sceneProgress?.latestSceneUpdate && sceneProgress.latestSceneUpdate > updatedAt) {
        updatedAt = sceneProgress.latestSceneUpdate;
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
        updatedAt,
        projectType: project.project_type,
        contentRating: project.content_rating,
        genres: project.genre || [],
        tonalPrecision: project.tonal_precision || '',
        targetLength: {
          min: project.target_length_min,
          max: project.target_length_max
        },
        ...(sceneProgress ? { sceneProgress } : {})
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

    // Query stage states to calculate currentStage
    const { data: stageStatesData } = await supabase
      .from('stage_states')
      .select('stage_number, status')
      .eq('branch_id', project.active_branch_id);

    const lockedStages = (stageStatesData || []).filter(s => s.status === 'locked');
    const draftStages = (stageStatesData || []).filter(s => s.status === 'draft');
    const highestLockedStage = lockedStages.length > 0
      ? Math.max(...lockedStages.map(s => s.stage_number)) : 0;
    const highestDraftStage = draftStages.length > 0
      ? Math.max(...draftStages.map(s => s.stage_number)) : 0;
    const currentStage = highestDraftStage > 0
      ? highestDraftStage
      : Math.min(highestLockedStage + 1, 5);

    // Transform the data
    const transformedProject = {
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const,
      branch: project.branches?.[0]?.name || 'main',
      currentStage,
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

    // Query stage states to calculate currentStage
    const { data: stageStatesData } = await supabase
      .from('stage_states')
      .select('stage_number, status')
      .eq('branch_id', updatedProject.active_branch_id);

    const lockedStages = (stageStatesData || []).filter(s => s.status === 'locked');
    const draftStages = (stageStatesData || []).filter(s => s.status === 'draft');
    const highestLockedStage = lockedStages.length > 0
      ? Math.max(...lockedStages.map(s => s.stage_number)) : 0;
    const highestDraftStage = draftStages.length > 0
      ? Math.max(...draftStages.map(s => s.stage_number)) : 0;
    const currentStage = highestDraftStage > 0
      ? highestDraftStage
      : Math.min(highestLockedStage + 1, 5);

    // Transform the response
    const transformedProject = {
      id: updatedProject.id,
      title: updatedProject.title,
      description: updatedProject.tonal_precision || '',
      status: 'draft' as const,
      branch: updatedProject.branches?.[0]?.name || 'main',
      currentStage,
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
    // Include end_state_summary and updated_at for continuity analysis
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('id, scene_number, slug, status, script_excerpt, end_state_summary, end_frame_thumbnail_url, updated_at, expected_characters, expected_location, expected_props, dependencies_extracted_at, shot_list_locked_at')
      .eq('branch_id', project.active_branch_id)
      .order('scene_number', { ascending: true });

    if (scenesError) {
      console.error('❌ Error fetching scenes:', scenesError);
      return res.status(500).json({ error: 'Failed to fetch scenes' });
    }

    // Fetch upstream stage states for continuity analysis
    const { data: stageStates } = await supabase
      .from('stage_states')
      .select('id, branch_id, stage_number, version, status, created_at')
      .eq('branch_id', project.active_branch_id)
      .in('stage_number', [1, 2, 3, 4]);

    // Transform scenes to match frontend Scene interface
    // Extract header (first line) and openingAction (lines after header) from script_excerpt
    const transformedScenes = (scenes || []).map((scene) => {
      const scriptExcerpt = scene.script_excerpt || '';
      const lines = scriptExcerpt.split('\n').filter((line: string) => line.trim().length > 0);
      
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
        expectedCharacters: scene.expected_characters || [],
        expectedLocation: scene.expected_location || '',
        expectedProps: scene.expected_props || [],
        endFrameThumbnail: scene.end_frame_thumbnail_url || undefined,
        shots: [],
        shotListLockedAt: scene.shot_list_locked_at ?? undefined,
        // Store raw scene data for continuity analysis
        updated_at: scene.updated_at,
        end_state_summary: scene.end_state_summary
      };
    });

    // Import and use ContinuityRiskAnalyzer for rule-based analysis
    const { ContinuityRiskAnalyzer } = await import('../services/continuityRiskAnalyzer');
    const continuityAnalyzer = new ContinuityRiskAnalyzer();

    // Enrich each scene with continuity risk analysis and prior scene end state
    const enrichedScenes = transformedScenes.map((scene, index) => {
      const dbScene = scenes![index];
      
      // Analyze continuity risk (rule-based, fast)
      const priorScene = index > 0 ? scenes![index - 1] : null;
      const continuityRisk = continuityAnalyzer.analyzeContinuityRisk({
        scene: dbScene,
        priorScene,
        upstreamStageStates: stageStates as any || []
      });
      
      // Remove temporary fields used for analysis
      const { updated_at, end_state_summary, ...sceneWithoutTempFields } = scene;
      
      return {
        ...sceneWithoutTempFields,
        expectedCharacters: dbScene.expected_characters || [],
        expectedLocation: dbScene.expected_location || '',
        expectedProps: dbScene.expected_props || [],
        priorSceneEndState: priorScene?.end_state_summary ?? null,
        endFrameThumbnail: scene.endFrameThumbnail ?? null,
        continuityRisk
      };
    });

    console.log(`✅ [SCENES] Successfully fetched ${enrichedScenes.length} scenes with continuity analysis`);

    res.json({
      scenes: enrichedScenes
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
    const scenesToUpdate: Array<{ 
      id: string; 
      script_excerpt: string;
      expected_characters?: string[];
      expected_location?: string;
      expected_props?: string[];
      dependencies_extracted_at?: string;
    }> = [];
    const scenesToInsert: Array<{
      branch_id: string;
      scene_number: number;
      slug: string;
      script_excerpt: string;
      status: string;
      expected_characters?: string[];
      expected_location?: string;
      expected_props?: string[];
      dependencies_extracted_at?: string;
    }> = [];
    const idMapping: Array<{ oldId?: string; newId: string; slug: string; sceneNumber: number }> = [];

    // Extract dependencies for all scenes
    console.log(`🔍 [SCENES] Extracting dependencies for ${scenes.length} scenes...`);
    const dependenciesMap = new Map<string, {
      expectedCharacters: string[];
      expectedLocation: string;
      expectedProps: string[];
    }>();

    for (const scene of scenes) {
      try {
        // Parse scene heading from script excerpt (first line)
        const lines = scene.scriptExcerpt.split('\n');
        const sceneHeading = lines[0]?.trim() || '';
        
        // Extract dependencies
        const dependencies = await sceneDependencyExtractionService.extractDependencies(
          sceneHeading,
          scene.scriptExcerpt
        );
        
        const key = `${scene.slug}:${scene.sceneNumber}`;
        dependenciesMap.set(key, dependencies);
        console.log(`✅ [SCENES] Extracted dependencies for scene ${scene.sceneNumber}: ${dependencies.expectedCharacters.length} chars, ${dependencies.expectedProps.length} props`);
      } catch (error) {
        console.warn(`⚠️ [SCENES] Failed to extract dependencies for scene ${scene.sceneNumber}:`, error);
        // Continue with empty dependencies rather than blocking
        const key = `${scene.slug}:${scene.sceneNumber}`;
        dependenciesMap.set(key, {
          expectedCharacters: [],
          expectedLocation: '',
          expectedProps: []
        });
      }
    }

    // Now process each scene with dependencies
    for (const scene of scenes) {
      const key = `${scene.slug}:${scene.sceneNumber}`;
      const existing = existingSceneMap.get(key);
      const dependencies = dependenciesMap.get(key);

      const dependencyFields = dependencies ? {
        expected_characters: dependencies.expectedCharacters,
        expected_location: dependencies.expectedLocation,
        expected_props: dependencies.expectedProps,
        dependencies_extracted_at: new Date().toISOString()
      } : {};

      if (existing) {
        // Match found: preserve the existing scene ID and update script_excerpt + dependencies
        matchedExistingIds.add(existing.id);
        scenesToUpdate.push({
          id: existing.id,
          script_excerpt: scene.scriptExcerpt,
          ...dependencyFields
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
          status: 'draft',
          ...dependencyFields
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
      const updateData: any = { 
        script_excerpt: sceneUpdate.script_excerpt 
      };
      
      // Include dependency fields if available
      if (sceneUpdate.expected_characters) {
        updateData.expected_characters = sceneUpdate.expected_characters;
      }
      if (sceneUpdate.expected_location) {
        updateData.expected_location = sceneUpdate.expected_location;
      }
      if (sceneUpdate.expected_props) {
        updateData.expected_props = sceneUpdate.expected_props;
      }
      if (sceneUpdate.dependencies_extracted_at) {
        updateData.dependencies_extracted_at = sceneUpdate.dependencies_extracted_at;
      }
      
      const { error: updateError } = await supabase
        .from('scenes')
        .update(updateData)
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

// ----- Shot CRUD (Stage 7) -----

// GET /api/projects/:id/scenes/:sceneId/shots
router.get('/:id/scenes/:sceneId/shots', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id, scene_number')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const { data: shots, error } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch shots' });

    const transformedShots = (shots || []).map((shot: any) => ({
      id: shot.id,
      sceneId: shot.scene_id,
      shotId: shot.shot_id,
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      charactersForeground: shot.characters_foreground || [],
      charactersBackground: shot.characters_background || [],
      setting: shot.setting,
      camera: shot.camera,
      continuityFlags: shot.continuity_flags || [],
      beatReference: shot.beat_reference
    }));

    res.json({ shots: transformedShots });
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes/:sceneId/shots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/shots/extract
router.post('/:id/scenes/:sceneId/shots/extract', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id, scene_number, script_excerpt')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    // Fetch prior scene end state for continuity
    const { data: priorScene } = await supabase
      .from('scenes')
      .select('end_state_summary')
      .eq('branch_id', project.active_branch_id)
      .eq('scene_number', scene.scene_number - 1)
      .single();

    // Fetch global context (beat sheet + master script summary)
    let beatSheetSummary: string | undefined;
    let masterScriptSummary: string | undefined;
    const { data: stage3 } = await supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', 3)
      .eq('status', 'locked')
      .order('version', { ascending: false })
      .limit(1);
    if (stage3?.[0]?.content?.beats) {
      const beats = stage3[0].content.beats as Array<{ order?: number; text?: string }>;
      beatSheetSummary = beats.map((b: any, i: number) => `${i + 1}. ${b.text || b}`).join('\n');
    }
    const { data: stage4 } = await supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', 4)
      .eq('status', 'locked')
      .order('version', { ascending: false })
      .limit(1);
    if (stage4?.[0]?.content) {
      const c = stage4[0].content as any;
      const script = c.formattedScript || c.formatted_script || '';
      const lines = script.split('\n');
      const summaryLines: string[] = [];
      let inScene = false;
      for (const line of lines) {
        const t = line.trim();
        if (t.match(/^(INT\.|EXT\.)/i)) {
          summaryLines.push(t);
          inScene = true;
        } else if (inScene && t.length > 0) {
          summaryLines.push(`  ${t.substring(0, 100)}${t.length > 100 ? '...' : ''}`);
          inScene = false;
        }
      }
      if (summaryLines.length > 0) masterScriptSummary = summaryLines.join('\n');
    }

    const shotExtractionService = new ShotExtractionService();
    const extractedShots = await shotExtractionService.extractShots(
      sceneId,
      scene.script_excerpt || '',
      scene.scene_number,
      {
        priorSceneEndState: priorScene?.end_state_summary ?? null,
        beatSheetSummary,
        masterScriptSummary
      }
    );

    const shotsToInsert = extractedShots.map((shot, index) => ({
      scene_id: sceneId,
      shot_id: shot.shotId,
      shot_order: index,
      duration: shot.duration,
      dialogue: shot.dialogue,
      action: shot.action,
      characters_foreground: shot.charactersForeground,
      characters_background: shot.charactersBackground,
      setting: shot.setting,
      camera: shot.camera,
      continuity_flags: shot.continuityFlags,
      beat_reference: shot.beatReference ?? null
    }));

    if (shotsToInsert.length === 0) {
      return res.json({ success: true, shotCount: 0, shots: [] });
    }

    const { data: insertedShots, error } = await supabase
      .from('shots')
      .insert(shotsToInsert)
      .select('*');

    if (error) return res.status(500).json({ error: 'Failed to persist shots' });

    res.json({ success: true, shotCount: insertedShots!.length, shots: insertedShots });
  } catch (error: any) {
    if (error?.code === 'RATE_LIMIT') {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });
    }
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/shots/extract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/shots/reorder (must be before /:shotId)
router.put('/:id/scenes/:sceneId/shots/reorder', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const userId = req.user!.id;
    const { orderedShotIds } = req.body;

    if (!orderedShotIds || !Array.isArray(orderedShotIds)) {
      return res.status(400).json({ error: 'orderedShotIds array is required' });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const { data: sceneShots } = await supabase
      .from('shots')
      .select('id')
      .eq('scene_id', sceneId);
    const sceneShotIds = new Set((sceneShots || []).map((s: any) => s.id));
    const invalidIds = orderedShotIds.filter((id: string) => !sceneShotIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Shot IDs not in scene: ${invalidIds.join(', ')}` });
    }

    const updates = orderedShotIds.map((shotId: string, index: number) =>
      supabase.from('shots').update({ shot_order: index }).eq('id', shotId).eq('scene_id', sceneId)
    );
    await Promise.all(updates);

    const { data: shots, error } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });
    if (error) return res.status(500).json({ error: 'Failed to fetch shots after reorder' });

    res.json({ success: true, shots: shots || [] });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/reorder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/shots/:shotId
router.put('/:id/scenes/:sceneId/shots/:shotId', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const updates = req.body;
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const allowedFields = [
      'duration', 'dialogue', 'action',
      'characters_foreground', 'characters_background',
      'setting', 'camera', 'continuity_flags', 'beat_reference'
    ];
    const invalidFields = Object.keys(updates).filter((f: string) => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      return res.status(400).json({ error: `Invalid fields: ${invalidFields.join(', ')}` });
    }

    const { data: updatedShot, error } = await supabase
      .from('shots')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update shot' });
    res.json({ success: true, shot: updatedShot });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/:shotId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/shots/:shotId/split
router.post('/:id/scenes/:sceneId/shots/:shotId/split', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { userGuidance } = req.body || {};
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: originalShot } = await supabase
      .from('shots')
      .select('*')
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .single();
    if (!originalShot) return res.status(404).json({ error: 'Shot not found' });

    const shotSplitService = new ShotSplitService();
    const newShotsPayload = await shotSplitService.splitShot(originalShot, userGuidance);

    const { error: deleteError } = await supabase
      .from('shots')
      .delete()
      .eq('id', shotId);
    if (deleteError) return res.status(500).json({ error: 'Failed to delete original shot' });

    const { data: shotsAfterDelete } = await supabase
      .from('shots')
      .select('id, shot_order')
      .eq('scene_id', sceneId)
      .gt('shot_order', originalShot.shot_order);
    if (shotsAfterDelete?.length) {
      for (const s of shotsAfterDelete) {
        await supabase.from('shots').update({ shot_order: s.shot_order + 1 }).eq('id', s.id);
      }
    }

    const insertRows = newShotsPayload.map((shot, i) => ({
      scene_id: sceneId,
      shot_id: shot.shot_id,
      shot_order: originalShot.shot_order + i,
      duration: shot.duration,
      dialogue: shot.dialogue,
      action: shot.action,
      characters_foreground: shot.characters_foreground,
      characters_background: shot.characters_background,
      setting: shot.setting,
      camera: shot.camera,
      continuity_flags: shot.continuity_flags,
      beat_reference: shot.beat_reference
    }));

    const { data: insertedShots, error: insertError } = await supabase
      .from('shots')
      .insert(insertRows)
      .select('*');
    if (insertError) return res.status(500).json({ error: 'Failed to insert split shots' });

    res.json({ success: true, newShots: insertedShots });
  } catch (error: any) {
    if (error?.message?.includes('parse') || error?.message?.includes('split')) {
      return res.status(422).json({ error: error.message || 'Shot split failed' });
    }
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/shots/:shotId/split:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/shots/:shotId/merge
router.post('/:id/scenes/:sceneId/shots/:shotId/merge', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { direction = 'next', userGuidance } = req.body || {};
    const userId = req.user!.id;

    if (direction !== 'next' && direction !== 'previous') {
      return res.status(400).json({ error: 'direction must be "next" or "previous"' });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: currentShot } = await supabase
      .from('shots')
      .select('*')
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .single();
    if (!currentShot) return res.status(404).json({ error: 'Shot not found' });

    const neighbourOrder = direction === 'next' ? currentShot.shot_order + 1 : currentShot.shot_order - 1;
    const { data: neighbourShot } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId)
      .eq('shot_order', neighbourOrder)
      .single();
    if (!neighbourShot) {
      return res.status(400).json({
        error: direction === 'next' ? 'No next shot to merge with' : 'No previous shot to merge with'
      });
    }

    const shotMergeService = new ShotMergeService();
    const mergedPayload = await shotMergeService.mergeShots(currentShot, neighbourShot, userGuidance);

    const [lowerOrder, higherOrder] =
      currentShot.shot_order <= neighbourShot.shot_order
        ? [currentShot.shot_order, neighbourShot.shot_order]
        : [neighbourShot.shot_order, currentShot.shot_order];

    const { error: deleteError1 } = await supabase.from('shots').delete().eq('id', currentShot.id);
    if (deleteError1) return res.status(500).json({ error: 'Failed to delete first shot' });
    const { error: deleteError2 } = await supabase.from('shots').delete().eq('id', neighbourShot.id);
    if (deleteError2) return res.status(500).json({ error: 'Failed to delete second shot' });

    const { data: insertedShot, error: insertError } = await supabase
      .from('shots')
      .insert({
        scene_id: sceneId,
        shot_id: mergedPayload.shot_id,
        shot_order: lowerOrder,
        duration: mergedPayload.duration,
        dialogue: mergedPayload.dialogue,
        action: mergedPayload.action,
        characters_foreground: mergedPayload.characters_foreground,
        characters_background: mergedPayload.characters_background,
        setting: mergedPayload.setting,
        camera: mergedPayload.camera,
        continuity_flags: mergedPayload.continuity_flags,
        beat_reference: mergedPayload.beat_reference
      })
      .select('*')
      .single();
    if (insertError) return res.status(500).json({ error: 'Failed to insert merged shot' });

    const { data: shotsAfter } = await supabase
      .from('shots')
      .select('id, shot_order')
      .eq('scene_id', sceneId)
      .gt('shot_order', higherOrder);
    if (shotsAfter?.length) {
      for (const s of shotsAfter) {
        await supabase.from('shots').update({ shot_order: s.shot_order - 1 }).eq('id', s.id);
      }
    }

    res.json({ success: true, mergedShot: insertedShot });
  } catch (error: any) {
    if (error?.message?.includes('parse') || error?.message?.includes('merge')) {
      return res.status(422).json({ error: error.message || 'Shot merge failed' });
    }
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/shots/:shotId/merge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id/scenes/:sceneId/shots/:shotId
router.delete('/:id/scenes/:sceneId/shots/:shotId', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const { error } = await supabase.from('shots').delete().eq('id', shotId).eq('scene_id', sceneId);
    if (error) return res.status(500).json({ error: 'Failed to delete shot' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects/:id/scenes/:sceneId/shots/:shotId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----- Shot List Locking (Stage 7 Gatekeeper) -----

// POST /api/projects/:id/scenes/:sceneId/shots/lock
router.post('/:id/scenes/:sceneId/shots/lock', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const { force = false } = req.body;
    const userId = req.user!.id;

    // 1. Verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 2. Fetch scene (verify it belongs to active branch)
    if (!project.active_branch_id) {
      return res.status(400).json({
        error: 'Project has no active branch',
        code: 'NO_ACTIVE_BRANCH'
      });
    }

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, scene_number, status, shot_list_locked_at, expected_characters, stage_locks')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      console.warn('[shots/lock] Scene not found:', { projectId, sceneId, active_branch_id: project.active_branch_id, sceneError: sceneError?.message });
      return res.status(404).json({
        error: 'Scene not found',
        code: 'SCENE_NOT_FOUND',
        hint: 'Ensure the scene belongs to this project\'s active branch and was saved from Script Hub (Stage 6).'
      });
    }

    // 3. Check if already locked (idempotent)
    if (scene.shot_list_locked_at) {
      // Already locked - return success
      return res.json({
        success: true,
        scene: {
          id: scene.id,
          status: scene.status,
          shotListLockedAt: scene.shot_list_locked_at,
          sceneNumber: scene.scene_number
        }
      });
    }

    // 4. Fetch all shots for validation
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (shotsError) {
      return res.status(500).json({ error: 'Failed to fetch shots' });
    }

    // Transform shots to match validation service interface
    const shotsForValidation = (shots || []).map((shot: any) => ({
      shotId: shot.shot_id,
      duration: shot.duration,
      action: shot.action,
      setting: shot.setting,
      camera: shot.camera,
      dialogue: shot.dialogue,
      charactersForeground: shot.characters_foreground,
      charactersBackground: shot.characters_background,
      continuityFlags: shot.continuity_flags
    }));

    // 5. Validate shots
    const validationResult = shotValidationService.validateShots(
      shotsForValidation, 
      { expected_characters: scene.expected_characters }
    );

    // 6. Handle validation results
    if (validationResult.errors.length > 0) {
      // ERRORS: Cannot proceed, even with force
      return res.status(400).json({
        error: 'Shot list validation failed',
        errors: validationResult.errors,
        canForce: false
      });
    }

    if (validationResult.warnings.length > 0 && !force) {
      // WARNINGS: Can bypass with force=true
      return res.status(409).json({
        error: 'Shot list has warnings',
        warnings: validationResult.warnings,
        canForce: true
      });
    }

    // 7. Lock the shot list
    // Note: The database trigger will automatically set status to 'shot_list_ready'
    // when shot_list_locked_at is set (defense-in-depth)
    const now = new Date().toISOString();

    // Also sync stage_locks JSONB for the new locking system
    const existingLocks = (scene as any).stage_locks || {};
    const updatedStageLocks = {
      ...existingLocks,
      '7': { status: 'locked', locked_at: now }
    };

    const updateData: any = {
      shot_list_locked_at: now,
      updated_at: now,
      stage_locks: updatedStageLocks
    };

    // Store forced lock metadata for audit trail (only if scenes.metadata column exists)
    // When adding scenes.metadata via migration, uncomment and ensure SELECT includes metadata
    // if (force && validationResult.warnings.length > 0) {
    //   updateData.metadata = { ...(scene.metadata || {}), forcedLock: true, ... };
    // }

    const { data: updatedScene, error: updateError } = await supabase
      .from('scenes')
      .update(updateData)
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .is('shot_list_locked_at', null)  // Prevent race condition
      .select('*')
      .single();

    if (updateError || !updatedScene) {
      console.error('Failed to lock scene:', updateError);
      return res.status(500).json({ error: 'Failed to lock shot list' });
    }

    // 8. Return success
    res.json({
      success: true,
      scene: {
        id: updatedScene.id,
        status: updatedScene.status,
        shotListLockedAt: updatedScene.shot_list_locked_at,
        sceneNumber: updatedScene.scene_number,
        shotCount: shots?.length || 0,
        forcedLock: force && validationResult.warnings.length > 0
      }
    });
  } catch (error) {
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/shots/lock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/shots/unlock
router.post('/:id/scenes/:sceneId/shots/unlock', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const { reason, confirm = false } = req.body;
    const userId = req.user!.id;

    // 1. Verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 2. Fetch scene
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, status, shot_list_locked_at, dependencies_extracted_at, stage_locks')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // 3. Check if locked
    if (!scene.shot_list_locked_at) {
      return res.status(400).json({ error: 'Shot list is not locked' });
    }

    // 4. Check for downstream work (frames, videos)
    const hasDownstreamWork = scene.status === 'frames_locked' || scene.status === 'video_complete';

    let framesAffected = 0;
    let videosAffected = 0;
    let estimatedCost = 0;

    if (hasDownstreamWork) {
      // Count affected artifacts
      const { data: shots } = await supabase
        .from('shots')
        .select('id')
        .eq('scene_id', sceneId);

      const shotIds = (shots || []).map(s => s.id);

      if (shotIds.length > 0) {
        const { data: frames } = await supabase
          .from('frames')
          .select('id')
          .in('shot_id', shotIds);

        const { data: videos } = await supabase
          .from('videos')
          .select('id')
          .in('shot_id', shotIds);

        framesAffected = frames?.length || 0;
        videosAffected = videos?.length || 0;

        // Estimate regeneration cost
        estimatedCost = framesAffected * 0.05 + videosAffected * 2.50;
      }

      // If not confirmed, return warning
      if (!confirm) {
        return res.status(409).json({
          error: 'Unlocking will invalidate downstream artifacts',
          details: {
            framesAffected,
            videosAffected,
            estimatedCost: estimatedCost.toFixed(2),
            message: `This will invalidate ${framesAffected} frames and ${videosAffected} videos. Estimated regeneration cost: $${estimatedCost.toFixed(2)}`
          },
          requiresConfirmation: true
        });
      }

      // User confirmed - proceed with invalidation
      // Mark frames as invalidated (not deleted)
      if (framesAffected > 0 && shotIds.length > 0) {
        await supabase
          .from('frames')
          .update({ status: 'invalidated' })
          .in('shot_id', shotIds);
      }

      // Mark videos as invalidated (not deleted)
      if (videosAffected > 0 && shotIds.length > 0) {
        await supabase
          .from('videos')
          .update({ status: 'invalidated' })
          .in('shot_id', shotIds);
      }

      // Log invalidation event (if invalidation_logs table exists)
      try {
        await supabase
          .from('invalidation_logs')
          .insert({
            branch_id: project.active_branch_id,
            invalidation_type: 'upstream_edit',
            invalidated_scenes: [sceneId],
            estimated_regen_cost: estimatedCost,
            reason: reason || 'Shot list unlocked for editing',
            created_by: userId
          });
      } catch (logError) {
        // Logging failure shouldn't block unlock
        console.warn('Failed to log invalidation:', logError);
      }
    }

    // 5. Unlock scene
    // Note: The database trigger will automatically revert status to 'draft' if currently
    // at 'shot_list_ready'. If status is 'frames_locked' or 'video_complete', the trigger
    // leaves it unchanged (those require explicit handling via invalidation).
    // Also sync stage_locks JSONB: set stage 7 to draft, downstream to outdated
    const existingLocks = (scene as any).stage_locks || {};
    const updatedStageLocks = { ...existingLocks, '7': { status: 'draft' } };
    for (let s = 8; s <= 12; s++) {
      const lock = updatedStageLocks[String(s)];
      if (lock && (lock.status === 'locked' || lock.status === 'outdated')) {
        updatedStageLocks[String(s)] = { status: 'outdated' };
      }
    }

    const { data: unlockedScene, error: updateError } = await supabase
      .from('scenes')
      .update({
        shot_list_locked_at: null,
        updated_at: new Date().toISOString(),
        stage_locks: updatedStageLocks
      })
      .eq('id', sceneId)
      .select('*')
      .single();

    if (updateError || !unlockedScene) {
      console.error('Failed to unlock scene:', updateError);
      return res.status(500).json({ error: 'Failed to unlock shot list' });
    }

    // 6. Return success
    res.json({
      success: true,
      scene: {
        id: unlockedScene.id,
        status: unlockedScene.status,
        shotListLockedAt: null
      },
      invalidated: hasDownstreamWork ? {
        frames: framesAffected,
        videos: videosAffected
      } : undefined
    });
  } catch (error) {
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/shots/unlock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----- Stage 9: Prompt Segmentation -----

// GET /api/projects/:id/scenes/:sceneId/prompts - Get all shot prompts for a scene
router.get('/:id/scenes/:sceneId/prompts', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify scene exists in project's active branch
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, scene_number')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Fetch all shots with prompt data
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select(`
        id,
        shot_id,
        duration,
        dialogue,
        action,
        characters_foreground,
        characters_background,
        setting,
        camera,
        continuity_flags,
        beat_reference,
        frame_prompt,
        video_prompt,
        requires_end_frame,
        compatible_models,
        prompts_generated_at
      `)
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (shotsError) {
      console.error('Error fetching shots:', shotsError);
      return res.status(500).json({ error: 'Failed to fetch shots' });
    }

    // Transform to PromptSet format
    const promptSets = (shots || []).map((shot: any) => ({
      shotId: shot.shot_id,
      shotUuid: shot.id,
      framePrompt: shot.frame_prompt || '',
      videoPrompt: shot.video_prompt || '',
      requiresEndFrame: shot.requires_end_frame ?? true,
      compatibleModels: shot.compatible_models || ['Veo3'],
      promptsGeneratedAt: shot.prompts_generated_at || null,
      // Include shot data for context
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      setting: shot.setting,
      camera: shot.camera,
    }));

    res.json({ prompts: promptSets, sceneNumber: scene.scene_number });
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes/:sceneId/prompts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts - Update prompts for a single shot
router.put('/:id/scenes/:sceneId/shots/:shotId/prompts', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { framePrompt, videoPrompt, requiresEndFrame, compatibleModels } = req.body;
    const userId = req.user!.id;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify scene exists
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Build update object with only provided fields
    const updateData: any = { updated_at: new Date().toISOString() };

    if (framePrompt !== undefined) {
      if (typeof framePrompt !== 'string') {
        return res.status(400).json({ error: 'framePrompt must be a string' });
      }
      if (framePrompt.length > 1500) {
        return res.status(400).json({ error: 'framePrompt exceeds maximum length (1500 characters)' });
      }
      updateData.frame_prompt = framePrompt;
    }

    if (videoPrompt !== undefined) {
      if (typeof videoPrompt !== 'string') {
        return res.status(400).json({ error: 'videoPrompt must be a string' });
      }
      if (videoPrompt.length > 1000) {
        return res.status(400).json({ error: 'videoPrompt exceeds maximum length (1000 characters)' });
      }
      updateData.video_prompt = videoPrompt;
    }

    if (requiresEndFrame !== undefined) {
      if (typeof requiresEndFrame !== 'boolean') {
        return res.status(400).json({ error: 'requiresEndFrame must be a boolean' });
      }
      updateData.requires_end_frame = requiresEndFrame;
    }

    if (compatibleModels !== undefined) {
      if (!Array.isArray(compatibleModels)) {
        return res.status(400).json({ error: 'compatibleModels must be an array' });
      }
      updateData.compatible_models = compatibleModels;
    }

    // Update the shot
    const { data: updatedShot, error: updateError } = await supabase
      .from('shots')
      .update(updateData)
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating shot prompts:', updateError);
      return res.status(500).json({ error: 'Failed to update shot prompts' });
    }

    res.json({
      success: true,
      shot: {
        shotId: updatedShot.shot_id,
        shotUuid: updatedShot.id,
        framePrompt: updatedShot.frame_prompt || '',
        videoPrompt: updatedShot.video_prompt || '',
        requiresEndFrame: updatedShot.requires_end_frame ?? true,
        compatibleModels: updatedShot.compatible_models || ['Veo3'],
        promptsGeneratedAt: updatedShot.prompts_generated_at,
      },
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/generate-prompts - Generate prompts for shots using LLM
router.post('/:id/scenes/:sceneId/generate-prompts', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const { shotIds } = req.body; // Optional: specific shot IDs to regenerate
    const userId = req.user!.id;

    console.log(`[Stage9] Generating prompts for scene ${sceneId}`);

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify scene exists
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, scene_number')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Fetch shots (all or specific)
    let shotsQuery = supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (shotIds && Array.isArray(shotIds) && shotIds.length > 0) {
      shotsQuery = shotsQuery.in('id', shotIds);
    }

    const { data: shots, error: shotsError } = await shotsQuery;

    if (shotsError || !shots || shots.length === 0) {
      return res.status(400).json({ error: 'No shots found for this scene' });
    }

    // Fetch scene asset instances for context
    const { data: assetInstances } = await supabase
      .from('scene_asset_instances')
      .select(`
        id,
        description_override,
        status_tags,
        project_assets!inner (
          id,
          name,
          asset_type,
          description
        )
      `)
      .eq('scene_id', sceneId);

    // Transform asset instances to service format
    const sceneAssets: SceneAssetInstanceData[] = (assetInstances || []).map((instance: any) => ({
      id: instance.id,
      project_asset: instance.project_assets ? {
        id: instance.project_assets.id,
        name: instance.project_assets.name,
        asset_type: instance.project_assets.asset_type,
        description: instance.project_assets.description,
      } : undefined,
      description_override: instance.description_override,
      effective_description: instance.description_override || instance.project_assets?.description || '',
      status_tags: instance.status_tags || [],
    }));

    // Fetch visual style capsule if applied to the project
    // For now, we'll skip style capsule - can be added later via stage_state lookups
    const styleCapsule = null;

    // Transform shots to service format
    const shotDataList: ShotData[] = shots.map((shot: any) => ({
      id: shot.id,
      shot_id: shot.shot_id,
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      characters_foreground: shot.characters_foreground || [],
      characters_background: shot.characters_background || [],
      setting: shot.setting,
      camera: shot.camera,
      continuity_flags: shot.continuity_flags,
      beat_reference: shot.beat_reference,
    }));

    // Generate prompts using the service
    const results = await promptGenerationService.generateBulkPromptSets(
      shotDataList,
      sceneAssets,
      styleCapsule
    );

    // Update shots with generated prompts
    const now = new Date().toISOString();
    const updatePromises = results
      .filter(r => r.success)
      .map(r =>
        supabase
          .from('shots')
          .update({
            frame_prompt: r.framePrompt,
            video_prompt: r.videoPrompt,
            requires_end_frame: r.requiresEndFrame,
            compatible_models: r.compatibleModels,
            prompts_generated_at: now,
            updated_at: now,
          })
          .eq('id', r.shotId)
      );

    await Promise.all(updatePromises);

    // Fetch updated shots
    const { data: updatedShots } = await supabase
      .from('shots')
      .select(`
        id,
        shot_id,
        frame_prompt,
        video_prompt,
        requires_end_frame,
        compatible_models,
        prompts_generated_at,
        duration,
        dialogue,
        action,
        setting,
        camera
      `)
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    // Transform response
    const promptSets = (updatedShots || []).map((shot: any) => ({
      shotId: shot.shot_id,
      shotUuid: shot.id,
      framePrompt: shot.frame_prompt || '',
      videoPrompt: shot.video_prompt || '',
      requiresEndFrame: shot.requires_end_frame ?? true,
      compatibleModels: shot.compatible_models || ['Veo3'],
      promptsGeneratedAt: shot.prompts_generated_at || null,
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      setting: shot.setting,
      camera: shot.camera,
    }));

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[Stage9] Generated prompts: ${successCount} succeeded, ${failedCount} failed`);

    res.json({
      success: true,
      prompts: promptSets,
      generated: successCount,
      failed: failedCount,
      errors: results.filter(r => !r.success).map(r => ({ shotId: r.shotId, error: r.error })),
    });
  } catch (error: any) {
    if (error?.code === 'RATE_LIMIT') {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });
    }
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/generate-prompts:', error);
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
