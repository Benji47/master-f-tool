const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

const TOURNAMENTS_COLLECTION = 'tournaments';
const TEAMS_COLLECTION = 'tournament-teams';
const MATCHES_COLLECTION = 'tournament-matches';
const RESULTS_COLLECTION = 'tournament-results';

if (!projectId || !apiKey) {
  console.warn('⚠️ Missing APPWRITE_PROJECT or APPWRITE_KEY env vars for tournament logic');
}

// ============ Types ============

export type TournamentTeamPlayer = {
  id: string; // username/userId
  username: string;
  elo: number;
};

export type TournamentTeam = {
  $id: string;
  tournamentId: string;
  player1: TournamentTeamPlayer;
  player2?: TournamentTeamPlayer; // undefined if looking for partner
  status: 'looking' | 'locked' | 'disqualified'; // looking = waiting for player2, locked = both confirmed, disqualified = removed from tournament
  createdAt?: string;
  lockedAt?: string;
};

export type TournamentMatch = {
  $id: string;
  tournamentId: string;
  team1Id: string;
  team2Id?: string; // undefined if bye match
  bracket: 'winners' | 'losers' | 'final'; // which bracket
  round: number; // 1, 2, 3, etc
  position: number; // position in the round (for seeding)
  isBye?: boolean; // true if this is a bye match
  winner?: string; // team ID of winner, or 'bye' for bye matches
  isFinal?: boolean; // true if this is the grand final
  loserBracketNextMatch?: string; // reference to next losers bracket match for the loser
  state: 'waiting' | 'playing' | 'finished'; // match state
  scores?: {
    team1Score: number;
    team2Score: number;
  };
  createdAt?: string;
};

export type Tournament = {
  $id: string;
  name: string;
  description?: string;
  status: 'setup' | 'registration' | 'started' | 'finished'; // setup = creating, registration = teams signing up, started = bracket active, finished = complete
  creatorId: string;
  maxTeams: number;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  rewards: string;
};

export type TournamentResult = {
  $id: string;
  tournamentId: string;
  rank: 1 | 2 | 3 | 4; // 1st, 2nd, 3rd, 4th place
  teamId: string;
  player1Id: string;
  player2Id: string;
  coinsAwarded: number;
  medalType: 'gold' | 'silver' | 'bronze' | 'bronze'; // gold, silver, bronze
};

// ============ Client Helper ============

function client() {
  if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite credentials/database not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

// ============ Tournament CRUD ============

export async function createTournament(
  creatorId: string,
  name: string,
  maxTeams: number = 16,
  description?: string
): Promise<Tournament> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const doc = await databases.createDocument(
      databaseId,
      TOURNAMENTS_COLLECTION,
      sdk.ID.unique(),
      {
        name,
        description: description ?? '',
        status: 'setup',
        creatorId,
        maxTeams,
        rewards: 
        JSON.stringify({
            first: 500000,
            second: 300000,
            third: 200000,
            fourth: 50000,
        }),
      }
    );

    return doc as Tournament;
  } catch (err: any) {
    console.error('Create tournament error:', err);
    throw err;
  }
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const doc = await databases.getDocument(databaseId, TOURNAMENTS_COLLECTION, tournamentId);
    return doc as Tournament;
  } catch (err: any) {
    if (err.code === 404) return null;
    console.error('Get tournament error:', err);
    throw err;
  }
}

export async function listTournaments(status?: string): Promise<Tournament[]> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const queries = [];
    if (status) {
      queries.push(sdk.Query.equal('status', status));
    }
    queries.push(sdk.Query.limit(100));

    const res = await databases.listDocuments(databaseId, TOURNAMENTS_COLLECTION, queries);
    return (res.documents || []) as Tournament[];
  } catch (err: any) {
    console.error('List tournaments error:', err);
    throw err;
  }
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: 'setup' | 'registration' | 'started' | 'finished'
): Promise<Tournament> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const updates: any = { status };
    if (status === 'started') {
      updates.startedAt = new Date().toISOString();
    } else if (status === 'finished') {
      updates.finishedAt = new Date().toISOString();
    }

    const doc = await databases.updateDocument(databaseId, TOURNAMENTS_COLLECTION, tournamentId, updates);
    return doc as Tournament;
  } catch (err: any) {
    console.error('Update tournament status error:', err);
    throw err;
  }
}

// ============ Team Management ============

export async function createTeam(
  tournamentId: string,
  player1Id: string,
  player1Username: string,
  player1Elo: number
): Promise<TournamentTeam> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const doc = await databases.createDocument(
      databaseId,
      TEAMS_COLLECTION,
      sdk.ID.unique(),
      {
        tournamentId,
        player1: {
          id: player1Id,
          username: player1Username,
          elo: player1Elo,
        },
        player2: null,
        status: 'looking',
      }
    );

    return doc as TournamentTeam;
  } catch (err: any) {
    console.error('Create team error:', err);
    throw err;
  }
}

export async function joinTeam(
  teamId: string,
  player2Id: string,
  player2Username: string,
  player2Elo: number
): Promise<TournamentTeam> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    // Check if player is not already in another team in this tournament
    const team = await databases.getDocument(databaseId, TEAMS_COLLECTION, teamId);
    if (team.player1.id === player2Id) {
      throw new Error('You cannot join your own team');
    }

    const doc = await databases.updateDocument(databaseId, TEAMS_COLLECTION, teamId, {
      player2: {
        id: player2Id,
        username: player2Username,
        elo: player2Elo,
      },
      status: 'locked',
      lockedAt: new Date().toISOString(),
    });

    return doc as TournamentTeam;
  } catch (err: any) {
    console.error('Join team error:', err);
    throw err;
  }
}

export async function getTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const res = await databases.listDocuments(databaseId, TEAMS_COLLECTION, [
      sdk.Query.equal('tournamentId', tournamentId),
      sdk.Query.limit(200),
    ]);
    return res.documents as TournamentTeam[];
  } catch (err: any) {
    console.error('Get tournament teams error:', err);
    throw err;
  }
}

export async function getTeam(teamId: string): Promise<TournamentTeam | null> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const doc = await databases.getDocument(databaseId, TEAMS_COLLECTION, teamId);
    return doc as TournamentTeam;
  } catch (err: any) {
    if (err.code === 404) return null;
    console.error('Get team error:', err);
    throw err;
  }
}

export async function getPlayerTeams(tournamentId: string, playerId: string): Promise<TournamentTeam[]> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const teams = await getTournamentTeams(tournamentId);
    return teams.filter((t) => t.player1.id === playerId || t.player2?.id === playerId);
  } catch (err: any) {
    console.error('Get player teams error:', err);
    throw err;
  }
}

// ============ Double Elimination Bracket Generation ============

/**
 * Generates a double elimination bracket for the given teams
 * Returns an array of matches organized by round
 */
export function generateDoubleEliminationBracket(
  teams: TournamentTeam[]
): TournamentMatch[] {
  const lockedTeams = teams.filter((t) => t.status === 'locked');
  const teamCount = lockedTeams.length;

  if (teamCount < 2) {
    throw new Error('Not enough teams (minimum 2) to start tournament');
  }

  const matches: TournamentMatch[] = [];
  let matchId = 0;

  // Calculate how many rounds we need and how many bye matches
  const isPowerOfTwo = (n: number) => (n & (n - 1)) === 0;
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const byeCount = nextPowerOfTwo - teamCount;

  // WINNERS BRACKET

  // Seed teams by ELO (highest gets bye if applicable)
  const seededTeams = [...lockedTeams].sort((a, b) => {
    const eloA = Math.max(a.player1.elo, a.player2?.elo ?? 0);
    const eloB = Math.max(b.player1.elo, b.player2?.elo ?? 0);
    return eloB - eloA;
  });

  // Round 1: Create initial matches + bye matches
  let round1Matches: TournamentMatch[] = [];
  let teamIndex = 0;

  for (let i = 0; i < nextPowerOfTwo / 2; i++) {
    if (i < byeCount) {
      // Bye match: one team advances automatically
      const team = seededTeams[teamIndex++];
      round1Matches.push({
        $id: `match_${matchId++}`,
        tournamentId: '', // will be filled when creating
        team1Id: team.$id,
        team2Id: undefined,
        bracket: 'winners',
        round: 1,
        position: i,
        isBye: true,
        winner: team.$id, // bye matches have automatic winner
        state: 'finished',
      });
    } else {
      // Regular match
      const team1 = seededTeams[teamIndex++];
      const team2 = seededTeams[teamIndex++];
      round1Matches.push({
        $id: `match_${matchId++}`,
        tournamentId: '', // will be filled when creating
        team1Id: team1.$id,
        team2Id: team2.$id,
        bracket: 'winners',
        round: 1,
        position: i,
        state: 'waiting',
      });
    }
  }

  matches.push(...round1Matches);

  // Generate remaining winners bracket rounds
  let currentRoundTeams = round1Matches.length;
  let currentRound = 2;

  while (currentRoundTeams > 1) {
    const nextRoundSize = currentRoundTeams / 2;

    for (let i = 0; i < nextRoundSize; i++) {
      matches.push({
        $id: `match_${matchId++}`,
        tournamentId: '', // will be filled when creating
        team1Id: '', // will be filled based on previous round winners
        team2Id: '', // will be filled based on previous round winners
        bracket: 'winners',
        round: currentRound,
        position: i,
        state: 'waiting',
      });
    }

    currentRoundTeams = nextRoundSize;
    currentRound++;
  }

  // LOSERS BRACKET - Complex structure
  // Losers bracket has double the rounds of winners bracket

  // Round 1 of losers: losers from winners round 1
  const winnersRound1Count = round1Matches.length;
  const losersRound1Count = Math.floor(winnersRound1Count / 2);

  for (let i = 0; i < losersRound1Count; i++) {
    matches.push({
      $id: `match_${matchId++}`,
      tournamentId: '', // will be filled when creating
      team1Id: '', // will be filled based on losers from winners R1
      team2Id: '', // will be filled based on losers from winners R1
      bracket: 'losers',
      round: 1,
      position: i,
      state: 'waiting',
    });
  }

  // Additional losers bracket rounds (simplified for now - full implementation would be more complex)
  // Losers bracket continues with winners from losers round feeding into next round
  let losersCurrentRound = 2;
  let losersCurrentTeams = losersRound1Count;

  while (losersCurrentTeams > 1) {
    const nextLosersRoundSize = Math.floor(losersCurrentTeams / 2);

    for (let i = 0; i < nextLosersRoundSize; i++) {
      matches.push({
        $id: `match_${matchId++}`,
        tournamentId: '', // will be filled when creating
        team1Id: '', // will be filled based on previous losers round winners
        team2Id: '', // will be filled based on previous losers round winners
        bracket: 'losers',
        round: losersCurrentRound,
        position: i,
        state: 'waiting',
      });
    }

    losersCurrentTeams = nextLosersRoundSize;
    losersCurrentRound++;
  }

  // GRAND FINALS
  // Winner of winners bracket vs winner of losers bracket
  matches.push({
    $id: `match_${matchId++}`,
    tournamentId: '', // will be filled when creating
    team1Id: '', // winners bracket winner
    team2Id: '', // losers bracket winner
    bracket: 'final',
    round: 1,
    position: 0,
    isFinal: true,
    state: 'waiting',
  });

  return matches;
}

// ============ Match Management ============

export async function createBracketMatches(
  tournamentId: string,
  bracketMatches: TournamentMatch[]
): Promise<TournamentMatch[]> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const createdMatches: TournamentMatch[] = [];

    for (const match of bracketMatches) {
      const doc = await databases.createDocument(
        databaseId,
        MATCHES_COLLECTION,
        sdk.ID.unique(),
        {
          tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id ?? null,
          bracket: match.bracket,
          round: match.round,
          position: match.position,
          isBye: match.isBye ?? false,
          isFinal: match.isFinal ?? false,
          state: match.isBye ? 'finished' : 'waiting',
          winner: match.isBye ? match.team1Id : null,
          scores: null,
        }
      );

      createdMatches.push(doc as TournamentMatch);
    }

    return createdMatches;
  } catch (err: any) {
    console.error('Create bracket matches error:', err);
    throw err;
  }
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const res = await databases.listDocuments(databaseId, MATCHES_COLLECTION, [
      sdk.Query.equal('tournamentId', tournamentId),
      sdk.Query.limit(500),
    ]);
    return res.documents as TournamentMatch[];
  } catch (err: any) {
    console.error('Get tournament matches error:', err);
    throw err;
  }
}

export async function getMatch(matchId: string): Promise<TournamentMatch | null> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const doc = await databases.getDocument(databaseId, MATCHES_COLLECTION, matchId);
    return doc as TournamentMatch;
  } catch (err: any) {
    if (err.code === 404) return null;
    console.error('Get match error:', err);
    throw err;
  }
}

export async function updateMatchState(
  matchId: string,
  state: 'waiting' | 'playing' | 'finished',
  team1Score?: number,
  team2Score?: number,
  winnerId?: string
): Promise<TournamentMatch> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const updates: any = { state };

    if (team1Score !== undefined && team2Score !== undefined) {
      updates.scores = {
        team1Score,
        team2Score,
      };
    }

    if (winnerId) {
      updates.winner = winnerId;
      updates.state = 'finished';
    }

    const doc = await databases.updateDocument(databaseId, MATCHES_COLLECTION, matchId, updates);
    return doc as TournamentMatch;
  } catch (err: any) {
    console.error('Update match state error:', err);
    throw err;
  }
}

// ============ Results & Rewards ============

export async function createTournamentResult(
  tournamentId: string,
  rank: 1 | 2 | 3 | 4,
  teamId: string,
  player1Id: string,
  player2Id: string,
  coinsAwarded: number,
  medalType: 'gold' | 'silver' | 'bronze'
): Promise<TournamentResult> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const doc = await databases.createDocument(
      databaseId,
      RESULTS_COLLECTION,
      sdk.ID.unique(),
      {
        tournamentId,
        rank,
        teamId,
        player1Id,
        player2Id,
        coinsAwarded,
        medalType,
      }
    );

    return doc as TournamentResult;
  } catch (err: any) {
    console.error('Create tournament result error:', err);
    throw err;
  }
}

export async function getTournamentResults(
  tournamentId: string
): Promise<TournamentResult[]> {
  const c = client();
  const databases = new sdk.Databases(c);

  try {
    const res = await databases.listDocuments(databaseId, RESULTS_COLLECTION, [
      sdk.Query.equal('tournamentId', tournamentId),
      sdk.Query.orderAsc('rank'),
    ]);
    return res.documents as TournamentResult[];
  } catch (err: any) {
    console.error('Get tournament results error:', err);
    throw err;
  }
}

// ============ Helper: Get bracket structure organized by round ============

export function organizeBracketByRound(
  matches: TournamentMatch[]
): { [bracket: string]: { [round: number]: TournamentMatch[] } } {
  const organized: { [bracket: string]: { [round: number]: TournamentMatch[] } } = {
    winners: {},
    losers: {},
    final: {},
  };

  for (const match of matches) {
    if (!organized[match.bracket]) {
      organized[match.bracket] = {};
    }
    if (!organized[match.bracket][match.round]) {
      organized[match.bracket][match.round] = [];
    }
    organized[match.bracket][match.round].push(match);
  }

  return organized;
}

// ============ Helper: Calculate average team ELO ============

export function getTeamAverageElo(team: TournamentTeam): number {
  if (!team.player2) {
    return team.player1.elo;
  }
  return Math.round((team.player1.elo + team.player2.elo) / 2);
}
