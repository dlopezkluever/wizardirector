import { describe, it, expect } from '@jest/globals';
import {
  analyzeContinuityRisk,
  ContinuityRiskAnalyzer,
  type ContinuityAnalysisInput,
  type SceneData,
  type StageStateData,
} from '../services/continuityRiskAnalyzer.js';

describe('ContinuityRiskAnalyzer', () => {
  // Helper function to create a scene with default values
  const createScene = (overrides: Partial<SceneData> = {}): SceneData => ({
    id: 'scene-1',
    scene_number: 1,
    slug: 'int-kitchen-day',
    status: 'draft',
    updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    ...overrides,
  });

  // Helper function to create a stage state with default values
  const createStageState = (overrides: Partial<StageStateData> = {}): StageStateData => ({
    id: 'stage-1',
    branch_id: 'branch-1',
    stage_number: 1,
    version: 1,
    status: 'locked',
    created_at: new Date('2024-01-01T09:00:00Z').toISOString(),
    ...overrides,
  });

  describe('Rule 1: No prior scene (Scene 1)', () => {
    it('should return "safe" when there is no prior scene', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({ scene_number: 1 }),
        priorScene: null,
        upstreamStageStates: [],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });

    it('should return "safe" for Scene 1 even with upstream changes', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 1,
          updated_at: new Date('2024-01-01T08:00:00Z').toISOString(),
        }),
        priorScene: null,
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T10:00:00Z').toISOString(), // After scene update
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });
  });

  describe('Rule 2: Prior scene not complete', () => {
    it('should return "risky" when prior scene status is "draft"', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({ scene_number: 2 }),
        priorScene: createScene({
          scene_number: 1,
          status: 'draft',
        }),
        upstreamStageStates: [],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('risky');
    });

    it('should return "risky" when prior scene status is "shot_list_ready"', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({ scene_number: 2 }),
        priorScene: createScene({
          scene_number: 1,
          status: 'shot_list_ready',
        }),
        upstreamStageStates: [],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('risky');
    });

    it('should return "risky" when prior scene status is "frames_locked"', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({ scene_number: 2 }),
        priorScene: createScene({
          scene_number: 1,
          status: 'frames_locked',
        }),
        upstreamStageStates: [],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('risky');
    });

    it('should NOT return "risky" when prior scene status is "video_complete"', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene update
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).not.toBe('risky');
    });
  });

  describe('Rule 3: Upstream artifacts changed', () => {
    it('should return "broken" when stage 1 was updated after scene', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // After scene update
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });

    it('should return "broken" when stage 4 was updated after scene', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 4,
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // After scene update
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });

    it('should return "broken" when multiple stages were updated after scene', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
          createStageState({
            stage_number: 2,
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // After scene
          }),
          createStageState({
            stage_number: 3,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });

    it('should return "safe" when all stages were updated before scene', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
          createStageState({
            stage_number: 2,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
          createStageState({
            stage_number: 3,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
          createStageState({
            stage_number: 4,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });

    it('should ignore stages 5-12 when checking upstream artifacts', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
          createStageState({
            stage_number: 5, // Should be ignored
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // After scene
          }),
          createStageState({
            stage_number: 6, // Should be ignored
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // After scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });

    it('should return "safe" when no stages 1-4 exist', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [], // No stages
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });
  });

  describe('Rule 4: Scene status is broken/outdated', () => {
    it('should return "broken" when scene status is "continuity_broken"', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          status: 'continuity_broken',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });

    it('should return "broken" when scene status is "outdated"', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          status: 'outdated',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });

    it('should return "broken" even when prior scene is complete and no upstream changes', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          status: 'outdated',
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });
  });

  describe('Rule priority and combinations', () => {
    it('should prioritize Rule 2 (risky) over Rule 3 when prior scene is incomplete', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'draft', // Incomplete
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // Would trigger Rule 3
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('risky'); // Rule 2 takes priority
    });

    it('should prioritize Rule 3 (broken) over default safe when upstream changed', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // After scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('broken');
    });

    it('should return "safe" when all conditions are met', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          status: 'draft',
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
          createStageState({
            stage_number: 2,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Before scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });
  });

  describe('ContinuityRiskAnalyzer class', () => {
    it('should work with class instance', () => {
      const analyzer = new ContinuityRiskAnalyzer();
      const input: ContinuityAnalysisInput = {
        scene: createScene({ scene_number: 1 }),
        priorScene: null,
        upstreamStageStates: [],
      };

      const result = analyzer.analyzeContinuityRisk(input);
      expect(result).toBe('safe');
    });

    it('should produce same results as standalone function', () => {
      const analyzer = new ContinuityRiskAnalyzer();
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          status: 'outdated',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [],
      };

      const classResult = analyzer.analyzeContinuityRisk(input);
      const functionResult = analyzeContinuityRisk(input);
      expect(classResult).toBe(functionResult);
      expect(classResult).toBe('broken');
    });
  });

  describe('Edge cases', () => {
    it('should handle exact timestamp matches (stage created_at equals scene updated_at)', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z').toISOString();
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: timestamp,
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            created_at: timestamp, // Exact same time
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      // If timestamps are equal, stage was not created AFTER scene, so should be safe
      expect(result).toBe('safe');
    });

    it('should handle multiple versions of same stage (use latest)', () => {
      const input: ContinuityAnalysisInput = {
        scene: createScene({
          scene_number: 2,
          updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          status: 'draft',
        }),
        priorScene: createScene({
          scene_number: 1,
          status: 'video_complete',
        }),
        upstreamStageStates: [
          createStageState({
            stage_number: 1,
            version: 1,
            created_at: new Date('2024-01-01T09:00:00Z').toISOString(), // Old version
          }),
          createStageState({
            stage_number: 1,
            version: 2,
            created_at: new Date('2024-01-01T11:00:00Z').toISOString(), // New version after scene
          }),
        ],
      };

      const result = analyzeContinuityRisk(input);
      // Should use the latest version (version 2) which was created after scene
      expect(result).toBe('broken');
    });
  });
});
