import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

async function createTables() {
  console.log('Creating tables via Supabase API...\n');

  // First, let's try creating the themes table
  try {
    const response1 = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS themes (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            theme VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
    });
    
    if (!response1.ok) {
      console.log('Note: Direct SQL execution via API may not be available.');
    }
  } catch (error) {
    console.log('Could not execute SQL directly via API.');
  }

  // Let's try a different approach - create a simple test entry
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Attempting to create tables by inserting test data...\n');
  
  // This will fail if tables don't exist, which is what we're checking
  const testDate = new Date().toISOString().split('T')[0];
  
  const { error: themesError } = await supabase
    .from('themes')
    .insert({ date: testDate, theme: 'test' });
    
  if (themesError?.code === '42P01') {
    console.log('❌ themes table does not exist');
    console.log('\nTo create the tables:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/zspgxtiiebfikrhlxshe');
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Copy and paste the SQL from: scripts/setup-database.sql');
    console.log('4. Click "Run" to execute the SQL');
  } else if (themesError) {
    console.log('Error:', themesError);
  } else {
    console.log('✅ themes table exists!');
    // Clean up test data
    await supabase.from('themes').delete().eq('theme', 'test');
  }
}

createTables().catch(console.error);