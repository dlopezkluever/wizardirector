import { supabase } from './supabase.js';

export class DatabaseService {
  public supabase = supabase;
  static async testConnection(): Promise<boolean> {
    try {
      // Try to get a simple response from Supabase
      const { data, error } = await supabase
        .from('projects')
        .select('count')
        .limit(1);

      // If the error is just that the table doesn't exist, that's OK for migration
      if (error && error.code === 'PGRST205') {
        console.log('✅ Database connection successful (tables not yet created)');
        return true;
      }

      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      return false;
    }
  }

  static async runMigration(migrationPath: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec', { query: statement });

          if (error) {
            // If rpc 'exec' doesn't work, try direct SQL execution
            console.log(`Trying direct execution for: ${statement.substring(0, 50)}...`);
            // For now, we'll need to run this in the Supabase SQL editor
            throw new Error(`Migration failed: Supabase doesn't support direct SQL execution via API. Please run the migration SQL in your Supabase SQL Editor: ${statement.substring(0, 100)}...`);
          }
        }
      }

      console.log(`✅ Migration executed successfully: ${path.basename(migrationPath)}`);
    } catch (error) {
      console.error('Migration execution failed:', error);
      throw error;
    }
  }

  /**
   * Update stage state with LangSmith trace ID
   */
  async updateStageStateTraceId(stageStateId: string, traceId: string): Promise<void> {
    const { error } = await supabase
      .from('stage_states')
      .update({ langsmith_trace_id: traceId })
      .eq('id', stageStateId);

    if (error) {
      throw new Error(`Failed to update stage state trace ID: ${error.message}`);
    }
  }

  /**
   * Create stage state with trace ID
   */
  async createStageState(stageState: {
    branch_id: string;
    stage_number: number;
    content: any;
    prompt_template_version?: string;
    final_prompt?: string;
    langsmith_trace_id?: string;
    regeneration_guidance?: string;
    created_by?: string;
  }): Promise<string> {
    const { data, error } = await supabase
      .from('stage_states')
      .insert(stageState)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create stage state: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Get stage states by trace ID for debugging
   */
  async getStageStatesByTraceId(traceId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('stage_states')
      .select('*')
      .eq('langsmith_trace_id', traceId);

    if (error) {
      throw new Error(`Failed to get stage states by trace ID: ${error.message}`);
    }

    return data || [];
  }
}
