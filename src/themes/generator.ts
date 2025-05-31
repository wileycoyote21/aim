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
 */
export async function generateThemeForToday(db: any, today: string): Promise<string> {
  // Check if a theme already exists for today
  const { data, error } = await db
    .from("themes")
    .select("theme")
    .eq("date", today)
    .single();

  if (data?.theme) {
    return data.theme;
  }

  const theme = getTodaysTheme();

  // Insert new theme for today
  const { error: insertError } = await db.from("themes").insert([{ date: today, theme }]);

  if (insertError) {
    console.error("Failed to insert theme for today:", insertError.message);
    throw insertError;
  }

  return theme;
}

// Optional: expose full theme list
export function getAllThemes(): string[] {
  return [...themes];
}

