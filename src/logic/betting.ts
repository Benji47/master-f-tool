const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'bets';

export type VyrazackaOutcome = 'zero' | 'gte1' | 'gte2' | 'gte3';

export interface BetOdds {
  match1?: number;
  match2?: number;
  match3?: number;
  vyrazackaOutcome?: number;
  totalGoals?: number;
  total?: number;
}

export interface PlayerVyrazackaStats {
  vyrazecky?: number;
  wins?: number;
  loses?: number;
}

export interface TeamFormStats {
  winRate: number;
  samples: number;
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
    vyrazackaOutcome?: VyrazackaOutcome;
    totalGoals?: number;
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

const MIN_ODDS = 1.05;
const MAX_ODDS = 100;
const HOUSE_EDGE = 0.94;

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

function sanitizeWinRate(value: number | undefined): number {
  const raw = Number(value ?? 0.5);
  if (!Number.isFinite(raw)) return 0.5;
  return Math.max(0.05, Math.min(0.95, raw));
}

function getAdjustedTeamElo(
  playerIds: string[],
  playerElosById: Record<string, number>,
  recentFormById?: Record<string, TeamFormStats>
): number {
  const ids = playerIds || [];
  const sum = ids.reduce((acc, id) => {
    const baseElo = Number(playerElosById[id] ?? 500);
    const form = recentFormById?.[id];
    const winRate = sanitizeWinRate(form?.winRate);
    const samples = Math.max(0, Number(form?.samples || 0));
    const weight = Math.min(1, samples / 10) * 0.35;
    const formAdjustment = (winRate - 0.5) * 160 * weight;
    return acc + baseElo + formAdjustment;
  }, 0);

  return Math.round(sum / Math.max(1, ids.length));
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax));
  return sign * y;
}

function normalCdf(x: number, mean: number, std: number): number {
  if (std <= 0) return x < mean ? 0 : 1;
  return 0.5 * (1 + erf((x - mean) / (std * Math.sqrt(2))));
}

function inferProbFromOdds(odds: number): number {
  const safeOdds = Math.max(MIN_ODDS, Number(odds || MIN_ODDS));
  return Math.max(0.01, Math.min(0.99, HOUSE_EDGE / safeOdds));
}

export function getRoundOdds(
  aPlayerIds: string[],
  bPlayerIds: string[],
  playerElosById: Record<string, number>,
  recentFormById?: Record<string, TeamFormStats>
): { a: number; b: number } {
  const aElo = getAdjustedTeamElo(aPlayerIds, playerElosById, recentFormById);
  const bElo = getAdjustedTeamElo(bPlayerIds, playerElosById, recentFormById);
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

export function getVyrazackaOutcomeOdds(
  statsByPlayer: Record<string, PlayerVyrazackaStats>,
  rounds: number = 3
): Record<VyrazackaOutcome, number> {
  const players = Object.values(statsByPlayer || {});
  const perPlayerRate = players.map((stats) => {
    const games = Math.max(1, Number(stats.wins || 0) + Number(stats.loses || 0));
    const vyrazecky = Math.max(0, Number(stats.vyrazecky || 0));
    return vyrazecky / games;
  });

  const avgPerPlayer = perPlayerRate.length
    ? perPlayerRate.reduce((sum, value) => sum + value, 0) / perPlayerRate.length
    : 0.2;

  const lambda = Math.max(0.05, avgPerPlayer * rounds);
  const p0 = Math.max(0.01, Math.min(0.99, Math.exp(-lambda)));
  const p1 = Math.max(0.01, Math.min(0.99, 1 - p0));
  const p2 = Math.max(0.01, Math.min(0.99, 1 - poissonCdf(1, lambda)));
  const p3 = Math.max(0.01, Math.min(0.99, 1 - poissonCdf(2, lambda)));

  return {
    zero: clampOdds((1 / p0) * HOUSE_EDGE),
    gte1: clampOdds((1 / p1) * HOUSE_EDGE),
    gte2: clampOdds((1 / p2) * HOUSE_EDGE),
    gte3: clampOdds((1 / p3) * HOUSE_EDGE),
  };
}

export function getTotalGoalsOdds(roundOdds: { a: number; b: number }[]): Record<number, number> {
  const rounds = Math.max(1, roundOdds.length || 3);
  const closenessAvg = (roundOdds.length ? roundOdds : Array.from({ length: rounds }, () => ({ a: 2, b: 2 })))
    .map((row) => {
      const pA = inferProbFromOdds(row.a);
      const pB = inferProbFromOdds(row.b);
      return 1 - Math.abs(pA - pB);
    })
    .reduce((sum, value) => sum + value, 0) / rounds;

  const meanPerRound = 14 + closenessAvg * 4;
  const mean = meanPerRound * rounds;
  const std = 4.6;

  const odds: Record<number, number> = {};
  for (let total = 30; total <= 57; total += 1) {
    const pLow = normalCdf(total - 0.5, mean, std);
    const pHigh = normalCdf(total + 0.5, mean, std);
    const prob = Math.max(0.0005, Math.min(0.99, pHigh - pLow));
    odds[total] = Math.min(20, clampOdds((1 / prob) * HOUSE_EDGE));
  }

  return odds;
}

function parseBetDoc(doc: any): Bet {
  const predictions = typeof doc.predictions === 'string' ? JSON.parse(doc.predictions) : doc.predictions;
  const legacyVyrazackaLegs = predictions?.vyrazacka?.playerCounts
    ? Object.keys(predictions.vyrazacka.playerCounts).length
    : 0;
  const derivedLegs =
    (predictions?.match1 ? 1 : 0) +
    (predictions?.match2 ? 1 : 0) +
    (predictions?.match3 ? 1 : 0) +
    (predictions?.vyrazackaOutcome ? 1 : 0) +
    (Number.isFinite(Number(predictions?.totalGoals)) && predictions?.totalGoals != 0 ? 1 : 0) +
    legacyVyrazackaLegs;

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
    totalLegs: predictions?._totalLegs ?? derivedLegs,
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

export async function getAllBets(limit: number = 200): Promise<Bet[]> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  try {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(safeLimit),
    ]);
    return (res.documents || []).map(parseBetDoc);
  } catch (e) {
    console.error('getAllBets error', e);
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

  const totalVyrazacky = scores.reduce((sum: number, s: any) => {
    if (!s?.vyrazacka || typeof s.vyrazacka !== 'object') return sum;
    const rowSum = Object.values(s.vyrazacka).reduce((acc: number, value: any) => acc + Number(value || 0), 0);
    return sum + rowSum;
  }, 0);

  const totalGoals = scores.reduce((sum: number, s: any) => sum + Number(s?.scoreA || 0) + Number(s?.scoreB || 0), 0);

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
    let totalLegs = 0;
    if (bet.predictions.match1 && winners[0] === bet.predictions.match1) correct++;
    if (bet.predictions.match1) totalLegs++;
    if (bet.predictions.match2 && winners[1] === bet.predictions.match2) correct++;
    if (bet.predictions.match2) totalLegs++;
    if (bet.predictions.match3 && winners[2] === bet.predictions.match3) correct++;
    if (bet.predictions.match3) totalLegs++;

    if (bet.predictions.vyrazackaOutcome) {
      totalLegs++;
      const outcome = bet.predictions.vyrazackaOutcome;
      const vyResult =
        (outcome === 'zero' && totalVyrazacky === 0) ||
        (outcome === 'gte1' && totalVyrazacky >= 1) ||
        (outcome === 'gte2' && totalVyrazacky >= 2) ||
        (outcome === 'gte3' && totalVyrazacky >= 3);
      if (vyResult) correct++;
    }

    if (Number.isFinite(Number(bet.predictions.totalGoals))) {
      totalLegs++;
      if (Number(bet.predictions.totalGoals) === totalGoals) correct++;
    }

    if (totalLegs === 0 && bet.predictions.vyrazacka) {
      Object.entries(bet.predictions.vyrazacka.playerCounts || {}).forEach(([playerId, minCount]) => {
        totalLegs++;
        const total = vyrazackaTotals[playerId] || 0;
        if (total >= Number(minCount || 0)) correct++;
      });
    }

    totalLegs = Math.max(totalLegs, bet.totalLegs ?? 0);
    const won = totalLegs > 0 && correct === totalLegs;
    const totalOdds = Number(bet.odds?.total || 1);
    const winnings = won ? Math.max(0, Math.round(bet.betAmount * totalOdds)) : 0;

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
