// src/themes/generator.ts

import { SupabaseClient } from '@supabase/supabase-js';

export interface ThemeResult {
  id: string;
  name: string;
}

export async function generateThemeForToday(db: SupabaseClient, today: string): Promise<ThemeResult> {
  // Step 1: fetch all unused themes
  let { data: themes, error } = await db
    .from('themes')
    .select('*')
    .eq('used', false);

  if (error) throw new Error(`Error fetching themes: ${error.message}`);

  // Step 2: if no unused themes, reset all themes to unused and re-fetch
  if (!themes || themes.length === 0) {
    console.log('All themes used — resetting all to unused.');
    const { error: resetError } = await db
      .from('themes')
      .update({ used: false });

    if (resetError) throw new Error(`Error resetting themes: ${resetError.message}`);

    const { data: resetThemes, error: refetchError } = await db
      .from('themes')
      .select('*')
      .eq('used', false);

    if (refetchError) throw new Error(`Error re-fetching themes: ${refetchError.message}`);
    if (!resetThemes || resetThemes.length === 0) throw new Error('No themes found after reset.');

    themes = resetThemes;
  }

  // Step 3: shuffle themes to randomize order
  shuffleArray(themes);

  // Step 4: pick first theme with fewer than 3 posts
  for (const theme of themes) {
    const { data: posts, error: postError } = await db
      .from('posts')
      .select('id')
      .eq('theme_id', theme.id);

    if (postError) throw new Error(`Error fetching posts for theme ${theme.theme}: ${postError.message}`);

    if ((posts?.length || 0) < 3) {
      return {
        id: theme.id,
        name: theme.theme,
      };
    } else {
      // mark theme as used if it already has 3 or more posts
      await db.from('themes').update({ used: true }).eq('id', theme.id);
    }
  }

  // fallback, retry in case no theme matched (should rarely happen)
  return generateThemeForToday(db, today);
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}





