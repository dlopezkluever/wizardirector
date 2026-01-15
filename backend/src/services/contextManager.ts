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

export interface LocalContext {
  sceneId?: string;
  sceneScript?: string;
  previousSceneEndState?: string;
  sceneAssets?: any[]; // SceneAssetInstance[] - to be defined in Phase B
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
   * Currently returns empty structure - to be implemented in Phase B
   */
  async assembleLocalContext(
    sceneId: string,
    globalContext: GlobalContext
  ): Promise<LocalContext> {
    console.log(`[ContextManager] Assembling local context for scene ${sceneId}`);
    
    // TODO: Phase B implementation
    // - Fetch current scene script from stage_states
    // - Fetch previous scene end state for continuity
    // - Fetch scene asset instances with inherited states
    
    return {
      sceneId
      // Other fields will be populated in Phase B
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
    const result = await this.db.query(
      `SELECT 
        p.*,
        ss.content as stage1_content
      FROM projects p
      LEFT JOIN branches b ON b.project_id = p.id AND b.is_main = TRUE
      LEFT JOIN stage_states ss ON ss.branch_id = b.id AND ss.stage_number = 1
      WHERE p.id = $1 AND p.user_id = $2
      ORDER BY ss.version DESC
      LIMIT 1`,
      [projectId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new ContextManagerError('Project not found', 'PROJECT_NOT_FOUND');
    }

    const project = result.rows[0];
    
    // Extract project params from Stage 1 content or project table
    const stage1Content = project.stage1_content || {};
    const projectParams: ProjectParams = {
      targetLengthMin: project.target_length_min || stage1Content.projectParams?.targetLengthMin || 180,
      targetLengthMax: project.target_length_max || stage1Content.projectParams?.targetLengthMax || 300,
      projectType: project.project_type || stage1Content.projectParams?.projectType || 'narrative',
      contentRating: project.content_rating || stage1Content.projectParams?.contentRating || 'PG-13',
      genres: project.genre || stage1Content.projectParams?.genres || [],
      tonalPrecision: project.tonal_precision || stage1Content.projectParams?.tonalPrecision || '',
      writingStyleCapsuleId: project.writing_style_capsule_id || stage1Content.projectParams?.writingStyleCapsuleId,
      visualStyleCapsuleId: project.visual_style_capsule_id || stage1Content.projectParams?.visualStyleCapsuleId
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
    const result = await this.db.query(
      `SELECT content 
      FROM stage_states 
      WHERE branch_id = $1 AND stage_number = 3 AND status = 'locked'
      ORDER BY version DESC 
      LIMIT 1`,
      [branchId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const content = result.rows[0].content;
    return content.beats || null;
  }

  /**
   * Private helper: Fetch master script and generate summary
   */
  private async fetchMasterScriptSummary(branchId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT content 
      FROM stage_states 
      WHERE branch_id = $1 AND stage_number = 4 AND status = 'locked'
      ORDER BY version DESC 
      LIMIT 1`,
      [branchId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const content = result.rows[0].content;
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

