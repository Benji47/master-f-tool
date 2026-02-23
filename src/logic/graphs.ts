const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

export type EloDataPoint = {
  date: string;
  elo: number;
  matchId: string;
};

export type XPDataPoint = {
  date: string;
  xp: number;
  matchId: string;
};

export type VyrazeckaDataPoint = {
  date: string;
  vyrazecka: number;
  matchId: string;
};

export type GamesDataPoint = {
  date: string;
  games: number;
  matchId: string;
};

export type PlayerEloHistory = {
  playerId: string;
  username: string;
  dataPoints: EloDataPoint[];
};

export type PlayerXPHistory = {
  playerId: string;
  username: string;
  dataPoints: XPDataPoint[];
};

export type PlayerVyrazeckaHistory = {
  playerId: string;
  username: string;
  dataPoints: VyrazeckaDataPoint[];
};

export type PlayerGamesHistory = {
  playerId: string;
  username: string;
  dataPoints: GamesDataPoint[];
};

/**
 * Get Elo history for all players by reconstructing from match history
 */
export async function getAllPlayersEloHistory(): Promise<PlayerEloHistory[]> {
  if (!projectId || !apiKey || !databaseId) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    // Fetch all match history, ordered by creation date
    const response = await databases.listDocuments(
      databaseId,
      'matches_history',
      [
        sdk.Query.orderAsc('$createdAt'),
        sdk.Query.limit(1000) // Adjust if needed
      ]
    );

    const playerHistories = new Map<string, PlayerEloHistory>();

    // Temporary storage for all data points
    const tempPlayerData = new Map<string, { username: string; points: Array<{ date: Date; elo: number; matchId: string }> }>();

    // Process each match in chronological order
    for (const match of response.documents) {
      const playersJson = match.players_json ?? match.players ?? '[]';
      let players: any[] = [];

      try {
        if (typeof playersJson === 'string') {
          players = JSON.parse(playersJson);
        } else {
          players = playersJson;
        }
      } catch (e) {
        console.warn('Failed to parse players_json for match', match.$id);
        continue;
      }

      // Collect all data points for each player
      for (const player of players) {
        if (!tempPlayerData.has(player.id)) {
          tempPlayerData.set(player.id, {
            username: player.username,
            points: []
          });
        }

        const data = tempPlayerData.get(player.id)!;
        const matchDate = new Date(match.$createdAt);
        
        // Add the starting Elo if this is the first match
        if (data.points.length === 0) {
          data.points.push({
            date: matchDate,
            elo: player.oldElo,
            matchId: match.matchId || match.$id
          });
        }

        // Add the ending Elo after this match
        data.points.push({
          date: matchDate,
          elo: player.newElo,
          matchId: match.matchId || match.$id
        });
      }
    }

    // Aggregate by day - keep only the last Elo value for each day
    const playerEntries = Array.from(tempPlayerData.entries());
    for (const [playerId, data] of playerEntries) {
      const dailyElo = new Map<string, { elo: number; matchId: string; date: Date }>();

      for (const point of data.points) {
        const dayKey = point.date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Keep the last Elo value for each day
        if (!dailyElo.has(dayKey) || point.date >= dailyElo.get(dayKey)!.date) {
          dailyElo.set(dayKey, {
            elo: point.elo,
            matchId: point.matchId,
            date: point.date
          });
        }
      }

      // Convert to array and sort by date
      const sortedDataPoints = Array.from(dailyElo.entries())
        .map(([dayKey, data]) => ({
          date: dayKey,
          elo: data.elo,
          matchId: data.matchId
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      playerHistories.set(playerId, {
        playerId,
        username: data.username,
        dataPoints: sortedDataPoints
      });
    }

    return Array.from(playerHistories.values());
  } catch (err: any) {
    console.error('Error fetching Elo history:', err);
    throw new Error(err?.message || 'Failed to fetch Elo history');
  }
}

/**
 * Get Elo history for specific players
 */
export async function getPlayersEloHistory(playerIds: string[]): Promise<PlayerEloHistory[]> {
  const allHistories = await getAllPlayersEloHistory();
  return allHistories.filter(h => playerIds.includes(h.playerId));
}

/**
 * Get XP history for all players - tracks cumulative XP from match history
 */
export async function getAllPlayersXPHistory(): Promise<PlayerXPHistory[]> {
  if (!projectId || !apiKey || !databaseId) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      'matches_history',
      [
        sdk.Query.orderAsc('$createdAt'),
        sdk.Query.limit(1000)
      ]
    );

    const playerHistories = new Map<string, PlayerXPHistory>();
    const tempPlayerData = new Map<string, { username: string; cumulativeXp: number; points: Array<{ date: Date; xp: number; matchId: string }> }>();

    for (const match of response.documents) {
      const playersJson = match.players_json ?? match.players ?? '[]';
      let players: any[] = [];

      try {
        if (typeof playersJson === 'string') {
          players = JSON.parse(playersJson);
        } else {
          players = playersJson;
        }
      } catch (e) {
        console.warn('Failed to parse players_json for match', match.$id);
        continue;
      }

      for (const player of players) {
        if (!tempPlayerData.has(player.id)) {
          tempPlayerData.set(player.id, {
            username: player.username,
            cumulativeXp: 0,
            points: []
          });
        }

        const data = tempPlayerData.get(player.id)!;
        data.cumulativeXp += player.xpGain || 0;
        const matchDate = new Date(match.$createdAt);
        
        data.points.push({
          date: matchDate,
          xp: data.cumulativeXp,
          matchId: match.matchId || match.$id
        });
      }
    }

    const playerEntries = Array.from(tempPlayerData.entries());
    for (const [playerId, data] of playerEntries) {
      const sortedDataPoints = data.points
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((p) => ({
          date: p.date.toISOString().split('T')[0],
          xp: p.xp,
          matchId: p.matchId
        }));

      playerHistories.set(playerId, {
        playerId,
        username: data.username,
        dataPoints: sortedDataPoints
      });
    }

    return Array.from(playerHistories.values());
  } catch (err: any) {
    console.error('Error fetching XP history:', err);
    throw new Error(err?.message || 'Failed to fetch XP history');
  }
}

/**
 * Get Vyrážečka history for all players - tracks cumulative vyrážečka count
 */
export async function getAllPlayersVyrazeckaHistory(): Promise<PlayerVyrazeckaHistory[]> {
  if (!projectId || !apiKey || !databaseId) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      'matches_history',
      [
        sdk.Query.orderAsc('$createdAt'),
        sdk.Query.limit(1000)
      ]
    );

    const playerHistories = new Map<string, PlayerVyrazeckaHistory>();
    const tempPlayerData = new Map<string, { username: string; cumulativeVyrazecka: number; points: Array<{ date: Date; vyrazecka: number; matchId: string }> }>();

    for (const match of response.documents) {
      const playersJson = match.players_json ?? match.players ?? '[]';
      const scoresJson = match.scores_json ?? '[]';
      let players: any[] = [];
      let scores: any[] = [];

      try {
        if (typeof playersJson === 'string') {
          players = JSON.parse(playersJson);
        } else {
          players = playersJson;
        }
      } catch (e) {
        console.warn('Failed to parse players_json for match', match.$id);
        continue;
      }

      try {
        if (typeof scoresJson === 'string') {
          scores = JSON.parse(scoresJson);
        } else {
          scores = scoresJson;
        }
      } catch (e) {
        // Scores might be empty, that's OK
        scores = [];
      }

      // Count vyrážečka per player from scores
      const vyrazeckaPerPlayer: Record<string, number> = {};
      for (const score of scores) {
        if (score.vyrazacka) {
          for (const [playerId, count] of Object.entries(score.vyrazacka)) {
            vyrazeckaPerPlayer[playerId] = (vyrazeckaPerPlayer[playerId] || 0) + (count as number);
          }
        }
      }

      for (const player of players) {
        if (!tempPlayerData.has(player.id)) {
          tempPlayerData.set(player.id, {
            username: player.username,
            cumulativeVyrazecka: 0,
            points: []
          });
        }

        const data = tempPlayerData.get(player.id)!;
        data.cumulativeVyrazecka += vyrazeckaPerPlayer[player.id] || 0;
        const matchDate = new Date(match.$createdAt);
        
        data.points.push({
          date: matchDate,
          vyrazecka: data.cumulativeVyrazecka,
          matchId: match.matchId || match.$id
        });
      }
    }

    const playerEntries = Array.from(tempPlayerData.entries());
    for (const [playerId, data] of playerEntries) {
      const sortedDataPoints = data.points
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((p) => ({
          date: p.date.toISOString().split('T')[0],
          vyrazecka: p.vyrazecka,
          matchId: p.matchId
        }));

      playerHistories.set(playerId, {
        playerId,
        username: data.username,
        dataPoints: sortedDataPoints
      });
    }

    return Array.from(playerHistories.values());
  } catch (err: any) {
    console.error('Error fetching Vyrážečka history:', err);
    throw new Error(err?.message || 'Failed to fetch Vyrážečka history');
  }
}

/**
 * Get games history for all players
 */
export async function getAllPlayersGamesHistory(): Promise<PlayerGamesHistory[]> {
  if (!projectId || !apiKey || !databaseId) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      'matches_history',
      [
        sdk.Query.orderAsc('$createdAt'),
        sdk.Query.limit(1000)
      ]
    );

    const playerHistories = new Map<string, PlayerGamesHistory>();
    const tempPlayerData = new Map<string, { username: string; games: number; lastDate: Date; points: Array<{ date: Date; games: number; matchId: string }> }>();

    for (const match of response.documents) {
      const playersJson = match.players_json ?? match.players ?? '[]';
      let players: any[] = [];

      try {
        if (typeof playersJson === 'string') {
          players = JSON.parse(playersJson);
        } else {
          players = playersJson;
        }
      } catch (e) {
        console.warn('Failed to parse players_json for match', match.$id);
        continue;
      }

      for (const player of players) {
        if (!tempPlayerData.has(player.id)) {
          tempPlayerData.set(player.id, {
            username: player.username,
            games: 0,
            lastDate: new Date(match.$createdAt),
            points: []
          });
        }

        const data = tempPlayerData.get(player.id)!;
        data.games += 1;
        const matchDate = new Date(match.$createdAt);
        
        data.points.push({
          date: matchDate,
          games: data.games,
          matchId: match.matchId || match.$id
        });
      }
    }

    const playerEntries = Array.from(tempPlayerData.entries());
    for (const [playerId, data] of playerEntries) {
      const sortedDataPoints = data.points
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((p) => ({
          date: p.date.toISOString().split('T')[0],
          games: p.games,
          matchId: p.matchId
        }));

      playerHistories.set(playerId, {
        playerId,
        username: data.username,
        dataPoints: sortedDataPoints
      });
    }

    return Array.from(playerHistories.values());
  } catch (err: any) {
    console.error('Error fetching games history:', err);
    throw new Error(err?.message || 'Failed to fetch games history');
  }
}
