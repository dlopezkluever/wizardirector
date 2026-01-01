import { supabase } from './supabase.js';

export class DatabaseService {
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
}
