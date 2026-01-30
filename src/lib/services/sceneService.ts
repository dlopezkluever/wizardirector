import { supabase } from '@/lib/supabase';
import { scriptService, type Scene as ExtractedScene } from './scriptService';
import type { Scene, SceneStatus } from '@/types/scene';

class SceneService {
  /**
   * Fetch all scenes for a project's active branch
   */
  async fetchScenes(projectId: string): Promise<Scene[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log(`📋 [SCENE SERVICE] Fetching scenes for project ${projectId}...`);

    const response = await fetch(`/api/projects/${projectId}/scenes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch scenes');
    }

    const result = await response.json();
    console.log(`✅ [SCENE SERVICE] Successfully fetched ${result.scenes?.length || 0} scenes`);

    // Transform API response to Scene[] format
    // The API already provides header and openingAction, but we ensure all fields are present
    return (result.scenes || []).map((scene: any): Scene => ({
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      slug: scene.slug,
      status: scene.status as SceneStatus,
      scriptExcerpt: scene.scriptExcerpt || '',
      header: scene.header || '',
      openingAction: scene.openingAction || '',
      expectedCharacters: scene.expectedCharacters || [], // Keep fallback for safety
      expectedLocation: scene.expectedLocation || '',     // Keep fallback for safety
      expectedProps: scene.expectedProps || [],           // Keep fallback for safety
      shots: scene.shots || [],
      priorSceneEndState: scene.priorSceneEndState,
      endFrameThumbnail: scene.endFrameThumbnail ?? (scene as any).end_frame_thumbnail_url,
      continuityRisk: scene.continuityRisk || 'safe'      // Add safe fallback
    }));
  }

  /**
   * Get a single scene by ID
   */
  async getScene(sceneId: string): Promise<Scene> {
    // For now, we'll need to fetch all scenes and find the one we need
    // In the future, we could add a GET /api/scenes/:id endpoint
    // For now, this is a placeholder that would require projectId
    throw new Error('getScene requires projectId. Use fetchScenes and filter by id instead.');
  }

  /**
   * Update a scene's status
   */
  async updateSceneStatus(sceneId: string, status: SceneStatus): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log(`🔄 [SCENE SERVICE] Updating scene ${sceneId} status to ${status}...`);

    // Note: This endpoint doesn't exist yet - would need to be created
    // For now, this is a placeholder for future implementation
    const response = await fetch(`/api/scenes/${sceneId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update scene status');
    }

    console.log(`✅ [SCENE SERVICE] Successfully updated scene ${sceneId} status`);
  }

  /**
   * Preview scenes from a script without persisting to database
   * Used in Stage 4 for draft/preview phase
   */
  async previewScenes(script: string): Promise<Scene[]> {
    console.log('👁️ [SCENE SERVICE] Previewing scenes from script (in-memory only)...');

    // Use scriptService.extractScenes() to extract scenes in-memory
    const extractedScenes = scriptService.extractScenes(script);

    // Transform extracted scenes to Scene[] format
    // Extract header and openingAction from content
    return extractedScenes.map((extractedScene: ExtractedScene): Scene => {
      const content = extractedScene.content || '';
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      // First line is the header (scene heading)
      const header = lines.length > 0 ? lines[0].trim() : extractedScene.heading || '';
      
      // Remaining lines are the opening action (first few lines after header)
      const openingActionLines = lines.slice(1, Math.min(6, lines.length));
      const openingAction = openingActionLines.join('\n').trim();

      return {
        id: extractedScene.id,
        sceneNumber: extractedScene.sceneNumber,
        slug: extractedScene.slug,
        status: 'draft' as SceneStatus,
        scriptExcerpt: content,
        header: header,
        openingAction: openingAction,
        expectedCharacters: [], // Future enhancement
        expectedLocation: '', // Future enhancement
        expectedProps: [], // Future enhancement
        shots: []
      };
    });
  }
}

export const sceneService = new SceneService();

