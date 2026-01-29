/**
 * Continuity Risk Analyzer Service
 * 
 * Rule-based continuity risk analysis for scenes (not LLM-powered).
 * Evaluates continuity risk based on:
 * - Prior scene completion status
 * - Upstream artifact changes (Stages 1-4)
 * - Scene status flags
 * 
 * Used in Stage 6 (Script Hub) to provide advisory warnings to users.
 */

export type ContinuityRisk = 'safe' | 'risky' | 'broken';

/**
 * Scene data structure as stored in database
 */
export interface SceneData {
  id: string;
  scene_number: number;
  slug: string;
  status: 'draft' | 'shot_list_ready' | 'frames_locked' | 'video_complete' | 'outdated' | 'continuity_broken';
  updated_at: string; // ISO timestamp
}

/**
 * Stage state data structure as stored in database
 */
export interface StageStateData {
  id: string;
  branch_id: string;
  stage_number: number;
  version: number;
  status: 'draft' | 'locked' | 'invalidated' | 'outdated';
  created_at: string; // ISO timestamp
}

/**
 * Input for continuity risk analysis
 */
export interface ContinuityAnalysisInput {
  scene: SceneData;
  priorScene: SceneData | null;
  upstreamStageStates: StageStateData[]; // Stage 1-4 states (latest versions)
}

/**
 * Analyze continuity risk for a scene based on rule-based logic
 * 
 * Rules:
 * 1. If no prior scene (Scene 1), always safe
 * 2. If prior scene status is not 'video_complete', mark as 'risky'
 * 3. If upstream artifacts (Stage 1-4) changed since scene was last modified, mark as 'broken'
 * 4. If scene status is 'continuity_broken' or 'outdated', mark as 'broken'
 * 
 * @param input - Analysis input containing scene, prior scene, and upstream stage states
 * @returns Continuity risk level
 */
export function analyzeContinuityRisk(input: ContinuityAnalysisInput): ContinuityRisk {
  const { scene, priorScene, upstreamStageStates } = input;

  // Rule 1: If no prior scene (Scene 1), always safe
  if (!priorScene) {
    return 'safe';
  }

  // Rule 2: If prior scene status is not 'video_complete', mark as 'risky'
  if (priorScene.status !== 'video_complete') {
    return 'risky';
  }

  // Rule 3: Check if upstream artifacts (Stage 1-4) changed since scene was last modified
  // Compare scene.updated_at with max(stage_states.created_at) for stages 1-4
  if (upstreamArtifactsChangedSinceSceneModified(scene, upstreamStageStates)) {
    return 'broken';
  }

  // Rule 4: If scene status is 'continuity_broken' or 'outdated', mark as 'broken'
  if (scene.status === 'continuity_broken' || scene.status === 'outdated') {
    return 'broken';
  }

  return 'safe';
}

/**
 * Check if upstream artifacts (Stages 1-4) have changed since the scene was last modified
 * 
 * Logic:
 * - Filter stage states to only stages 1-4
 * - Find the maximum created_at timestamp among those stages
 * - Compare with scene.updated_at
 * - Return true if any stage 1-4 was created after the scene was last updated
 * 
 * @param scene - The scene to check
 * @param upstreamStageStates - All stage states (should be filtered to latest versions of stages 1-4)
 * @returns true if upstream artifacts changed, false otherwise
 */
function upstreamArtifactsChangedSinceSceneModified(
  scene: SceneData,
  upstreamStageStates: StageStateData[]
): boolean {
  // Filter to only stages 1-4
  const stages1to4 = upstreamStageStates.filter(
    state => state.stage_number >= 1 && state.stage_number <= 4
  );

  // If no stages 1-4 exist, assume no change (safe)
  if (stages1to4.length === 0) {
    return false;
  }

  // Find the maximum created_at timestamp among stages 1-4
  const maxStageCreatedAt = stages1to4.reduce((max, state) => {
    const stateCreatedAt = new Date(state.created_at).getTime();
    const maxTime = new Date(max).getTime();
    return stateCreatedAt > maxTime ? state.created_at : max;
  }, stages1to4[0].created_at);

  // Compare with scene.updated_at
  const sceneUpdatedAt = new Date(scene.updated_at).getTime();
  const maxStageTime = new Date(maxStageCreatedAt).getTime();

  // If any stage 1-4 was created after the scene was last updated, artifacts changed
  return maxStageTime > sceneUpdatedAt;
}

/**
 * Continuity Risk Analyzer Service class
 * Provides a service interface for continuity risk analysis
 */
export class ContinuityRiskAnalyzer {
  /**
   * Analyze continuity risk for a scene
   * 
   * @param input - Analysis input
   * @returns Continuity risk level
   */
  analyzeContinuityRisk(input: ContinuityAnalysisInput): ContinuityRisk {
    return analyzeContinuityRisk(input);
  }
}

// Export singleton instance
export const continuityRiskAnalyzer = new ContinuityRiskAnalyzer();
