// src/db/client.ts - This file should set up your Supabase client
import { createClient } from '@supabase/supabase-js'; // Make sure you have @supabase/supabase-js installed

// Load environment variables (useful for local development, though CI/CD injects them)
import 'dotenv/config'; 

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.https://nwadzhjjulybxzvaccnk.supabase.co;
const supabaseKey = process.env.SUPABASE_KEY;

// Basic check to ensure credentials exist
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables (SUPABASE_URL, SUPABASE_KEY)');
}

// Initialize and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase Client initialized."); // Optional: for debugging



