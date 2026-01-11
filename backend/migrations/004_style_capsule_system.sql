-- Migration 004: Style Capsule System
-- This migration replaces the RAG system with explicit Style Capsules for both writing and visual styles
-- Assumes no production data exists (clean migration strategy)

-- Step 1: Remove RAG references from projects table
ALTER TABLE projects
DROP COLUMN IF EXISTS written_style_rag_id,
DROP COLUMN IF EXISTS visual_style_rag_id;

-- Step 2: Create style_capsule_libraries table
CREATE TABLE style_capsule_libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_preset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create style_capsules table
CREATE TABLE style_capsules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID REFERENCES style_capsule_libraries(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('writing', 'visual')),

    -- Writing Style Fields
    example_text_excerpts TEXT[],
    style_labels TEXT[],
    negative_constraints TEXT[],
    freeform_notes TEXT,

    -- Visual Style Fields
    design_pillars JSONB,
    reference_image_urls TEXT[],
    descriptor_strings TEXT,

    -- Metadata
    is_preset BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(library_id, name)
);

-- Step 4: Create style_capsule_applications table (audit logging)
CREATE TABLE style_capsule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_state_id UUID REFERENCES stage_states(id) ON DELETE CASCADE,
    style_capsule_id UUID REFERENCES style_capsules(id),

    applied_at TIMESTAMPTZ DEFAULT NOW(),
    injection_context JSONB
);

-- Step 5: Update projects table with new Style Capsule references
ALTER TABLE projects
ADD COLUMN writing_style_capsule_id UUID REFERENCES style_capsules(id),
ADD COLUMN visual_style_capsule_id UUID REFERENCES style_capsules(id);

-- Step 6: Create indexes for performance
CREATE INDEX idx_style_capsule_libraries_user ON style_capsule_libraries(user_id);
CREATE INDEX idx_style_capsule_libraries_preset ON style_capsule_libraries(is_preset);
CREATE INDEX idx_style_capsules_library ON style_capsules(library_id);
CREATE INDEX idx_style_capsules_user ON style_capsules(user_id);
CREATE INDEX idx_style_capsules_type ON style_capsules(type);
CREATE INDEX idx_style_capsules_preset ON style_capsules(is_preset);
CREATE INDEX idx_style_capsules_favorite ON style_capsules(is_favorite);
CREATE INDEX idx_style_capsule_applications_stage ON style_capsule_applications(stage_state_id);
CREATE INDEX idx_style_capsule_applications_capsule ON style_capsule_applications(style_capsule_id);

-- Step 7: Setup Row Level Security (RLS) policies

-- Enable RLS on all new tables
ALTER TABLE style_capsule_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_capsule_applications ENABLE ROW LEVEL SECURITY;

-- Style Capsule Libraries: Users can view their own libraries and preset libraries
CREATE POLICY "Users can view own libraries and presets" ON style_capsule_libraries
    FOR SELECT USING (
        auth.uid() = user_id OR is_preset = TRUE
    );

CREATE POLICY "Users can insert own libraries" ON style_capsule_libraries
    FOR INSERT WITH CHECK (auth.uid() = user_id AND is_preset = FALSE);

CREATE POLICY "Users can update own libraries" ON style_capsule_libraries
    FOR UPDATE USING (auth.uid() = user_id AND is_preset = FALSE);

CREATE POLICY "Users can delete own libraries" ON style_capsule_libraries
    FOR DELETE USING (auth.uid() = user_id AND is_preset = FALSE);

-- Style Capsules: Users can view their own capsules, capsules from their libraries, and preset capsules
CREATE POLICY "Users can view own capsules and presets" ON style_capsules
    FOR SELECT USING (
        auth.uid() = user_id OR is_preset = TRUE OR
        EXISTS (
            SELECT 1 FROM style_capsule_libraries
            WHERE style_capsule_libraries.id = style_capsules.library_id
            AND (style_capsule_libraries.user_id = auth.uid() OR style_capsule_libraries.is_preset = TRUE)
        )
    );

CREATE POLICY "Users can insert own capsules" ON style_capsules
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND is_preset = FALSE AND
        EXISTS (
            SELECT 1 FROM style_capsule_libraries
            WHERE style_capsule_libraries.id = style_capsules.library_id
            AND style_capsule_libraries.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own capsules" ON style_capsules
    FOR UPDATE USING (
        auth.uid() = user_id AND is_preset = FALSE AND
        EXISTS (
            SELECT 1 FROM style_capsule_libraries
            WHERE style_capsule_libraries.id = style_capsules.library_id
            AND style_capsule_libraries.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own capsules" ON style_capsules
    FOR DELETE USING (
        auth.uid() = user_id AND is_preset = FALSE AND
        EXISTS (
            SELECT 1 FROM style_capsule_libraries
            WHERE style_capsule_libraries.id = style_capsules.library_id
            AND style_capsule_libraries.user_id = auth.uid()
        )
    );

-- Style Capsule Applications: Users can view applications for their own stage states
CREATE POLICY "Users can view own capsule applications" ON style_capsule_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stage_states ss
            JOIN branches b ON b.id = ss.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE ss.id = style_capsule_applications.stage_state_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can insert capsule applications" ON style_capsule_applications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM stage_states ss
            JOIN branches b ON b.id = ss.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE ss.id = style_capsule_applications.stage_state_id
            AND p.user_id = auth.uid()
        )
    );

-- Update projects table to include Style Capsule references in RLS
-- (The existing projects RLS policies remain unchanged, but now allow access to style capsule columns)

-- Step 8: Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_style_capsule_libraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_style_capsules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create triggers for updated_at
CREATE TRIGGER style_capsule_libraries_updated_at
    BEFORE UPDATE ON style_capsule_libraries
    FOR EACH ROW
    EXECUTE FUNCTION update_style_capsule_libraries_updated_at();

CREATE TRIGGER style_capsules_updated_at
    BEFORE UPDATE ON style_capsules
    FOR EACH ROW
    EXECUTE FUNCTION update_style_capsules_updated_at();
