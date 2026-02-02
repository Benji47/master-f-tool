import * as sdk from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT || '';
const apiKey = process.env.APPWRITE_KEY || '';
const databaseId = process.env.APPWRITE_DATABASE_ID || '';
const collectionId = 'daily-achievements';

interface DailyAchievement {
  $id?: string;
  timestamp: number;
  type: 'elo_rank_up' | 'elo_rank_down' | 'level_up' | 'shutout_win' | 'vyrazecka' | 'golden_vyrazecka';
  playerId: string;
  username: string;
  data: {
    oldValue?: number;
    newValue?: number;
    vyrazeckaCount?: number;
    matchId?: string;
    details?: string;
  };
}

const getClient = () => {
  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return client;
};

export async function recordAchievement(achievement: Omit<DailyAchievement, '$id'>) {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);

    const doc = await databases.createDocument(
      databaseId,
      collectionId,
      sdk.ID.unique(),
      {
        ...achievement,
        data: JSON.stringify(achievement.data)
      }
    );
    return doc;
  } catch (error) {
    console.error("Error recording achievement:", error);
    return null;
  }
}

export async function getDailyAchievements(hoursBack: number = 24) {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);

    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        sdk.Query.greaterThan('timestamp', cutoffTime),
        sdk.Query.orderDesc('timestamp'),
        sdk.Query.limit(100),
      ]
    );

    return res.documents.map(doc => ({
      ...doc,
      data: typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data
    })) as unknown as DailyAchievement[];
  } catch (error) {
    console.error("Error fetching daily achievements:", error);
    return [];
  }
}

export async function cleanOldAchievements(hoursOld: number = 48) {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);

    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);

    // Fetch old achievements
    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      [sdk.Query.lessThan('timestamp', cutoffTime)]
    );

    // Delete them
    for (const doc of res.documents) {
      try {
        await databases.deleteDocument(databaseId, collectionId, doc.$id);
      } catch (e) {
        console.error(`Error deleting achievement ${doc.$id}:`, e);
      }
    }

    return res.documents.length;
  } catch (error) {
    console.error("Error cleaning old achievements:", error);
    return 0;
  }
}
