/**
 * Prompt Template Service
 * Manages versioned, database-stored prompt templates with variable interpolation
 */

import { DatabaseService } from '../config/database.js';

export interface PromptTemplate {
  id: string;
  name: string;
  stage_number: number;
  version: string;
  system_prompt: string;
  user_prompt_template: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  created_by?: string;
}

export interface PromptTemplateCreate {
  name: string;
  stage_number: number;
  version: string;
  system_prompt: string;
  user_prompt_template: string;
  description?: string;
  is_active?: boolean;
}

export interface PromptTemplateUpdate {
  system_prompt?: string;
  user_prompt_template?: string;
  description?: string;
  is_active?: boolean;
}

export interface InterpolatedPrompt {
  system_prompt: string;
  user_prompt: string;
  template: PromptTemplate;
  variables_used: string[];
}

export class PromptTemplateError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PromptTemplateError';
  }
}

export class PromptTemplateService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Create a new prompt template
   */
  async createTemplate(
    template: PromptTemplateCreate,
    userId?: string
  ): Promise<PromptTemplate> {
    try {
      const { data, error } = await this.db.supabase
        .from('prompt_templates')
        .insert({
          ...template,
          created_by: userId,
          is_active: template.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        throw new PromptTemplateError(`Failed to create template: ${error.message}`, 'CREATE_ERROR');
      }

      return this.mapDbRowToTemplate(data);
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error creating template: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Get a specific prompt template by ID
   */
  async getTemplate(id: string): Promise<PromptTemplate | null> {
    try {
      const { data, error } = await this.db.supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new PromptTemplateError(`Failed to get template: ${error.message}`, 'GET_ERROR');
      }

      return this.mapDbRowToTemplate(data);
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error getting template: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Get the active template for a specific stage
   */
  async getActiveTemplateForStage(stageNumber: number, name?: string): Promise<PromptTemplate | null> {
    try {
      let query = this.db.supabase
        .from('prompt_templates')
        .select('*')
        .eq('stage_number', stageNumber)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (name) {
        query = query.eq('name', name);
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new PromptTemplateError(`Failed to get active template: ${error.message}`, 'GET_ERROR');
      }

      return this.mapDbRowToTemplate(data);
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error getting active template: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * List all templates with optional filtering
   */
  async listTemplates(options?: {
    stageNumber?: number;
    activeOnly?: boolean;
    name?: string;
    limit?: number;
    offset?: number;
  }): Promise<PromptTemplate[]> {
    try {
      let query = this.db.supabase
        .from('prompt_templates')
        .select('*')
        .order('stage_number', { ascending: true })
        .order('name', { ascending: true })
        .order('created_at', { ascending: false });

      if (options?.stageNumber) {
        query = query.eq('stage_number', options.stageNumber);
      }

      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }

      if (options?.name) {
        query = query.eq('name', options.name);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new PromptTemplateError(`Failed to list templates: ${error.message}`, 'LIST_ERROR');
      }

      return data.map(row => this.mapDbRowToTemplate(row));
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error listing templates: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Update a prompt template
   */
  async updateTemplate(
    id: string,
    updates: PromptTemplateUpdate,
    userId?: string
  ): Promise<PromptTemplate> {
    try {
      // First check if the template exists and user has permission
      const existing = await this.getTemplate(id);
      if (!existing) {
        throw new PromptTemplateError('Template not found', 'NOT_FOUND');
      }

      if (userId && existing.created_by && existing.created_by !== userId) {
        throw new PromptTemplateError('Permission denied', 'PERMISSION_DENIED');
      }

      const { data, error } = await this.db.supabase
        .from('prompt_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new PromptTemplateError(`Failed to update template: ${error.message}`, 'UPDATE_ERROR');
      }

      return this.mapDbRowToTemplate(data);
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error updating template: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Delete a prompt template
   */
  async deleteTemplate(id: string, userId?: string): Promise<void> {
    try {
      // First check if the template exists and user has permission
      const existing = await this.getTemplate(id);
      if (!existing) {
        throw new PromptTemplateError('Template not found', 'NOT_FOUND');
      }

      if (userId && existing.created_by && existing.created_by !== userId) {
        throw new PromptTemplateError('Permission denied', 'PERMISSION_DENIED');
      }

      const { error } = await this.db.supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) {
        throw new PromptTemplateError(`Failed to delete template: ${error.message}`, 'DELETE_ERROR');
      }
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error deleting template: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Interpolate variables in a prompt template
   */
  interpolateTemplate(
    template: PromptTemplate,
    variables: Record<string, any>
  ): InterpolatedPrompt {
    const variablesUsed: string[] = [];
    
    // Helper function to replace variables in text
    const interpolateText = (text: string): string => {
      return text.replace(/\{([^}]+)\}/g, (match, variableName) => {
        variablesUsed.push(variableName);
        
        if (variableName in variables) {
          const value = variables[variableName];
          
          // Handle different value types
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
          }
          
          return String(value);
        }
        
        // Variable not found - keep the placeholder or throw error based on preference
        console.warn(`Variable '${variableName}' not found in template interpolation`);
        return match; // Keep the original placeholder
      });
    };

    const system_prompt = interpolateText(template.system_prompt);
    const user_prompt = interpolateText(template.user_prompt_template);

    return {
      system_prompt,
      user_prompt,
      template,
      variables_used: [...new Set(variablesUsed)], // Remove duplicates
    };
  }

  /**
   * Extract variable names from a template
   */
  extractVariables(template: PromptTemplate): string[] {
    const variables = new Set<string>();
    const text = template.system_prompt + ' ' + template.user_prompt_template;
    
    const matches = text.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => {
        const variableName = match.slice(1, -1); // Remove { and }
        variables.add(variableName);
      });
    }
    
    return Array.from(variables);
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(template: PromptTemplate, variables: Record<string, any>): {
    valid: boolean;
    missing: string[];
    extra: string[];
  } {
    const required = this.extractVariables(template);
    const provided = Object.keys(variables);
    
    const missing = required.filter(v => !(v in variables));
    const extra = provided.filter(v => !required.includes(v));
    
    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }

  /**
   * Get template versions for a specific name
   */
  async getTemplateVersions(name: string): Promise<PromptTemplate[]> {
    try {
      const { data, error } = await this.db.supabase
        .from('prompt_templates')
        .select('*')
        .eq('name', name)
        .order('version', { ascending: false });

      if (error) {
        throw new PromptTemplateError(`Failed to get template versions: ${error.message}`, 'GET_ERROR');
      }

      return data.map(row => this.mapDbRowToTemplate(row));
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error getting template versions: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Activate a specific template version (deactivates others with same name)
   */
  async activateTemplate(id: string, userId?: string): Promise<PromptTemplate> {
    try {
      const template = await this.getTemplate(id);
      if (!template) {
        throw new PromptTemplateError('Template not found', 'NOT_FOUND');
      }

      if (userId && template.created_by && template.created_by !== userId) {
        throw new PromptTemplateError('Permission denied', 'PERMISSION_DENIED');
      }

      // Deactivate all other templates with the same name
      await this.db.supabase
        .from('prompt_templates')
        .update({ is_active: false })
        .eq('name', template.name)
        .neq('id', id);

      // Activate this template
      const { data, error } = await this.db.supabase
        .from('prompt_templates')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new PromptTemplateError(`Failed to activate template: ${error.message}`, 'UPDATE_ERROR');
      }

      return this.mapDbRowToTemplate(data);
    } catch (error) {
      if (error instanceof PromptTemplateError) throw error;
      throw new PromptTemplateError(`Unexpected error activating template: ${error}`, 'UNKNOWN_ERROR');
    }
  }

  private mapDbRowToTemplate(row: any): PromptTemplate {
    return {
      id: row.id,
      name: row.name,
      stage_number: row.stage_number,
      version: row.version,
      system_prompt: row.system_prompt,
      user_prompt_template: row.user_prompt_template,
      description: row.description,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      created_by: row.created_by,
    };
  }
}

// Export singleton instance
export const promptTemplateService = new PromptTemplateService();
