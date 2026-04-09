/**
 * In-memory store for profiles and global stats.
 * Loaded once at server start, updated after writes.
 * Eliminates DB reads for the most common page loads.
 */
const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

function getDb() {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

// ---- In-memory stores ----

let allProfiles: any[] = [];
let profilesById: Map<string, any> = new Map();
let globalStats: any = null;
let ready = false;

// ---- Public API ----

export function isMemoryReady(): boolean { return ready; }

export function getProfileFromMemory(id: string): any | null {
  // Case-insensitive lookup
  return profilesById.get(id) || profilesById.get(id.toLowerCase()) || null;
}

export function getAllProfilesFromMemory(): any[] {
  return allProfiles;
}

export function getGlobalStatsFromMemory(): any | null {
  return globalStats;
}

// ---- Load from DB (called once at startup) ----

export async function loadAllIntoMemory(): Promise<void> {
  const databases = getDb();

  // Load all profiles
  let profiles: any[] = [];
  let offset = 0;
  while (true) {
    const res = await databases.listDocuments(databaseId, 'players-profile', [
      sdk.Query.limit(100), sdk.Query.offset(offset),
    ]);
    if (!res.documents.length) break;
    profiles = profiles.concat(res.documents);
    offset += 100;
    if (profiles.length > 10000) break;
  }
  allProfiles = profiles;
  rebuildIndex();

  // Load global stats
  try {
    globalStats = await databases.getDocument(databaseId, 'global_stats', '692e9c56001c048e4beb');
  } catch {
    globalStats = { totalMatches: 0, totalGoals: 0, totalPodlezani: 0, totalVyrazecka: 0 };
  }

  ready = true;
  console.log(`[memoryStore] Loaded ${allProfiles.length} profiles + global stats`);
}

// ---- Update after writes (call from server.tsx) ----

export function updateProfileInMemory(profile: any): void {
  const idx = allProfiles.findIndex(p => p.$id === profile.$id);
  if (idx >= 0) {
    allProfiles[idx] = { ...allProfiles[idx], ...profile };
  } else {
    allProfiles.push(profile);
  }
  rebuildIndex();
}

export function updateGlobalStatsInMemory(stats: any): void {
  globalStats = { ...globalStats, ...stats };
}

// ---- Refresh single profile from DB (after shop purchase etc.) ----

export async function refreshProfileFromDb(id: string): Promise<any | null> {
  try {
    const databases = getDb();
    const profile = await databases.getDocument(databaseId, 'players-profile', id);
    updateProfileInMemory(profile);
    return profile;
  } catch {
    return null;
  }
}

// ---- Helpers ----

function rebuildIndex() {
  profilesById = new Map();
  for (const p of allProfiles) {
    profilesById.set(p.$id, p);
    if (p.username) profilesById.set(p.username, p);
    if (p.$id) profilesById.set(p.$id.toLowerCase(), p);
    if (p.username) profilesById.set(p.username.toLowerCase(), p);
  }
}
