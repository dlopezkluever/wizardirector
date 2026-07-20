import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { sceneDependencyExtractionService } from '../services/sceneDependencyExtraction.js';
import { extractManifest } from '../utils/scriptManifest.js';
import { ShotExtractionService } from '../services/shotExtractionService.js';
import { ShotSplitService } from '../services/shotSplitService.js';
import { ShotMergeService } from '../services/shotMergeService.js';
import { shotValidationService } from '../services/shotValidationService.js';
import { promptGenerationService, type ShotData, type SceneAssetInstanceData, type ShotAssetAssignmentForPrompt } from '../services/promptGenerationService.js';
import { shotAssetAssignmentService } from '../services/shotAssetAssignmentService.js';
import { StyleCapsuleService } from '../services/styleCapsuleService.js';
import { ContextManager } from '../services/contextManager.js';
import { textFieldVersionService } from '../services/textFieldVersionService.js';
import {
  DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE,
  locationResolverService,
  type LocationResolveResult,
  type LocationResolverContext,
} from '../services/locationResolverService.js';
import {
  locationCoverageService,
  type LocationCoverageAssetInput,
  type LocationCoverageMode,
  type LocationCoverageShotInput,
  type LocationCoverageViewInput,
} from '../services/locationCoverageService.js';
import { continuityCompositionService } from '../services/continuityCompositionService.js';
import { continuityBaseService } from '../services/continuityBaseService.js';

const router = Router();

type LocationResolvableShotRow = Record<string, unknown> & {
  setting?: string | null;
  camera_direction_id?: string | null;
  location_match_source?: string | null;
};

type LocationContinuityState = 'resolved' | 'suggested' | 'ambiguous' | 'unresolved';

interface ShotLocationValidationSummary {
  unresolvedCount: number;
  ambiguousCount: number;
  mismatchCount: number;
  totalIssueCount: number;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseLocationCoverageMode(value: unknown): LocationCoverageMode {
  return value === 'advanced' ? 'advanced' : 'basic';
}

function resolveExpectedLocationAssetId(
  context: LocationResolverContext,
  sceneExpectedLocation?: string | null
): string | null {
  if (!sceneExpectedLocation?.trim()) return null;

  const result = locationResolverService.resolveShotLocation(
    { sceneExpectedLocation },
    context
  );

  return locationResolverService.shouldApplyResolution(result)
    ? result.locationAssetId
    : null;
}

function buildShotLocationState(
  shot: Record<string, unknown>,
  context: LocationResolverContext,
  sceneExpectedLocation?: string | null,
  expectedLocationAssetId?: string | null
) {
  const locationAssetId = asNullableString(shot.location_asset_id);
  const assignedLocation = locationAssetId
    ? context.locationAssets.find(asset => asset.id === locationAssetId)
    : null;
  const confidence = shot.location_match_confidence != null
    ? Number(shot.location_match_confidence)
    : null;
  const source = asNullableString(shot.location_match_source);
  const resolverResult = locationResolverService.resolveShotLocation(
    {
      setting: asNullableString(shot.setting),
      sceneExpectedLocation,
      cameraDirectionId: asNullableString(shot.camera_direction_id),
    },
    context
  );

  let state: LocationContinuityState;
  if (locationAssetId) {
    state = source === 'manual' || (confidence ?? 0) >= DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE
      ? 'resolved'
      : 'suggested';
  } else if (source === 'manual') {
    state = 'unresolved';
  } else if (resolverResult.isAmbiguous) {
    state = 'ambiguous';
  } else if (resolverResult.locationAssetId) {
    state = 'suggested';
  } else {
    state = 'unresolved';
  }

  return {
    shotId: asString(shot.id),
    shotLabel: asString(shot.shot_id),
    rawSetting: asString(shot.setting),
    sceneExpectedLocation: sceneExpectedLocation || null,
    expectedLocationAssetId: expectedLocationAssetId || null,
    locationAssetId,
    locationName: assignedLocation?.name || null,
    confidence: confidence ?? resolverResult.confidence,
    source: source || resolverResult.source,
    notes: asNullableString(shot.location_match_notes),
    state,
    candidates: resolverResult.candidates.map(candidate => ({
      locationAssetId: candidate.locationAssetId,
      name: candidate.name,
      confidence: candidate.confidence,
      source: candidate.source,
      reason: candidate.reason,
    })),
    cameraDirectionId: asNullableString(shot.camera_direction_id),
    cameraDirection: null,
  };
}

function summarizeShotLocationStates(
  states: Array<ReturnType<typeof buildShotLocationState>>
): ShotLocationValidationSummary {
  const unresolvedCount = states.filter(state => state.state === 'unresolved').length;
  const ambiguousCount = states.filter(state => state.state === 'ambiguous').length;
  const mismatchCount = states.filter(state =>
    !!state.expectedLocationAssetId &&
    !!state.locationAssetId &&
    state.locationAssetId !== state.expectedLocationAssetId
  ).length;

  return {
    unresolvedCount,
    ambiguousCount,
    mismatchCount,
    totalIssueCount: unresolvedCount + ambiguousCount + mismatchCount,
  };
}

function buildShotLocationValidationSummary(
  shots: Record<string, unknown>[],
  context: LocationResolverContext,
  sceneExpectedLocation?: string | null
): ShotLocationValidationSummary {
  const expectedLocationAssetId = resolveExpectedLocationAssetId(context, sceneExpectedLocation);
  const states = shots.map(shot =>
    buildShotLocationState(shot, context, sceneExpectedLocation, expectedLocationAssetId)
  );

  return summarizeShotLocationStates(states);
}

function buildLocationValidationWarning(summary: ShotLocationValidationSummary) {
  if (summary.totalIssueCount === 0) return null;

  const parts: string[] = [];
  if (summary.unresolvedCount > 0) parts.push(`${summary.unresolvedCount} unresolved`);
  if (summary.ambiguousCount > 0) parts.push(`${summary.ambiguousCount} ambiguous`);
  if (summary.mismatchCount > 0) parts.push(`${summary.mismatchCount} scene-location mismatch`);

  return {
    shotId: 'scene',
    shotOrder: -1,
    field: 'location',
    message: `Location continuity needs review: ${parts.join(', ')}.`,
    severity: 'warning' as const,
  };
}

function transformShotForClient(
  shot: Record<string, unknown>,
  context?: LocationResolverContext,
  sceneExpectedLocation?: string | null,
  expectedLocationAssetId?: string | null
) {
  return {
    id: asString(shot.id),
    sceneId: asString(shot.scene_id),
    shotId: asString(shot.shot_id),
    duration: Number(shot.duration ?? 8),
    dialogue: asString(shot.dialogue),
    action: asString(shot.action),
    charactersForeground: asStringArray(shot.characters_foreground),
    charactersBackground: asStringArray(shot.characters_background),
    setting: asString(shot.setting),
    camera: asString(shot.camera),
    camera_distance: asNullableString(shot.camera_distance) || undefined,
    camera_height: asNullableString(shot.camera_height) || undefined,
    camera_movement: asNullableString(shot.camera_movement) || undefined,
    camera_direction_id: asNullableString(shot.camera_direction_id) || undefined,
    location_asset_id: asNullableString(shot.location_asset_id),
    location_match_confidence: shot.location_match_confidence != null
      ? Number(shot.location_match_confidence)
      : null,
    location_match_source: asNullableString(shot.location_match_source),
    location_match_notes: asNullableString(shot.location_match_notes),
    locationState: context
      ? buildShotLocationState(shot, context, sceneExpectedLocation, expectedLocationAssetId)
      : undefined,
    continuityFlags: asStringArray(shot.continuity_flags),
    beatReference: asNullableString(shot.beat_reference) || undefined,
  };
}

function applyShotLocationResolution(
  row: LocationResolvableShotRow,
  context: LocationResolverContext,
  sceneExpectedLocation?: string | null,
  options?: { preserveManual?: boolean; threshold?: number }
): { row: LocationResolvableShotRow; result: LocationResolveResult | null; wasApplied: boolean } {
  if (options?.preserveManual && row.location_match_source === 'manual') {
    return { row, result: null, wasApplied: false };
  }

  const result = locationResolverService.resolveShotLocation(
    {
      setting: row.setting,
      sceneExpectedLocation,
      cameraDirectionId: row.camera_direction_id,
    },
    context
  );
  const patch = locationResolverService.toShotLocationPatch(result, {
    threshold: options?.threshold,
  });
  const wasApplied = locationResolverService.shouldApplyResolution(result, options?.threshold);

  return {
    row: {
      ...row,
      ...patch,
    },
    result,
    wasApplied,
  };
}

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
        aspect_ratio,
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
        aspectRatio: project.aspect_ratio || '16:9',
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
        aspect_ratio,
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
      aspectRatio: project.aspect_ratio || '16:9',
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
        aspect_ratio,
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
      aspectRatio: project.aspect_ratio || '16:9',
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
      target_length_max,
      aspect_ratio
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

    if (aspect_ratio !== undefined) {
      if (!['16:9', '9:16'].includes(aspect_ratio)) {
        return res.status(400).json({ error: 'Invalid aspect ratio. Must be 16:9 or 9:16' });
      }
      updateData.aspect_ratio = aspect_ratio;
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
        aspect_ratio,
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
      aspectRatio: updatedProject.aspect_ratio || '16:9',
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
      .select('id, scene_number, slug, status, script_excerpt, end_state_summary, end_frame_thumbnail_url, updated_at, expected_characters, expected_location, expected_props, dependencies_extracted_at, shot_list_locked_at, is_deferred')
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
        continuityRisk,
        isDeferred: (dbScene as any).is_deferred ?? false,
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

// PUT /api/projects/:id/scenes/:sceneId/defer - Defer (sideline) a scene
router.put('/:id/scenes/:sceneId/defer', async (req, res) => {
  try {
    const { id, sceneId } = req.params;
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id, is_deferred')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    if ((scene as any).is_deferred) {
      return res.json({ success: true, message: 'Scene is already deferred' });
    }

    const { error: updateError } = await supabase
      .from('scenes')
      .update({ is_deferred: true, updated_at: new Date().toISOString() })
      .eq('id', sceneId);

    if (updateError) return res.status(500).json({ error: 'Failed to defer scene' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/defer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/restore - Restore a deferred scene
router.put('/:id/scenes/:sceneId/restore', async (req, res) => {
  try {
    const { id, sceneId } = req.params;
    const userId = req.user!.id;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id, is_deferred')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    if (!(scene as any).is_deferred) {
      return res.json({ success: true, message: 'Scene is not deferred' });
    }

    const { error: updateError } = await supabase
      .from('scenes')
      .update({ is_deferred: false, updated_at: new Date().toISOString() })
      .eq('id', sceneId);

    if (updateError) return res.status(500).json({ error: 'Failed to restore scene' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/restore:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes - Persist extracted scenes to database
router.put('/:id/scenes', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { scenes, tiptapDoc } = req.body;

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

    // Create maps of existing scenes for matching (primary: slug+number, fallback: number-only)
    const existingSceneMap = new Map<string, { id: string; status: string }>();
    const existingByNumber = new Map<number, { id: string; slug: string; status: string }>();
    (existingScenes || []).forEach((scene) => {
      const key = `${scene.slug}:${scene.scene_number}`;
      existingSceneMap.set(key, { id: scene.id, status: scene.status });
      existingByNumber.set(scene.scene_number, { id: scene.id, slug: scene.slug, status: scene.status });
    });

    // Track which existing scenes are matched (to identify deleted scenes)
    const matchedExistingIds = new Set<string>();

    // Process each extracted scene: match or create
    const scenesToUpdate: Array<{
      id: string;
      slug: string;
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

    if (tiptapDoc) {
      // Deterministic extraction from TipTap JSON — zero LLM calls, instant
      console.log(`⚡ [SCENES] Using deterministic TipTap extraction (no LLM)`);
      try {
        const manifest = extractManifest(tiptapDoc);

        for (const mScene of manifest.scenes) {
          // Match by scene number — find the corresponding input scene
          const inputScene = scenes.find((s: any) => s.sceneNumber === mScene.sceneNumber);
          if (!inputScene) continue;

          const key = `${inputScene.slug}:${inputScene.sceneNumber}`;
          dependenciesMap.set(key, {
            expectedCharacters: mScene.characters,
            expectedLocation: mScene.location,
            expectedProps: mScene.props,
          });
          console.log(`✅ [SCENES] Extracted dependencies for scene ${mScene.sceneNumber}: ${mScene.characters.length} chars, ${mScene.props.length} props`);
        }

        // Fill in any scenes not found in manifest with empty deps
        for (const scene of scenes) {
          const key = `${scene.slug}:${scene.sceneNumber}`;
          if (!dependenciesMap.has(key)) {
            dependenciesMap.set(key, {
              expectedCharacters: [],
              expectedLocation: '',
              expectedProps: [],
            });
          }
        }
      } catch (manifestError) {
        console.warn(`⚠️ [SCENES] Manifest extraction failed, falling back to LLM:`, manifestError);
        // Fall through to LLM fallback below
      }
    }

    // Legacy fallback: LLM extraction for projects without tiptapDoc
    if (dependenciesMap.size === 0) {
      console.log(`🤖 [SCENES] Using LLM extraction (legacy fallback)`);
      for (const scene of scenes) {
        try {
          const lines = scene.scriptExcerpt.split('\n');
          const sceneHeading = lines[0]?.trim() || '';

          const dependencies = await sceneDependencyExtractionService.extractDependencies(
            sceneHeading,
            scene.scriptExcerpt
          );

          const key = `${scene.slug}:${scene.sceneNumber}`;
          dependenciesMap.set(key, dependencies);
          console.log(`✅ [SCENES] Extracted dependencies for scene ${scene.sceneNumber}: ${dependencies.expectedCharacters.length} chars, ${dependencies.expectedProps.length} props`);
        } catch (error) {
          console.warn(`⚠️ [SCENES] Failed to extract dependencies for scene ${scene.sceneNumber}:`, error);
          const key = `${scene.slug}:${scene.sceneNumber}`;
          dependenciesMap.set(key, {
            expectedCharacters: [],
            expectedLocation: '',
            expectedProps: [],
          });
        }
      }
    }

    // Now process each scene with dependencies
    for (const scene of scenes) {
      const key = `${scene.slug}:${scene.sceneNumber}`;
      const dependencies = dependenciesMap.get(key);

      const dependencyFields = dependencies ? {
        expected_characters: dependencies.expectedCharacters,
        expected_location: dependencies.expectedLocation,
        expected_props: dependencies.expectedProps,
        dependencies_extracted_at: new Date().toISOString()
      } : {};

      // Primary match: slug + scene_number
      let existing = existingSceneMap.get(key);

      // Fallback match: scene_number only (handles slug variations between extractions)
      if (!existing) {
        const byNumber = existingByNumber.get(scene.sceneNumber);
        if (byNumber) {
          console.log(`🔄 [SCENES] Slug mismatch for scene ${scene.sceneNumber}: "${byNumber.slug}" → "${scene.slug}", matching by scene_number`);
          existing = { id: byNumber.id, status: byNumber.status };
        }
      }

      if (existing) {
        // Match found: preserve the existing scene ID and update script_excerpt + dependencies
        matchedExistingIds.add(existing.id);
        scenesToUpdate.push({
          id: existing.id,
          slug: scene.slug,
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

      // Delete removed scenes so the UNIQUE(branch_id, scene_number) constraint
      // is freed up for new inserts with the same scene_number
      const deletedIds = deletedScenes.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('scenes')
        .delete()
        .in('id', deletedIds);

      if (deleteError) {
        console.error('❌ Error deleting removed scenes:', deleteError);
        // Continue anyway - this is a warning, not a blocker
      } else {
        console.log(`🗑️ [SCENES] Deleted ${deletedScenes.length} removed scenes to free constraint space`);
      }
    }

    // Update matched scenes
    for (const sceneUpdate of scenesToUpdate) {
      const updateData: any = {
        slug: sceneUpdate.slug,
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
      .select('id, scene_number, expected_location')
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

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);
    const shotRows = (shots || []) as Record<string, unknown>[];
    const transformedShots = shotRows.map(shot =>
      transformShotForClient(shot, locationContext, scene.expected_location, expectedLocationAssetId)
    );
    const locationValidation = summarizeShotLocationStates(
      transformedShots
        .map(shot => shot.locationState)
        .filter((state): state is ReturnType<typeof buildShotLocationState> => Boolean(state))
    );

    res.json({ shots: transformedShots, locationValidation });
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes/:sceneId/shots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/scenes/:sceneId/location-coverage
router.get('/:id/scenes/:sceneId/location-coverage', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const userId = req.user!.id;
    const mode = parseLocationCoverageMode(req.query.mode);

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

    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select(`
        id,
        shot_id,
        setting,
        camera,
        camera_distance,
        camera_height,
        camera_direction_id,
        location_asset_id,
        location_match_confidence,
        location_match_source
      `)
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (shotsError) return res.status(500).json({ error: 'Failed to fetch shots' });

    const { data: sceneAssetRows, error: sceneAssetsError } = await supabase
      .from('scene_asset_instances')
      .select('project_asset_id, image_key_url')
      .eq('scene_id', sceneId);

    if (sceneAssetsError) return res.status(500).json({ error: 'Failed to fetch scene assets' });

    const { data: projectLocationRows, error: locationAssetsError } = await supabase
      .from('project_assets')
      .select('id, name, image_key_url')
      .eq('branch_id', project.active_branch_id)
      .eq('asset_type', 'location');

    if (locationAssetsError) return res.status(500).json({ error: 'Failed to fetch location assets' });

    const sceneImageByAssetId = new Map<string, string | null>();
    for (const row of sceneAssetRows || []) {
      const assetId = asNullableString(row.project_asset_id);
      if (assetId) sceneImageByAssetId.set(assetId, asNullableString(row.image_key_url));
    }

    const shotLocationIds = new Set(
      ((shots || []) as Record<string, unknown>[])
        .map(shot => asNullableString(shot.location_asset_id))
        .filter((assetId): assetId is string => Boolean(assetId))
    );
    const relevantLocationIds = new Set<string>([
      ...shotLocationIds,
      ...sceneImageByAssetId.keys(),
    ]);

    const locations: LocationCoverageAssetInput[] = ((projectLocationRows || []) as Record<string, unknown>[])
      .filter(row => relevantLocationIds.has(asString(row.id)))
      .map(row => ({
        id: asString(row.id),
        name: asString(row.name, 'Unknown location'),
        image_key_url: asNullableString(row.image_key_url),
        scene_image_key_url: sceneImageByAssetId.get(asString(row.id)) || null,
      }));

    let views: LocationCoverageViewInput[] = [];
    const locationIds = locations.map(location => location.id);
    if (locationIds.length > 0) {
      const { data: locationViews, error: viewsError } = await supabase
        .from('location_views')
        .select(`
          id,
          project_asset_id,
          name,
          alias,
          description,
          view_type,
          camera_distance,
          camera_height,
          image_key_url,
          is_primary,
          source,
          sort_order,
          created_at
        `)
        .in('project_asset_id', locationIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (viewsError) return res.status(500).json({ error: 'Failed to fetch location views' });
      views = (locationViews || []) as LocationCoverageViewInput[];
    }

    const coverage = locationCoverageService.buildCoverage({
      mode,
      locations,
      views,
      shots: (shots || []) as LocationCoverageShotInput[],
    });

    res.json(coverage);
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes/:sceneId/location-coverage:', error);
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
      .select('id, scene_number, script_excerpt, expected_location')
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

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);

    // 3.7 Phase D + location continuity Phase 1: Fetch existing location views
    // for the resolved scene location asset.
    let locationDirections: { name: string; alias?: string; description?: string }[] = [];
    let locationAssetId: string | undefined;
    const locationName = scene.expected_location || '';

    if (locationName) {
      const sceneLocationResolution = locationResolverService.resolveShotLocation(
        { sceneExpectedLocation: locationName },
        locationContext
      );

      if (locationResolverService.shouldApplyResolution(sceneLocationResolution)) {
        locationAssetId = sceneLocationResolution.locationAssetId || undefined;

        // Fetch existing location views
        const { data: existingViews } = await supabase
          .from('location_views')
          .select('id, name, alias, description')
          .eq('project_asset_id', locationAssetId)
          .order('sort_order', { ascending: true });

        if (existingViews && existingViews.length > 0) {
          locationDirections = existingViews.map((v: any) => ({
            name: v.name,
            alias: v.alias || undefined,
            description: v.description || undefined,
          }));
        }
      }
    }

    const shotExtractionService = new ShotExtractionService();
    const { shots: extractedShots, newDirections } = await shotExtractionService.extractShots(
      sceneId,
      scene.script_excerpt || '',
      scene.scene_number,
      {
        priorSceneEndState: priorScene?.end_state_summary ?? null,
        beatSheetSummary,
        masterScriptSummary,
        locationDirections: locationDirections.length > 0 ? locationDirections : undefined,
        locationName: locationName || undefined,
      }
    );

    // 3.7 Phase D: Create stage7_inferred location_views for new directions
    const directionNameToId = new Map<string, string>();

    // Map existing direction names to their IDs
    if (locationAssetId && locationDirections.length > 0) {
      const { data: existingViews } = await supabase
        .from('location_views')
        .select('id, name')
        .eq('project_asset_id', locationAssetId);

      for (const v of (existingViews || [])) {
        directionNameToId.set(v.name, v.id);
      }
    }

    // Create new inferred directions
    if (locationAssetId && newDirections.length > 0) {
      // Get current max sort_order
      const { data: maxRow } = await supabase
        .from('location_views')
        .select('sort_order')
        .eq('project_asset_id', locationAssetId)
        .order('sort_order', { ascending: false })
        .limit(1);
      let nextOrder = (maxRow?.[0]?.sort_order ?? -1) + 1;

      // Check if any is_primary already set
      const { data: primaryCheck } = await supabase
        .from('location_views')
        .select('id')
        .eq('project_asset_id', locationAssetId)
        .eq('is_primary', true)
        .limit(1);
      let hasPrimary = (primaryCheck?.length ?? 0) > 0;

      for (const nd of newDirections) {
        // Skip if name already exists (shouldn't happen, but safety check)
        if (directionNameToId.has(nd.name)) continue;

        const isDirection = !nd.name.includes('establishing');
        const { data: created, error: createErr } = await supabase
          .from('location_views')
          .insert({
            project_asset_id: locationAssetId,
            name: nd.name,
            alias: nd.alias || null,
            description: nd.description || null,
            view_type: isDirection ? 'direction' : 'establishing',
            camera_distance: 'wide',
            camera_height: isDirection ? 'eye_level' : 'overhead',
            is_primary: isDirection && !hasPrimary,
            source: 'stage7_inferred',
            sort_order: nextOrder++,
          })
          .select('id, name')
          .single();

        if (created) {
          directionNameToId.set(created.name, created.id);
          if (locationAssetId) {
            locationContext.cameraDirectionParents.set(created.id, {
              cameraDirectionId: created.id,
              locationAssetId,
              locationName: locationName || 'Unknown location',
            });
          }
          if (isDirection && !hasPrimary) hasPrimary = true;
        } else if (createErr) {
          console.warn(`[ShotExtraction] Failed to create inferred direction "${nd.name}":`, createErr.message);
        }
      }
    }

    // Build shots to insert with structured camera metadata
    const shotResolutionResults: Array<LocationResolveResult | null> = [];
    const shotResolutionApplied: boolean[] = [];
    const shotsToInsert = extractedShots.map((shot, index) => {
      const baseRow = {
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
        camera_distance: shot.camera_distance || null,
        camera_height: shot.camera_height || null,
        camera_movement: shot.camera_movement || null,
        camera_direction_id: shot.camera_direction_name
          ? (directionNameToId.get(shot.camera_direction_name) || null)
          : null,
        continuity_flags: shot.continuityFlags,
        beat_reference: shot.beatReference ?? null,
        transformation_flags: shot.transformationFlags ? JSON.stringify(shot.transformationFlags) : null,
      };

      const resolved = applyShotLocationResolution(baseRow, locationContext, scene.expected_location);
      shotResolutionResults.push(resolved.result);
      shotResolutionApplied.push(resolved.wasApplied);
      return resolved.row;
    });

    if (shotsToInsert.length === 0) {
      return res.json({ success: true, shotCount: 0, shots: [] });
    }

    const { data: insertedShots, error } = await supabase
      .from('shots')
      .insert(shotsToInsert)
      .select('*');

    if (error) return res.status(500).json({ error: 'Failed to persist shots' });

    await Promise.all((insertedShots || []).map((shot: any, index: number) => {
      const result = shotResolutionResults[index];
      if (!result) return Promise.resolve();
      return locationResolverService.recordMatchEvent({
        projectId,
        branchId: project.active_branch_id,
        sceneId,
        shotId: shot.id,
        rawSetting: shot.setting,
        sceneExpectedLocation: scene.expected_location,
        cameraDirectionId: shot.camera_direction_id,
        result,
        wasApplied: shotResolutionApplied[index] || false,
      });
    }));

    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);
    const transformedShots = ((insertedShots || []) as Record<string, unknown>[]).map(shot =>
      transformShotForClient(shot, locationContext, scene.expected_location, expectedLocationAssetId)
    );

    res.json({ success: true, shotCount: insertedShots!.length, shots: transformedShots });
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
      .select('id, expected_location')
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

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);
    const shotRows = (shots || []) as Record<string, unknown>[];
    const transformedShots = shotRows.map(shot =>
      transformShotForClient(shot, locationContext, scene.expected_location, expectedLocationAssetId)
    );

    res.json({ success: true, shots: transformedShots });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/reorder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/shots/resolve-locations
router.post('/:id/scenes/:sceneId/shots/resolve-locations', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const { apply = false, threshold, preserveManual = true } = req.body || {};
    const userId = req.user!.id;

    if (threshold != null && (typeof threshold !== 'number' || threshold < 0 || threshold > 1)) {
      return res.status(400).json({ error: 'threshold must be a number between 0 and 1' });
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
      .select('id, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (shotsError) return res.status(500).json({ error: 'Failed to fetch shots' });

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const resolvedRows: Record<string, unknown>[] = [];
    const resolveEvents: Array<{
      shot: Record<string, unknown>;
      result: LocationResolveResult;
      wasApplied: boolean;
    }> = [];

    for (const shot of shots || []) {
      const resolved = applyShotLocationResolution(
        shot,
        locationContext,
        scene.expected_location,
        { preserveManual: !!preserveManual, threshold }
      );
      resolvedRows.push(resolved.row);
      if (resolved.result) {
        resolveEvents.push({
          shot,
          result: resolved.result,
          wasApplied: resolved.wasApplied,
        });
      }
    }

    let outputRows = resolvedRows;
    let appliedCount = 0;

    if (apply) {
      const updatedRows: Record<string, unknown>[] = [];

      for (const row of resolvedRows) {
        const sourceShot = ((shots || []) as Record<string, unknown>[]).find(shot => shot.id === row.id);
        const shouldUpdate =
          !!sourceShot &&
          row.location_asset_id !== sourceShot.location_asset_id;

        if (shouldUpdate) {
          appliedCount += 1;
          const { data: updatedShot, error: updateError } = await supabase
            .from('shots')
            .update({
              location_asset_id: row.location_asset_id,
              location_match_confidence: row.location_match_confidence,
              location_match_source: row.location_match_source,
              location_match_notes: row.location_match_notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
            .eq('scene_id', sceneId)
            .select('*')
            .single();

          if (updateError || !updatedShot) {
            return res.status(500).json({ error: 'Failed to apply location suggestions' });
          }
          updatedRows.push(updatedShot);
        } else {
          updatedRows.push(row);
        }
      }

      outputRows = updatedRows;

      await Promise.all(resolveEvents.map(event =>
        locationResolverService.recordMatchEvent({
          projectId,
          branchId: project.active_branch_id,
          sceneId,
          shotId: asString(event.shot.id),
          rawSetting: asNullableString(event.shot.setting),
          sceneExpectedLocation: scene.expected_location,
          cameraDirectionId: asNullableString(event.shot.camera_direction_id),
          result: event.result,
          wasApplied: event.wasApplied,
        })
      ));
    }

    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);
    const transformedShots = outputRows.map(shot =>
      transformShotForClient(shot, locationContext, scene.expected_location, expectedLocationAssetId)
    );
    const locationValidation = summarizeShotLocationStates(
      transformedShots
        .map(shot => shot.locationState)
        .filter((state): state is ReturnType<typeof buildShotLocationState> => Boolean(state))
    );

    res.json({
      success: true,
      mode: apply ? 'apply' : 'dry_run',
      appliedCount,
      shots: transformedShots,
      locationValidation,
    });
  } catch (error) {
    console.error('Error in POST /api/projects/:id/scenes/:sceneId/shots/resolve-locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/camera-direction
router.put('/:id/scenes/:sceneId/shots/:shotId/camera-direction', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { cameraDirectionId, clear = false } = req.body || {};
    const userId = req.user!.id;

    if (!clear && (typeof cameraDirectionId !== 'string' || cameraDirectionId.length === 0)) {
      return res.status(400).json({ error: 'cameraDirectionId is required unless clear is true' });
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
      .select('id, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const { data: existingShot, error: existingShotError } = await supabase
      .from('shots')
      .select('id, setting, camera_direction_id, location_asset_id, location_match_source')
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .single();

    if (existingShotError || !existingShot) {
      return res.status(404).json({ error: 'Shot not found' });
    }

    const updateData: Record<string, unknown> = {
      camera_direction_id: clear ? null : cameraDirectionId,
      updated_at: new Date().toISOString(),
    };

    if (clear) {
      if (existingShot.location_match_source !== 'manual') {
        const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
        const resolved = applyShotLocationResolution(
          {
            setting: existingShot.setting,
            camera_direction_id: null,
            location_match_source: existingShot.location_match_source,
          },
          locationContext,
          scene.expected_location
        );
        Object.assign(updateData, {
          location_asset_id: resolved.row.location_asset_id,
          location_match_confidence: resolved.row.location_match_confidence,
          location_match_source: resolved.row.location_match_source,
          location_match_notes: resolved.row.location_match_notes,
        });
      }
    } else {
      const { data: directionView, error: viewError } = await supabase
        .from('location_views')
        .select('id, project_asset_id, name, view_type')
        .eq('id', cameraDirectionId)
        .single();

      if (viewError || !directionView) {
        return res.status(404).json({ error: 'Camera direction not found' });
      }

      if (directionView.view_type !== 'direction') {
        return res.status(400).json({ error: 'Camera direction must be a direction view' });
      }

      const { data: locationAsset } = await supabase
        .from('project_assets')
        .select('id, name')
        .eq('id', directionView.project_asset_id)
        .eq('branch_id', project.active_branch_id)
        .eq('asset_type', 'location')
        .single();

      if (!locationAsset) {
        return res.status(404).json({ error: 'Direction location asset not found' });
      }

      const existingLocationAssetId = asNullableString(existingShot.location_asset_id);
      const isManualDifferentLocation =
        existingShot.location_match_source === 'manual' &&
        !!existingLocationAssetId &&
        existingLocationAssetId !== locationAsset.id;

      if (isManualDifferentLocation) {
        return res.status(409).json({
          error: 'Camera direction belongs to a different location than the shot manual assignment',
        });
      }

      if (existingLocationAssetId !== locationAsset.id) {
        Object.assign(updateData, {
          location_asset_id: locationAsset.id,
          location_match_confidence: 1,
          location_match_source: 'camera_direction_parent',
          location_match_notes: `Camera direction "${directionView.name}" belongs to "${locationAsset.name}".`,
        });
      }
    }

    const { data: updatedShot, error: updateError } = await supabase
      .from('shots')
      .update(updateData)
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .select('*')
      .single();

    if (updateError || !updatedShot) {
      return res.status(500).json({ error: 'Failed to update camera direction' });
    }

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);

    res.json({
      success: true,
      shot: transformShotForClient(updatedShot, locationContext, scene.expected_location, expectedLocationAssetId),
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/camera-direction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/location
router.put('/:id/scenes/:sceneId/shots/:shotId/location', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { locationAssetId, clear = false } = req.body || {};
    const userId = req.user!.id;

    if (!clear && (typeof locationAssetId !== 'string' || locationAssetId.length === 0)) {
      return res.status(400).json({ error: 'locationAssetId is required unless clear is true' });
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
      .select('id, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    let assignedLocationName: string | null = null;
    if (!clear) {
      const { data: locationAsset } = await supabase
        .from('project_assets')
        .select('id, name')
        .eq('id', locationAssetId)
        .eq('branch_id', project.active_branch_id)
        .eq('asset_type', 'location')
        .single();

      if (!locationAsset) return res.status(404).json({ error: 'Location asset not found' });
      assignedLocationName = locationAsset.name;
    }

    const locationPatch = clear
      ? {
          location_asset_id: null,
          location_match_confidence: null,
          location_match_source: 'manual',
          location_match_notes: 'Manual location assignment cleared.',
        }
      : {
          location_asset_id: locationAssetId,
          location_match_confidence: 1,
          location_match_source: 'manual',
          location_match_notes: `Manual assignment to "${assignedLocationName}".`,
        };

    const { data: updatedShot, error: updateError } = await supabase
      .from('shots')
      .update({
        ...locationPatch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .select('*')
      .single();

    if (updateError || !updatedShot) {
      return res.status(500).json({ error: 'Failed to update shot location' });
    }

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);

    res.json({
      success: true,
      shot: transformShotForClient(updatedShot, locationContext, scene.expected_location, expectedLocationAssetId),
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/location:', error);
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
      .select('id, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const allowedFields = [
      'duration', 'dialogue', 'action',
      'characters_foreground', 'characters_background',
      'setting', 'camera', 'continuity_flags', 'beat_reference',
      'camera_distance', 'camera_height', 'camera_movement', 'camera_direction_id'
    ];
    const invalidFields = Object.keys(updates).filter((f: string) => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      return res.status(400).json({ error: `Invalid fields: ${invalidFields.join(', ')}` });
    }

    const shouldResolveLocation =
      Object.prototype.hasOwnProperty.call(updates, 'setting') ||
      Object.prototype.hasOwnProperty.call(updates, 'camera_direction_id');
    let locationResolution: LocationResolveResult | null = null;
    let locationWasApplied = false;
    const updateData = { ...updates, updated_at: new Date().toISOString() };

    if (shouldResolveLocation) {
      const { data: existingShot, error: existingShotError } = await supabase
        .from('shots')
        .select('id, setting, camera_direction_id, location_match_source')
        .eq('id', shotId)
        .eq('scene_id', sceneId)
        .single();

      if (existingShotError || !existingShot) {
        return res.status(404).json({ error: 'Shot not found' });
      }

      if (existingShot.location_match_source !== 'manual') {
        const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
        const rowForResolution = {
          setting: Object.prototype.hasOwnProperty.call(updates, 'setting')
            ? updates.setting
            : existingShot.setting,
          camera_direction_id: Object.prototype.hasOwnProperty.call(updates, 'camera_direction_id')
            ? updates.camera_direction_id
            : existingShot.camera_direction_id,
        };
        const resolved = applyShotLocationResolution(
          rowForResolution,
          locationContext,
          scene.expected_location
        );
        Object.assign(updateData, {
          location_asset_id: resolved.row.location_asset_id,
          location_match_confidence: resolved.row.location_match_confidence,
          location_match_source: resolved.row.location_match_source,
          location_match_notes: resolved.row.location_match_notes,
        });
        locationResolution = resolved.result;
        locationWasApplied = resolved.wasApplied;
      }
    }

    const { data: updatedShot, error } = await supabase
      .from('shots')
      .update(updateData)
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update shot' });

    if (locationResolution) {
      await locationResolverService.recordMatchEvent({
        projectId,
        branchId: project.active_branch_id,
        sceneId,
        shotId: updatedShot.id,
        rawSetting: updatedShot.setting,
        sceneExpectedLocation: scene.expected_location,
        cameraDirectionId: updatedShot.camera_direction_id,
        result: locationResolution,
        wasApplied: locationWasApplied,
      });
    }

    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);

    res.json({
      success: true,
      shot: transformShotForClient(updatedShot, locationContext, scene.expected_location, expectedLocationAssetId),
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/:id/scenes/:sceneId/shots/:shotId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/scenes/:sceneId/shots/:shotId/split
router.post('/:id/scenes/:sceneId/shots/:shotId/split', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { userGuidance, splitCount } = req.body || {};
    const userId = req.user!.id;
    const count = splitCount === 3 ? 3 : 2;

    const { data: project } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { data: scene } = await supabase
      .from('scenes')
      .select('id, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const { data: originalShot } = await supabase
      .from('shots')
      .select('*')
      .eq('id', shotId)
      .eq('scene_id', sceneId)
      .single();
    if (!originalShot) return res.status(404).json({ error: 'Shot not found' });

    // §6: Save existing assignments BEFORE deleting the original shot (they cascade-delete)
    const { data: existingAssignments } = await supabase
      .from('shot_asset_assignments')
      .select('scene_asset_instance_id, presence_type')
      .eq('shot_id', shotId);

    const shotSplitService = new ShotSplitService();
    const newShotsPayload = await shotSplitService.splitShot(originalShot, userGuidance, count);
    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);

    const { error: deleteError } = await supabase
      .from('shots')
      .delete()
      .eq('id', shotId);
    if (deleteError) return res.status(500).json({ error: 'Failed to delete original shot' });

    // Shift shot_order for downstream shots to make room for (count - 1) additional shots
    const { data: shotsAfterDelete } = await supabase
      .from('shots')
      .select('id, shot_order')
      .eq('scene_id', sceneId)
      .gt('shot_order', originalShot.shot_order);
    if (shotsAfterDelete?.length) {
      for (const s of shotsAfterDelete) {
        await supabase.from('shots').update({ shot_order: s.shot_order + (count - 1) }).eq('id', s.id);
      }
    }

    const shotResolutionResults: Array<LocationResolveResult | null> = [];
    const shotResolutionApplied: boolean[] = [];
    const insertRows = newShotsPayload.map((shot, i) => {
      const baseRow = {
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
        beat_reference: shot.beat_reference,
      };
      const resolved = applyShotLocationResolution(baseRow, locationContext, scene.expected_location);
      shotResolutionResults.push(resolved.result);
      shotResolutionApplied.push(resolved.wasApplied);
      return resolved.row;
    });

    const { data: insertedShots, error: insertError } = await supabase
      .from('shots')
      .insert(insertRows)
      .select('*');
    if (insertError) return res.status(500).json({ error: 'Failed to insert split shots' });

    await Promise.all((insertedShots || []).map((shot: any, index: number) => {
      const result = shotResolutionResults[index];
      if (!result) return Promise.resolve();
      return locationResolverService.recordMatchEvent({
        projectId,
        branchId: project.active_branch_id,
        sceneId,
        shotId: shot.id,
        rawSetting: shot.setting,
        sceneExpectedLocation: scene.expected_location,
        cameraDirectionId: shot.camera_direction_id,
        result,
        wasApplied: shotResolutionApplied[index] || false,
      });
    }));

    // §6: Clone saved assignments to all new sub-shots
    if (existingAssignments && existingAssignments.length > 0 && insertedShots) {
      const assignmentRows = insertedShots.flatMap((newShot: any) =>
        existingAssignments.map((a: any) => ({
          shot_id: newShot.id,
          scene_asset_instance_id: a.scene_asset_instance_id,
          presence_type: a.presence_type,
        }))
      );
      const { error: assignError } = await supabase
        .from('shot_asset_assignments')
        .insert(assignmentRows);
      if (assignError) {
        console.warn('Failed to clone assignments to split shots:', assignError);
      }
    }

    // §6: Invalidate Stage 9 and downstream after split
    shotAssetAssignmentService.invalidateStage9AndDownstream(sceneId).catch(err => {
      console.warn('Failed to invalidate stages after shot split:', err);
    });

    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);
    const transformedShots = ((insertedShots || []) as Record<string, unknown>[]).map(shot =>
      transformShotForClient(shot, locationContext, scene.expected_location, expectedLocationAssetId)
    );

    res.json({ success: true, newShots: transformedShots });
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

    const { data: scene } = await supabase
      .from('scenes')
      .select('id, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

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
    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);

    const [lowerOrder, higherOrder] =
      currentShot.shot_order <= neighbourShot.shot_order
        ? [currentShot.shot_order, neighbourShot.shot_order]
        : [neighbourShot.shot_order, currentShot.shot_order];

    const { error: deleteError1 } = await supabase.from('shots').delete().eq('id', currentShot.id);
    if (deleteError1) return res.status(500).json({ error: 'Failed to delete first shot' });
    const { error: deleteError2 } = await supabase.from('shots').delete().eq('id', neighbourShot.id);
    if (deleteError2) return res.status(500).json({ error: 'Failed to delete second shot' });

    const mergedBaseRow = {
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
      beat_reference: mergedPayload.beat_reference,
    };
    const mergedLocationResolution = applyShotLocationResolution(
      mergedBaseRow,
      locationContext,
      scene.expected_location
    );

    const { data: insertedShot, error: insertError } = await supabase
      .from('shots')
      .insert(mergedLocationResolution.row)
      .select('*')
      .single();
    if (insertError) return res.status(500).json({ error: 'Failed to insert merged shot' });

    if (mergedLocationResolution.result) {
      await locationResolverService.recordMatchEvent({
        projectId,
        branchId: project.active_branch_id,
        sceneId,
        shotId: insertedShot.id,
        rawSetting: insertedShot.setting,
        sceneExpectedLocation: scene.expected_location,
        cameraDirectionId: insertedShot.camera_direction_id,
        result: mergedLocationResolution.result,
        wasApplied: mergedLocationResolution.wasApplied,
      });
    }

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

    const expectedLocationAssetId = resolveExpectedLocationAssetId(locationContext, scene.expected_location);

    res.json({
      success: true,
      mergedShot: transformShotForClient(
        insertedShot,
        locationContext,
        scene.expected_location,
        expectedLocationAssetId
      ),
    });
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

    // Check if this is the last shot in the scene
    const { data: shotCount } = await supabase
      .from('shots')
      .select('id', { count: 'exact', head: true })
      .eq('scene_id', sceneId);

    const count = (shotCount as any)?.length ?? 0;
    // Use the count from the response header if available, otherwise count rows
    const { count: exactCount } = await supabase
      .from('shots')
      .select('id', { count: 'exact', head: true })
      .eq('scene_id', sceneId);

    if (exactCount !== null && exactCount <= 1) {
      return res.status(409).json({
        error: 'Cannot delete the last shot',
        code: 'LAST_SHOT',
        suggestion: 'defer_scene',
      });
    }

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
      .select('id, scene_number, status, shot_list_locked_at, expected_characters, expected_location, stage_locks')
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
    const locationContext = await locationResolverService.loadProjectLocationContext(project.active_branch_id);
    const locationValidation = buildShotLocationValidationSummary(
      (shots || []) as Record<string, unknown>[],
      locationContext,
      scene.expected_location
    );
    const locationWarning = buildLocationValidationWarning(locationValidation);
    if (locationWarning) {
      validationResult.warnings.push(locationWarning);
    }

    // 6. Handle validation results
    if (validationResult.errors.length > 0) {
      // ERRORS: Cannot proceed, even with force
      return res.status(400).json({
        error: 'Shot list validation failed',
        errors: validationResult.errors,
        locationValidation,
        canForce: false
      });
    }

    if (validationResult.warnings.length > 0 && !force) {
      // WARNINGS: Can bypass with force=true
      return res.status(409).json({
        error: 'Shot list has warnings',
        warnings: validationResult.warnings,
        locationValidation,
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
      },
      locationValidation
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
        ai_recommends_end_frame,
        compatible_models,
        reference_image_order,
        prompts_generated_at,
        start_continuity,
        ai_start_continuity,
        continuity_frame_prompt
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
      aiRecommendsEndFrame: shot.ai_recommends_end_frame ?? null,
      compatibleModels: shot.compatible_models || ['Veo3'],
      referenceImageOrder: shot.reference_image_order || null,
      promptsGeneratedAt: shot.prompts_generated_at || null,
      // Include shot data for context
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      setting: shot.setting,
      camera: shot.camera,
      startContinuity: shot.start_continuity || 'none',
      aiStartContinuity: shot.ai_start_continuity || null,
      continuityFramePrompt: shot.continuity_frame_prompt || null,
    }));

    res.json({ prompts: promptSets, sceneNumber: scene.scene_number });
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes/:sceneId/prompts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/scenes/:sceneId/continuity-preview - Preview generation-time continuity packages
router.get('/:id/scenes/:sceneId/continuity-preview', async (req, res) => {
  try {
    const { id: projectId, sceneId } = req.params;
    const userId = req.user!.id;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, scene_number, expected_location')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select(`
        id,
        shot_id,
        shot_order,
        duration,
        dialogue,
        action,
        characters_foreground,
        characters_background,
        setting,
        camera,
        continuity_flags,
        beat_reference,
        camera_distance,
        camera_height,
        camera_movement,
        camera_direction_id,
        location_asset_id,
        location_match_confidence,
        location_match_source,
        location_match_notes,
        selected_continuity_base_frame_id,
        start_continuity
      `)
      .eq('scene_id', sceneId)
      .order('shot_order', { ascending: true });

    if (shotsError) {
      return res.status(500).json({ error: 'Failed to fetch shots' });
    }

    const sceneAssets = await continuityCompositionService.loadSceneAssetsForContinuity(sceneId);

    const linkedLocationIds = Array.from(new Set(
      ((shots || []) as Record<string, unknown>[])
        .map(shot => asNullableString(shot.location_asset_id))
        .filter((locationId): locationId is string => Boolean(locationId))
    ));
    const locationNameById = new Map<string, string>();
    const locationImageById = new Map<string, string | null>();

    if (linkedLocationIds.length > 0) {
      const { data: locationRows } = await supabase
        .from('project_assets')
        .select('id, name, image_key_url')
        .eq('branch_id', project.active_branch_id)
        .eq('asset_type', 'location')
        .in('id', linkedLocationIds);

      for (const row of locationRows || []) {
        const locationId = asString(row.id);
        locationNameById.set(locationId, asString(row.name, 'Unknown location'));
        locationImageById.set(locationId, asNullableString(row.image_key_url));
      }
    }

    let shotAssignmentMap: Map<string, ShotAssetAssignmentForPrompt[]> | undefined;
    try {
      const hasAssignments = await shotAssetAssignmentService.hasAssignments(sceneId);
      if (hasAssignments) {
        const allAssignments = await shotAssetAssignmentService.getAssignmentsForScene(sceneId);
        shotAssignmentMap = new Map<string, ShotAssetAssignmentForPrompt[]>();
        for (const assignment of allAssignments) {
          const list = shotAssignmentMap.get(assignment.shot_id) || [];
          list.push({
            scene_asset_instance_id: assignment.scene_asset_instance_id,
            presence_type: assignment.presence_type as ShotAssetAssignmentForPrompt['presence_type'],
          });
          shotAssignmentMap.set(assignment.shot_id, list);
        }
      }
    } catch (assignErr) {
      console.warn('[Stage9] Failed to fetch shot assignments for continuity preview:', assignErr);
    }

    const continuityBaseCandidatesByShotId = new Map<string, Awaited<ReturnType<typeof continuityBaseService.listCandidates>>>();
    const selectedContinuityBaseByShotId = new Map<string, Awaited<ReturnType<typeof continuityBaseService.pickCandidateById>>>();
    for (const shot of (shots || []) as Record<string, unknown>[]) {
      const shotId = asString(shot.id);
      const candidates = await continuityBaseService.listCandidates({
        projectId,
        branchId: project.active_branch_id,
        sceneId,
        shotId,
        locationAssetId: asNullableString(shot.location_asset_id),
        cameraDirectionId: asNullableString(shot.camera_direction_id),
      });
      continuityBaseCandidatesByShotId.set(shotId, candidates);
      selectedContinuityBaseByShotId.set(
        shotId,
        await continuityBaseService.pickCandidateById(
          candidates,
          asNullableString(shot.selected_continuity_base_frame_id)
        )
      );
    }

    const packages = continuityCompositionService.buildGenerationPackages(
      ((shots || []) as Record<string, unknown>[]).map(shot => ({
        shot: {
          id: asString(shot.id),
          shot_id: asString(shot.shot_id, 'Shot'),
          shot_order: typeof shot.shot_order === 'number' ? shot.shot_order : 0,
          duration: typeof shot.duration === 'number' ? shot.duration : 0,
          dialogue: asString(shot.dialogue),
          action: asString(shot.action),
          characters_foreground: asStringArray(shot.characters_foreground),
          characters_background: asStringArray(shot.characters_background),
          setting: asString(shot.setting),
          camera: asString(shot.camera),
          continuity_flags: asStringArray(shot.continuity_flags),
          beat_reference: asNullableString(shot.beat_reference) || undefined,
          camera_distance: asNullableString(shot.camera_distance) as ShotData['camera_distance'],
          camera_height: asNullableString(shot.camera_height) as ShotData['camera_height'],
          camera_movement: asNullableString(shot.camera_movement) || undefined,
          camera_direction_id: asNullableString(shot.camera_direction_id) || undefined,
          location_asset_id: asNullableString(shot.location_asset_id),
          location_match_confidence: shot.location_match_confidence as number | string | null,
          location_match_source: asNullableString(shot.location_match_source),
          location_match_notes: asNullableString(shot.location_match_notes),
          start_continuity: ['match', 'camera_change'].includes(asString(shot.start_continuity))
            ? asString(shot.start_continuity) as ShotData['start_continuity']
            : 'none',
        },
        sceneAssets,
        shotAssignments: shotAssignmentMap?.get(asString(shot.id)),
        sceneExpectedLocation: asNullableString(scene.expected_location),
        locationNameById,
        locationImageById,
        continuityBaseCandidates: continuityBaseCandidatesByShotId.get(asString(shot.id)) || [],
        continuityBase: selectedContinuityBaseByShotId.get(asString(shot.id)) || null,
      }))
    );

    res.json({
      packages,
      previews: packages.map(pkg => pkg.preview),
      sceneNumber: scene.scene_number,
    });
  } catch (error) {
    console.error('Error in GET /api/projects/:id/scenes/:sceneId/continuity-preview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts - Update prompts for a single shot
router.put('/:id/scenes/:sceneId/shots/:shotId/prompts', async (req, res) => {
  try {
    const { id: projectId, sceneId, shotId } = req.params;
    const { framePrompt, videoPrompt, requiresEndFrame, compatibleModels, startContinuity } = req.body;
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

    if (startContinuity !== undefined) {
      if (!['none', 'match', 'camera_change'].includes(startContinuity)) {
        return res.status(400).json({ error: 'startContinuity must be none, match, or camera_change' });
      }
      updateData.start_continuity = startContinuity;
      // Clear continuity prompt when switching to 'none'
      if (startContinuity === 'none') {
        updateData.continuity_frame_prompt = null;
      }
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
        startContinuity: updatedShot.start_continuity || 'none',
        aiStartContinuity: updatedShot.ai_start_continuity || null,
        continuityFramePrompt: updatedShot.continuity_frame_prompt || null,
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
      .select('id, active_branch_id, visual_style_capsule_id')
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

    // Fetch scene asset instances with enriched data for context
    const { data: assetInstances } = await supabase
      .from('scene_asset_instances')
      .select(`
        id,
        description_override,
        effective_description,
        status_tags,
        image_key_url,
        carry_forward,
        inherited_from_instance_id,
        use_master_as_is,
        selected_master_reference_url,
        project_assets!inner (
          id,
          name,
          asset_type,
          description,
          image_key_url
        )
      `)
      .eq('scene_id', sceneId);

    // Transform asset instances to service format with enriched data
    const sceneAssets: SceneAssetInstanceData[] = (assetInstances || []).map((instance: any) => ({
      id: instance.id,
      project_asset: instance.project_assets ? {
        id: instance.project_assets.id,
        name: instance.project_assets.name,
        asset_type: instance.project_assets.asset_type,
        description: instance.project_assets.description,
        image_key_url: instance.project_assets.image_key_url || undefined,
      } : undefined,
      description_override: instance.description_override,
      effective_description: instance.effective_description || instance.description_override || instance.project_assets?.description || '',
      status_tags: instance.status_tags || [],
      image_key_url: instance.image_key_url || undefined,
      master_image_url: instance.selected_master_reference_url || instance.project_assets?.image_key_url || undefined,
      carry_forward: instance.carry_forward ?? false,
      inherited_from_instance_id: instance.inherited_from_instance_id || undefined,
    }));

    // 3C.2: Fetch angle variants for character assets and attach to scene asset data
    const characterAssetIds = sceneAssets
      .filter(a => a.project_asset?.asset_type === 'character' && a.project_asset?.id)
      .map(a => a.project_asset!.id);

    if (characterAssetIds.length > 0) {
      const { data: angleVariants } = await supabase
        .from('asset_angle_variants')
        .select('project_asset_id, angle_type, image_url, status')
        .in('project_asset_id', characterAssetIds)
        .eq('status', 'completed');

      if (angleVariants && angleVariants.length > 0) {
        const variantsByAsset = new Map<string, Array<{ angle_type: string; image_url: string | null; status: string }>>();
        for (const v of angleVariants) {
          if (!variantsByAsset.has(v.project_asset_id)) {
            variantsByAsset.set(v.project_asset_id, []);
          }
          variantsByAsset.get(v.project_asset_id)!.push({
            angle_type: v.angle_type,
            image_url: v.image_url,
            status: v.status,
          });
        }

        for (const asset of sceneAssets) {
          if (asset.project_asset?.id && variantsByAsset.has(asset.project_asset.id)) {
            asset.angle_variants = variantsByAsset.get(asset.project_asset.id);
          }
        }
        console.log(`[Stage9] Attached angle variants for ${variantsByAsset.size} character asset(s)`);
      }
    }

    // 3.7 Phase F: Fetch location views for location assets and attach to scene asset data
    const locationAssetIds = sceneAssets
      .filter(a => a.project_asset?.asset_type === 'location' && a.project_asset?.id)
      .map(a => a.project_asset!.id);

    if (locationAssetIds.length > 0) {
      const { data: locationViews } = await supabase
        .from('location_views')
        .select('id, project_asset_id, name, alias, description, view_type, camera_distance, camera_height, image_key_url, is_primary, source')
        .in('project_asset_id', locationAssetIds);

      if (locationViews && locationViews.length > 0) {
        const viewsByAsset = new Map<string, any[]>();
        for (const v of locationViews) {
          if (!viewsByAsset.has(v.project_asset_id)) {
            viewsByAsset.set(v.project_asset_id, []);
          }
          viewsByAsset.get(v.project_asset_id)!.push({
            id: v.id,
            name: v.name,
            alias: v.alias || undefined,
            description: v.description || undefined,
            view_type: v.view_type,
            camera_distance: v.camera_distance,
            camera_height: v.camera_height,
            image_key_url: v.image_key_url || undefined,
            is_primary: v.is_primary,
            source: v.source,
          });
        }

        for (const asset of sceneAssets) {
          if (asset.project_asset?.id && viewsByAsset.has(asset.project_asset.id)) {
            asset.location_views = viewsByAsset.get(asset.project_asset.id);
          }
        }
        console.log(`[Stage9] Attached location views for ${viewsByAsset.size} location asset(s)`);
      }
    }

    // Fetch visual style capsule if applied to the project
    let styleCapsule = null;
    if (project.visual_style_capsule_id) {
      try {
        const styleCapsuleService = new StyleCapsuleService();
        styleCapsule = await styleCapsuleService.getCapsuleById(project.visual_style_capsule_id, userId);
        if (styleCapsule) {
          console.log(`[Stage9] Loaded visual style capsule: ${styleCapsule.name}`);
        }
      } catch (err) {
        console.warn('[Stage9] Failed to load visual style capsule, continuing without it:', err);
      }
    }

    // Context size monitoring
    const contextManager = new ContextManager();
    const assetContextStr = sceneAssets.map(a => a.effective_description).join(' ');
    const estimatedTokens = contextManager.estimateContextSize(assetContextStr);
    console.log(`[Stage9] Asset context size: ~${estimatedTokens} tokens for ${sceneAssets.length} assets`);
    if (estimatedTokens > 4000) {
      console.warn(`[Stage9] Large asset context (~${estimatedTokens} tokens) — prompt quality may be affected`);
    }

    // Transform shots to service format (include shot_order for transformation resolution)
    const shotDataList = shots.map((shot: any) => ({
      id: shot.id,
      shot_id: shot.shot_id,
      shot_order: shot.shot_order ?? 0,
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      characters_foreground: shot.characters_foreground || [],
      characters_background: shot.characters_background || [],
      setting: shot.setting,
      camera: shot.camera,
      continuity_flags: shot.continuity_flags,
      beat_reference: shot.beat_reference,
      // 3.7 Phase F: Structured camera metadata
      camera_distance: shot.camera_distance || undefined,
      camera_height: shot.camera_height || undefined,
      camera_movement: shot.camera_movement || undefined,
      camera_direction_id: shot.camera_direction_id || undefined,
      location_asset_id: shot.location_asset_id || null,
      location_match_confidence: shot.location_match_confidence ?? null,
      location_match_source: shot.location_match_source || null,
      location_match_notes: shot.location_match_notes || null,
      start_continuity: shot.start_continuity || 'none',
    })) as (ShotData & { shot_order: number })[];

    // Fetch confirmed transformation events for this scene
    const { data: transformationEventsRaw } = await supabase
      .from('transformation_events')
      .select(`
        *,
        trigger_shot:shots!trigger_shot_id(id, shot_id, shot_order),
        completion_shot:shots!completion_shot_id(id, shot_id, shot_order)
      `)
      .eq('scene_id', sceneId)
      .eq('confirmed', true);

    const transformationEvents = (transformationEventsRaw ?? []).map((row: any) => ({
      ...row,
      trigger_shot: Array.isArray(row.trigger_shot) ? row.trigger_shot[0] : row.trigger_shot,
      completion_shot: Array.isArray(row.completion_shot) ? row.completion_shot[0] : row.completion_shot,
    }));

    if (transformationEvents.length > 0) {
      console.log(`[Stage9] Found ${transformationEvents.length} confirmed transformation event(s) for scene`);
    }

    // Fetch per-shot asset assignments (§4: presence-aware manifests)
    let shotAssignmentMap: Map<string, ShotAssetAssignmentForPrompt[]> | undefined;
    try {
      const hasAssignments = await shotAssetAssignmentService.hasAssignments(sceneId);
      if (hasAssignments) {
        const allAssignments = await shotAssetAssignmentService.getAssignmentsForScene(sceneId);
        shotAssignmentMap = new Map<string, ShotAssetAssignmentForPrompt[]>();
        for (const a of allAssignments) {
          const list = shotAssignmentMap.get(a.shot_id) || [];
          list.push({
            scene_asset_instance_id: a.scene_asset_instance_id,
            presence_type: a.presence_type as ShotAssetAssignmentForPrompt['presence_type'],
          });
          shotAssignmentMap.set(a.shot_id, list);
        }
        console.log(`[Stage9] Using per-shot asset assignments for ${shotAssignmentMap.size} shot(s)`);
      } else {
        console.log(`[Stage9] No shot assignments found — using legacy all-assets-per-shot behavior`);
      }
    } catch (assignErr) {
      console.warn('[Stage9] Failed to fetch shot assignments, falling back to legacy:', assignErr);
    }

    // Generate prompts using the service (with transformation events + assignments)
    const results = await promptGenerationService.generateBulkPromptSets(
      shotDataList,
      sceneAssets,
      styleCapsule,
      transformationEvents.length > 0 ? transformationEvents : undefined,
      shotAssignmentMap
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
            ai_recommends_end_frame: r.aiRecommendsEndFrame ?? r.requiresEndFrame,
            compatible_models: r.compatibleModels,
            reference_image_order: r.referenceImageOrder || null,
            end_frame_reference_image_order: r.endFrameReferenceImageOrder || null,
            ai_start_continuity: r.aiStartContinuity || null,
            start_continuity: r.aiStartContinuity || 'none',
            prompts_generated_at: now,
            updated_at: now,
          })
          .eq('id', r.shotId)
      );

    await Promise.all(updatePromises);

    // Create text field versions for AI-generated prompts
    const versionPromises = results
      .filter(r => r.success)
      .flatMap(r => {
        const versions = [];
        if (r.framePrompt) {
          versions.push(
            textFieldVersionService.createVersion('shot', r.shotId, 'frame_prompt', {
              content: r.framePrompt,
              source: 'ai_generation',
            })
          );
        }
        if (r.videoPrompt) {
          versions.push(
            textFieldVersionService.createVersion('shot', r.shotId, 'video_prompt', {
              content: r.videoPrompt,
              source: 'ai_generation',
            })
          );
        }
        return versions;
      });

    await Promise.all(versionPromises).catch(err => {
      console.warn('[Stage9] Failed to create some text field versions:', err.message);
    });

    // Fetch updated shots
    const { data: updatedShots } = await supabase
      .from('shots')
      .select(`
        id,
        shot_id,
        frame_prompt,
        video_prompt,
        requires_end_frame,
        ai_recommends_end_frame,
        compatible_models,
        reference_image_order,
        prompts_generated_at,
        duration,
        dialogue,
        action,
        setting,
        camera,
        start_continuity,
        ai_start_continuity,
        continuity_frame_prompt
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
      aiRecommendsEndFrame: shot.ai_recommends_end_frame ?? null,
      compatibleModels: shot.compatible_models || ['Veo3'],
      referenceImageOrder: shot.reference_image_order || null,
      promptsGeneratedAt: shot.prompts_generated_at || null,
      duration: shot.duration,
      dialogue: shot.dialogue || '',
      action: shot.action,
      setting: shot.setting,
      camera: shot.camera,
      startContinuity: shot.start_continuity || 'none',
      aiStartContinuity: shot.ai_start_continuity || null,
      continuityFramePrompt: shot.continuity_frame_prompt || null,
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
