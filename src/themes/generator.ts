// src/themes/generator.ts

import type { SupabaseClient } from "@supabase/supabase-js";

const themes = [
  "vulnerability",
  "curiosity",
  "hope",
  "gratitude",
  "joy",
  "resilience",
  "empathy",
  "identity",
  "change",
  "connection",
  "growth",
  "memory",
  "forgiveness",
  "dreams",
  "patience",
  "belonging",
  "acceptance",
  "creativity",
  "silence",
  "trust",
  "love",
  "wonder",
];

// Interface for theme result with UUID id
export interface ThemeResult {
  id: string; // UUID
  name: string;
}

export function getTodaysTheme(date = new Date()): string {
  const dayOfMonth = date.getUTCDate();
  const index = (dayOfMonth - 1) % themes.length;
  return themes[index];
}

export async function generateThemeForToday(
  db: SupabaseClient,
  today: string
): Promise<ThemeResult> {
  const { data, error } = await db
    .from("themes")
    .select("id, theme")
    .eq("date", today)
    .single();

  if (data) {
    return { id: data.id, name: data.theme };
  }

  const themeName = getTodaysTheme();

  const { data: newThemeData, error: insertError } = await db
    .from("themes")
    .insert([{ date: today, theme: themeName }])
    .select("id, theme")
    .single();

  if (insertError) {
    console.error("Failed to insert theme for today:", insertError);
    throw new Error(`Failed to insert theme: ${JSON.stringify(insertError)}`);
  }

  if (!newThemeData) {
    throw new Error("Failed to retrieve new theme data after insertion.");
  }

  return { id: newThemeData.id, name: newThemeData.theme };
}

export function getAllThemes(): string[] {
  return [...themes];
}



