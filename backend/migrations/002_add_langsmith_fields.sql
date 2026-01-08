-- Migration 002: Add LangSmith observability and prompt template system
-- This migration adds LangSmith trace tracking and a comprehensive prompt template system

-- Add LangSmith observability field to stage_states
ALTER TABLE stage_states 
ADD COLUMN langsmith_trace_id TEXT;

-- Create index for LangSmith trace lookups
CREATE INDEX idx_stage_states_langsmith_trace ON stage_states(langsmith_trace_id);

-- Prompt templates for versioned, reusable prompts
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., "treatment_expansion_v1"
    stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 12),
    version TEXT NOT NULL, -- semantic versioning e.g., "1.0.0"
    
    -- Template content
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL, -- with {variable} placeholders
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(name, version)
);

-- Indexes for prompt templates
CREATE INDEX idx_prompt_templates_stage ON prompt_templates(stage_number);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX idx_prompt_templates_name ON prompt_templates(name);

-- Row Level Security for prompt_templates
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Users can view all active prompt templates (they're shared resources)
CREATE POLICY "Users can view active prompt templates" ON prompt_templates
    FOR SELECT USING (is_active = TRUE);

-- Only authenticated users can create prompt templates
CREATE POLICY "Authenticated users can create prompt templates" ON prompt_templates
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only update their own prompt templates
CREATE POLICY "Users can update own prompt templates" ON prompt_templates
    FOR UPDATE USING (created_by = auth.uid());

-- Users can only delete their own prompt templates
CREATE POLICY "Users can delete own prompt templates" ON prompt_templates
    FOR DELETE USING (created_by = auth.uid());
