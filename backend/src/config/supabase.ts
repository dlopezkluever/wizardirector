import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables if not already loaded
if (!process.env.SUPABASE_URL) {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export the URL and anon key for client-side usage
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: process.env.SUPABASE_ANON_KEY!
};
