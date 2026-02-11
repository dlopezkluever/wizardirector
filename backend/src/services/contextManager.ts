/**
 * Context Manager Service
 * Centralizes context assembly for LLM calls across Phase A and B stages
 * Manages Global Context (Phase A) and Local Context (Phase B)
 */

import { DatabaseService } from '../config/database.js';
import { StyleCapsuleService, type StyleCapsule } from './styleCapsuleService.js';
import { estimateTokenCount } from '../utils/token-utils.js';

// Type definitions
export interface ProjectParams {
  targetLengthMin: number;
  targetLengthMax: number;
  projectType: 'narrative' | 'commercial' | 'audio_visual';
  contentRating: string;
  genres: string[];
  tonalPrecision: string;
  writingStyleCapsuleId?: string;
  visualStyleCapsuleId?: string;
}

export interface Beat {
  id: string;
  order: number;
  text: string;
  rationale?: string;
  estimatedScreenTimeSeconds: number;
}

export interface GlobalContext {
  projectId: string;
  branchId: string;
  projectParams: ProjectParams;
  beatSheet?: Beat[];
  masterScriptSummary?: string;
  writingStyleCapsule?: StyleCapsule;
  visualStyleCapsule?: StyleCapsule;
}

/** Scene asset entry for LLM context (formatted from scene_asset_instances + project_asset). */
export interface LocalContextSceneAsset {
  name: string;
  type: 'character' | 'prop' | 'location';
  description: string;
  statusTags: string[];
  imageKeyUrl?: string;
  masterImageUrl?: string;
  carryForward?: boolean;
  inheritedFromInstanceId?: string;
}

export interface LocalContext {
  sceneId?: string;
  sceneScript?: string;
  previousSceneEndState?: string;
  sceneAssets?: LocalContextSceneAsset[];
}

export interface FullContext {
  global: GlobalContext;
  local: LocalContext;
  combinedPromptSection: string;
}

export interface StageContext {
  stage: number;
  globalContext: GlobalContext;
  localContext?: LocalContext;
  formattedContext: string;
}

export class ContextManagerError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ContextManagerError';
  }
}

export class ContextManager {
  private db: DatabaseService;
  private styleCapsuleService: StyleCapsuleService;

  constructor() {
    this.db = new DatabaseService();
    this.styleCapsuleService = new StyleCapsuleService();
  }

  /**
   * Assembles global context for Phase A stages
   * Fetches project params, beat sheet, master script, and style capsules
   */
  async assembleGlobalContext(
    projectId: string,
    branchId: string,
    userId: string
  ): Promise<GlobalContext> {
    console.log(`[ContextManager] Assembling global context for project ${projectId}, branch ${branchId}`);

    try {
      // Fetch project data including project params and style capsule references
      const project = await this.fetchProject(projectId, userId);
      
      // Resolve actual branch ID if 'main' was passed
      const actualBranchId = branchId === 'main' ? project.activeBranchId : branchId;
      
      if (!actualBranchId) {
        throw new ContextManagerError('Project has no active branch', 'NO_ACTIVE_BRANCH');
      }
      
      // Initialize global context with project params
      const globalContext: GlobalContext = {
        projectId,
        branchId: actualBranchId,
        projectParams: project.projectParams
      };

      // Fetch writing style capsule if selected
      if (project.projectParams.writingStyleCapsuleId) {
        try {
          const writingCapsule = await this.styleCapsuleService.getCapsuleById(
            project.projectParams.writingStyleCapsuleId,
            userId
          );
          if (writingCapsule) {
            globalContext.writingStyleCapsule = writingCapsule;
            console.log(`[ContextManager] Loaded writing style capsule: ${writingCapsule.name}`);
          }
        } catch (error) {
          console.warn('[ContextManager] Failed to load writing style capsule:', error);
        }
      }

      // Fetch visual style capsule if selected
      if (project.projectParams.visualStyleCapsuleId) {
        try {
          const visualCapsule = await this.styleCapsuleService.getCapsuleById(
            project.projectParams.visualStyleCapsuleId,
            userId
          );
          if (visualCapsule) {
            globalContext.visualStyleCapsule = visualCapsule;
            console.log(`[ContextManager] Loaded visual style capsule: ${visualCapsule.name}`);
          }
        } catch (error) {
          console.warn('[ContextManager] Failed to load visual style capsule:', error);
        }
      }

      // Fetch beat sheet from Stage 3 if available
      try {
        const beatSheet = await this.fetchBeatSheet(actualBranchId);
        if (beatSheet) {
          globalContext.beatSheet = beatSheet;
          console.log(`[ContextManager] Loaded beat sheet with ${beatSheet.length} beats`);
        }
      } catch (error) {
        console.log('[ContextManager] Beat sheet not yet available (expected for early stages)');
      }

      // Fetch master script summary from Stage 4 if available
      try {
        const scriptSummary = await this.fetchMasterScriptSummary(actualBranchId);
        if (scriptSummary) {
          globalContext.masterScriptSummary = scriptSummary;
          console.log(`[ContextManager] Loaded master script summary (${scriptSummary.length} chars)`);
        }
      } catch (error) {
        console.log('[ContextManager] Master script not yet available (expected for early stages)');
      }

      return globalContext;
    } catch (error) {
      console.error('[ContextManager] Error assembling global context:', error);
      throw new ContextManagerError(
        'Failed to assemble global context',
        'GLOBAL_CONTEXT_ASSEMBLY_ERROR'
      );
    }
  }

  /**
   * Assembles local context for Phase B scene-specific generation
   * Fetches scene details and scene asset instances with project_asset data for LLM context.
   */
  async assembleLocalContext(
    sceneId: string,
    globalContext: GlobalContext
  ): Promise<LocalContext> {
    console.log(`[ContextManager] Assembling local context for scene ${sceneId}`);

    const { data: scene, error: sceneError } = await this.db.supabase
      .from('scenes')
      .select('id, script_excerpt, end_state_summary')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene) {
      throw new ContextManagerError(`Scene ${sceneId} not found`, 'SCENE_NOT_FOUND');
    }

    const { data: sceneAssets, error: assetsError } = await this.db.supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .eq('scene_id', sceneId);

    if (assetsError) {
      console.error(`[ContextManager] Failed to fetch scene assets: ${assetsError.message}`);
    }

    const projectAssetRow = (row: { project_asset?: { name: string; asset_type: string; description: string; image_key_url?: string | null } | null; effective_description?: string; status_tags?: string[]; image_key_url?: string | null }) =>
      row.project_asset as { name: string; asset_type: string; description: string; image_key_url?: string | null } | null;

    const formattedAssets: LocalContextSceneAsset[] = (sceneAssets || []).map((instance: any) => {
      const pa = projectAssetRow(instance);
      const name = pa?.name ?? '';
      const assetType = (pa?.asset_type ?? 'prop') as 'character' | 'prop' | 'location';
      const description = instance.effective_description ?? pa?.description ?? '';
      const statusTags = instance.status_tags ?? [];
      const imageKeyUrl = instance.image_key_url ?? pa?.image_key_url ?? undefined;
      const masterImageUrl = instance.selected_master_reference_url ?? pa?.image_key_url ?? undefined;
      const carryForward = instance.carry_forward ?? false;
      const inheritedFromInstanceId = instance.inherited_from_instance_id ?? undefined;
      return {
        name,
        type: assetType,
        description,
        statusTags,
        ...(imageKeyUrl && { imageKeyUrl }),
        ...(masterImageUrl && { masterImageUrl }),
        ...(carryForward && { carryForward }),
        ...(inheritedFromInstanceId && { inheritedFromInstanceId }),
      };
    });

    return {
      sceneId: scene.id,
      sceneScript: scene.script_excerpt ?? undefined,
      previousSceneEndState: scene.end_state_summary ?? undefined,
      sceneAssets: formattedAssets,
    };
  }

  /**
   * Combines global and local context into a complete context object
   */
  assembleFullContext(
    globalContext: GlobalContext,
    localContext: LocalContext = {}
  ): FullContext {
    return {
      global: globalContext,
      local: localContext,
      combinedPromptSection: this.formatForInjection(globalContext)
    };
  }

  /**
   * Prepares stage-specific context based on stage number
   */
  async prepareStageContext(
    stageNumber: number,
    globalContext: GlobalContext,
    localContext?: LocalContext
  ): Promise<StageContext> {
    console.log(`[ContextManager] Preparing context for stage ${stageNumber}`);

    let formattedContext = '';

    // Stage-specific context formatting
    switch (stageNumber) {
      case 2: // Treatment Generation
        formattedContext = this.formatTreatmentContext(globalContext);
        break;
      case 3: // Beat Sheet
        formattedContext = this.formatBeatSheetContext(globalContext);
        break;
      case 4: // Master Script
        formattedContext = this.formatScriptContext(globalContext);
        break;
      default:
        formattedContext = this.formatForInjection(globalContext);
    }

    return {
      stage: stageNumber,
      globalContext,
      localContext,
      formattedContext
    };
  }

  /**
   * Formats context specifically for Stage 9 prompt generation.
   * Assembles visual style capsule + scene assets (rich) + prior scene end-state
   * into SceneAssetInstanceData[] compatible with promptGenerationService.
   * Includes context size monitoring with truncation for oversized contexts.
   */
  formatPromptGenerationContext(
    globalContext: GlobalContext,
    localContext: LocalContext
  ): {
    sceneAssets: import('./promptGenerationService.js').SceneAssetInstanceData[];
    styleCapsule: StyleCapsule | null;
  } {
    const styleCapsule = globalContext.visualStyleCapsule ?? null;

    // Convert LocalContextSceneAsset[] → SceneAssetInstanceData[] for prompt generation
    const sceneAssets = (localContext.sceneAssets || []).map((la) => ({
      id: '',
      project_asset: {
        id: '',
        name: la.name,
        asset_type: la.type as 'character' | 'prop' | 'location',
        description: la.description,
        image_key_url: la.masterImageUrl,
      },
      effective_description: la.description,
      status_tags: la.statusTags,
      image_key_url: la.imageKeyUrl,
      master_image_url: la.masterImageUrl,
      carry_forward: la.carryForward ?? false,
      inherited_from_instance_id: la.inheritedFromInstanceId,
    }));

    // Context size monitoring — warn if combined asset context is very large
    const CONTEXT_TOKEN_WARNING_THRESHOLD = 4000;
    const assetContextStr = sceneAssets.map(a => a.effective_description).join(' ');
    const estimatedTokens = this.estimateContextSize(assetContextStr);
    if (estimatedTokens > CONTEXT_TOKEN_WARNING_THRESHOLD) {
      console.warn(
        `[ContextManager] Prompt generation context is large (~${estimatedTokens} tokens). ` +
        `Truncating lowest-priority asset descriptions. Priority: characters > locations > props.`
      );
      // Truncate props first, then locations, then characters
      const priorityOrder: Array<'character' | 'location' | 'prop'> = ['prop', 'location', 'character'];
      for (const type of priorityOrder) {
        if (this.estimateContextSize(sceneAssets.map(a => a.effective_description).join(' ')) <= CONTEXT_TOKEN_WARNING_THRESHOLD) break;
        const assetsOfType = sceneAssets.filter(a => a.project_asset?.asset_type === type);
        for (const asset of assetsOfType) {
          if (asset.effective_description.length > 200) {
            asset.effective_description = asset.effective_description.substring(0, 197) + '...';
          }
        }
      }
    }

    return { sceneAssets, styleCapsule };
  }

  /**
   * Formats global context for LLM prompt injection
   */
  formatForInjection(globalContext: GlobalContext): string {
    const parts: string[] = [];

    // Add writing style context if available
    if (globalContext.writingStyleCapsule) {
      const styleContext = this.styleCapsuleService.formatWritingStyleInjection(
        globalContext.writingStyleCapsule
      );
      parts.push(`WRITING STYLE GUIDANCE:\n${styleContext}`);
    }

    // Add beat sheet context if available
    if (globalContext.beatSheet) {
      parts.push(`\nNARRATIVE STRUCTURE:\n${this.formatBeatSheet(globalContext.beatSheet)}`);
    }

    // Add master script summary if available
    if (globalContext.masterScriptSummary) {
      parts.push(`\nMASTER SCRIPT SUMMARY:\n${globalContext.masterScriptSummary}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Formats beat sheet for prompt injection
   */
  formatBeatSheet(beats: Beat[]): string {
    return beats
      .map((beat, index) => {
        return `Beat ${beat.order}: ${beat.text}
${beat.rationale ? `Rationale: ${beat.rationale}` : ''}
Estimated screen time: ${beat.estimatedScreenTimeSeconds} seconds`;
      })
      .join('\n\n');
  }

  /**
   * Estimates token count for context
   */
  estimateContextSize(context: any): number {
    const contextString = typeof context === 'string' 
      ? context 
      : JSON.stringify(context);
    return estimateTokenCount(contextString);
  }

  /**
   * Private helper: Fetch project data including params and style capsule IDs
   */
  private async fetchProject(projectId: string, userId: string): Promise<{
    projectParams: ProjectParams;
    activeBranchId: string | null;
  }> {
    // Fetch project data
    const { data: project, error: projectError } = await this.db.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      throw new ContextManagerError('Project not found', 'PROJECT_NOT_FOUND');
    }

    // Fetch the main branch
    const { data: branch, error: branchError } = await this.db.supabase
      .from('branches')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_main', true)
      .single();

    if (branchError || !branch) {
      throw new ContextManagerError('Main branch not found', 'BRANCH_NOT_FOUND');
    }

    // Fetch Stage 1 content for project params
    const { data: stageStates, error: stageError } = await this.db.supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', branch.id)
      .eq('stage_number', 1)
      .order('version', { ascending: false })
      .limit(1);

    const stage1Content = (stageStates && stageStates.length > 0) ? stageStates[0].content : {};
    
    // Extract project params from Stage 1 content (stored in processedInput) or project table
    const stage1ProjectParams = stage1Content.processedInput?.projectParams || {};
    
    const projectParams: ProjectParams = {
      targetLengthMin: project.target_length_min || stage1ProjectParams.targetLengthMin || 180,
      targetLengthMax: project.target_length_max || stage1ProjectParams.targetLengthMax || 300,
      projectType: project.project_type || stage1ProjectParams.projectType || 'narrative',
      contentRating: project.content_rating || stage1ProjectParams.contentRating || 'PG-13',
      genres: project.genre || stage1ProjectParams.genres || [],
      tonalPrecision: project.tonal_precision || stage1ProjectParams.tonalPrecision || '',
      writingStyleCapsuleId: project.writing_style_capsule_id || stage1ProjectParams.writingStyleCapsuleId,
      visualStyleCapsuleId: project.visual_style_capsule_id || stage1ProjectParams.visualStyleCapsuleId
    };

    return { 
      projectParams,
      activeBranchId: project.active_branch_id
    };
  }

  /**
   * Private helper: Fetch beat sheet from Stage 3
   */
  private async fetchBeatSheet(branchId: string): Promise<Beat[] | null> {
    const { data, error } = await this.db.supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', branchId)
      .eq('stage_number', 3)
      .eq('status', 'locked')
      .order('version', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const content = data[0].content;
    return content.beats || null;
  }

  /**
   * Private helper: Fetch master script and generate summary
   */
  private async fetchMasterScriptSummary(branchId: string): Promise<string | null> {
    const { data, error } = await this.db.supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', branchId)
      .eq('stage_number', 4)
      .eq('status', 'locked')
      .order('version', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const content = data[0].content;
    const formattedScript = content.formattedScript || content.formatted_script || '';
    
    // Generate summary: Extract scene headings and first action line
    // This provides a concise overview without overwhelming context
    const lines = formattedScript.split('\n');
    const summaryLines: string[] = [];
    
    let inScene = false;
    let sceneCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Scene heading
      if (trimmedLine.match(/^(INT\.|EXT\.)/i)) {
        summaryLines.push(trimmedLine);
        inScene = true;
        sceneCount++;
        continue;
      }
      
      // First action line after scene heading
      if (inScene && trimmedLine.length > 0 && !trimmedLine.match(/^[A-Z\s]+$/)) {
        summaryLines.push(`  ${trimmedLine.substring(0, 100)}${trimmedLine.length > 100 ? '...' : ''}`);
        inScene = false;
      }
    }
    
    if (summaryLines.length === 0) {
      return null;
    }
    
    return `Master Script Summary (${sceneCount} scenes):\n\n${summaryLines.join('\n')}`;
  }

  /**
   * Format context specifically for treatment generation (Stage 2)
   */
  private formatTreatmentContext(globalContext: GlobalContext): string {
    const parts: string[] = [];

    if (globalContext.writingStyleCapsule) {
      parts.push(this.styleCapsuleService.formatWritingStyleInjection(
        globalContext.writingStyleCapsule
      ));
    }

    return parts.join('\n\n');
  }

  /**
   * Format context specifically for beat sheet generation (Stage 3)
   */
  private formatBeatSheetContext(globalContext: GlobalContext): string {
    const parts: string[] = [];

    if (globalContext.writingStyleCapsule) {
      parts.push(this.styleCapsuleService.formatWritingStyleInjection(
        globalContext.writingStyleCapsule
      ));
    }

    return parts.join('\n\n');
  }

  /**
   * Format context specifically for script generation (Stage 4)
   */
  private formatScriptContext(globalContext: GlobalContext): string {
    const parts: string[] = [];

    if (globalContext.writingStyleCapsule) {
      parts.push(this.styleCapsuleService.formatWritingStyleInjection(
        globalContext.writingStyleCapsule
      ));
    }

    if (globalContext.beatSheet) {
      parts.push(`Beat Sheet Reference:\n${this.formatBeatSheet(globalContext.beatSheet)}`);
    }

    return parts.join('\n\n');
  }
}

