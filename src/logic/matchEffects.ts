// Pure scoring helpers shared between match finish and match edit flows.
// Given match scores and player snapshots (with oldElo), compute every
// per-player delta so callers can either apply or diff them.

export type EffectPlayerInput = {
  id: string;
  username: string;
  oldElo: number;
};

export type PlayerEffect = {
  id: string;
  username: string;
  oldElo: number;
  eloDelta: number;
  xpGained: number;
  coinsGained: number;
  winsAdded: number;
  losesAdded: number;
  gamesAdded: number;
  ten_zero_wins: number;
  ten_zero_loses: number;
  vyrazecky: number;
  goals_scored: number;
  goals_conceded: number;
  ultimateWinInc: number;
  ultimateLoseInc: number;
};

export type MatchEffects = {
  byId: Record<string, PlayerEffect>;
  totalSumGoals: number;
  totalSumPodlezani: number;
  totalSumVyrazecka: number;
  ultimateWinnerId: string | null;
  ultimateLoserId: string | null;
  lostByGolden: Record<string, boolean>;
};

function avgElo(p1?: number, p2?: number): number {
  const e1 = (typeof p1 === 'number' && Number.isFinite(p1)) ? p1 : 500;
  const e2 = (typeof p2 === 'number' && Number.isFinite(p2)) ? p2 : 500;
  return Math.round((e1 + e2) / 2);
}

export function computeMatchEffects(
  scores: any[],
  players: EffectPlayerInput[],
): MatchEffects {
  const byId: Record<string, PlayerEffect> = {};
  players.forEach(p => {
    byId[p.id] = {
      id: p.id,
      username: p.username,
      oldElo: Math.round(p.oldElo ?? 500),
      eloDelta: 0,
      xpGained: 0,
      coinsGained: 0,
      winsAdded: 0,
      losesAdded: 0,
      gamesAdded: 0,
      ten_zero_wins: 0,
      ten_zero_loses: 0,
      vyrazecky: 0,
      goals_scored: 0,
      goals_conceded: 0,
      ultimateWinInc: 0,
      ultimateLoseInc: 0,
    };
  });

  const lostByGolden: Record<string, boolean> = {};
  (scores || []).forEach((s: any) => {
    const golden = s?.goldenVyrazacka;
    if (!golden?.playerId) return;
    const a = Array.isArray(s.a) ? s.a : [];
    const b = Array.isArray(s.b) ? s.b : [];
    if (a.includes(golden.playerId)) {
      b.forEach((id: string) => { lostByGolden[id] = true; });
    } else if (b.includes(golden.playerId)) {
      a.forEach((id: string) => { lostByGolden[id] = true; });
    }
  });

  let totalSumGoals = 0;
  let totalSumPodlezani = 0;
  let totalSumVyrazecka = 0;

  (scores || []).forEach((s: any) => {
    const a: string[] = s.a || [];
    const b: string[] = s.b || [];
    const aScore = Number(s.scoreA || 0);
    const bScore = Number(s.scoreB || 0);
    const winnerSide: 'a' | 'b' | null = aScore > bScore ? 'a' : (bScore > aScore ? 'b' : null);

    const a0 = byId[a[0]];
    const a1 = byId[a[1]];
    const b0 = byId[b[0]];
    const b1 = byId[b[1]];
    const avgA = avgElo(a0?.oldElo, a1?.oldElo);
    const avgB = avgElo(b0?.oldElo, b1?.oldElo);
    const diff = Math.abs(avgA - avgB);
    const adj = Math.min(10, Math.floor(diff / 25));

    totalSumGoals += aScore + bScore;

    const ensure = (id: string) => byId[id];

    if (winnerSide === 'a') {
      a.forEach(id => {
        const r = ensure(id); if (!r) return;
        r.winsAdded += 1;
        r.xpGained += 15 + aScore;
        r.eloDelta += 20;
        r.coinsGained += 200 + aScore * 2;
        r.gamesAdded += 1;
        r.goals_scored += aScore;
        r.goals_conceded += bScore;
        if (aScore === 10 && bScore === 0) {
          r.xpGained += 50;
          r.ten_zero_wins += 1;
          totalSumPodlezani += 0.5;
        }
      });
      b.forEach(id => {
        const r = ensure(id); if (!r) return;
        r.losesAdded += 1;
        r.xpGained += 5 + bScore;
        r.eloDelta -= 20;
        r.coinsGained += 100 + bScore * 2;
        r.gamesAdded += 1;
        r.goals_scored += bScore;
        r.goals_conceded += aScore;
        if (aScore === 10 && bScore === 0) r.ten_zero_loses += 1;
      });
      if (avgA > avgB) {
        a.forEach(id => { if (byId[id]) byId[id].eloDelta -= adj; });
        b.forEach(id => { if (byId[id]) byId[id].eloDelta += adj; });
      } else if (avgA < avgB) {
        a.forEach(id => { if (byId[id]) byId[id].eloDelta += adj; });
        b.forEach(id => { if (byId[id]) byId[id].eloDelta -= adj; });
      }
    } else if (winnerSide === 'b') {
      b.forEach(id => {
        const r = ensure(id); if (!r) return;
        r.winsAdded += 1;
        r.xpGained += 15 + bScore;
        r.eloDelta += 20;
        r.coinsGained += 200 + bScore * 2;
        r.gamesAdded += 1;
        r.goals_scored += bScore;
        r.goals_conceded += aScore;
        if (bScore === 10 && aScore === 0) {
          r.xpGained += 50;
          r.ten_zero_wins += 1;
          totalSumPodlezani += 0.5;
        }
      });
      a.forEach(id => {
        const r = ensure(id); if (!r) return;
        r.losesAdded += 1;
        r.xpGained += 5 + aScore;
        r.eloDelta -= 20;
        r.coinsGained += 100 + aScore * 2;
        r.gamesAdded += 1;
        r.goals_scored += aScore;
        r.goals_conceded += bScore;
        if (bScore === 10 && aScore === 0) r.ten_zero_loses += 1;
      });
      if (avgB > avgA) {
        b.forEach(id => { if (byId[id]) byId[id].eloDelta -= adj; });
        a.forEach(id => { if (byId[id]) byId[id].eloDelta += adj; });
      } else if (avgB < avgA) {
        b.forEach(id => { if (byId[id]) byId[id].eloDelta += adj; });
        a.forEach(id => { if (byId[id]) byId[id].eloDelta -= adj; });
      }
    } else {
      a.forEach(id => { if (byId[id]) byId[id].gamesAdded += 1; });
      b.forEach(id => { if (byId[id]) byId[id].gamesAdded += 1; });
    }
  });

  const totalRounds = (scores || []).length || 0;
  const ids = Object.keys(byId);
  let ultimateWinnerId: string | null = null;
  let ultimateLoserId: string | null = null;
  ids.forEach(id => {
    if (totalRounds > 0 && byId[id].winsAdded === totalRounds) ultimateWinnerId = id;
    if (totalRounds > 0 && byId[id].losesAdded === totalRounds) ultimateLoserId = id;
  });

  if (ultimateWinnerId) {
    ids.forEach(id => {
      if (id === ultimateWinnerId) {
        byId[id].xpGained += 25;
        byId[id].eloDelta += 6;
        byId[id].ultimateWinInc = 1;
      } else {
        byId[id].eloDelta -= 2;
      }
    });
  }
  if (ultimateLoserId) {
    ids.forEach(id => {
      if (id === ultimateLoserId) {
        byId[id].eloDelta -= 3;
        byId[id].ultimateLoseInc = 1;
      } else {
        byId[id].eloDelta += 1;
      }
    });
  }

  (scores || []).forEach((s: any) => {
    if (!s?.vyrazacka || typeof s.vyrazacka !== 'object') return;
    Object.entries(s.vyrazacka).forEach(([playerId, count]: [string, any]) => {
      const r = byId[playerId];
      if (!r) return;
      const n = Number(count || 0);
      r.xpGained += n * 10;
      r.vyrazecky += n;
      totalSumVyrazecka += n;
    });
  });

  return {
    byId,
    totalSumGoals,
    totalSumPodlezani,
    totalSumVyrazecka,
    ultimateWinnerId,
    ultimateLoserId,
    lostByGolden,
  };
}
