import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET /api/projects - List all projects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get projects with their active branch information
    const { data: projects, error } = await supabase
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
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    // Transform the data to match the frontend Project interface
    const transformedProjects = projects.map(project => ({
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const, // We'll derive this from stage states later
      branch: project.branches?.[0]?.name || 'main',
      currentStage: 1, // We'll calculate this from stage states later
      stages: [], // We'll populate this from stage states later
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      projectType: project.project_type,
      contentRating: project.content_rating,
      genres: project.genre || [],
      targetLength: {
        min: project.target_length_min,
        max: project.target_length_max
      }
    }));

    res.json(transformedProjects);
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id - Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { data: project, error } = await supabase
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
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      console.error('Error fetching project:', error);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    // Transform the data
    const transformedProject = {
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const,
      branch: project.branches?.[0]?.name || 'main',
      currentStage: 1,
      stages: [],
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      projectType: project.project_type,
      contentRating: project.content_rating,
      genres: project.genre || [],
      targetLength: {
        min: project.target_length_min,
        max: project.target_length_max
      }
    };

    res.json(transformedProject);
  } catch (error) {
    console.error('Error in GET /api/projects/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const { title } = req.body;

    console.log('🔄 Creating project:', { title, userId });

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: 'Title must be less than 255 characters' });
    }

    // Create the project with minimal data - Stage 1 will handle the rest
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title,
        // Use defaults for Stage 1 configuration - these will be overridden by Stage 1 data
        project_type: 'narrative',
        content_rating: 'PG',
        genre: [],
        tonal_precision: '',
        target_length_min: 180,
        target_length_max: 300
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
      console.error('❌ Error creating project:', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }

    console.log('✅ Project created successfully:', project.id);

    // Transform the response
    const transformedProject = {
      id: project.id,
      title: project.title,
      description: project.tonal_precision || '',
      status: 'draft' as const,
      branch: project.branches?.[0]?.name || 'main',
      currentStage: 1,
      stages: [],
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      projectType: project.project_type,
      contentRating: project.content_rating,
      genres: project.genre || [],
      targetLength: {
        min: project.target_length_min,
        max: project.target_length_max
      }
    };

    res.status(201).json(transformedProject);
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as projectsRouter };
