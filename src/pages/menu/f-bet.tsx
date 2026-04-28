import { Context } from "hono";
import { MatchDoc } from "../../logic/match";
import { formatCoins } from "../../logic/format";

export interface SpinPrizeView {
  index: number;
  coins: number;
  label: string;
  color: string;
  weight: number;
}

export interface FBetPageProps {
  c: Context;
  currentUser: string | null;
  currentUserProfile: any | null;
  availableMatches:  MatchDoc[];
  playerBets: any[];
  allBetsHistory: any[];
  playerBetsPage: number;
  playerBetsTotalPages: number;
  allBetsPage: number;
  allBetsTotalPages: number;
  matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }>;
  spinsUsed: number;
  spinsTotalWon: number;
  spinPrizes: SpinPrizeView[];
  freeSpinsPerDay: number;
  spinHitsByIndex: Record<string, number>;
  spinTotalSpins: number;
  spinJackpotHits: { username: string; coins: number; timestamp: number }[];
  spinNextResetIso: string;
  spinResetHour: number;
  myHitsByIndex: Record<string, number>;
  myTotalSpins: number;
  myTotalWonAllTime: number;
  myBonusSpins: number;
  superSpinsAvailable: number;
  mySuperSpinsTotal: number;
  wonTockar: boolean;
  superSpinLog: { username: string; won: boolean; timestamp: number }[];
  superSpinWinRate: number;
  tockarBadgeName: string;
}

type PredictionLine =
  | {
      type: "match";
      matchNo: number;
      teamA: string;
      teamB: string;
      pickedSide: "a" | "b";
      oddsLabel: string;
    }
  | {
      type: "text";
      label: string;
    };

function buildPredictionLines(
  bet: any,
  matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }>
): PredictionLine[] {
  const predictions = bet?.predictions || {};
  const odds = bet?.odds || predictions?._odds || {};
  const teams = bet?.matchId ? matchTeamInfoByMatchId?.[bet.matchId] : undefined;
  const lines: PredictionLine[] = [];

  [1, 2, 3].forEach((idx) => {
    const key = `match${idx}`;
    const pick = predictions?.[key];
    if (!pick) return;
    const teamRow = teams?.[key as keyof typeof teams] as { a?: string[]; b?: string[] } | undefined;
    const teamA = (teamRow?.a || []).join(' & ') || '-';
    const teamB = (teamRow?.b || []).join(' & ') || '-';
    const pickedSide = String(pick).toLowerCase() === "b" ? "b" : "a";
    const partOdds = Number(odds?.[key] || 0);
    lines.push({
      type: "match",
      matchNo: idx,
      teamA,
      teamB,
      pickedSide,
      oddsLabel: partOdds ? `x${partOdds}` : "n/a",
    });
  });

  if (predictions?.vyrazackaOutcome) {
    const label =
      predictions.vyrazackaOutcome === 'zero' ? '0 total vyrazecky' :
      predictions.vyrazackaOutcome === 'gte1' ? '1+ total vyrazecky' :
      predictions.vyrazackaOutcome === 'gte2' ? '2+ total vyrazecky' :
      predictions.vyrazackaOutcome === 'gte3' ? '3+ total vyrazecky' :
      String(predictions.vyrazackaOutcome);
    const partOdds = Number(odds?.vyrazackaOutcome || 0);
    lines.push({ type: "text", label: `Vyrazecka: ${label} | Odds: ${partOdds ? `x${partOdds}` : 'n/a'}` });
  }

  const totalGoalsValue = Number(predictions?.totalGoals);
  if (Number.isFinite(totalGoalsValue) && totalGoalsValue >= 30) {
    const partOdds = Number(odds?.totalGoals || 0);
    lines.push({ type: "text", label: `Total Goals: ${totalGoalsValue} | Odds: ${partOdds ? `x${partOdds}` : 'n/a'}` });
  }

  if (predictions?.vyrazacka?.playerCounts && typeof predictions.vyrazacka.playerCounts === 'object') {
    Object.entries(predictions.vyrazacka.playerCounts).forEach(([playerId, count]) => {
      lines.push({ type: "text", label: `Legacy Vyrazecka: ${playerId} >= ${count}` });
    });
  }

  return lines.length ? lines : [{ type: "text", label: "—" }];
}

function getSubBetResultMap(bet: any): Record<string, 'correct' | 'wrong' | 'pending'> {
  const map: Record<string, 'correct' | 'wrong' | 'pending'> = {};
  (bet?.subBetResults || []).forEach((row: any) => {
    if (row?.key && (row?.result === 'correct' || row?.result === 'wrong' || row?.result === 'pending')) {
      map[String(row.key)] = row.result;
    }
  });
  return map;
}

function SubBetMarker({ result }: { result?: 'correct' | 'wrong' | 'pending' }) {
  if (result === 'correct') return <span className="ml-2 text-emerald-300 font-bold">✓</span>;
  if (result === 'wrong') return <span className="ml-2 text-rose-300 font-bold">✕</span>;
  if (result === 'pending') return <span className="ml-2 text-amber-300 font-bold">•</span>;
  return null;
}

export function FBetPage({ c, currentUser, currentUserProfile, availableMatches, playerBets, allBetsHistory, playerBetsPage, playerBetsTotalPages, allBetsPage, allBetsTotalPages, matchTeamInfoByMatchId, spinsUsed, spinsTotalWon, spinPrizes, freeSpinsPerDay, spinHitsByIndex, spinTotalSpins, spinJackpotHits, spinNextResetIso, spinResetHour, myHitsByIndex, myTotalSpins, myTotalWonAllTime, myBonusSpins, superSpinsAvailable, mySuperSpinsTotal, wonTockar, superSpinLog, superSpinWinRate, tockarBadgeName }: FBetPageProps) {
  // Super spin leaderboard: aggregate spins per username from log + identify winners.
  const superSpinAggregates = (() => {
    const counts = new Map<string, { spins: number; wins: number }>();
    (superSpinLog || []).forEach(entry => {
      const row = counts.get(entry.username) || { spins: 0, wins: 0 };
      row.spins += 1;
      if (entry.won) row.wins += 1;
      counts.set(entry.username, row);
    });
    return Array.from(counts.entries())
      .map(([username, v]) => ({ username, ...v }))
      .sort((a, b) => b.spins - a.spins);
  })();
  const superSpinWinners = (superSpinLog || [])
    .filter(e => e.won)
    .sort((a, b) => a.timestamp - b.timestamp);
  const totalSuperSpinsAll = (superSpinLog || []).length;
  // Jackpot leaderboard: count hits per player from spinJackpotHits.
  const jackpotByPlayer = (() => {
    const counts = new Map<string, { count: number; total: number; firstAt: number }>();
    (spinJackpotHits || []).forEach(hit => {
      const row = counts.get(hit.username) || { count: 0, total: 0, firstAt: hit.timestamp };
      row.count += 1;
      row.total += Number(hit.coins || 0);
      if (hit.timestamp < row.firstAt) row.firstAt = hit.timestamp;
      counts.set(hit.username, row);
    });
    return Array.from(counts.entries())
      .map(([username, v]) => ({ username, ...v }))
      .sort((a, b) => b.count - a.count || b.total - a.total);
  })();
  const userCoins = currentUserProfile?.coins || 0;
  const dailyLeft = Math.max(0, (freeSpinsPerDay || 0) - (spinsUsed || 0));
  const bonusLeft = Math.max(0, myBonusSpins || 0);
  const spinsRemaining = dailyLeft + bonusLeft;
  const jackpotCoins = spinPrizes.reduce((max, p) => p.coins > max ? p.coins : max, 0);
  const totalWeight = spinPrizes.reduce((sum, p) => sum + (p.weight || 0), 0) || 1;

  // Build SVG wheel segments — proportional to weight
  const cx = 160, cy = 160, r = 150;
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const segmentPath = (startDeg: number, endDeg: number) => {
    const s = toRad(startDeg);
    const e = toRad(endDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
  };
  const labelPos = (deg: number, radiusFactor: number = 0.65) => {
    const rad = toRad(deg);
    return { x: cx + (r * radiusFactor) * Math.cos(rad), y: cy + (r * radiusFactor) * Math.sin(rad), rot: deg };
  };

  let cumulative = 0;
  const segments = spinPrizes.map((prize) => {
    const span = ((prize.weight || 0) / totalWeight) * 360;
    const startDeg = cumulative;
    const endDeg = cumulative + span;
    const midDeg = startDeg + span / 2;
    cumulative = endDeg;
    return { prize, startDeg, endDeg, midDeg, span, percent: (prize.weight || 0) / totalWeight * 100 };
  });
  // Stats tables are sorted by chance (highest first). Wheel keeps the interleaved order.
  const segmentsByChance = [...segments].sort((a, b) => b.percent - a.percent);
  const buildBetPageHref = (nextPlayerPage: number, nextAllBetsPage: number) => {
    const safePlayerPage = Math.max(1, nextPlayerPage);
    const safeAllBetsPage = Math.max(1, nextAllBetsPage);
    return `/v1/f-bet?playerPage=${safePlayerPage}&allPage=${safeAllBetsPage}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 text-white">
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">🎲 F Bet</h1>
          <p className="text-purple-200/70 text-sm sm:text-base">Live match betting with match winners, vyrážečka outcomes, and exact total goals.</p>
        </div>
        <a href="/v1/lobby" className="inline-block px-5 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg font-semibold transition border border-purple-500 whitespace-nowrap self-start">
          ← Back to Lobby
        </a>
      </div>

      {/* COINS DISPLAY */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-yellow-900/65 to-amber-900/55 p-4 rounded-lg border border-yellow-500/70 inline-block min-w-[14rem]">
          <div className="text-yellow-100/80 text-sm">Your Coins</div>
          <div className="text-3xl font-bold text-yellow-200" data-user-coins>{formatCoins(userCoins)}</div>
        </div>
      </div>

      {/* TAB SWITCHER */}
      {currentUser && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-purple-700/40 pb-3" id="fbet-tab-bar">
          <button type="button" data-tab-btn="bet" className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-purple-600 text-white">
            🎲 Bet
          </button>
          <button type="button" data-tab-btn="your-bets" className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700">
            📒 Your Bets
          </button>
          <button type="button" data-tab-btn="all-bets" className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700">
            🌍 All History
          </button>
          <button type="button" data-tab-btn="spin" className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700">
            🎰 Spins
          </button>
          <button type="button" data-tab-btn="super" className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700">
            🍀 Super Spin
          </button>
        </div>
      )}

      {/* FREE SPINS */}
      {currentUser && (
        <div data-tab-pane="spin" className="mb-8 relative overflow-hidden rounded-2xl border border-amber-500/60 bg-gradient-to-br from-purple-950/80 via-fuchsia-950/70 to-amber-900/40 p-6 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
          <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(251,191,36,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(236,72,153,0.4) 0%, transparent 40%)',
          }} />
          <div className="relative flex flex-col lg:flex-row items-center gap-6">
            {/* WHEEL */}
            <div className="relative flex-shrink-0">
              <div className="relative w-[320px] h-[320px]">
                {/* Outer ring glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-fuchsia-500 to-purple-600 blur-lg opacity-60" />
                {/* Wheel */}
                <svg viewBox="0 0 320 320" className="relative w-full h-full drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" id="free-spin-wheel" style={{ transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' }}>
                  <circle cx={cx} cy={cy} r={r + 6} fill="#1e1b4b" stroke="#fbbf24" strokeWidth="4" />
                  {segments.map(({ prize, startDeg, endDeg, midDeg, span }) => {
                    const isJackpot = prize.coins === jackpotCoins;
                    const narrow = span < 12;
                    const radiusFactor = narrow ? 0.78 : 0.62;
                    const pos = labelPos(midDeg, radiusFactor);
                    const fontSize = isJackpot ? 16 : narrow ? 11 : 14;
                    // For narrow slices, run text radially (outward from center) so it fits.
                    const rotation = narrow ? midDeg - 90 : midDeg;
                    return (
                      <g key={prize.index}>
                        <path d={segmentPath(startDeg, endDeg)} fill={prize.color} stroke="#1e1b4b" strokeWidth="2" />
                        <text
                          x={pos.x}
                          y={pos.y}
                          fill={isJackpot ? '#1e1b4b' : '#fff'}
                          fontSize={fontSize}
                          fontWeight={isJackpot ? '900' : 'bold'}
                          textAnchor={narrow ? 'end' : 'middle'}
                          dominantBaseline="middle"
                          transform={`rotate(${rotation} ${pos.x} ${pos.y})`}
                          style={{ textShadow: isJackpot ? '0 0 4px #fbbf24' : '0 1px 3px rgba(0,0,0,0.8)' }}
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx={cx} cy={cy} r="20" fill="#fbbf24" stroke="#1e1b4b" strokeWidth="3" />
                </svg>
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                  <svg width="32" height="40" viewBox="0 0 32 40">
                    <polygon points="16,40 0,0 32,0" fill="#fbbf24" stroke="#7c2d12" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* INFO & BUTTON */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-200 text-xs font-bold uppercase tracking-wider mb-3">
                ✨ Daily Bonus
              </div>
              <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300 bg-clip-text text-transparent mb-2">
                Free Spins
              </h2>
              <p className="text-purple-100/80 text-sm mb-2">
                Spin the wheel for free coins. You get <span className="font-bold text-amber-300">{freeSpinsPerDay}</span> spins every day.
              </p>
              <p className="text-xs text-purple-200/70 mb-4">
                🕗 Resets daily at <span className="font-bold text-amber-200">{String(spinResetHour).padStart(2,'0')}:00</span>
                {' • '}
                Next reset in <span data-spin-countdown className="font-bold text-amber-200" data-reset-iso={spinNextResetIso}>…</span>
              </p>

              {/* JACKPOT CALLOUT */}
              <div className="mb-4 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(251,191,36,0.35)] w-full sm:w-auto justify-center lg:justify-start">
                <span className="text-3xl">🏆</span>
                <div className="text-left">
                  <div className="text-[0.65rem] uppercase tracking-[0.25em] text-amber-200/80 font-bold">Jackpot</div>
                  <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    {formatCoins(jackpotCoins)}
                  </div>
                  <div className="text-[0.7rem] text-amber-100/70 mt-1">coins</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4 max-w-lg mx-auto lg:mx-0">
                <div className="bg-black/40 border border-amber-500/40 rounded-lg p-3">
                  <div className="text-xs text-amber-200/70">Daily left</div>
                  <div className="text-2xl font-bold text-amber-200" data-daily-left>{dailyLeft}</div>
                  <div className="text-[0.6rem] text-amber-200/50">of {freeSpinsPerDay}</div>
                </div>
                <div className={`border rounded-lg p-3 ${bonusLeft > 0 ? 'bg-fuchsia-900/40 border-fuchsia-500/50' : 'bg-black/40 border-fuchsia-500/20 opacity-70'}`}>
                  <div className="text-xs text-fuchsia-200/70">Bonus spins</div>
                  <div className="text-2xl font-bold text-fuchsia-200" data-bonus-left>{bonusLeft}</div>
                  <div className="text-[0.6rem] text-fuchsia-200/50">from shop</div>
                </div>
                <div className="bg-black/40 border border-emerald-500/40 rounded-lg p-3">
                  <div className="text-xs text-emerald-200/70">Won today</div>
                  <div className="text-2xl font-bold text-emerald-300" data-spins-won>{formatCoins(spinsTotalWon)}</div>
                </div>
              </div>
              <div className="hidden" data-spins-remaining>{spinsRemaining}</div>
              <button
                type="button"
                id="free-spin-btn"
                disabled={spinsRemaining === 0}
                className={`relative group w-full sm:w-auto px-10 py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-2xl ${
                  spinsRemaining > 0
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-white hover:scale-105 hover:shadow-amber-500/40 shadow-amber-600/20'
                    : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10">🎰 {spinsRemaining > 0 ? 'SPIN!' : 'Come back tomorrow'}</span>
                {spinsRemaining > 0 && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 blur opacity-50 group-hover:opacity-75 transition -z-0" />
                )}
              </button>
              <div id="free-spin-result" className="mt-4 min-h-[2rem] text-center lg:text-left text-lg font-bold"></div>

              {/* CHANCES TABLE */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-200/80 font-bold">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                    Chances & Hits
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[0.6rem] tracking-normal normal-case text-purple-100/90 font-semibold">
                      🌍 all players
                    </span>
                  </div>
                  <div className="text-xs text-purple-200/70">
                    Total spins: <span className="font-bold text-white">{formatCoins(spinTotalSpins)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {segmentsByChance.map(({ prize, percent }) => {
                    const isJackpot = prize.coins === jackpotCoins;
                    const hits = spinHitsByIndex[String(prize.index)] || 0;
                    return (
                      <div
                        key={prize.index}
                        className={`rounded-lg px-2 py-2 text-center border ${
                          isJackpot
                            ? 'bg-gradient-to-br from-amber-500/30 to-yellow-400/20 border-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                            : 'bg-black/30 border-purple-700/40'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prize.color }} />
                          <span className={`text-xs font-bold ${isJackpot ? 'text-amber-200' : 'text-white'}`}>{prize.label}</span>
                        </div>
                        <div className={`text-sm font-black ${isJackpot ? 'text-amber-300' : 'text-purple-200'}`}>
                          {percent.toFixed(percent < 1 ? 2 : 1)}%
                        </div>
                        <div className="text-[0.65rem] uppercase tracking-wider text-purple-300/70 mt-1">
                          hit <span className={`font-bold ${hits > 0 ? (isJackpot ? 'text-amber-300' : 'text-emerald-300') : 'text-neutral-400'}`}>{formatCoins(hits)}×</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-purple-300/60 italic">
                  Wedge size on the wheel = chance of landing. Jackpot is the thin slice. 🎯
                </div>
              </div>

              {/* MY PERSONAL HITS */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80 font-bold">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    Your Hits
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[0.6rem] tracking-normal normal-case text-emerald-100/90 font-semibold">
                      👤 {currentUser || 'you'}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-200/70 whitespace-nowrap">
                    Your spins: <span className="font-bold text-white">{formatCoins(myTotalSpins)}</span> • Won: <span className="font-bold text-emerald-300">{formatCoins(myTotalWonAllTime)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {segmentsByChance.map(({ prize }) => {
                    const isJackpot = prize.coins === jackpotCoins;
                    const myHits = myHitsByIndex[String(prize.index)] || 0;
                    return (
                      <div
                        key={prize.index}
                        className={`rounded-lg px-2 py-2 text-center border ${
                          myHits > 0 && isJackpot
                            ? 'bg-gradient-to-br from-amber-500/30 to-yellow-400/20 border-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                            : myHits > 0
                            ? 'bg-emerald-900/30 border-emerald-600/50'
                            : 'bg-black/20 border-neutral-700/40 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prize.color }} />
                          <span className={`text-xs font-bold ${isJackpot && myHits > 0 ? 'text-amber-200' : 'text-white'}`}>{prize.label}</span>
                        </div>
                        <div className={`text-lg font-black ${
                          myHits === 0 ? 'text-neutral-500' : isJackpot ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                          {formatCoins(myHits)}×
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPER SPIN — 1:100 chance for the Točkář badge */}
      {currentUser && (
        <div data-tab-pane="super" className="mb-8 relative overflow-hidden rounded-2xl border border-fuchsia-500/60 bg-gradient-to-br from-purple-950/85 via-fuchsia-900/55 to-emerald-900/35 p-6 shadow-[0_0_45px_rgba(217,70,239,0.18)]">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes ss-pulse-glow { 0%,100% { box-shadow: 0 0 30px rgba(74,222,128,0.5), 0 0 60px rgba(217,70,239,0.4); } 50% { box-shadow: 0 0 60px rgba(34,211,238,0.9), 0 0 110px rgba(217,70,239,0.8); } }
            @keyframes ss-win-burst { 0% { transform: scale(1); filter: brightness(1); } 30% { transform: scale(1.25); filter: brightness(2) saturate(1.6); } 60% { transform: scale(0.95); } 100% { transform: scale(1.05); filter: brightness(1.3); } }
            @keyframes ss-shake { 0%,100% { transform: translateX(0); } 15% { transform: translateX(-10px) rotate(-2deg); } 30% { transform: translateX(8px) rotate(2deg); } 45% { transform: translateX(-6px) rotate(-1deg); } 60% { transform: translateX(5px) rotate(1deg); } 80% { transform: translateX(-2px); } }
            @keyframes ss-confetti-fall { 0% { transform: translate(0,0) rotate(0deg) scale(0.6); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--ss-tx,0), var(--ss-ty,200px)) rotate(var(--ss-rot,720deg)) scale(1); opacity: 0; } }
            @keyframes ss-result-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes ss-pointer-bounce { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-4px); } }
            .ss-glowing { animation: ss-pulse-glow 0.5s ease-in-out infinite; }
            .ss-win { animation: ss-win-burst 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards; }
            .ss-lose { animation: ss-shake 0.6s ease-in-out; }
            .ss-result-anim { animation: ss-result-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
            .ss-confetti-piece { position: absolute; top: 50%; left: 50%; font-size: 24px; pointer-events: none; animation: ss-confetti-fall 1.6s ease-out forwards; }
            .ss-pointer { animation: ss-pointer-bounce 1.2s ease-in-out infinite; }
            .ss-wheel { transition: transform 4.2s cubic-bezier(0.15, 0.85, 0.18, 1); transform-origin: center; }
          `}} />
          <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            backgroundImage: 'radial-gradient(circle at 25% 30%, rgba(34,197,94,0.3) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(217,70,239,0.45) 0%, transparent 45%)',
          }} />
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Tockar visual + button */}
            <div className="lg:col-span-1 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-400/20 border border-fuchsia-400/60 text-fuchsia-100 text-xs font-bold uppercase tracking-wider mb-3">
                🍀 Lucky Spin
              </div>
              <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-cyan-200 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent mb-3">
                Super Spin
              </h2>

              {/* Roulette wheel — 1° green slice (~1:100), rest red */}
              <div className="relative mb-4 w-56 h-56" id="super-spin-badge-wrap">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-purple-600 blur-xl opacity-70 animate-pulse" />

                {/* Pointer */}
                <div className="ss-pointer absolute z-20 left-1/2" style={{ top: '-10px', width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '24px solid #fde047', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.7))' }} />

                {/* Wheel */}
                <div
                  id="super-spin-wheel"
                  className="ss-wheel absolute inset-0 rounded-full border-4 border-emerald-300/80 shadow-[0_0_30px_rgba(74,222,128,0.5)]"
                  style={{
                    background: 'conic-gradient(from -1.8deg, #10b981 0deg 3.6deg, #b91c1c 3.6deg 360deg)',
                  }}
                >
                  {/* Tick marks every 36° (10 ticks) for visual reference */}
                  <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                    background: 'repeating-conic-gradient(from 0deg, transparent 0deg 35.6deg, rgba(0,0,0,0.25) 35.6deg 36deg)',
                  }} />
                  {/* Inner shading for depth */}
                  <div className="absolute inset-2 rounded-full pointer-events-none" style={{
                    background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 45%), radial-gradient(circle, transparent 55%, rgba(0,0,0,0.45) 100%)',
                  }} />
                </div>

                {/* Center hub (Točkář badge) */}
                <div id="super-spin-badge" className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-300 via-fuchsia-500 to-purple-700 border-[3px] border-white/70 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center">
                    <div className="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">🍀</div>
                    <div className="text-white font-black text-[9px] tracking-wider drop-shadow">Točkář</div>
                  </div>
                </div>

                <div id="super-spin-confetti" className="absolute inset-0 pointer-events-none overflow-visible z-30" />
              </div>

              <p className="text-purple-100/80 text-sm mb-1">
                <span className="font-bold text-emerald-300">1:{Math.round(1 / Math.max(0.0001, superSpinWinRate))}</span> chance to win the exclusive badge.
              </p>
              <p className="text-xs text-purple-200/60 mb-3">
                1 free spin per day (resets at {String(spinResetHour).padStart(2, '0')}:00). Buy more in the Shop.
              </p>

              <div className="grid grid-cols-3 gap-2 w-full mb-4">
                <div className={`rounded-lg p-2 border ${superSpinsAvailable > 0 ? 'bg-emerald-900/40 border-emerald-500/60' : 'bg-black/40 border-neutral-700/40 opacity-70'}`}>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-200/70">Available</div>
                  <div className="text-2xl font-black text-emerald-300" data-super-available>{superSpinsAvailable}</div>
                </div>
                <div className="rounded-lg p-2 bg-fuchsia-950/50 border border-fuchsia-500/40">
                  <div className="text-[10px] uppercase tracking-wider text-fuchsia-200/70">My spins</div>
                  <div className="text-2xl font-black text-fuchsia-200" data-super-mytotal>{mySuperSpinsTotal}</div>
                </div>
                <div className={`rounded-lg p-2 border ${wonTockar ? 'bg-amber-900/40 border-amber-400/60' : 'bg-black/40 border-neutral-700/40'}`}>
                  <div className="text-[10px] uppercase tracking-wider text-amber-200/70">Status</div>
                  <div className="text-sm font-black text-amber-300" data-super-status>{wonTockar ? 'Won!' : 'Pending'}</div>
                </div>
              </div>

              <button
                type="button"
                id="super-spin-btn"
                disabled={superSpinsAvailable <= 0 || wonTockar}
                className={`relative group w-full px-6 py-4 rounded-xl font-black text-base uppercase tracking-widest transition-all shadow-2xl ${
                  superSpinsAvailable > 0 && !wonTockar
                    ? 'bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-600 hover:from-cyan-400 hover:via-fuchsia-400 hover:to-purple-500 text-white hover:scale-105 hover:shadow-fuchsia-500/40 shadow-fuchsia-600/20'
                    : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10">
                  🍀 {wonTockar ? 'Already won' : superSpinsAvailable > 0 ? 'Try your luck!' : 'No spin left'}
                </span>
                {superSpinsAvailable > 0 && !wonTockar && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 blur opacity-50 group-hover:opacity-75 transition -z-0" />
                )}
              </button>
              <div id="super-spin-result" className="mt-3 min-h-[2rem] text-center text-base font-bold"></div>
            </div>

            {/* RIGHT: Leaderboard */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80 font-bold">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  Super Spin Leaderboard
                </div>
                <div className="text-xs text-purple-200/70 whitespace-nowrap">
                  Total spins: <span className="font-bold text-white">{totalSuperSpinsAll}</span>
                  {' • '}Winners: <span className="font-bold text-emerald-300">{superSpinWinners.length}</span>
                </div>
              </div>

              {/* Winners hall of fame */}
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 to-black/40 p-3">
                <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-emerald-200/80 font-bold">
                  <span>🏅</span> Točkář Hall of Fame
                </div>
                {superSpinWinners.length === 0 ? (
                  <div className="text-sm text-emerald-200/60 italic text-center py-2">
                    Nobody won yet. Be the first! 🍀
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {superSpinWinners.map((w, i) => (
                      <div
                        key={`${w.username}-${w.timestamp}`}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/30 to-purple-500/30 border border-emerald-400/60 text-xs font-bold text-white shadow-[0_0_8px_rgba(74,222,128,0.3)]"
                        title={new Date(w.timestamp).toLocaleString()}
                      >
                        {i === 0 && <span className="mr-1">👑</span>}🍀 {w.username}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spin counts by player */}
              <div className="rounded-lg border border-purple-500/30 bg-black/30 max-h-[18rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-purple-950/85 backdrop-blur z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-purple-200/70 border-b border-purple-500/30">
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">Player</th>
                      <th className="px-3 py-2 text-right">Spins</th>
                      <th className="px-3 py-2 text-right">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {superSpinAggregates.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-purple-200/50 italic">Nobody spun yet — be the first.</td></tr>
                    )}
                    {superSpinAggregates.map((row, i) => (
                      <tr
                        key={row.username}
                        className={`${row.wins > 0 ? 'bg-emerald-500/10' : 'hover:bg-purple-500/5'} border-b border-purple-500/10 transition`}
                      >
                        <td className="px-3 py-2 text-purple-200/70 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-white">
                          {row.username === currentUser && <span className="text-xs text-emerald-300 mr-1">★</span>}
                          {row.username}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-purple-200">{row.spins}</td>
                        <td className="px-3 py-2 text-right">
                          {row.wins > 0 ? (
                            <span className="font-black text-emerald-300">🍀 {row.wins}</span>
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JACKPOT HALL OF FAME */}
      {currentUser && (
        <div data-tab-pane="spin" className="mb-8 relative rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-950/50 via-yellow-950/40 to-black/60 p-5 shadow-[0_0_25px_rgba(251,191,36,0.12)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="text-xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  Jackpot Hall of Fame
                </h3>
                <div className="text-xs text-amber-200/70">Every player who hit the {formatCoins(jackpotCoins)} jackpot</div>
              </div>
            </div>
            <div className="text-xs text-amber-200/80 whitespace-nowrap">
              Total jackpots: <span className="font-black text-amber-300 text-base">{spinJackpotHits.length}</span>
            </div>
          </div>
          {/* Jackpot leaderboard — top winners by count */}
          {jackpotByPlayer.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-black/40 p-3">
              <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-amber-200/80 font-bold">
                <span>👑</span> Jackpot Leaderboard
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {jackpotByPlayer.map((row, i) => (
                  <div
                    key={row.username}
                    className={`rounded-lg px-3 py-2 border flex items-center justify-between gap-3 ${
                      i === 0
                        ? 'bg-gradient-to-r from-amber-500/30 to-yellow-400/20 border-amber-400/70 shadow-[0_0_8px_rgba(251,191,36,0.25)]'
                        : 'bg-black/30 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-amber-200/70 font-mono text-xs flex-shrink-0">#{i + 1}</span>
                      <span className="font-bold text-white truncate">
                        {i === 0 && <span className="mr-1">👑</span>}
                        {row.username}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-amber-300 font-black">{row.count}×</div>
                      <div className="text-[10px] text-amber-200/60">+{formatCoins(row.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {spinJackpotHits.length === 0 ? (
            <div className="text-center py-8 text-amber-200/60 italic">
              Nobody has hit the jackpot yet. Will you be the first? 💫
            </div>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto rounded-lg border border-amber-500/20">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-amber-950/80 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wider text-amber-200/70 border-b border-amber-500/30">
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2 text-right">Coins</th>
                    <th className="px-3 py-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {spinJackpotHits.map((hit, i) => (
                    <tr key={`${hit.username}-${hit.timestamp}`} className={`${i === 0 ? 'bg-amber-400/10' : 'hover:bg-amber-500/5'} border-b border-amber-500/10 transition`}>
                      <td className="px-3 py-2 text-amber-200/70 font-mono">{i + 1}</td>
                      <td className="px-3 py-2 font-bold text-white">
                        {i === 0 && <span className="mr-1.5">👑</span>}
                        {hit.username}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-amber-300">+{formatCoins(hit.coins)}</td>
                      <td className="px-3 py-2 text-right text-xs text-purple-200/70">{new Date(hit.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* YOUR BETS — lazy loaded */}
      <div data-tab-pane="your-bets" className="mb-8" style={{ display: 'none' }}>
        <h2 className="text-2xl font-bold mb-4">Your Bets</h2>
        <div id="your-bets-container" data-loaded="false" data-current-page="1" className="bg-neutral-900/40 border border-purple-700/40 rounded-lg p-4 min-h-[10rem]">
          <div className="text-sm text-purple-200/60 italic text-center py-6">Loading…</div>
        </div>
      </div>

      {/* ALL BETS HISTORY — lazy loaded */}
      <div data-tab-pane="all-bets" className="mb-8" style={{ display: 'none' }}>
        <h2 className="text-2xl font-bold mb-4">All Players Bet History</h2>
        <div id="all-bets-container" data-loaded="false" data-current-page="1" className="bg-neutral-900/40 border border-purple-700/40 rounded-lg p-4 min-h-[10rem]">
          <div className="text-sm text-purple-200/60 italic text-center py-6">Loading…</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div data-tab-pane="bet" className="grid grid-cols-1 gap-6 items-start">
        {/* LEFT: AVAILABLE MATCHES */}
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-4">Available Matches</h2>
          {availableMatches.length === 0 ? (
            <div className="bg-neutral-900/70 p-8 rounded-lg text-center text-neutral-300 border border-purple-700/60">
              <p>No live matches available for betting right now.</p>
              <a href="/v1/lobby" className="inline-block mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded transition">
                Back to Lobby
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {availableMatches.map((match: any) => {
                // helper to map player id => username
                const playerName = (id: string) => {
                  const p = match.players?.find((x:any)=>x.id===id) || match.players?.find((x:any)=>x.username===id);
                  return p ? (p.username || p.id) : id;
                };

                const isPlayerInMatch = currentUserProfile && match.players && match.players.some((p:any)=> (p.id === currentUserProfile.$id || p.username === currentUserProfile.username));

                return (
                  <div key={match.$id} className="bg-gradient-to-br from-neutral-900/90 to-purple-950/50 border border-purple-700/60 rounded-lg p-4 hover:border-purple-500/70 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm text-purple-200/70">Match ID: {match.$id.substring(0, 8)}</div>
                        <div className="text-lg font-semibold mt-1">Players: {match.players?.map((p:any)=>p.username || p.id).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-purple-200/70 mb-1">Status</div>
                        <div className="px-3 py-1 bg-purple-900/60 border border-purple-500 rounded text-purple-200 text-sm font-semibold">
                          {match.state === 'playing' ? '🔴 LIVE' : '🟡 WAITING'}
                        </div>
                      </div>
                    </div>

                    {/* per-round teams and scores */}
                    {match.scores?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-purple-200/70 mb-2">Rounds</div>
                        <div className="space-y-2">
                          {match.scores.map((s:any, idx:number) => {
                            const aNames = (s.a || []).map((id:string)=>playerName(id)).join(' & ');
                            const bNames = (s.b || []).map((id:string)=>playerName(id)).join(' & ');
                            return (
                              <div key={idx} className="p-2 bg-neutral-950/80 border border-purple-900/60 rounded flex items-center justify-between">
                                <div className="text-sm">
                                  <div className="font-semibold">Match {idx+1}</div>
                                  <div className="text-xs text-purple-200/70">{aNames} vs {bNames}</div>
                                </div>
                                <div className="text-sm font-bold">
                                  <span>{s.scoreA ?? 0}</span>
                                  <span className="mx-2 text-purple-300/60">:</span>
                                  <span>{s.scoreB ?? 0}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* countdown and betting form */}
                    {match.state === 'playing' ? (
                      <>
                        <form
                          method="post"
                          action="/v1/bet/place"
                          className="bet-form mt-2 p-3 bg-neutral-950/70 rounded-lg border border-purple-700/60"
                        >
                          <input type="hidden" name="matchId" value={match.$id} />

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            {[1,2,3].map((n)=>(
                              <div key={n}>
                                <label className="block text-xs text-purple-200/70 mb-1">Match {n}</label>
                                <div className="flex gap-1 items-center">
                                  <label className={`flex-1 px-2 py-2 rounded text-xs border ${isPlayerInMatch ? 'opacity-50 pointer-events-none border-purple-800 bg-purple-950/40' : 'border-purple-700 bg-purple-900/40 hover:bg-purple-800/50'}`}>
                                    <input type="radio" name={`match${n}`} value="a" className="mr-2" data-odds={match.bettingOdds?.[n-1]?.a ?? ''} disabled={isPlayerInMatch} />
                                    A {match.bettingOdds?.[n-1]?.a ? `(x${match.bettingOdds[n-1].a})` : ''}
                                  </label>
                                  <label className={`flex-1 px-2 py-2 rounded text-xs border ${isPlayerInMatch ? 'opacity-50 pointer-events-none border-purple-800 bg-purple-950/40' : 'border-purple-700 bg-purple-900/40 hover:bg-purple-800/50'}`}>
                                    <input type="radio" name={`match${n}`} value="b" className="mr-2" data-odds={match.bettingOdds?.[n-1]?.b ?? ''} disabled={isPlayerInMatch} />
                                    B {match.bettingOdds?.[n-1]?.b ? `(x${match.bettingOdds[n-1].b})` : ''}
                                  </label>
                                </div>
                                <div className="text-xs text-purple-200/70 mt-1">Team A: {(match.scores?.[n-1]?.a || []).map((id:string)=>playerName(id)).join(', ') || '-'}</div>
                                <div className="text-xs text-purple-200/70">Team B: {(match.scores?.[n-1]?.b || []).map((id:string)=>playerName(id)).join(', ') || '-'}</div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div>
                              <label className="block text-xs text-purple-200/70 mb-1">Bet Amount</label>
                              <input type="number" name="betAmount" min="1" max={userCoins} defaultValue="100" className="w-full px-3 py-2 bg-purple-950/60 border border-purple-700 rounded text-white text-sm" required disabled={isPlayerInMatch} />
                            </div>
                            {/* Vyrážečka betting temporarily disabled
                            <div>
                              <label className="block text-xs text-purple-200/70 mb-1">Vyrážečka Outcome</label>
                              <select name="vyrazackaOutcome" className="w-full px-3 py-2 bg-purple-950/60 border border-purple-700 rounded text-white text-sm" disabled={isPlayerInMatch}>
                                <option value="">No vyrážečka bet</option>
                                <option value="zero" data-odds={match.vyrazackaOutcomeOdds?.zero ?? ''}>0 total (x{match.vyrazackaOutcomeOdds?.zero ?? '-'})</option>
                                <option value="gte1" data-odds={match.vyrazackaOutcomeOdds?.gte1 ?? ''}>1+ total (x{match.vyrazackaOutcomeOdds?.gte1 ?? '-'})</option>
                                <option value="gte2" data-odds={match.vyrazackaOutcomeOdds?.gte2 ?? ''}>2+ total (x{match.vyrazackaOutcomeOdds?.gte2 ?? '-'})</option>
                                <option value="gte3" data-odds={match.vyrazackaOutcomeOdds?.gte3 ?? ''}>3+ total (x{match.vyrazackaOutcomeOdds?.gte3 ?? '-'})</option>
                              </select>
                            </div>
                            */}
                            <div>
                              <label className="block text-xs text-purple-200/70 mb-1">Exact Total Goals</label>
                              <select name="totalGoals" className="w-full px-3 py-2 bg-purple-950/60 border border-purple-700 rounded text-white text-sm" disabled={isPlayerInMatch}>
                                <option value="">No goals bet</option>
                                {Array.from({ length: 28 }, (_, i) => 30 + i).map((goalTotal) => (
                                  <option key={goalTotal} value={goalTotal} data-odds={match.totalGoalsOdds?.[goalTotal] ?? ''}>
                                    {goalTotal} (x{match.totalGoalsOdds?.[goalTotal] ?? '-'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mb-3 text-xs text-purple-100/90" data-odds-preview>
                            Current odds: x1.00 • Potential win: {formatCoins(0)}
                          </div>

                          <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded font-semibold text-sm transition" disabled={isPlayerInMatch}>
                            🎲 Place Bet
                          </button>
                        </form>

                        {/* All bets for this match */}
                        <div className="mt-3">
                          <div className="text-sm text-purple-200/80 mb-2">All bets for this match</div>
                          <div className="space-y-2">
                            {(match.bets || []).map((b:any)=>(
                              <div key={b.$id} className="p-2 bg-neutral-950/80 border border-purple-900/60 rounded flex justify-between text-sm gap-4">
                                <div>
                                  <div className="font-semibold">{b.username}</div>
                                  <div className="text-xs text-purple-200/70">Bet: {formatCoins(b.betAmount)} • Legs: {b.totalLegs ?? b.numMatches} • Odds: {b.odds?.total ? `x${b.odds.total}` : 'n/a'}</div>
                                  <div className="text-xs text-purple-200/70 space-y-1">
                                    {buildPredictionLines(b, matchTeamInfoByMatchId).map((line, lineIdx) => (
                                      line.type === "match" ? (
                                        <div key={lineIdx}>
                                          <span>Match {line.matchNo}: </span>
                                          <span className={line.pickedSide === 'a' ? 'font-bold underline text-purple-100' : ''}>Team A: {line.teamA}</span>
                                          <span> | </span>
                                          <span className={line.pickedSide === 'b' ? 'font-bold underline text-purple-100' : ''}>Team B: {line.teamB}</span>
                                          <span> | Odds: {line.oddsLabel}</span>
                                        </div>
                                      ) : (
                                        <div key={lineIdx}>{line.label}</div>
                                      )
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold">{b.status === 'pending' ? `${b.correctPredictions}/${b.totalLegs ?? b.numMatches}` : (b.status === 'won' ? `+${formatCoins(b.winnings)}` : 'LOST')}</div>
                                  <div className="text-xs text-purple-200/60">{new Date(b.$createdAt || '').toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                            {(!match.bets || match.bets.length===0) && <div className="text-xs text-purple-200/60">No bets yet</div>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-purple-200/70 italic">Match will be available for betting once it starts playing.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          function updateOddsPreview(form) {
            const preview = form.querySelector('[data-odds-preview]');
            if (!preview) return;
            const amountInput = form.querySelector('input[name="betAmount"]');
            const amount = Number(amountInput ? amountInput.value : 0) || 0;
            const matchOdds = Array.from(form.querySelectorAll('input[type="radio"]:checked'))
              .map(r => Number(r.getAttribute('data-odds')) || 1);
            let totalOdds = 1;
            let legs = 0;
            matchOdds.forEach(o => { totalOdds *= o; legs += 1; });

            const vySelect = form.querySelector('select[name="vyrazackaOutcome"]');
            if (vySelect && vySelect.value) {
              const selectedVyOption = vySelect.options[vySelect.selectedIndex];
              const vyOdds = Number(selectedVyOption?.getAttribute('data-odds')) || 1;
              totalOdds *= vyOdds;
              legs += 1;
            }

            const goalsSelect = form.querySelector('select[name="totalGoals"]');
            if (goalsSelect && goalsSelect.value) {
              const selectedGoalsOption = goalsSelect.options[goalsSelect.selectedIndex];
              const goalsOdds = Number(selectedGoalsOption?.getAttribute('data-odds')) || 1;
              totalOdds *= goalsOdds;
              legs += 1;
            }

            if (legs === 0) {
              preview.textContent = 'Current odds: x1.00 • Potential win: 0';
              return;
            }
            const payout = Math.round(amount * totalOdds);
            preview.textContent = 'Current odds: x' + totalOdds.toFixed(2) + ' • Potential win: ' + payout.toLocaleString();
          }

          function wireOddsPreview(form) {
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(el => el.addEventListener('change', function(){ updateOddsPreview(form); }));
            inputs.forEach(el => el.addEventListener('keyup', function(){ updateOddsPreview(form); }));
            updateOddsPreview(form);
          }

          function wireUncheckableMatchRadios(form) {
            const radios = form.querySelectorAll('input[type="radio"][name^="match"]');
            radios.forEach(function(radio) {
              const markWasChecked = function() {
                radio.dataset.wasChecked = radio.checked ? '1' : '0';
              };

              radio.addEventListener('pointerdown', markWasChecked);
              radio.addEventListener('mousedown', markWasChecked);

              const parentLabel = radio.closest('label');
              if (parentLabel) {
                parentLabel.addEventListener('pointerdown', markWasChecked);
                parentLabel.addEventListener('mousedown', markWasChecked);
              }

              radio.addEventListener('click', function() {
                if (this.dataset.wasChecked === '1') {
                  this.checked = false;
                  this.dataset.wasChecked = '0';
                  this.dispatchEvent(new Event('change', { bubbles: true }));
                }
              });
            });
          }

          function wireSingleSubmit(form) {
            form.addEventListener('submit', function(event) {
              if (form.dataset.submitting === '1') {
                event.preventDefault();
                return;
              }

              form.dataset.submitting = '1';
              const submitButton = form.querySelector('button[type="submit"]');
              if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Placing Bet...';
              }
            });
          }

          document.querySelectorAll('.bet-form').forEach(form => {
            wireOddsPreview(form);
            wireUncheckableMatchRadios(form);
            wireSingleSubmit(form);
          });

          // ----- TAB SWITCHING + LAZY BETS PANEL FETCH -----
          (function(){
            const bar = document.getElementById('fbet-tab-bar');
            if (!bar) return;
            const buttons = bar.querySelectorAll('[data-tab-btn]');
            const panes = document.querySelectorAll('[data-tab-pane]');

            async function loadBetsPanel(target, page) {
              const containerId = target === 'your-bets' ? 'your-bets-container' : 'all-bets-container';
              const url = target === 'your-bets'
                ? '/v1/f-bet/your-bets?page=' + page
                : '/v1/f-bet/all-bets?page=' + page;
              const container = document.getElementById(containerId);
              if (!container) return;
              container.innerHTML = '<div class="text-sm text-purple-200/60 italic text-center py-6">Loading…</div>';
              try {
                const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
                if (!res.ok) throw new Error('http ' + res.status);
                const html = await res.text();
                container.innerHTML = html;
                container.setAttribute('data-loaded', 'true');
                container.setAttribute('data-current-page', String(page));
                wireBetsPanelPagination(container, target);
              } catch (e) {
                container.innerHTML = '<div class="text-sm text-rose-300 text-center py-6">Failed to load. Click the tab again to retry.</div>';
                container.setAttribute('data-loaded', 'false');
              }
            }

            function wireBetsPanelPagination(container, target) {
              const pagBtns = container.querySelectorAll('[data-bets-page]');
              pagBtns.forEach(function(btn){
                btn.addEventListener('click', function(ev){
                  ev.preventDefault();
                  if (btn.disabled) return;
                  const page = Number(btn.getAttribute('data-bets-page')) || 1;
                  loadBetsPanel(target, page);
                });
              });
            }

            function activate(name) {
              buttons.forEach(function(b){
                if (b.getAttribute('data-tab-btn') === name) {
                  b.className = 'px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-purple-600 text-white';
                } else {
                  b.className = 'px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700';
                }
              });
              panes.forEach(function(p){
                if (p.getAttribute('data-tab-pane') === name) {
                  p.style.display = '';
                } else {
                  p.style.display = 'none';
                }
              });
              try { localStorage.setItem('fbet-active-tab', name); } catch (e) {}

              if (name === 'your-bets' || name === 'all-bets') {
                const containerId = name === 'your-bets' ? 'your-bets-container' : 'all-bets-container';
                const c = document.getElementById(containerId);
                if (c && c.getAttribute('data-loaded') !== 'true') {
                  loadBetsPanel(name, 1);
                }
              }
            }

            buttons.forEach(function(b){
              b.addEventListener('click', function(){
                activate(b.getAttribute('data-tab-btn'));
              });
            });

            let initial = 'bet';
            try { initial = localStorage.getItem('fbet-active-tab') || 'bet'; } catch (e) {}
            activate(initial);
          })();

          // ----- COUNTDOWN TO SPIN RESET -----
          (function(){
            const el = document.querySelector('[data-spin-countdown]');
            if (!el) return;
            const resetIso = el.getAttribute('data-reset-iso');
            if (!resetIso) return;
            const resetMs = new Date(resetIso).getTime();
            function tick() {
              const diff = resetMs - Date.now();
              if (diff <= 0) {
                el.textContent = 'now';
                return;
              }
              const h = Math.floor(diff / 3600000);
              const m = Math.floor((diff % 3600000) / 60000);
              const s = Math.floor((diff % 60000) / 1000);
              el.textContent = (h > 0 ? h + 'h ' : '') + (m < 10 ? '0' + m : m) + 'm ' + (s < 10 ? '0' + s : s) + 's';
            }
            tick();
            setInterval(tick, 1000);
          })();

          // ----- FREE SPINS WHEEL -----
          (function(){
            const wheel = document.getElementById('free-spin-wheel');
            const btn = document.getElementById('free-spin-btn');
            const result = document.getElementById('free-spin-result');
            const spinsRemainingEl = document.querySelector('[data-spins-remaining]');
            const spinsWonEl = document.querySelector('[data-spins-won]');
            const userCoinsEl = document.querySelector('[data-user-coins]');
            const dailyLeftEl = document.querySelector('[data-daily-left]');
            const bonusLeftEl = document.querySelector('[data-bonus-left]');
            if (!wheel || !btn) return;
            const segmentMidsByIndex = ${JSON.stringify(Object.fromEntries(segments.map(s => [s.prize.index, s.midDeg])))};
            let currentRotation = 0;
            let spinning = false;

            function formatCoinsJs(n) {
              const num = Number(n) || 0;
              const sign = num < 0 ? '-' : '';
              const digits = String(Math.trunc(Math.abs(num)));
              return sign + digits.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ');
            }

            btn.addEventListener('click', async function() {
              if (spinning || btn.disabled) return;
              spinning = true;
              btn.disabled = true;
              if (result) result.innerHTML = '<span class="text-amber-200 animate-pulse">Spinning...</span>';

              let data;
              try {
                const res = await fetch('/v1/f-bet/spin', { method: 'POST' });
                data = await res.json();
              } catch (e) {
                result.innerHTML = '<span class="text-rose-300">Network error</span>';
                spinning = false;
                btn.disabled = false;
                return;
              }

              if (!data.ok) {
                result.innerHTML = '<span class="text-rose-300">' + (data.message || 'Failed') + '</span>';
                spinning = false;
                btn.disabled = (data.remaining === 0);
                return;
              }

              const prizeIndex = data.prize ? data.prize.index : 0;
              const targetMid = Number(segmentMidsByIndex[prizeIndex] || 0);
              const desiredMod = (360 - targetMid) % 360;
              const currentMod = ((currentRotation % 360) + 360) % 360;
              let delta = desiredMod - currentMod;
              if (delta < 0) delta += 360;
              const fullSpins = 6;
              const finalRotation = currentRotation + fullSpins * 360 + delta;
              currentRotation = finalRotation;
              wheel.style.transform = 'rotate(' + finalRotation + 'deg)';

              setTimeout(function() {
                const coins = data.prize ? data.prize.coins : 0;
                const label = data.prize ? data.prize.label : '';
                if (coins > 0) {
                  result.innerHTML = '<span class="text-emerald-300">🎉 You won <span class="text-amber-300 text-2xl">' + formatCoinsJs(coins) + '</span> coins! (' + label + ')</span>';
                } else {
                  result.innerHTML = '<span class="text-purple-200">😅 Try again! Better luck next spin.</span>';
                }
                if (spinsRemainingEl) spinsRemainingEl.textContent = String(data.remaining);
                if (spinsWonEl) spinsWonEl.textContent = formatCoinsJs(data.totalWonToday);
                if (userCoinsEl && typeof data.newCoins === 'number') userCoinsEl.textContent = formatCoinsJs(data.newCoins);
                if (bonusLeftEl && typeof data.bonusSpinsLeft === 'number') bonusLeftEl.textContent = String(data.bonusSpinsLeft);
                if (dailyLeftEl) {
                  const daily = Math.max(0, Number(data.remaining || 0) - Number(data.bonusSpinsLeft || 0));
                  dailyLeftEl.textContent = String(daily);
                }
                spinning = false;
                if (data.remaining > 0) {
                  btn.disabled = false;
                } else {
                  btn.disabled = true;
                  btn.innerHTML = '<span class="relative z-10">🎰 Come back tomorrow</span>';
                  btn.className = 'relative group w-full sm:w-auto px-10 py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-2xl bg-neutral-700 text-neutral-400 cursor-not-allowed';
                }
              }, 4100);
            });
          })();

          // ----- SUPER SPIN (roulette wheel) -----
          (function(){
            const btn = document.getElementById('super-spin-btn');
            if (!btn) return;
            const result = document.getElementById('super-spin-result');
            const availableEl = document.querySelector('[data-super-available]');
            const myTotalEl = document.querySelector('[data-super-mytotal]');
            const statusEl = document.querySelector('[data-super-status]');
            const wrap = document.getElementById('super-spin-badge-wrap');
            const wheel = document.getElementById('super-spin-wheel');
            const badge = document.getElementById('super-spin-badge');
            const confettiHost = document.getElementById('super-spin-confetti');

            // Cumulative wheel rotation so each spin keeps spinning forward.
            // Green slice spans -1.8°..+1.8° (centered at top). Pointer is at 0°.
            // For WIN: final rotation R must satisfy ((-R) mod 360) ∈ [-1.5°, 1.5°]
            //   → R mod 360 ∈ [358.5°, 360°] ∪ [0°, 1.5°]
            // For LOSE: pick R mod 360 ∈ [6°, 354°] (well clear of green).
            let totalRotation = 0;

            function fireConfetti(){
              if (!confettiHost) return;
              const emojis = ['🎉','✨','🍀','🌟','💎','🎊','⭐'];
              for (let i = 0; i < 28; i++) {
                const piece = document.createElement('span');
                piece.className = 'ss-confetti-piece';
                piece.textContent = emojis[i % emojis.length];
                const angle = (Math.PI * 2 * i) / 28 + (Math.random() * 0.4 - 0.2);
                const dist = 100 + Math.random() * 90;
                piece.style.setProperty('--ss-tx', Math.cos(angle) * dist + 'px');
                piece.style.setProperty('--ss-ty', Math.sin(angle) * dist + 'px');
                piece.style.setProperty('--ss-rot', (Math.random() * 720 + 360) + 'deg');
                piece.style.animationDelay = (Math.random() * 0.15) + 's';
                confettiHost.appendChild(piece);
              }
              setTimeout(() => { if (confettiHost) confettiHost.innerHTML = ''; }, 2200);
            }

            function spinTo(won){
              if (!wheel) return 0;
              // 8 full turns plus landing offset.
              const turns = 8 + Math.floor(Math.random() * 3); // 8–10 full rotations
              let landing;
              if (won) {
                // Land on green: small angle within ±1.4° of top.
                landing = (Math.random() * 2.8) - 1.4;
                if (landing < 0) landing += 360;
              } else {
                // Land on red: anywhere in 6°..354°.
                landing = 6 + Math.random() * 348;
              }
              totalRotation += turns * 360 + landing - (totalRotation % 360);
              wheel.style.transform = 'rotate(' + totalRotation + 'deg)';
              return 4200; // matches CSS transition duration
            }

            function clearResultAnims(){
              if (badge) badge.classList.remove('ss-win');
              if (wrap) wrap.classList.remove('ss-lose');
              if (wheel) wheel.classList.remove('ss-glowing');
              if (confettiHost) confettiHost.innerHTML = '';
            }

            let busy = false;
            btn.addEventListener('click', async function() {
              if (busy || btn.disabled) return;
              busy = true;
              btn.disabled = true;
              clearResultAnims();
              if (result) result.innerHTML = '<span class="text-fuchsia-200 animate-pulse">🎡 Spinning the wheel...</span>';
              if (wheel) wheel.classList.add('ss-glowing');

              let data;
              try {
                const res = await fetch('/v1/f-bet/super-spin', { method: 'POST' });
                data = await res.json();
              } catch (e) {
                if (wheel) wheel.classList.remove('ss-glowing');
                if (result) result.innerHTML = '<span class="text-rose-300">Network error</span>';
                busy = false;
                btn.disabled = false;
                return;
              }
              if (!data.ok) {
                if (wheel) wheel.classList.remove('ss-glowing');
                if (result) result.innerHTML = '<span class="text-rose-300">' + (data.message || 'Failed') + '</span>';
                busy = false;
                btn.disabled = !((data.superSpinsAvailable || 0) > 0 && !data.wonTockar);
                return;
              }

              const dur = spinTo(!!data.won);
              await new Promise(r => setTimeout(r, dur));

              if (wheel) wheel.classList.remove('ss-glowing');
              if (availableEl && typeof data.superSpinsAvailable === 'number') availableEl.textContent = String(data.superSpinsAvailable);
              if (myTotalEl && typeof data.superSpinsTotal === 'number') myTotalEl.textContent = String(data.superSpinsTotal);

              if (data.won) {
                if (badge) { void badge.offsetWidth; badge.classList.add('ss-win'); }
                fireConfetti();
                if (statusEl) statusEl.textContent = 'Won!';
                if (result) result.innerHTML = '<span class="ss-result-anim inline-block text-emerald-300">🎉 JACKPOT! Trafil si zelenú! <span class="text-amber-300">' + (data.badgeName || 'Točkář 🍀') + '</span> je tvoj — refreshni na equip.</span>';
                btn.disabled = true;
                btn.innerHTML = '<span class="relative z-10">🍀 Already won</span>';
                btn.className = 'relative group w-full px-6 py-4 rounded-xl font-black text-base uppercase tracking-widest transition-all shadow-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white cursor-not-allowed';
              } else {
                if (wrap) { void wrap.offsetWidth; wrap.classList.add('ss-lose'); }
                if (result) result.innerHTML = '<span class="ss-result-anim inline-block text-purple-200">😅 Červená — skús to znova alebo si kúp viac točení v Shope.</span>';
                if ((data.superSpinsAvailable || 0) > 0) {
                  busy = false;
                  btn.disabled = false;
                } else {
                  btn.disabled = true;
                  btn.innerHTML = '<span class="relative z-10">🍀 No spin left</span>';
                  btn.className = 'relative group w-full px-6 py-4 rounded-xl font-black text-base uppercase tracking-widest transition-all shadow-2xl bg-neutral-700 text-neutral-400 cursor-not-allowed';
                }
              }
              busy = false;
            });
          })();
        `
      }} />
    </div>
  );
}

// Lazy-loaded panel: player's own bets, paginated. Rendered HTML-only by
// /v1/f-bet/your-bets?page=N — never on the initial page load.
export function YourBetsPanel({
  playerBets,
  matchTeamInfoByMatchId,
  page,
  totalPages,
}: {
  playerBets: any[];
  matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }>;
  page: number;
  totalPages: number;
}) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <div data-bets-content="your-bets" data-current-page={page} data-total-pages={safeTotal}>
      <div className="flex flex-col gap-3">
        {playerBets.length === 0 ? (
          <div className="bg-neutral-900/70 border border-purple-700/60 p-4 rounded-lg text-center text-purple-200/70 text-sm">
            No bets placed yet
          </div>
        ) : (
          playerBets.map((bet: any) => {
            const subBetResultMap = getSubBetResultMap(bet);
            return (
              <div
                key={bet.$id}
                className={`p-3 rounded-lg border text-sm ${
                  bet.status === 'won'
                    ? 'bg-emerald-900/25 border-emerald-600'
                    : bet.status === 'lost'
                    ? 'bg-rose-900/25 border-rose-600'
                    : 'bg-purple-900/30 border-purple-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">{formatCoins(bet.betAmount)} coins</span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      bet.status === 'won'
                        ? 'bg-emerald-600 text-emerald-50'
                        : bet.status === 'lost'
                        ? 'bg-rose-600 text-rose-50'
                        : 'bg-purple-600 text-purple-100'
                    }`}
                  >
                    {bet.status === 'pending'
                      ? `${bet.correctPredictions}/${bet.totalLegs ?? bet.numMatches}`
                      : bet.status === 'won'
                      ? `+${formatCoins(bet.winnings)}`
                      : 'LOST'}
                  </span>
                </div>
                <div className="text-xs text-purple-200/70">
                  ID: {String(bet.matchId || '').substring(0, 8)}... • Odds: {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'}
                </div>
                <div className="text-xs text-purple-200/70 space-y-1">
                  {buildPredictionLines(bet, matchTeamInfoByMatchId).map((line, lineIdx) => (
                    line.type === 'match' ? (
                      <div key={lineIdx}>
                        <span>Match {line.matchNo}: </span>
                        <span className={line.pickedSide === 'a' ? 'font-bold underline text-purple-100' : ''}>Team A: {line.teamA}</span>
                        <span> | </span>
                        <span className={line.pickedSide === 'b' ? 'font-bold underline text-purple-100' : ''}>Team B: {line.teamB}</span>
                        <span> | Odds: {line.oddsLabel}</span>
                        <SubBetMarker result={subBetResultMap[`match${line.matchNo}`]} />
                      </div>
                    ) : (
                      <div key={lineIdx}>
                        <span>{line.label}</span>
                        {line.label.startsWith('Vyrazecka:') && <SubBetMarker result={subBetResultMap['vyrazackaOutcome']} />}
                        {line.label.startsWith('Total Goals:') && <SubBetMarker result={subBetResultMap['totalGoals']} />}
                      </div>
                    )
                  ))}
                </div>
                <div className="text-xs text-purple-200/60">{new Date(bet.$createdAt || '').toLocaleString()}</div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-purple-200/80">
        <span>Page {page} / {safeTotal}</span>
        <div className="flex gap-2">
          <button
            type="button"
            data-bets-page={page - 1}
            data-bets-target="your-bets"
            disabled={page <= 1}
            className={`px-2 py-1 rounded border ${page > 1 ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50 cursor-pointer' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 cursor-not-allowed'}`}
          >
            Prev
          </button>
          <button
            type="button"
            data-bets-page={page + 1}
            data-bets-target="your-bets"
            disabled={page >= safeTotal}
            className={`px-2 py-1 rounded border ${page < safeTotal ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50 cursor-pointer' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 cursor-not-allowed'}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Lazy-loaded panel: every player's bet history, paginated.
export function AllBetsHistoryPanel({
  allBetsHistory,
  matchTeamInfoByMatchId,
  page,
  totalPages,
}: {
  allBetsHistory: any[];
  matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }>;
  page: number;
  totalPages: number;
}) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <div data-bets-content="all-bets" data-current-page={page} data-total-pages={safeTotal}>
      <div className="bg-neutral-900/70 border border-purple-700/60 rounded-lg p-4 max-h-[26rem] overflow-y-auto">
        {allBetsHistory.length === 0 ? (
          <div className="text-sm text-purple-200/70">No bet history available.</div>
        ) : (
          <div className="space-y-2">
            {allBetsHistory.map((bet: any) => {
              const subBetResultMap = getSubBetResultMap(bet);
              return (
                <div key={bet.$id} className="p-3 rounded border border-purple-900/70 bg-neutral-950/70 flex justify-between gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-white">{bet.username}</div>
                    <div className="text-xs text-purple-200/70">Match {String(bet.matchId || '').substring(0, 8)}... • Bet {formatCoins(bet.betAmount || 0)} • Odds {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'}</div>
                    <div className="text-xs text-purple-200/70 space-y-1">
                      {buildPredictionLines(bet, matchTeamInfoByMatchId).map((line, lineIdx) => (
                        line.type === 'match' ? (
                          <div key={lineIdx}>
                            <span>Match {line.matchNo}: </span>
                            <span className={line.pickedSide === 'a' ? 'font-bold underline text-purple-100' : ''}>Team A: {line.teamA}</span>
                            <span> | </span>
                            <span className={line.pickedSide === 'b' ? 'font-bold underline text-purple-100' : ''}>Team B: {line.teamB}</span>
                            <span> | Odds: {line.oddsLabel}</span>
                            <SubBetMarker result={subBetResultMap[`match${line.matchNo}`]} />
                          </div>
                        ) : (
                          <div key={lineIdx}>
                            <span>{line.label}</span>
                            {line.label.startsWith('Vyrazecka:') && <SubBetMarker result={subBetResultMap['vyrazackaOutcome']} />}
                            {line.label.startsWith('Total Goals:') && <SubBetMarker result={subBetResultMap['totalGoals']} />}
                          </div>
                        )
                      ))}
                    </div>
                    <div className="text-xs text-purple-200/60">{new Date(bet.$createdAt || '').toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${bet.status === 'won' ? 'text-emerald-300' : bet.status === 'lost' ? 'text-rose-300' : 'text-indigo-200'}`}>
                      {bet.status === 'won' ? `+${formatCoins(bet.winnings || 0)}` : bet.status === 'lost' ? 'LOST' : 'PENDING'}
                    </div>
                    <div className="text-xs text-purple-200/60">Correct {bet.correctPredictions || 0}/{bet.totalLegs ?? bet.numMatches ?? 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-purple-200/80">
        <span>Page {page} / {safeTotal}</span>
        <div className="flex gap-2">
          <button
            type="button"
            data-bets-page={page - 1}
            data-bets-target="all-bets"
            disabled={page <= 1}
            className={`px-2 py-1 rounded border ${page > 1 ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50 cursor-pointer' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 cursor-not-allowed'}`}
          >
            Prev
          </button>
          <button
            type="button"
            data-bets-page={page + 1}
            data-bets-target="all-bets"
            disabled={page >= safeTotal}
            className={`px-2 py-1 rounded border ${page < safeTotal ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50 cursor-pointer' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 cursor-not-allowed'}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
