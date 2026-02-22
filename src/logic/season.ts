import { GlobalStats, PlayerProfile } from "./profile";
import { MatchHistoryDoc } from "./match";

export type StatsScope = "overall" | "current" | "season";

const SEASON_ZERO_START = new Date(process.env.SEASON_ZERO_START_DATE ?? "2025-11-24T00:00:00");
const SEASON_ONE_START = new Date(process.env.SEASON_ONE_START_DATE ?? "2026-02-24T00:00:00");
const SEASON_DURATION_MONTHS = 3;

export type SeasonWindow = {
  index: number;
  start: Date;
  end: Date;
};

export function getSeasonZeroStartDate(): Date {
  return new Date(SEASON_ZERO_START);
}

export function getSeasonDurationMonths(): number {
  return SEASON_DURATION_MONTHS;
}

export function getSeasonOneStartDate(): Date {
  return new Date(SEASON_ONE_START);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getSeasonWindow(index: number): SeasonWindow {
  const safeIndex = Math.max(0, Math.floor(index));
  if (safeIndex === 0) {
    return {
      index: 0,
      start: getSeasonZeroStartDate(),
      end: getSeasonOneStartDate(),
    };
  }

  const start = addMonths(getSeasonOneStartDate(), (safeIndex - 1) * getSeasonDurationMonths());
  const end = addMonths(start, getSeasonDurationMonths());
  return { index: safeIndex, start, end };
}

export function getCurrentSeasonIndex(now: Date = new Date()): number {
  if (now < getSeasonZeroStartDate()) return 0;
  if (now < getSeasonOneStartDate()) return 0;

  let idx = 1;
  while (idx < 500) {
    const window = getSeasonWindow(idx);
    if (now >= window.start && now < window.end) return idx;
    idx += 1;
  }

  return 0;
}

export function getSeasonLabel(index: number): string {
  return `Season ${Math.max(0, Math.floor(index))}`;
}

export function getAvailableSeasonIndexes(now: Date = new Date()): number[] {
  const current = getCurrentSeasonIndex(now);
  return Array.from({ length: current + 1 }, (_, i) => i).reverse();
}

export function getScopeFromQuery(raw: string | undefined): StatsScope {
  if (raw === "overall" || raw === "season" || raw === "current") return raw;
  return "current";
}

export function isDateInSeason(dateInput: string | Date | undefined | null, seasonIndex: number): boolean {
  if (!dateInput) return false;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return false;

  const w = getSeasonWindow(seasonIndex);
  return date >= w.start && date < w.end;
}

export function filterMatchesForSeason(matches: MatchHistoryDoc[], seasonIndex: number): MatchHistoryDoc[] {
  return matches.filter((m) => isDateInSeason(m.createdAt, seasonIndex));
}

function createEmptyPlayerStat(id: string, username: string): PlayerProfile {
  return {
    $id: id,
    userId: id,
    username,
    wins: 0,
    loses: 0,
    ultimate_wins: 0,
    ultimate_loses: 0,
    xp: 0,
    elo: 500,
    vyrazecky: 0,
    goals_scored: 0,
    goals_conceded: 0,
    ten_zero_wins: 0,
    ten_zero_loses: 0,
    coins: 0,
  };
}

function sumVyrazackyInRound(round: any): number {
  if (!round?.vyrazacka || typeof round.vyrazacka !== "object") return 0;
  return Object.values(round.vyrazacka).reduce((acc: number, value: any) => acc + Number(value || 0), 0);
}

function getPlayerRoundStats(round: any, playerId: string): {
  isWinner: boolean;
  isLoser: boolean;
  goalsScored: number;
  goalsConceded: number;
  shutoutWin: boolean;
  vyrazackaCount: number;
} {
  const a = Array.isArray(round?.a) ? round.a : [];
  const b = Array.isArray(round?.b) ? round.b : [];
  const aScore = Number(round?.scoreA || 0);
  const bScore = Number(round?.scoreB || 0);
  const inA = a.includes(playerId);
  const inB = b.includes(playerId);

  if (!inA && !inB) {
    return {
      isWinner: false,
      isLoser: false,
      goalsScored: 0,
      goalsConceded: 0,
      shutoutWin: false,
      vyrazackaCount: 0,
    };
  }

  const isWinner = inA ? aScore > bScore : bScore > aScore;
  const isLoser = inA ? aScore < bScore : bScore < aScore;
  const goalsScored = inA ? aScore : bScore;
  const goalsConceded = inA ? bScore : aScore;
  const shutoutWin = isWinner && goalsScored === 10 && goalsConceded === 0;
  const vyrazackaCount = Number(round?.vyrazacka?.[playerId] || 0);

  return {
    isWinner,
    isLoser,
    goalsScored,
    goalsConceded,
    shutoutWin,
    vyrazackaCount,
  };
}

export function aggregateSeasonStats(matches: MatchHistoryDoc[], allPlayers: PlayerProfile[]): {
  players: PlayerProfile[];
  globalStats: GlobalStats;
} {
  const playersMap = new Map<string, PlayerProfile>();
  const playerById = new Map(allPlayers.map((p) => [p.$id, p]));
  const sorted = [...matches].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tA - tB;
  });

  const seenEloStart = new Set<string>();

  const globalStats: GlobalStats = {
    totalMatches: 0,
    totalGoals: 0,
    totalPodlezani: 0,
    totalVyrazecka: 0,
  };

  for (const match of sorted) {
    const rounds = Array.isArray(match.scores) ? match.scores : [];
    globalStats.totalMatches += rounds.length;

    for (const r of rounds) {
      const aScore = Number(r?.scoreA || 0);
      const bScore = Number(r?.scoreB || 0);
      globalStats.totalGoals += aScore + bScore;
      if ((aScore === 10 && bScore === 0) || (bScore === 10 && aScore === 0)) {
        globalStats.totalPodlezani += 0.5;
      }
      globalStats.totalVyrazecka += sumVyrazackyInRound(r);
    }

    for (const rec of match.players || []) {
      const id = rec.id;
      if (!id) continue;

      const fallback = playerById.get(id);
      const username = rec.username || fallback?.username || id;

      if (!playersMap.has(id)) {
        playersMap.set(id, createEmptyPlayerStat(id, username));
      }

      const row = playersMap.get(id)!;
      row.username = username;

      row.wins += Number(rec.winsAdd || 0);
      row.loses += Number(rec.losesAdd || 0);
      row.ultimate_wins += Number(rec.ultimateWinInc || 0);
      row.ultimate_loses += Number(rec.ultimateLoseInc || 0);

      const xpGainRaw = Number(rec.xpGain);
      if (Number.isFinite(xpGainRaw) && xpGainRaw > 0) {
        row.xp += xpGainRaw;
      } else {
        let fallbackXp = 0;
        for (const r of rounds) {
          const stats = getPlayerRoundStats(r, id);
          if (stats.isWinner) fallbackXp += 15;
          if (stats.isLoser) fallbackXp += 5;
          fallbackXp += stats.goalsScored;
          fallbackXp += stats.vyrazackaCount * 10;
          if (stats.shutoutWin) fallbackXp += 50;
        }
        if (Number(rec.ultimateWinInc || 0) > 0) fallbackXp += 25;
        row.xp += fallbackXp;
      }

      if (!seenEloStart.has(id)) {
        row.elo = Number(rec.oldElo ?? row.elo ?? 500);
        seenEloStart.add(id);
      }
      row.elo = Number(rec.newElo ?? row.elo);
    }

    for (const r of rounds) {
      const a = Array.isArray(r?.a) ? r.a : [];
      const b = Array.isArray(r?.b) ? r.b : [];
      const aScore = Number(r?.scoreA || 0);
      const bScore = Number(r?.scoreB || 0);

      for (const playerId of a) {
        if (!playersMap.has(playerId)) {
          const p = playerById.get(playerId);
          playersMap.set(playerId, createEmptyPlayerStat(playerId, p?.username || playerId));
        }
        const row = playersMap.get(playerId)!;
        row.goals_scored += aScore;
        row.goals_conceded += bScore;
        row.coins += 100 + aScore * 2 + (aScore > bScore ? 100 : 0);
        if (aScore === 10 && bScore === 0) row.ten_zero_wins += 1;
        if (bScore === 10 && aScore === 0) row.ten_zero_loses += 1;
      }

      for (const playerId of b) {
        if (!playersMap.has(playerId)) {
          const p = playerById.get(playerId);
          playersMap.set(playerId, createEmptyPlayerStat(playerId, p?.username || playerId));
        }
        const row = playersMap.get(playerId)!;
        row.goals_scored += bScore;
        row.goals_conceded += aScore;
        row.coins += 100 + bScore * 2 + (bScore > aScore ? 100 : 0);
        if (bScore === 10 && aScore === 0) row.ten_zero_wins += 1;
        if (aScore === 10 && bScore === 0) row.ten_zero_loses += 1;
      }

      if (r?.vyrazacka && typeof r.vyrazacka === "object") {
        Object.entries(r.vyrazacka).forEach(([playerId, val]) => {
          if (!playersMap.has(playerId)) {
            const p = playerById.get(playerId);
            playersMap.set(playerId, createEmptyPlayerStat(playerId, p?.username || playerId));
          }
          playersMap.get(playerId)!.vyrazecky += Number(val || 0);
        });
      }
    }
  }

  return {
    players: Array.from(playersMap.values()),
    globalStats,
  };
}

export function buildEmptySeasonPlayer(username: string): PlayerProfile {
  return createEmptyPlayerStat(username, username);
}
