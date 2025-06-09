// src/themes/generator.ts

import type { SupabaseClient } from "@supabase/supabase-js";

const themes = [
  "vulnerability", "curiosity", "loneliness", "hope", "regret",
  "gratitude", "fear", "joy", "disappointment", "resilience",
  "empathy", "identity", "change", "loss", "connection",
  "self-doubt", "growth", "memory", "forgiveness", "dreams",
  "patience", "belonging", "anger", "acceptance", "creativity",
  "silence", "trust", "confusion", "love", "wonder"
];

interface ThemeResult {
  id: string;
  name: string;
}

export function getTodaysTheme(date = new Date()): string {
  const dayOfMonth = date.getUTCDate();
  const index = (dayOfMonth - 1) % themes.length;
  return themes[index];
}

export async function generateThemeForToday(db: SupabaseClient, today: string): Promise<ThemeResult> {
  const { data, error } = await db
    .from("themes")
    .select("id, theme")
    .eq("date", today)
    .single();

  if (data) {
    return { id: data.id, name: data.theme };
  }

  // If no theme exists for today, find the next unused theme
  const { data: unusedThemes, error: fetchError } = await db
    .from("themes")
    .select("theme")
    .is("used", null);

  const usedSet = new Set((unusedThemes || []).map(t => t.theme));
  const nextAvailable = themes.find(t => !usedSet.has(t)) || getTodaysTheme();

  const { data: newThemeData, error: insertError } = await db
    .from("themes")
    .insert([{ date: today, theme: nextAvailable }])
    .select("id, theme")
    .single();

  if (insertError || !newThemeData) {
    console.error("Failed to insert new theme for today:", insertError);
    throw new Error(`Failed to insert theme: ${JSON.stringify(insertError)}`);
  }

  return { id: newThemeData.id, name: newThemeData.theme };
}

export function getAllThemes(): string[] {
  return [...themes];
}


