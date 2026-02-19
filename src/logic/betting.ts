const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'bets';

export interface BetOdds {
  match1?: number;
  match2?: number;
  match3?: number;
  vyrazacka?: number;
  total?: number;
}

export interface VyrazackaOddsRequest {
  vyrazecky?: number;
  wins?: number;
  loses?: number;
}

export interface Bet {
  $id?: string;
  playerId: string;
  username: string;
  matchId: string;
  predictions: {
    match1?: 'a' | 'b';
    match2?: 'a' | 'b';
    match3?: 'a' | 'b';
    vyrazacka?: {
      playerCounts: Record<string, number>;
    };
    _odds?: BetOdds;
    _totalLegs?: number;
  };
  betAmount: number;
  numMatches: number;
  status: 'pending' | 'won' | 'lost';
  winnings: number;
  correctPredictions: number;
  odds?: BetOdds;
  totalLegs?: number;
  $createdAt?: string;
}

// Multipliers: 1 match = x2, 2 matches = x4, 3 matches = x8
const MULTIPLIERS: Record<number, number> = {
  1: 2,
  2: 4,
  3: 8,
};

const MIN_ODDS = 1.2;
const MAX_ODDS = 6;
const HOUSE_EDGE = 0.92;

function client() {
  if (!projectId || !apiKey) throw new Error('Appwrite credentials not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function clampOdds(value: number): number {
  if (!Number.isFinite(value)) return MIN_ODDS;
  return Math.min(MAX_ODDS, Math.max(MIN_ODDS, Number(value.toFixed(2))));
}

function eloWinProb(eloA: number, eloB: number): number {
  const diff = eloB - eloA;
  return 1 / (1 + Math.pow(10, diff / 400));
}

export function getRoundOdds(
  aPlayerIds: string[],
  bPlayerIds: string[],
  playerElosById: Record<string, number>
): { a: number; b: number } {
  const aElo = Math.round(
    aPlayerIds.reduce((sum, id) => sum + (playerElosById[id] ?? 500), 0) / Math.max(1, aPlayerIds.length)
  );
  const bElo = Math.round(
    bPlayerIds.reduce((sum, id) => sum + (playerElosById[id] ?? 500), 0) / Math.max(1, bPlayerIds.length)
  );
  const probA = Math.max(0.05, Math.min(0.95, eloWinProb(aElo, bElo)));
  const probB = 1 - probA;
  return {
    a: clampOdds((1 / probA) * HOUSE_EDGE),
    b: clampOdds((1 / probB) * HOUSE_EDGE),
  };
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= k; i += 1) {
    sum += (Math.pow(lambda, i) * Math.exp(-lambda)) / factorial(i);
  }
  return Math.min(1, Math.max(0, sum));
}

export function getVyrazackaOdds(
  stats: VyrazackaOddsRequest,
  minCount: number,
  rounds: number = 3
): number {
  const games = Math.max(1, Number(stats.wins || 0) + Number(stats.loses || 0));
  const vyrazecky = Math.max(0, Number(stats.vyrazecky || 0));
  const perRound = vyrazecky / games;
  const lambda = Math.max(0.05, perRound * rounds);
  let prob = 1 - poissonCdf(Math.max(0, minCount - 1), lambda);
  if (minCount >= 2) {
    const penalty = Math.pow(0.5, minCount - 1);
    prob *= penalty;
  }
  return clampOdds((1 / Math.max(0.05, prob)) * HOUSE_EDGE);
}

function parseBetDoc(doc: any): Bet {
  const predictions = typeof doc.predictions === 'string' ? JSON.parse(doc.predictions) : doc.predictions;
  return {
    $id: doc.$id,
    playerId: doc.playerId,
    username: doc.username,
    matchId: doc.matchId,
    predictions,
    betAmount: doc.betAmount,
    numMatches: doc.numMatches,
    status: doc.status,
    winnings: doc.winnings || 0,
    correctPredictions: doc.correctPredictions || 0,
    odds: predictions?._odds,
    totalLegs: predictions?._totalLegs,
    $createdAt: doc.$createdAt,
  };
}

export async function placeBet(b: Omit<Bet, '$id' | 'status' | 'winnings' | 'correctPredictions' | 'odds' | 'totalLegs'>): Promise<Bet> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  const doc = await databases.createDocument(
    databaseId,
    collectionId,
    'unique()',
    {
      playerId: b.playerId,
      username: b.username,
      matchId: b.matchId,
      predictions: JSON.stringify(b.predictions),
      betAmount: b.betAmount,
      numMatches: b.numMatches,
      status: 'pending',
      winnings: 0,
      correctPredictions: 0,
    }
  );
  return parseBetDoc(doc);
}

export async function getBetsForMatch(matchId: string): Promise<Bet[]> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  try {
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal('matchId', matchId),
      sdk.Query.orderDesc('$createdAt'),
    ]);
    return (res.documents || []).map(parseBetDoc);
  } catch (e) {
    console.error('getBetsForMatch error', e);
    return [];
  }
}

export async function getBetsForPlayer(playerId: string): Promise<Bet[]> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  try {
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal('playerId', playerId),
      sdk.Query.orderDesc('$createdAt'),
    ]);
    return (res.documents || []).map(parseBetDoc);
  } catch (e) {
    console.error('getBetsForPlayer error', e);
    return [];
  }
}

/*
 Resolve bets for a finished match.
 scores: array of rounds with scoreA/scoreB
*/
export async function resolveBets(matchId: string, scores: any[]): Promise<void> {
  const cli = client();
  const databases = new sdk.Databases(cli);

  const allBets = await getBetsForMatch(matchId);
  const pending = allBets.filter(b => b.status === 'pending');

  const winners: ('a'|'b'|'tie')[] = scores.map((s: any) => {
    const a = Number(s.scoreA || 0), b = Number(s.scoreB || 0);
    if (a > b) return 'a';
    if (b > a) return 'b';
    return 'tie';
  });

  // sum vyrazacka across rounds per player
  const vyrazackaTotals: Record<string, number> = {};
  scores.forEach((s: any) => {
    if (!s?.vyrazacka) return;
    Object.entries(s.vyrazacka).forEach(([playerId, count]: [string, any]) => {
      vyrazackaTotals[playerId] = (vyrazackaTotals[playerId] || 0) + Number(count || 0);
    });
  });

  for (const bet of pending) {
    let correct = 0;
    if (bet.predictions.match1 && winners[0] === bet.predictions.match1) correct++;
    if (bet.predictions.match2 && winners[1] === bet.predictions.match2) correct++;
    if (bet.predictions.match3 && winners[2] === bet.predictions.match3) correct++;

    if (bet.predictions.vyrazacka) {
      Object.entries(bet.predictions.vyrazacka.playerCounts || {}).forEach(([playerId, minCount]) => {
        const total = vyrazackaTotals[playerId] || 0;
        if (total >= Number(minCount || 0)) correct++;
      });
    }

    const vyrazackaLegs = bet.predictions.vyrazacka
      ? Object.keys(bet.predictions.vyrazacka.playerCounts || {}).length
      : 0;
    const totalLegs = bet.totalLegs ?? (bet.numMatches + vyrazackaLegs);
    const won = totalLegs > 0 && correct === totalLegs;
    const fallbackOdds = MULTIPLIERS[bet.numMatches] || 1;
    const totalOdds = bet.odds?.total || fallbackOdds;
    const winnings = won ? (bet.betAmount * totalOdds) : 0;

    try {
      await databases.updateDocument(databaseId, collectionId, bet.$id, {
        status: won ? 'won' : 'lost',
        winnings,
        correctPredictions: correct,
      });
    } catch (e) {
      console.error('failed updating bet doc', e);
    }

    if (won) {
      try {
        const { getPlayerProfile, updatePlayerStats } = await import('./profile');
        const profile = await getPlayerProfile(bet.playerId);
        if (profile) {
          await updatePlayerStats(profile.$id, {
            coins: (profile.coins || 0) + winnings,
          });
        }
      } catch (e) {
        console.error('failed awarding winnings', e);
      }
    }
  }
}

export { MULTIPLIERS };
