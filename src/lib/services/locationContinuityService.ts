import { supabase } from '@/lib/supabase';
import type { Shot } from '@/types/scene';
import type {
  LocationCoverageResponse,
  GenerationContinuityPackage,
  ShotContinuityPreview,
} from '@/types/locationContinuity';

export interface ContinuityPreviewResponse {
  packages: GenerationContinuityPackage[];
  previews: ShotContinuityPreview[];
  sceneNumber: number;
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  return session.access_token;
}

async function parseError(response: Response, fallback: string): Promise<Error> {
  const errorBody = await response.json().catch(() => ({}));
  return new Error(errorBody.error || fallback);
}

class LocationContinuityService {
  async fetchCoverage(
    projectId: string,
    sceneId: string,
    mode: 'basic' | 'advanced' = 'basic'
  ): Promise<LocationCoverageResponse> {
    const token = await getAccessToken();
    const params = new URLSearchParams({ mode });
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/location-coverage?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw await parseError(response, 'Failed to fetch location coverage');
    }

    return response.json();
  }

  async assignCameraDirection(
    projectId: string,
    sceneId: string,
    shotId: string,
    cameraDirectionId: string | null
  ): Promise<Shot> {
    const token = await getAccessToken();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/camera-direction`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          cameraDirectionId
            ? { cameraDirectionId }
            : { clear: true }
        ),
      }
    );

    if (!response.ok) {
      throw await parseError(response, 'Failed to assign camera direction');
    }

    const result = await response.json();
    if (!result.shot) throw new Error('Camera direction response missing shot');
    return result.shot as Shot;
  }

  async fetchContinuityPreview(
    projectId: string,
    sceneId: string
  ): Promise<ContinuityPreviewResponse> {
    const token = await getAccessToken();
    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/continuity-preview`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw await parseError(response, 'Failed to fetch continuity preview');
    }

    return response.json();
  }
}

export const locationContinuityService = new LocationContinuityService();
