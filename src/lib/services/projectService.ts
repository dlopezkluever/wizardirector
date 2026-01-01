import { supabase } from '../supabase';
import type { Project, ProjectSettings } from '@/types/project';

class ProjectService {
  // Get all projects for the current user
  async getProjects(): Promise<Project[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // For now, we'll make a direct Supabase call
    // TODO: Replace with API call when backend auth middleware is ready
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
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }

    // Transform database data to match frontend Project interface
    return data.map(project => ({
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const, // TODO: Calculate from stage states
      branch: project.branches?.name || 'main',
      currentStage: 1, // TODO: Calculate from stage states
      stages: [], // TODO: Populate from stage states
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
      projectType: project.project_type,
      contentRating: project.content_rating,
      genres: project.genre || [],
      targetLength: {
        min: project.target_length_min,
        max: project.target_length_max
      }
    }));
  }

  // Get a specific project by ID
  async getProject(id: string): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Direct Supabase call for now
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: settings.projectTitle || 'New Project', // We'll need to add this to ProjectSettings
        project_type: settings.projectType,
        content_rating: settings.contentRating,
        genre: settings.genres,
        tonal_precision: settings.tonalPrecision,
        target_length_min: settings.targetLength.min,
        target_length_max: settings.targetLength.max
      })
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
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
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
