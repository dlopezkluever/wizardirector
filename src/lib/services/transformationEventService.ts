/**
 * Transformation Event Service
 * Frontend API client for transformation events (within-scene asset visual changes).
 */

import { supabase } from '@/lib/supabase';
import type { TransformationEvent, TransformationType } from '@/types/scene';

export interface CreateTransformationEventRequest {
  scene_asset_instance_id: string;
  trigger_shot_id: string;
  transformation_type: TransformationType;
  completion_shot_id?: string | null;
  pre_description?: string;
  post_description: string;
  transformation_narrative?: string | null;
  pre_status_tags?: string[];
  post_status_tags?: string[];
  detected_by: 'stage7_extraction' | 'stage8_relevance' | 'manual';
}

export interface UpdateTransformationEventRequest {
  transformation_type?: TransformationType;
  trigger_shot_id?: string;
  completion_shot_id?: string | null;
  pre_description?: string;
  post_description?: string;
  transformation_narrative?: string | null;
  pre_image_key_url?: string | null;
  post_image_key_url?: string | null;
  pre_status_tags?: string[];
  post_status_tags?: string[];
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('User not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export const transformationEventService = {
  async fetchEvents(projectId: string, sceneId: string): Promise<TransformationEvent[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch transformation events');
    return response.json();
  },

  async createEvent(
    projectId: string,
    sceneId: string,
    data: CreateTransformationEventRequest
  ): Promise<TransformationEvent> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events`,
      { method: 'POST', headers, body: JSON.stringify(data) }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create transformation event');
    }
    return response.json();
  },

  async updateEvent(
    projectId: string,
    sceneId: string,
    eventId: string,
    data: UpdateTransformationEventRequest
  ): Promise<TransformationEvent> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events/${eventId}`,
      { method: 'PUT', headers, body: JSON.stringify(data) }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update transformation event');
    }
    return response.json();
  },

  async confirmEvent(
    projectId: string,
    sceneId: string,
    eventId: string
  ): Promise<TransformationEvent> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events/${eventId}/confirm`,
      { method: 'POST', headers }
    );
    if (!response.ok) throw new Error('Failed to confirm transformation event');
    return response.json();
  },

  async deleteEvent(
    projectId: string,
    sceneId: string,
    eventId: string
  ): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events/${eventId}`,
      { method: 'DELETE', headers }
    );
    if (!response.ok) throw new Error('Failed to delete transformation event');
  },

  async generatePostDescription(
    projectId: string,
    sceneId: string,
    eventId: string
  ): Promise<string> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events/${eventId}/generate-post-description`,
      { method: 'POST', headers }
    );
    if (!response.ok) throw new Error('Failed to generate post-description');
    const data = await response.json();
    return data.post_description;
  },

  async generatePostImage(
    projectId: string,
    sceneId: string,
    eventId: string
  ): Promise<string> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/transformation-events/${eventId}/generate-post-image`,
      { method: 'POST', headers }
    );
    if (!response.ok) throw new Error('Failed to generate post-image');
    const data = await response.json();
    return data.post_image_key_url;
  },
};
