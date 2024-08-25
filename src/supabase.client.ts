import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config(); // Ensure .env is loaded

export const supabaseClient: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);
