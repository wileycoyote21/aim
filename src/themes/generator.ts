// generator.ts

import type { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type

const themes = [
  "vulnerability",
  "curiosity",
  "loneliness",
  "hope",
  "regret",
  "gratitude",
  "fear",
  "joy",
  "disappointment",
  "resilience",
  "empathy",
  "identity",
  "change",
  "loss",
  "connection",
  "self-doubt",
  "growth",
  "memory",
  "forgiveness",
  "dreams",
  "patience",
  "belonging",
  "anger",
  "acceptance",
  "creativity",
  "silence",
  "trust",
  "confusion",
  "love",
  "wonder",
];

// Define the interface for the theme object that will be returned
interface ThemeResult {
  id: number; // Assuming the ID from your Supabase 'themes' table is a number
  name: string; // The actual theme string (e.g., "fear")
}

/**
 * Return today's theme based on date logic
 */
export function getTodaysTheme(date = new Date()): string {
  const dayOfMonth = date.getUTCDate();
  const index = (dayOfMonth - 1) % themes.length;
  return themes[index];
}

/**
 * Main function used in cron to get or insert today's theme in DB
 * Returns an object with the theme's ID and name.
 */
export async function generateThemeForToday(db: SupabaseClient, today: string): Promise<ThemeResult> {
  // Check if a theme already exists for today
  // Select both 'id' and 'theme' (which we'll rename to 'name' for consistency)
  const { data, error } = await db
    .from("themes")
    .select("id, theme") // Select the ID and the theme content
    .eq("date", today)
    .single();

  if (data) { // If data exists, return it with the correct property names
    return { id: data.id, name: data.theme };
  }

  // If no theme exists for today, generate a new one
  const themeName = getTodaysTheme();

  // Insert new theme for today, and select the ID and theme back
  const { data: newThemeData, error: insertError } = await db
    .from("themes")
    .insert([{ date: today, theme: themeName }])
    .select("id, theme") // Select the ID and theme of the newly inserted row
    .single();

  if (insertError) {
    console.error("Failed to insert theme for today:", insertError);
    throw new Error(`Failed to insert theme: ${JSON.stringify(insertError)}`);
  }

  if (!newThemeData) {
      throw new Error("Failed to retrieve new theme data after insertion.");
  }

  // Return the newly created theme's ID and name
  return { id: newThemeData.id, name: newThemeData.theme };
}

// Optional: expose full theme list
export function getAllThemes(): string[] {
  return [...themes];
}

