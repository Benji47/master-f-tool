import { badges, computeLevel } from "../static/data";
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePrefix, CACHE_KEYS, CACHE_TTL } from "./cache";

const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'players-profile';

export interface PlayerProfile {
  $id: string;
  userId: string;
  username: string;
  wins: number;
  loses: number;
  ultimate_wins: number;
  ultimate_loses: number;
  xp: number;
  elo: number;
  vyrazecky: number;
  goals_scored: number;
  goals_conceded: number;
  ten_zero_wins: number;
  ten_zero_loses: number;
  coins: number;
  ownedBadges?: string; // JSON array of badge names
  selectedBadge?: string; // Currently equipped badge name
}

export interface GlobalStats {
  totalMatches: number;
  totalPodlezani: number;
  totalGoals: number;
  totalVyrazecka: number;
}

export async function createPlayerProfile(userId: string, username: string): Promise<PlayerProfile> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const profile = await databases.createDocument(
      databaseId,
      collectionId,
      username,
      {
        userId,
        username,
        wins: 0,
        loses: 0,
        ultimate_wins: 0,
        ultimate_loses: 0,
        xp: 0,
        elo: 500,
        vyrazecky: 0,
        goals_scored: 0,
        goals_conceded: 0,
        ten_zero_wins: 0,
        ten_zero_loses: 0,
        coins: 100,
      }
    );
    
    return profile as PlayerProfile;
  } catch (err: any) {
    console.error('Profile creation error:', err);
    throw new Error(err?.message || 'Failed to create player profile');
  }
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const cached = cacheGet<PlayerProfile>(CACHE_KEYS.PROFILE(userId));
  if (cached) return cached;

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const profile = await databases.getDocument(databaseId, collectionId, userId);
    cacheSet(CACHE_KEYS.PROFILE(userId), profile as PlayerProfile, CACHE_TTL.PROFILES);
    return profile as PlayerProfile;
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    return null;
  }
}

export async function getAllPlayerProfiles(): Promise<PlayerProfile[]> {
  if (!projectId || !apiKey) {
    throw new Error("Appwrite credentials not configured");
  }

  const cached = cacheGet<PlayerProfile[]>(CACHE_KEYS.ALL_PROFILES);
  if (cached) return cached;

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    // Fetch ALL documents with pagination
    let allProfiles: PlayerProfile[] = [];
    let offset = 0;
    const limit = 100; // Fetch 100 at a time

    while (true) {
      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          sdk.Query.limit(limit),
          sdk.Query.offset(offset)
        ]
      );

      if (res.documents.length === 0) break;

      allProfiles = allProfiles.concat(res.documents as PlayerProfile[]);
      offset += limit;

      // Safety check to prevent infinite loops
      if (allProfiles.length > 10000) {
        break;
      }
    }

    cacheSet(CACHE_KEYS.ALL_PROFILES, allProfiles, CACHE_TTL.PROFILES);
    // Also populate individual profile caches
    for (const p of allProfiles) {
      cacheSet(CACHE_KEYS.PROFILE(p.$id), p, CACHE_TTL.PROFILES);
    }

    return allProfiles;
  } catch (err: any) {
    console.error("Profiles fetch error:", err);
    return [];
  }
}

export async function updatePlayerStats(
  userId: string,
  updates: Partial<PlayerProfile>
): Promise<PlayerProfile> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const profile = await databases.updateDocument(databaseId, collectionId, userId, updates);
    // Invalidate caches for this profile and the all-profiles list
    cacheInvalidate(CACHE_KEYS.PROFILE(userId));
    cacheInvalidate(CACHE_KEYS.ALL_PROFILES);
    return profile as PlayerProfile;
  } catch (err: any) {
    console.error('Profile update error:', err);
    throw new Error(err?.message || 'Failed to update player profile');
  }
}

export async function updateGlobalStats(
  updates: Partial<GlobalStats>
): Promise<GlobalStats> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const globalStats = await databases.updateDocument(databaseId, 'global_stats', '692e9c56001c048e4beb', updates);
    cacheInvalidate(CACHE_KEYS.GLOBAL_STATS);
    return globalStats as GlobalStats;
  } catch (err: any) {
    console.error('Profile update error:', err);
    throw new Error(err?.message || 'Failed to update player profile');
  }
}

export async function getGlobalStats(): Promise<GlobalStats | null> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const cached = cacheGet<GlobalStats>(CACHE_KEYS.GLOBAL_STATS);
  if (cached) return cached;

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const globalStats = await databases.getDocument(databaseId, 'global_stats', '692e9c56001c048e4beb');
    cacheSet(CACHE_KEYS.GLOBAL_STATS, globalStats as GlobalStats, CACHE_TTL.GLOBAL_STATS);
    return globalStats as GlobalStats;
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    return null;
  }
}


export async function getLeaderboard(limit: number = 50): Promise<PlayerProfile[]> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const result = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        sdk.Query.orderDesc('elo'),
        sdk.Query.limit(limit),
      ]
    );
    return (result.documents || []) as PlayerProfile[];
  } catch (err: any) {
    console.error('Leaderboard fetch error:', err);
    throw new Error(err?.message || 'Failed to fetch leaderboard');
  }
}

export async function getBetsForPlayer(playerId: string): Promise<any[]> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const result = await databases.listDocuments(
      databaseId,
      'bets',
      [
        sdk.Query.equal('playerId', playerId),
        sdk.Query.orderDesc('$createdAt'),
      ]
    );

    return (result.documents || []).map((doc: any) => ({
      $id: doc.$id,
      ...doc,
      predictions: typeof doc.predictions === 'string' ? JSON.parse(doc.predictions) : doc.predictions,
    }));
  } catch (err: any) {
    console.error('Get player bets error:', err);
    return [];
  }
}

/**
 * Get owned badges for a player
 */
export async function getOwnedBadges(username: string): Promise<string[]> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  // Reuse the cached profile instead of a separate DB read
  const profile = await getPlayerProfile(username);

  try {
    if (!profile || !profile.ownedBadges) {
      return [];
    }

    return typeof profile.ownedBadges === 'string'
      ? JSON.parse(profile.ownedBadges)
      : profile.ownedBadges;
  } catch (err: any) {
    console.error('Get owned badges error:', err);
    return [];
  }
}

/**
 * Select/equip a badge for display
 */
export async function selectBadge(
  username: string,
  badgeName: string | null
): Promise<{ success: boolean; message: string }> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    // Use cached profile to avoid an extra DB read
    const profile = await getPlayerProfile(username);
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    // If badgeName is null, unequip badge
    if (badgeName === null) {
      await databases.updateDocument(databaseId, collectionId, username, {
        selectedBadge: null,
      });
      cacheInvalidate(CACHE_KEYS.PROFILE(username));
      cacheInvalidate(CACHE_KEYS.ALL_PROFILES);
      return { success: true, message: 'Badge unequipped' };
    }

    // Get owned badges
    const ownedBadges: string[] = profile.ownedBadges
      ? (typeof profile.ownedBadges === 'string' ? JSON.parse(profile.ownedBadges) : profile.ownedBadges)
      : [];

    const level = computeLevel(profile.xp || 0).level;
    const earnedLevelBadges = badges.slice(0, Math.max(0, level)).map((b) => b.name);

    // Check if player owns the badge
    if (!ownedBadges.includes(badgeName) && !earnedLevelBadges.includes(badgeName)) {
      return { success: false, message: 'You do not own this badge!' };
    }

    // Update selected badge
    await databases.updateDocument(databaseId, collectionId, username, {
      selectedBadge: badgeName,
    });
    cacheInvalidate(CACHE_KEYS.PROFILE(username));
    cacheInvalidate(CACHE_KEYS.ALL_PROFILES);

    return { success: true, message: `Badge "${badgeName}" equipped!` };
  } catch (err: any) {
    console.error('Select badge error:', err);
    return { success: false, message: err.message || 'Failed to select badge' };
  }
}

/**
 * Add a badge to player's owned badges (used when leveling up)
 */
export async function addOwnedBadge(
  username: string,
  badgeName: string
): Promise<boolean> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    // Use cached profile instead of a separate DB read
    const profile = await getPlayerProfile(username);
    if (!profile) return false;

    const ownedBadges: string[] = profile.ownedBadges
      ? (typeof profile.ownedBadges === 'string' ? JSON.parse(profile.ownedBadges) : profile.ownedBadges)
      : [];

    // Don't add if already owned
    if (ownedBadges.includes(badgeName)) {
      return true;
    }

    ownedBadges.push(badgeName);

    await databases.updateDocument(databaseId, collectionId, username, {
      ownedBadges: JSON.stringify(ownedBadges),
    });
    cacheInvalidate(CACHE_KEYS.PROFILE(username));
    cacheInvalidate(CACHE_KEYS.ALL_PROFILES);

    return true;
  } catch (err: any) {
    console.error('Add owned badge error:', err);
    return false;
  }
}
