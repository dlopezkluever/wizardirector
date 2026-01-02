-- Initial schema for Phase 0: Basic data persistence
-- Simplified version focusing on core functionality

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stage 1 Configuration (immutable once Stage 2 begins)
    title TEXT NOT NULL,
    target_length_min INTEGER NOT NULL DEFAULT 180, -- seconds (3 minutes)
    target_length_max INTEGER NOT NULL DEFAULT 300, -- seconds (5 minutes)
    project_type TEXT NOT NULL DEFAULT 'narrative' CHECK (project_type IN ('narrative', 'commercial', 'audio_visual')),
    content_rating TEXT NOT NULL DEFAULT 'PG' CHECK (content_rating IN ('G', 'PG', 'PG-13', 'M')),
    genre TEXT[] DEFAULT '{}', -- array of selected genres
    tonal_precision TEXT DEFAULT '', -- user's custom tone guidance

    -- RAG Configuration (optional)
    written_style_rag_id UUID, -- FK to be added later when RAG tables exist
    visual_style_rag_id UUID, -- FK to be added later when RAG tables exist

    -- Metadata
    active_branch_id UUID, -- FK to be added after branches table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches table (Git-style versioning)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Branch Identity
    name TEXT NOT NULL,
    parent_branch_id UUID REFERENCES branches(id), -- NULL for initial "Main" branch

    -- Branch Metadata
    commit_message TEXT DEFAULT '',
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, name)
);

-- Add FK back to projects for active branch
ALTER TABLE projects
ADD CONSTRAINT fk_active_branch
FOREIGN KEY (active_branch_id) REFERENCES branches(id);

-- Stage states table (versioned pipeline state)
CREATE TABLE stage_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 12),

    -- State Identity
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'invalidated', 'outdated')),

    -- Inheritance Tracking (simplified for Phase 0)
    inherited_from_stage_id UUID REFERENCES stage_states(id),

    -- Content Storage (stage-specific data)
    content JSONB NOT NULL DEFAULT '{}',

    -- Prompt Engineering (placeholders for Phase 0)
    prompt_template_version TEXT DEFAULT '',
    final_prompt TEXT DEFAULT '',

    -- Regeneration Context
    regeneration_guidance TEXT DEFAULT '',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(branch_id, stage_number, version)
);

-- Indexes for performance
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_active_branch ON projects(active_branch_id);
CREATE INDEX idx_branches_project ON branches(project_id);
CREATE INDEX idx_branches_parent ON branches(parent_branch_id);
CREATE INDEX idx_stage_states_branch ON stage_states(branch_id);
CREATE INDEX idx_stage_states_stage ON stage_states(stage_number);
CREATE INDEX idx_stage_states_status ON stage_states(status);
CREATE INDEX idx_stage_states_inherited ON stage_states(inherited_from_stage_id);

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_states ENABLE ROW LEVEL SECURITY;

-- Projects: Users can only see their own projects
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Branches: Users can only access branches of their projects
CREATE POLICY "Users can view own project branches" ON branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = branches.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project branches" ON branches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = branches.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project branches" ON branches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = branches.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Stage States: Users can only access stage states of their project branches
CREATE POLICY "Users can view own project stage states" ON stage_states
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = stage_states.branch_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project stage states" ON stage_states
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = stage_states.branch_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project stage states" ON stage_states
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = stage_states.branch_id
            AND p.user_id = auth.uid()
        )
    );

-- Function to create initial "Main" branch when project is created
CREATE OR REPLACE FUNCTION create_initial_branch()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO branches (project_id, name, is_main)
    VALUES (NEW.id, 'Main', TRUE);

    -- Set the active branch to the newly created Main branch
    UPDATE projects SET active_branch_id = (
        SELECT id FROM branches WHERE project_id = NEW.id AND is_main = TRUE
    ) WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create Main branch for new projects
CREATE TRIGGER on_project_created
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION create_initial_branch();
