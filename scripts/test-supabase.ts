// scripts/test-supabase.ts

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const { data, error } = await supabase.from('posts').select('*').limit(1);
  
  if (error) {
    console.error('❌ Supabase error:', error.message);
  } else {
    console.log('✅ Supabase connection successful. Sample data:', data);
  }
}

testConnection();
