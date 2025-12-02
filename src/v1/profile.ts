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
  vyrazacky: number;
  goals_scored: number;
  goals_conceded: number;
  ten_zero_wins: number;
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
        vyrazacky: 0,
        goals_scored: 0,
        goals_conceded: 0,
        ten_zero_wins: 0,
      }
    );
    console.log('Player profile created:', profile.$id);
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

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const profile = await databases.getDocument(databaseId, collectionId, userId);
    return profile as PlayerProfile;
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    return null;
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

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const globalStats = await databases.getDocument(databaseId, 'global_stats', '692e9c56001c048e4beb');
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
