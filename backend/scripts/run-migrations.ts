#!/usr/bin/env tsx

import { DatabaseService } from '../src/config/database.js';
import { readdirSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  console.log('🚀 Running database migrations...');

  try {
    // Test connection first
    const connected = await DatabaseService.testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Get all migration files
    const migrationsDir = join(process.cwd(), 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const migrationFile of migrationFiles) {
      const migrationPath = join(migrationsDir, migrationFile);
      console.log(`Running migration: ${migrationFile}`);
      await DatabaseService.runMigration(migrationPath);
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
}

runMigrations();
