// Load environment variables FIRST
import { config } from 'dotenv';
config({ path: './.env' });

// Now import modules that depend on env vars
import { DatabaseService } from './src/config/database.js';

async function testConnection() {
  console.log('🧪 Testing Supabase database connection...');

  try {
    const success = await DatabaseService.testConnection();
    if (success) {
      console.log('✅ Database connection successful!');
      process.exit(0);
    } else {
      console.log('❌ Database connection failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Connection test error:', error);
    process.exit(1);
  }
}

testConnection();
