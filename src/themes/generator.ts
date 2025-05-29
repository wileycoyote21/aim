// src/themes/generator.ts

// Initial 30 themes (seed) — emotionally resonant, human nature topics
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
 * Returns today's theme based on the current date.
 * Rotates through the 30 themes by day of month.
 */
export function getTodaysTheme(date = new Date()): string {
  // Use UTC date to avoid timezone drift, get day of month 1-31
  const dayOfMonth = date.getUTCDate();

  // Map day to theme index (0 to 29)
  // If dayOfMonth > 30, wrap around by modulo
  const index = (dayOfMonth - 1) % themes.length;

  return themes[index];
}

/**
 * Export all themes for reference (optional)
 */
export function getAllThemes(): string[] {
  return [...themes];
}
