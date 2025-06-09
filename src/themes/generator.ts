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
  "confusion",
  "love",
  "wonder",
];

export interface ThemeResult {
  id: string;  // UUID support
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

  if (insertError || !newThemeData) {
    console.error("Failed to insert theme for today:", insertError);
    throw new Error("Failed to insert or retrieve new theme.");
  }

  return { id: newThemeData.id, name: newThemeData.theme };
}

export function getAllThemes(): string[] {
  return [...themes];
}




