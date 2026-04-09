/**
 * In-memory pre-computed stats. Built once at server start from match history,
 * then updated incrementally after each match finish. Zero DB reads for
 * lobby season view, leaderboard golden/duo tabs.
 */

// ---- Types ----

export interface SeasonPlayerStats {
  wins: number; loses: number; elo: number; eloStart: number; xp: number;
  vyrazecky: number; goals_scored: number; goals_conceded: number;
  ultimate_wins: number; ultimate_loses: number;
  ten_zero_wins: number; ten_zero_loses: number; coins: number;
}

export interface GoldenTeamEntry {
  teamIds: string[]; teamNames: string[]; count: number;
  scorers: { id: string; username: string; count: number }[];
}

export interface DuoEntry {
  ids: string[]; names: string[]; wins: number; losses: number; total: number;
}

export interface ComputedStats {
  seasonStats: Record<string, Record<string, SeasonPlayerStats>>;
  seasonGlobalStats: Record<string, { totalMatches: number; totalGoals: number; totalPodlezani: number; totalVyrazecka: number }>;
  goldenScored: GoldenTeamEntry[];
  goldenReceived: GoldenTeamEntry[];
  duoStats: DuoEntry[];
  ready: boolean;
}

// ---- Singleton ----

let STATS: ComputedStats = emptyStats();

function emptyStats(): ComputedStats {
  return { seasonStats: {}, seasonGlobalStats: {}, goldenScored: [], goldenReceived: [], duoStats: [], ready: false };
}

export function getComputedStats(): ComputedStats { return STATS; }
export function isReady(): boolean { return STATS.ready; }

// ---- Build from full match history (called once at server start) ----

export function buildFromMatchHistory(
  allMatches: { players: any[]; scores: any[]; createdAt?: string; $createdAt?: string; $id?: string; matchId?: string }[],
  getSeasonIndex: (date: Date) => number,
): void {
  const fresh = emptyStats();
  const goldenScoredMap = new Map<string, InternalGolden>();
  const goldenReceivedMap = new Map<string, InternalGolden>();
  const duoMap = new Map<string, DuoEntry>();

  for (const match of allMatches) {
    processMatch(fresh, match, getSeasonIndex, goldenScoredMap, goldenReceivedMap, duoMap);
  }

  fresh.goldenScored = finalizeGoldenMap(goldenScoredMap);
  fresh.goldenReceived = finalizeGoldenMap(goldenReceivedMap);
  fresh.duoStats = Array.from(duoMap.values());
  fresh.ready = true;
  STATS = fresh;
  console.log(`[computedStats] built from ${allMatches.length} matches`);
}

// ---- Append a single match (called after match finish) ----

export function appendMatch(
  match: { players: any[]; scores: any[]; createdAt?: string },
  getSeasonIndex: (date: Date) => number,
): void {
  if (!STATS.ready) return;
  const goldenScoredMap = goldenArrayToMap(STATS.goldenScored);
  const goldenReceivedMap = goldenArrayToMap(STATS.goldenReceived);
  const duoMap = duoArrayToMap(STATS.duoStats);

  processMatch(STATS, match, getSeasonIndex, goldenScoredMap, goldenReceivedMap, duoMap);

  STATS.goldenScored = finalizeGoldenMap(goldenScoredMap);
  STATS.goldenReceived = finalizeGoldenMap(goldenReceivedMap);
  STATS.duoStats = Array.from(duoMap.values());
}

// ---- Core processing for one match ----

interface InternalGolden {
  teamIds: string[]; teamNames: string[]; count: number;
  scorers: Record<string, { id: string; username: string; count: number }>;
}

function processMatch(
  stats: ComputedStats,
  match: any,
  getSeasonIndex: (date: Date) => number,
  goldenScoredMap: Map<string, InternalGolden>,
  goldenReceivedMap: Map<string, InternalGolden>,
  duoMap: Map<string, DuoEntry>,
) {
  const players: any[] = match.players || [];
  const scores: any[] = match.scores || [];
  const matchDate = new Date(match.createdAt || match.$createdAt || Date.now());
  const seasonIdx = String(getSeasonIndex(matchDate));

  if (!stats.seasonStats[seasonIdx]) stats.seasonStats[seasonIdx] = {};
  if (!stats.seasonGlobalStats[seasonIdx]) stats.seasonGlobalStats[seasonIdx] = { totalMatches: 0, totalGoals: 0, totalPodlezani: 0, totalVyrazecka: 0 };
  const sg = stats.seasonGlobalStats[seasonIdx];
  const nameById = new Map<string, string>(players.map((p: any) => [p.id, p.username]));

  for (const s of scores) {
    const a: string[] = Array.isArray(s.a) ? s.a : [];
    const b: string[] = Array.isArray(s.b) ? s.b : [];
    const scoreA = Number(s.scoreA || 0);
    const scoreB = Number(s.scoreB || 0);

    sg.totalMatches += 1;
    sg.totalGoals += scoreA + scoreB;
    if ((scoreA === 10 && scoreB === 0) || (scoreB === 10 && scoreA === 0)) sg.totalPodlezani += 1;

    if (s.vyrazacka && typeof s.vyrazacka === 'object') {
      for (const [pid, cnt] of Object.entries(s.vyrazacka)) {
        sg.totalVyrazecka += Number(cnt || 0);
        ensure(stats.seasonStats[seasonIdx], pid);
        stats.seasonStats[seasonIdx][pid].vyrazecky += Number(cnt || 0);
      }
    }

    const winSide = scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : null;

    for (const pid of a) {
      ensure(stats.seasonStats[seasonIdx], pid);
      const ps = stats.seasonStats[seasonIdx][pid];
      ps.goals_scored += scoreA; ps.goals_conceded += scoreB;
      if (winSide === 'a') { ps.wins += 1; ps.coins += 200 + scoreA * 2; }
      else if (winSide === 'b') { ps.loses += 1; ps.coins += 100 + scoreA * 2; }
      if (scoreA === 10 && scoreB === 0) ps.ten_zero_wins += 1;
      if (scoreB === 10 && scoreA === 0) ps.ten_zero_loses += 1;
    }
    for (const pid of b) {
      ensure(stats.seasonStats[seasonIdx], pid);
      const ps = stats.seasonStats[seasonIdx][pid];
      ps.goals_scored += scoreB; ps.goals_conceded += scoreA;
      if (winSide === 'b') { ps.wins += 1; ps.coins += 200 + scoreB * 2; }
      else if (winSide === 'a') { ps.loses += 1; ps.coins += 100 + scoreB * 2; }
      if (scoreB === 10 && scoreA === 0) ps.ten_zero_wins += 1;
      if (scoreA === 10 && scoreB === 0) ps.ten_zero_loses += 1;
    }

    if (a.length === 2 && winSide) updateDuo(duoMap, a, nameById, winSide === 'a');
    if (b.length === 2 && winSide) updateDuo(duoMap, b, nameById, winSide === 'b');

    // Golden vyrazecka
    const golden = s?.goldenVyrazacka;
    if (golden?.playerId) {
      let side = golden.side;
      if (side !== 'a' && side !== 'b') {
        if (a.includes(golden.playerId)) side = 'a';
        else if (b.includes(golden.playerId)) side = 'b';
      }
      if (side === 'a' || side === 'b') {
        addGolden(goldenScoredMap, side === 'a' ? a : b, nameById, golden.playerId);
        addGolden(goldenReceivedMap, side === 'a' ? b : a, nameById, golden.playerId);
      }
    }
  }

  for (const p of players) {
    ensure(stats.seasonStats[seasonIdx], p.id);
    const ps = stats.seasonStats[seasonIdx][p.id];
    ps.elo = Number(p.newElo || p.elo || 500);
    if (ps.eloStart === 500 && p.oldElo) ps.eloStart = Number(p.oldElo);
    if (Number(p.winsAdd || 0) >= 3) ps.ultimate_wins += 1;
    if (Number(p.losesAdd || 0) >= 3) ps.ultimate_loses += 1;
    ps.xp += Number(p.xpGain || 0);
  }
}

// ---- Helpers ----

function ensure(map: Record<string, SeasonPlayerStats>, pid: string) {
  if (!map[pid]) {
    map[pid] = { wins: 0, loses: 0, elo: 500, eloStart: 500, xp: 0, vyrazecky: 0, goals_scored: 0, goals_conceded: 0, ultimate_wins: 0, ultimate_loses: 0, ten_zero_wins: 0, ten_zero_loses: 0, coins: 0 };
  }
}

function updateDuo(map: Map<string, DuoEntry>, ids: string[], nameById: Map<string, string>, won: boolean) {
  const sorted = [...ids].sort();
  const key = sorted.join('|');
  if (!map.has(key)) map.set(key, { ids: sorted, names: sorted.map(id => nameById.get(id) || id), wins: 0, losses: 0, total: 0 });
  const e = map.get(key)!;
  e.total += 1;
  if (won) e.wins += 1; else e.losses += 1;
}

function addGolden(map: Map<string, InternalGolden>, teamIds: string[], nameById: Map<string, string>, scorerId: string) {
  const sorted = [...teamIds].sort();
  const key = sorted.join('|');
  if (!map.has(key)) map.set(key, { teamIds: sorted, teamNames: sorted.map(id => nameById.get(id) || id), count: 0, scorers: {} });
  const e = map.get(key)!;
  e.count += 1;
  if (!e.scorers[scorerId]) e.scorers[scorerId] = { id: scorerId, username: nameById.get(scorerId) || scorerId, count: 0 };
  e.scorers[scorerId].count += 1;
}

function finalizeGoldenMap(map: Map<string, InternalGolden>): GoldenTeamEntry[] {
  return Array.from(map.values())
    .map(e => ({ teamIds: e.teamIds, teamNames: e.teamNames, count: e.count, scorers: Object.values(e.scorers).sort((a, b) => b.count - a.count) }))
    .sort((a, b) => b.count - a.count);
}

function goldenArrayToMap(arr: GoldenTeamEntry[]): Map<string, InternalGolden> {
  const map = new Map<string, InternalGolden>();
  for (const e of arr || []) {
    const key = (e.teamIds || []).slice().sort().join('|');
    const scorers: Record<string, { id: string; username: string; count: number }> = {};
    for (const s of e.scorers || []) scorers[s.id] = { ...s };
    map.set(key, { teamIds: e.teamIds, teamNames: e.teamNames, count: e.count, scorers });
  }
  return map;
}

function duoArrayToMap(arr: DuoEntry[]): Map<string, DuoEntry> {
  const map = new Map<string, DuoEntry>();
  for (const e of arr || []) map.set((e.ids || []).slice().sort().join('|'), { ...e });
  return map;
}
