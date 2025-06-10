// src/themes/generator.ts

import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ThemeResult {
  id: string;
  name: string;
  used: boolean;
  start_date: string | null;
  date: string;
}

// Mixed list of themes with lighter ones evenly distributed
const themesList = [
  'connection',
  'happiness',
  'chaos',
  'joy',
  'memory',
  'surprise',
  'time',
  'wonder',
  'language',
  'curiosity',
  'intuition',
  'longing',
  'identity',
  'desire',
  'stillness',
  'doubt',
  'liminality',
  'echoes',
  'control',
  'happiness', // repeated lighter theme to balance
];

export async function generateThemeForToday(db: SupabaseClient, today: string): Promise<ThemeResult> {
  try {
    // Fetch unused themes from DB
    let { data: unusedThemes, error: fetchError } = await db
      .from('themes')
      .select('*')
      .eq('used', false);

    if (fetchError) {
      throw new Error(`Error fetching unused themes: ${JSON.stringify(fetchError)}`);
    }

    // Reset all themes to unused if none available
    if (!unusedThemes || unusedThemes.length === 0) {
      const { error: resetError } = await db
        .from('themes')
        .update({ used: false }); // <--- FIXED HERE: no .neq('id', '') needed

      if (resetError) {
        throw new Error(`Error resetting themes: ${JSON.stringify(resetError)}`);
      }

      // Fetch again after reset
      const { data, error } = await db.from('themes').select('*').eq('used', false);
      if (error) {
        throw new Error(`Error fetching themes after reset: ${JSON.stringify(error)}`);
      }
      unusedThemes = data || [];
    }

    // Pick first unused theme from DB
    let currentTheme = unusedThemes[0];

    // Insert missing theme from code list if needed
    if (!currentTheme) {
      const { data: allThemesInDb, error: allError } = await db.from('themes').select('theme');
      if (allError) {
        throw new Error(`Error fetching all themes: ${JSON.stringify(allError)}`);
      }
      const dbThemes = allThemesInDb?.map(t => t.theme) || [];
      const nextThemeName = themesList.find(t => !dbThemes.includes(t));

      if (!nextThemeName) {
        // All themes exist in DB but none unused, fallback to first code theme
        return {
          id: uuidv4(),
          name: themesList[0],
          used: false,
          start_date: null,
          date: new Date().toISOString(),
        };
      }

      const newTheme = {
        id: uuidv4(),
        theme: nextThemeName,
        used: false,
        start_date: null,
        date: new Date().toISOString(),
      };

      const { error: insertError } = await db.from('themes').insert([newTheme]);
      if (insertError) {
        throw new Error(`Error inserting new theme: ${JSON.stringify(insertError)}`);
      }

      currentTheme = newTheme;
    }

    return {
      id: currentTheme.id,
      name: currentTheme.theme,
      used: currentTheme.used,
      start_date: currentTheme.start_date,
      date: currentTheme.date,
    };
  } catch (error: any) {
    throw new Error(`Error generating theme for today: ${error.message}`);
  }
}










