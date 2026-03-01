/**
 * Shot Asset Assignment Service
 * Frontend API client for per-shot asset assignments with presence_type control.
 */

import { supabase } from '@/lib/supabase';
import type { ShotAssetAssignment, PresenceType } from '@/types/scene';

class ShotAssetAssignmentService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /** List all assignments for a scene (all shots) */
  async listForScene(projectId: string, sceneId: string): Promise<ShotAssetAssignment[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list assignments');
    }

    const result = await response.json();
    return result.assignments;
  }

  /** List assignments for a specific shot */
  async listForShot(projectId: string, sceneId: string, shotId: string): Promise<ShotAssetAssignment[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments/shots/${shotId}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list assignments for shot');
    }

    const result = await response.json();
    return result.assignments;
  }

  /** Create one or more assignments */
  async createAssignments(
    projectId: string,
    sceneId: string,
    assignments: { shotId: string; instanceId: string; presenceType: PresenceType }[]
  ): Promise<ShotAssetAssignment[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ assignments }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create assignments');
    }

    const result = await response.json();
    return result.assignments;
  }

  /** Update presence_type for an existing assignment */
  async updateAssignment(
    projectId: string,
    sceneId: string,
    assignmentId: string,
    presenceType: PresenceType
  ): Promise<ShotAssetAssignment> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments/${assignmentId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ presenceType }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update assignment');
    }

    const result = await response.json();
    return result.assignment;
  }

  /** Delete an assignment (remove asset from shot) */
  async deleteAssignment(projectId: string, sceneId: string, assignmentId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments/${assignmentId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete assignment');
    }
  }

  /** Trigger auto-population for the scene */
  async autoPopulate(projectId: string, sceneId: string): Promise<{ created: number; existing: number }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments/auto-populate`,
      {
        method: 'POST',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to auto-populate assignments');
    }

    return response.json();
  }

  /** Check if a scene has any assignments */
  async hasAssignments(projectId: string, sceneId: string): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shot-assignments/has-assignments`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check assignments');
    }

    const result = await response.json();
    return result.hasAssignments;
  }
}

export const shotAssetAssignmentService = new ShotAssetAssignmentService();
