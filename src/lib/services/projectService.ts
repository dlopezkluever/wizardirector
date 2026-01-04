import { supabase } from '../supabase';
import type { Project, ProjectSettings } from '@/types/project';

class ProjectService {
  // Get all projects for the current user
  async getProjects(): Promise<Project[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Make API call to backend with JWT token
    const response = await fetch('/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch projects');
    }

    const data = await response.json();

    // Transform database data to match frontend Project interface
    return data.map((project: any) => ({
      id: project.id,
      title: project.title,
      description: project.description || '',
      status: project.status || 'draft',
      branch: project.branch || 'main',
      currentStage: project.currentStage || 1,
      stages: project.stages || [],
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      projectType: project.projectType,
      contentRating: project.contentRating,
      genres: project.genres || [],
      targetLength: project.targetLength
    }));
  }

  // Get a specific project by ID
  async getProject(id: string): Promise<Project> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Make API call to backend with JWT token
    const response = await fetch(`/api/projects/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project');
    }

    const project = await response.json();

    // Transform to ensure dates are Date objects
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    };
    const { data, error } = await supabase
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
        created_at,
        updated_at,
        active_branch_id,
        branches!active_branch_id (
          name,
          commit_message
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Project not found');
      }
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }

    return {
      id: data.id,
      title: data.title,
      description: data.tonal_precision || '',
      status: 'draft' as const,
      branch: data.branches?.name || 'main',
      currentStage: 1,
      stages: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      projectType: data.project_type,
      contentRating: data.content_rating,
      genres: data.genre || [],
      targetLength: {
        min: data.target_length_min,
        max: data.target_length_max
      }
    };
  }

  // Create a new project
  async createProject(settings: ProjectSettings): Promise<Project> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log('🔄 ProjectService.createProject called:', settings);

    // Make API call to backend with JWT token - only send title
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: settings.projectTitle || 'New Project'
        // Stage 1 configuration will be handled separately in stage_states
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }

    const project = await response.json();

    // Transform to ensure dates are Date objects
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    };
  }

  // Update project (placeholder for future use)
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    // TODO: Implement update functionality
    throw new Error('Update project not implemented yet');
  }

  // Delete project (placeholder for future use)
  async deleteProject(id: string): Promise<void> {
    // TODO: Implement delete functionality
    throw new Error('Delete project not implemented yet');
  }
}

export const projectService = new ProjectService();
