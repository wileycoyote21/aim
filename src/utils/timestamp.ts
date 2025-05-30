/**
 * Returns the current UTC timestamp as an ISO string.
 */
export function getCurrentUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Returns a Date object representing the start of today in UTC.
 */
export function getUtcStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Returns a Date object representing the start of yesterday in UTC.
 */
export function getUtcStartOfYesterday(): Date {
  const startOfToday = getUtcStartOfToday();
  return new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Returns a timestamp for n days ago from now in ISO string.
 * @param days Number of days ago
 */
export function getUtcDaysAgoIso(days: number): string {
  const now = new Date();
  const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return pastDate.toISOString();
}

/**
 * Returns today's start timestamp as an ISO string.
 */
export function getTodayTimestamp(): string {
  return getUtcStartOfToday().toISOString();
}

