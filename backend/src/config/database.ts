import { supabase } from './supabase.js';

export class DatabaseService {
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('count')
        .limit(1);

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

      const { error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });

      if (error) {
        throw new Error(`Migration failed: ${error.message}`);
      }

      console.log(`✅ Migration executed successfully: ${path.basename(migrationPath)}`);
    } catch (error) {
      console.error('Migration execution failed:', error);
      throw error;
    }
  }
}
