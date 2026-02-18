import * as sdk from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT || '';
const apiKey = process.env.APPWRITE_KEY || '';
const databaseId = process.env.APPWRITE_DATABASE_ID || '';

interface AchievementDefinition {
  $id?: string;
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement?: {
    type: string;
    value?: number;
    description?: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface PlayerAchievement {
  $id?: string;
  playerId: string;
  username: string;
  achievementId: string;
  unlockedAt: string;
  data?: {
    matchId?: string;
    value?: number;
    details?: string;
  };
}

interface PlayerAchievementWithDef extends PlayerAchievement {
  definition?: AchievementDefinition;
}

const getClient = () => {
  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return client;
};

// ============ ACHIEVEMENT DEFINITIONS ============

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    achievementId: 'first_match',
    name: 'Nova Start',
    description: 'Win your first foosball match',
    icon: '🎮',
    category: 'milestone',
    rarity: 'common',
    requirement: { type: 'win_match', value: 1 }
  },
  {
    achievementId: 'shutout_master',
    name: 'Shut Them Down',
    description: 'Win a match with a perfect 10-0 score',
    icon: '🔥',
    category: 'skill',
    rarity: 'rare',
    requirement: { type: 'shutout_win', value: 1 }
  },
  {
    achievementId: 'golden_vyrazecka',
    name: 'Golden Touch',
    description: 'Achieve a golden vyrážečka (perfect defense)',
    icon: '✨',
    category: 'skill',
    rarity: 'epic',
    requirement: { type: 'golden_vyrazecka', value: 1 }
  },
  {
    achievementId: 'win_streak_5',
    name: 'On Fire',
    description: 'Win 5 consecutive matches',
    icon: '🔥',
    category: 'milestone',
    rarity: 'rare',
    requirement: { type: 'win_streak', value: 5 }
  },
  {
    achievementId: 'level_10',
    name: 'Maximum Level',
    description: 'Reach level 10',
    icon: '⭐',
    category: 'milestone',
    rarity: 'epic',
    requirement: { type: 'level', value: 10 }
  },
  {
    achievementId: 'elo_500',
    name: 'Rising Star',
    description: 'Reach 500 Elo rating',
    icon: '📈',
    category: 'milestone',
    rarity: 'rare',
    requirement: { type: 'elo', value: 500 }
  },
  {
    achievementId: 'elo_1000',
    name: 'Master Player',
    description: 'Reach 1000 Elo rating',
    icon: '👑',
    category: 'milestone',
    rarity: 'epic',
    requirement: { type: 'elo', value: 1000 }
  },
  {
    achievementId: 'win_100',
    name: 'Century Player',
    description: 'Win 100 matches',
    icon: '🏆',
    category: 'milestone',
    rarity: 'legendary',
    requirement: { type: 'wins', value: 100 }
  },
  {
    achievementId: 'vyrrazecka_artist',
    name: 'Vyrážečka Artist',
    description: 'Score 10 vyrážečky in total',
    icon: '⚡',
    category: 'skill',
    rarity: 'rare',
    requirement: { type: 'vyrazecky', value: 10 }
  },
  {
    achievementId: 'consistency',
    name: 'The Steady One',
    description: 'Win matches across 10 days',
    icon: '📅',
    category: 'milestone',
    rarity: 'rare',
    requirement: { type: 'days_played', value: 10 }
  }
];

// ============ DATABASE OPERATIONS ============

export async function unlockAchievement(
  playerId: string,
  username: string,
  achievementId: string,
  data?: any
): Promise<PlayerAchievement | null> {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);

    // Check if already unlocked
    const existing = await databases.listDocuments(
      databaseId,
      'player-achievements',
      [
        sdk.Query.equal('playerId', playerId),
        sdk.Query.equal('achievementId', achievementId),
        sdk.Query.limit(1)
      ]
    );

    if (existing.documents.length > 0) {
      return null; // Already unlocked
    }

    // Create new achievement
    const doc = await databases.createDocument(
      databaseId,
      'player-achievements',
      sdk.ID.unique(),
      {
        playerId,
        username,
        achievementId,
        unlockedAt: new Date().toISOString(),
        data: data ? JSON.stringify(data) : null
      }
    );

    return {
      $id: doc.$id,
      playerId: doc.playerId,
      username: doc.username,
      achievementId: doc.achievementId,
      unlockedAt: doc.unlockedAt,
      data: typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data
    } as PlayerAchievement;
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return null;
  }
}

export async function getPlayerAchievements(
  playerId: string
): Promise<PlayerAchievementWithDef[]> {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);

    const res = await databases.listDocuments(
      databaseId,
      'player-achievements',
      [
        sdk.Query.equal('playerId', playerId),
        sdk.Query.orderDesc('unlockedAt'),
        sdk.Query.limit(100)
      ]
    );

    return res.documents.map(doc => {
      const definition = ACHIEVEMENT_DEFINITIONS.find(
        d => d.achievementId === doc.achievementId
      );
      return {
        ...doc,
        data: typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data,
        definition
      };
    }) as unknown as PlayerAchievementWithDef[];
  } catch (error) {
    console.error('Error fetching player achievements:', error);
    return [];
  }
}

export async function getAllAchievementsForPlayer(
  playerId: string
): Promise<{
  unlocked: PlayerAchievementWithDef[];
  locked: AchievementDefinition[];
}> {
  try {
    const unlocked = await getPlayerAchievements(playerId);
    const unlockedIds = new Set(unlocked.map(a => a.achievementId));
    const locked = ACHIEVEMENT_DEFINITIONS.filter(
      def => !unlockedIds.has(def.achievementId)
    );

    return { unlocked, locked };
  } catch (error) {
    console.error('Error getting all achievements:', error);
    return { unlocked: [], locked: ACHIEVEMENT_DEFINITIONS };
  }
}

export function getAchievementColorClass(rarity: string): {
  border: string;
  bg: string;
  text: string;
} {
  switch (rarity) {
    case 'legendary':
      return {
        border: 'border-red-500',
        bg: 'bg-red-950/30',
        text: 'text-red-300'
      };
    case 'epic':
      return {
        border: 'border-purple-500',
        bg: 'bg-purple-950/30',
        text: 'text-purple-300'
      };
    case 'rare':
      return {
        border: 'border-blue-500',
        bg: 'bg-blue-950/30',
        text: 'text-blue-300'
      };
    case 'common':
    default:
      return {
        border: 'border-neutral-500',
        bg: 'bg-neutral-950/30',
        text: 'text-neutral-300'
      };
  }
}

export function formatUnlockDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
