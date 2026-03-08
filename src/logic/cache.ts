/**
 * Simple in-memory cache with TTL support.
 * Designed to drastically reduce Appwrite database reads
 * by caching frequently-accessed, slowly-changing data.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(key: string): void {
  store.delete(key);
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

// Cache key constants
export const CACHE_KEYS = {
  ALL_PROFILES: 'all_profiles',
  PROFILE: (id: string) => `profile:${id}`,
  GLOBAL_STATS: 'global_stats',
  LEADERBOARD: (limit: number) => `leaderboard:${limit}`,
  MATCH_HISTORY_ALL: 'match_history_all',
  DAILY_ACHIEVEMENTS: (hours: number) => `daily_achievements:${hours}`,
  SITE_CONTENT: (key: string) => `site_content:${key}`,
  ALL_SITE_CONTENT: 'all_site_content',
  PLAYER_ACHIEVEMENTS: (playerId: string) => `player_achievements:${playerId}`,
  ACHIEVEMENT_CLAIMS: (playerId: string) => `achievement_claims:${playerId}`,
} as const;

// TTL constants (in milliseconds)
// These are MAXIMUM lifetimes. Caches are INVALIDATED immediately when
// data changes (match finish, profile update, etc.), so long TTLs are safe.
export const CACHE_TTL = {
  PROFILES: 600_000,         // 10min - invalidated on profile update
  GLOBAL_STATS: 600_000,     // 10min - invalidated on stats update
  MATCH_HISTORY: 600_000,    // 10min - invalidated on match finish
  DAILY_ACHIEVEMENTS: 120_000, // 2min
  SITE_CONTENT: 600_000,     // 10min - invalidated on admin edit
  ACHIEVEMENTS: 600_000,     // 10min - invalidated on unlock/claim
} as const;
