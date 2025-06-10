import { SupabaseClient } from '@supabase/supabase-js';

export interface Theme {
  id: string;
  name: string;
  start_date: string | null;
}

// Hardcoded theme list excluding unwanted ones and including lighter themes
const THEMES: Theme[] = [
  { id: 'theme-connection', name: 'connection', start_date: null },
  { id: 'theme-chaos', name: 'chaos', start_date: null },
  { id: 'theme-memory', name: 'memory', start_date: null },
  { id: 'theme-time', name: 'time', start_date: null },
  { id: 'theme-language', name: 'language', start_date: null },
  { id: 'theme-intuition', name: 'intuition', start_date: null },
  { id: 'theme-longing', name: 'longing', start_date: null },
  { id: 'theme-identity', name: 'identity', start_date: null },
  { id: 'theme-desire', name: 'desire', start_date: null },
  { id: 'theme-stillness', name: 'stillness', start_date: null },
  { id: 'theme-doubt', name: 'doubt', start_date: null },
  { id: 'theme-liminality', name: 'liminality', start_date: null },
  { id: 'theme-echoes', name: 'echoes', start_date: null },
  { id: 'theme-control', name: 'control', start_date: null },
  // lighter themes
  { id: 'theme-happiness', name: 'happiness', start_date: null },
  { id: 'theme-joy', name: 'joy', start_date: null },
  { id: 'theme-surprise', name: 'surprise', start_date: null },
  { id: 'theme-wonder', name: 'wonder', start_date: null },
  { id: 'theme-gratitude', name: 'gratitude', start_date: null },
  { id: 'theme-kindness', name: 'kindness', start_date: null },
];

export async function generateThemeForToday(db: SupabaseClient): Promise<Theme> {
  const { data: dbThemes, error } = await db.from('themes').select('id, used');
  if (error) throw new Error('Error fetching themes from DB: ' + error.message);

  const usedMap = new Map<string, boolean>();
  dbThemes?.forEach((t) => usedMap.set(t.id, t.used));

  // Find next unused theme
  let nextTheme = THEMES.find((t) => !usedMap.get(t.id));

  // If all themes used, reset all used flags and pick first theme
  if (!nextTheme) {
    const { error: resetError } = await db.from('themes').update({ used: false }).neq('id', '');
    if (resetError) throw new Error('Error resetting themes: ' + resetError.message);

    THEMES.forEach((t) => usedMap.set(t.id, false));
    nextTheme = THEMES[0];
  }

  // Insert theme record if missing in DB
  if (!dbThemes?.some((t) => t.id === nextTheme!.id)) {
    const { error: insertError } = await db.from('themes').insert([
      {
        id: nextTheme!.id,
        theme: nextTheme!.name,
        used: false,
        start_date: nextTheme!.start_date,
        date: new Date().toISOString(),
      },
    ]);
    if (insertError) throw new Error('Error inserting new theme: ' + insertError.message);
  }

  return nextTheme!;
}

export async function markThemeAsUsed(db: SupabaseClient, themeId: string) {
  const { error } = await db.from('themes').update({ used: true }).eq('id', themeId);
  if (error) throw new Error('Error marking theme as used: ' + error.message);
}








