/**
 * Text Field Version Service
 * Frontend API client for text field version history (frame_prompt, video_prompt, end_frame_prompt, description_override).
 */

import { supabase } from '@/lib/supabase';

export interface TextFieldVersion {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  content: string;
  isSelected: boolean;
  source: 'user_save' | 'ai_generation';
  versionNumber: number;
  createdAt: string;
}

interface ApiTextFieldVersion {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  content: string;
  is_selected: boolean;
  source: 'user_save' | 'ai_generation';
  version_number: number;
  created_at: string;
}

function mapVersion(v: ApiTextFieldVersion): TextFieldVersion {
  return {
    id: v.id,
    entityType: v.entity_type,
    entityId: v.entity_id,
    fieldName: v.field_name,
    content: v.content,
    isSelected: v.is_selected,
    source: v.source,
    versionNumber: v.version_number,
    createdAt: v.created_at,
  };
}

class TextFieldVersionServiceClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  // Shot-based field methods (frame_prompt, video_prompt, end_frame_prompt)

  async listShotFieldVersions(
    projectId: string,
    sceneId: string,
    shotId: string,
    fieldName: string
  ): Promise<TextFieldVersion[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/field-versions/${fieldName}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list versions');
    }

    const { versions } = await response.json();
    return versions.map(mapVersion);
  }

  async createShotFieldVersion(
    projectId: string,
    sceneId: string,
    shotId: string,
    fieldName: string,
    content: string,
    source: 'user_save' | 'ai_generation' = 'user_save'
  ): Promise<TextFieldVersion> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/field-versions/${fieldName}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, source }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create version');
    }

    const { version } = await response.json();
    return mapVersion(version);
  }

  async selectShotFieldVersion(
    projectId: string,
    sceneId: string,
    shotId: string,
    fieldName: string,
    versionId: string
  ): Promise<TextFieldVersion> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/field-versions/${fieldName}/${versionId}/select`,
      { method: 'POST', headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to select version');
    }

    const { version } = await response.json();
    return mapVersion(version);
  }

  // Asset-based field methods (description_override)

  async listAssetFieldVersions(
    projectId: string,
    sceneId: string,
    instanceId: string
  ): Promise<TextFieldVersion[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/field-versions/description_override`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list versions');
    }

    const { versions } = await response.json();
    return versions.map(mapVersion);
  }

  async createAssetFieldVersion(
    projectId: string,
    sceneId: string,
    instanceId: string,
    content: string,
    source: 'user_save' | 'ai_generation' = 'user_save'
  ): Promise<TextFieldVersion> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/field-versions/description_override`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, source }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create version');
    }

    const { version } = await response.json();
    return mapVersion(version);
  }

  async selectAssetFieldVersion(
    projectId: string,
    sceneId: string,
    instanceId: string,
    versionId: string
  ): Promise<TextFieldVersion> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/field-versions/description_override/${versionId}/select`,
      { method: 'POST', headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to select version');
    }

    const { version } = await response.json();
    return mapVersion(version);
  }
}

export const textFieldVersionService = new TextFieldVersionServiceClient();
