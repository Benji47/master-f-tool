import * as sdk from "node-appwrite";
import { computeLevel } from "../static/data";

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
  rewardCoins: number;
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
  claimed?: boolean;
}

export interface MatchAchievementStats {
  matchWon: boolean;
  matchLost: boolean;
  matchUltimateWin: boolean;
  matchUltimateLose: boolean;
  hadShutoutWin: boolean;
  lostByGoldenVyrazecka: boolean;
  vyrazeckyAdded: number;
  newLevel: number;
  newElo: number;
  newCoins: number;
}

interface PlayerAchievementProgress {
  $id?: string;
  playerId: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  baselineLevel: number;
  baselineElo: number;
  baselineCoins: number;
  maxLevel: number;
  maxElo: number;
  maxCoins: number;
  matchesPlayed: number;
  winStreak: number;
  maxWinStreak: number;
  totalVyrazecky: number;
}

interface PlayerAchievementClaim {
  $id?: string;
  playerId: string;
  achievementId: string;
  claimedAt: string;
  rewardCoins: number;
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
    achievementId: 'level_5',
    name: 'Rookie Ascension',
    description: 'Reach level 5',
    icon: '⭐',
    category: 'level',
    rarity: 'common',
    rewardCoins: 500,
    requirement: { type: 'level', value: 5, description: 'Reach level 5' }
  },
  {
    achievementId: 'level_8',
    name: 'Rising Force',
    description: 'Reach level 8',
    icon: '✨',
    category: 'level',
    rarity: 'rare',
    rewardCoins: 2000,
    requirement: { type: 'level', value: 8, description: 'Reach level 8' }
  },
  {
    achievementId: 'level_10',
    name: 'Tenfold',
    description: 'Reach level 10',
    icon: '🏅',
    category: 'level',
    rarity: 'epic',
    rewardCoins: 5000,
    requirement: { type: 'level', value: 10, description: 'Reach level 10' }
  },
  {
    achievementId: 'shutout_10_0',
    name: 'No Mercy',
    description: 'Win a match 10-0',
    icon: '🔥',
    category: 'match',
    rarity: 'epic',
    rewardCoins: 10000,
    requirement: { type: 'shutout_win', value: 1, description: 'Win a match 10-0' }
  },
  {
    achievementId: 'coins_100k',
    name: 'Pocket Change',
    description: 'Reach 100,000 coins',
    icon: '🪙',
    category: 'economy',
    rarity: 'rare',
    rewardCoins: 1,
    requirement: { type: 'coins', value: 100000, description: 'Reach 100,000 coins' }
  },
  {
    achievementId: 'golden_loss',
    name: 'Oh, the irony.',
    description: 'Lose against a golden vyrážečka',
    icon: '🫠',
    category: 'match',
    rarity: 'legendary',
    rewardCoins: 15000,
    requirement: { type: 'golden_loss', value: 1, description: 'Lose against a golden vyrážečka' }
  },
  {
    achievementId: 'vyrazecka_1',
    name: 'First Wall',
    description: 'Score 1 vyrážečka',
    icon: '🛡️',
    category: 'match',
    rarity: 'epic',
    rewardCoins: 10000,
    requirement: { type: 'vyrazecky', value: 1, description: 'Score 1 vyrážečka' }
  },
  {
    achievementId: 'play_1',
    name: 'Kickoff',
    description: 'Play 1 match',
    icon: '🎯',
    category: 'milestone',
    rarity: 'common',
    rewardCoins: 100,
    requirement: { type: 'matches_played', value: 1, description: 'Play 1 match' }
  },
  {
    achievementId: 'play_10',
    name: 'On the Board',
    description: 'Play 10 matches',
    icon: '🎮',
    category: 'milestone',
    rarity: 'rare',
    rewardCoins: 500,
    requirement: { type: 'matches_played', value: 10, description: 'Play 10 matches' }
  },
  {
    achievementId: 'play_100',
    name: 'Centurion',
    description: 'Play 100 matches',
    icon: '🏆',
    category: 'milestone',
    rarity: 'legendary',
    rewardCoins: 15000,
    requirement: { type: 'matches_played', value: 100, description: 'Play 100 matches' }
  },
  {
    achievementId: 'elo_600',
    name: 'Climber',
    description: 'Reach 600 ELO',
    icon: '📈',
    category: 'rank',
    rarity: 'rare',
    rewardCoins: 5000,
    requirement: { type: 'elo', value: 600, description: 'Reach 600 ELO' }
  },
  {
    achievementId: 'elo_800',
    name: 'Challenger',
    description: 'Reach 800 ELO',
    icon: '⚔️',
    category: 'rank',
    rarity: 'epic',
    rewardCoins: 15000,
    requirement: { type: 'elo', value: 800, description: 'Reach 800 ELO' }
  },
  {
    achievementId: 'elo_1000',
    name: 'Master Rank',
    description: 'Reach 1000 ELO',
    icon: '👑',
    category: 'rank',
    rarity: 'legendary',
    rewardCoins: 50000,
    requirement: { type: 'elo', value: 1000, description: 'Reach 1000 ELO' }
  },
  {
    achievementId: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 matches in a row',
    icon: '🔥',
    category: 'milestone',
    rarity: 'epic',
    rewardCoins: 12000,
    requirement: { type: 'win_streak', value: 5, description: 'Win 5 matches in a row' }
  },
  {
    achievementId: 'ultimate_winner',
    name: 'Clean Sweep',
    description: 'Win all 3 games in a match',
    icon: '🧹',
    category: 'match',
    rarity: 'rare',
    rewardCoins: 1500,
    requirement: { type: 'ultimate_win', value: 1, description: 'Win all 3 games' }
  },
  {
    achievementId: 'ultimate_loser',
    name: 'Rough Night',
    description: 'Lose all 3 games in a match',
    icon: '🌧️',
    category: 'match',
    rarity: 'common',
    rewardCoins: 500,
    requirement: { type: 'ultimate_lose', value: 1, description: 'Lose all 3 games' }
  }
];

const progressCollectionId = 'player-achievement-progress';
const claimsCollectionId = 'player-achievement-claims';

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

    return res.documents
      .map(doc => {
        const definition = ACHIEVEMENT_DEFINITIONS.find(
          d => d.achievementId === doc.achievementId
        );
        if (!definition) return null;
        return {
          ...doc,
          data: typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data,
          definition
        };
      })
      .filter(Boolean) as unknown as PlayerAchievementWithDef[];
  } catch (error) {
    console.error('Error fetching player achievements:', error);
    return [];
  }
}

async function getAchievementClaims(playerId: string): Promise<Set<string>> {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);
    const res = await databases.listDocuments(
      databaseId,
      claimsCollectionId,
      [
        sdk.Query.equal('playerId', playerId),
        sdk.Query.limit(200)
      ]
    );
    return new Set(res.documents.map(doc => String(doc.achievementId)));
  } catch (error) {
    console.error('Error fetching achievement claims:', error);
    return new Set();
  }
}

export async function getAllAchievementsForPlayer(
  playerId: string
): Promise<{
  unlocked: PlayerAchievementWithDef[];
  locked: AchievementDefinition[];
}> {
  try {
    await syncAchievementsFromProfile(playerId);

    const unlocked = await getPlayerAchievements(playerId);
    const claimed = await getAchievementClaims(playerId);
    const unlockedWithClaims = unlocked.map((row) => ({
      ...row,
      claimed: claimed.has(row.achievementId)
    }));
    const unlockedIds = new Set(unlocked.map(a => a.achievementId));
    const locked = ACHIEVEMENT_DEFINITIONS.filter(
      def => !unlockedIds.has(def.achievementId)
    );
    return { unlocked: unlockedWithClaims, locked };
  } catch (error) {
    console.error('Error getting all achievements:', error);
    return { unlocked: [], locked: ACHIEVEMENT_DEFINITIONS };
  }
}

async function syncAchievementsFromProfile(playerId: string): Promise<void> {
  try {
    const client = getClient();
    const databases = new sdk.Databases(client);
    const profile = await databases.getDocument(databaseId, 'players-profile', playerId);

    const username = String(profile.username || '');
    const level = computeLevel(Number(profile.xp || 0)).level;
    const elo = Number(profile.elo || 0);
    const coins = Number(profile.coins || 0);
    const vyrazecky = Number(profile.vyrazecky || 0);
    const ultimateWins = Number(profile.ultimate_wins || 0);
    const ultimateLoses = Number(profile.ultimate_loses || 0);
    const shutoutWins = Number(profile.ten_zero_wins || 0);

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const requirement = def.requirement;
      if (!requirement) continue;

      const value = requirement.value ?? 1;
      let shouldUnlock = false;

      switch (requirement.type) {
        case 'level':
          shouldUnlock = level >= value;
          break;
        case 'elo':
          shouldUnlock = elo >= value;
          break;
        case 'coins':
          shouldUnlock = coins >= value;
          break;
        case 'vyrazecky':
          shouldUnlock = vyrazecky >= value;
          break;
        case 'ultimate_win':
          shouldUnlock = ultimateWins >= value;
          break;
        case 'ultimate_lose':
          shouldUnlock = ultimateLoses >= value;
          break;
        case 'shutout_win':
          shouldUnlock = shutoutWins >= value;
          break;
        default:
          shouldUnlock = false;
          break;
      }

      if (shouldUnlock) {
        await unlockAchievement(playerId, username, def.achievementId, {
          source: 'profile_sync',
          value,
        });
      }
    }
  } catch (error) {
    console.error('Error syncing profile achievements:', error);
  }
}

async function getOrCreateProgress(
  playerId: string,
  username: string,
  baseline: { level: number; elo: number; coins: number }
): Promise<PlayerAchievementProgress> {
  const client = getClient();
  const databases = new sdk.Databases(client);
  try {
    const doc = await databases.getDocument(databaseId, progressCollectionId, playerId);
    return doc as unknown as PlayerAchievementProgress;
  } catch {
    const now = new Date().toISOString();
    const doc = await databases.createDocument(
      databaseId,
      progressCollectionId,
      playerId,
      {
        playerId,
        username,
        createdAt: now,
        updatedAt: now,
        baselineLevel: baseline.level,
        baselineElo: baseline.elo,
        baselineCoins: baseline.coins,
        maxLevel: baseline.level,
        maxElo: baseline.elo,
        maxCoins: baseline.coins,
        matchesPlayed: 0,
        winStreak: 0,
        maxWinStreak: 0,
        totalVyrazecky: 0,
      }
    );
    return doc as unknown as PlayerAchievementProgress;
  }
}

export async function updateAchievementProgressAndUnlock(
  playerId: string,
  username: string,
  matchId: string,
  stats: MatchAchievementStats
): Promise<AchievementDefinition[]> {
  let nextMatchesPlayed = 1;
  let nextWinStreak = stats.matchWon ? 1 : 0;
  let nextMaxWinStreak = nextWinStreak;
  let nextTotalVyrazecky = Number(stats.vyrazeckyAdded || 0);
  let nextMaxLevel = Number(stats.newLevel || 0);
  let nextMaxElo = Number(stats.newElo || 0);
  let nextMaxCoins = Number(stats.newCoins || 0);

  try {
    const progress = await getOrCreateProgress(playerId, username, {
      level: stats.newLevel,
      elo: stats.newElo,
      coins: stats.newCoins,
    });

    nextMatchesPlayed = Number(progress.matchesPlayed || 0) + 1;
    nextWinStreak = stats.matchWon ? Number(progress.winStreak || 0) + 1 : 0;
    nextMaxWinStreak = Math.max(Number(progress.maxWinStreak || 0), nextWinStreak);
    nextTotalVyrazecky = Number(progress.totalVyrazecky || 0) + Number(stats.vyrazeckyAdded || 0);

    nextMaxLevel = Math.max(Number(progress.maxLevel || 0), Number(stats.newLevel || 0));
    nextMaxElo = Math.max(Number(progress.maxElo || 0), Number(stats.newElo || 0));
    nextMaxCoins = Math.max(Number(progress.maxCoins || 0), Number(stats.newCoins || 0));

    const client = getClient();
    const databases = new sdk.Databases(client);
    await databases.updateDocument(databaseId, progressCollectionId, progress.playerId, {
      matchesPlayed: nextMatchesPlayed,
      winStreak: nextWinStreak,
      maxWinStreak: nextMaxWinStreak,
      totalVyrazecky: nextTotalVyrazecky,
      maxLevel: nextMaxLevel,
      maxElo: nextMaxElo,
      maxCoins: nextMaxCoins,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating achievement progress, using fallback unlock evaluation:', error);
  }

  const unlocked: AchievementDefinition[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const requirement = def.requirement;
    if (!requirement) continue;

    const value = requirement.value ?? 1;
    let shouldUnlock = false;

    switch (requirement.type) {
      case 'level':
        shouldUnlock = nextMaxLevel >= value;
        break;
      case 'elo':
        shouldUnlock = nextMaxElo >= value;
        break;
      case 'coins':
        shouldUnlock = nextMaxCoins >= value;
        break;
      case 'matches_played':
        shouldUnlock = nextMatchesPlayed >= value;
        break;
      case 'win_streak':
        shouldUnlock = nextMaxWinStreak >= value;
        break;
      case 'vyrazecky':
        shouldUnlock = nextTotalVyrazecky >= value;
        break;
      case 'shutout_win':
        shouldUnlock = stats.hadShutoutWin;
        break;
      case 'golden_loss':
        shouldUnlock = stats.lostByGoldenVyrazecka;
        break;
      case 'ultimate_win':
        shouldUnlock = stats.matchUltimateWin;
        break;
      case 'ultimate_lose':
        shouldUnlock = stats.matchUltimateLose;
        break;
      default:
        shouldUnlock = false;
        break;
    }

    if (shouldUnlock) {
      const res = await unlockAchievement(playerId, username, def.achievementId, {
        matchId,
        value,
      });
      if (res) unlocked.push(def);
    }
  }

  return unlocked;
}

export async function claimAchievementReward(
  playerId: string,
  achievementId: string
): Promise<{ rewardCoins: number; status: 'claimed' | 'already-claimed' | 'not-unlocked' | 'not-found' }> {
  const def = ACHIEVEMENT_DEFINITIONS.find((row) => row.achievementId === achievementId);
  if (!def) return { rewardCoins: 0, status: 'not-found' };

  const client = getClient();
  const databases = new sdk.Databases(client);

  const unlocked = await databases.listDocuments(
    databaseId,
    'player-achievements',
    [
      sdk.Query.equal('playerId', playerId),
      sdk.Query.equal('achievementId', achievementId),
      sdk.Query.limit(1)
    ]
  );

  if (!unlocked.documents.length) {
    return { rewardCoins: 0, status: 'not-unlocked' };
  }

  const claims = await databases.listDocuments(
    databaseId,
    claimsCollectionId,
    [
      sdk.Query.equal('playerId', playerId),
      sdk.Query.equal('achievementId', achievementId),
      sdk.Query.limit(1)
    ]
  );

  if (claims.documents.length) {
    return { rewardCoins: 0, status: 'already-claimed' };
  }

  await databases.createDocument(
    databaseId,
    claimsCollectionId,
    sdk.ID.unique(),
    {
      playerId,
      achievementId,
      claimedAt: new Date().toISOString(),
      rewardCoins: def.rewardCoins,
    }
  );

  return { rewardCoins: def.rewardCoins, status: 'claimed' };
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
