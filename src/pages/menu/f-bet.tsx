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

export function FBetPage({ c, currentUser, currentUserProfile, availableMatches, playerBets, allBetsHistory, playerBetsPage, playerBetsTotalPages, allBetsPage, allBetsTotalPages, matchTeamInfoByMatchId, spinsUsed, spinsTotalWon, spinPrizes, freeSpinsPerDay, spinHitsByIndex, spinTotalSpins, spinJackpotHits, spinNextResetIso, spinResetHour, myHitsByIndex, myTotalSpins, myTotalWonAllTime, myBonusSpins }: FBetPageProps) {
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
  const wonBets = playerBets.filter((b: any) => b.status === 'won');
  const lostBets = playerBets.filter((b: any) => b.status === 'lost');
  const totalWinnings = wonBets.reduce((sum: number, b: any) => sum + b.winnings, 0);
  const totalLosings = lostBets.reduce((sum: number, b: any) => sum + Number(b.betAmount || 0), 0);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-yellow-900/65 to-amber-900/55 p-4 rounded-lg border border-yellow-500/70">
          <div className="text-yellow-100/80 text-sm">Your Coins</div>
          <div className="text-3xl font-bold text-yellow-200" data-user-coins>{formatCoins(userCoins)}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/65 to-emerald-900/55 p-4 rounded-lg border border-green-500/70">
          <div className="text-green-100/80 text-sm">Total Winnings</div>
          <div className="text-3xl font-bold text-emerald-300">{formatCoins(totalWinnings)}</div>
        </div>
        <div className="bg-gradient-to-br from-red-900/65 to-rose-900/55 p-4 rounded-lg border border-rose-500/70">
          <div className="text-rose-100/80 text-sm">Total Losings</div>
          <div className="text-3xl font-bold text-rose-300">{formatCoins(totalLosings)}</div>
        </div>
      </div>

      {/* FREE SPINS */}
      {currentUser && (
        <div className="mb-8 relative overflow-hidden rounded-2xl border border-amber-500/60 bg-gradient-to-br from-purple-950/80 via-fuchsia-950/70 to-amber-900/40 p-6 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
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

      {/* JACKPOT HALL OF FAME */}
      {currentUser && (
        <div className="mb-8 relative rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-950/50 via-yellow-950/40 to-black/60 p-5 shadow-[0_0_25px_rgba(251,191,36,0.12)]">
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

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: AVAILABLE MATCHES */}
        <div className="lg:col-span-2">
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

        {/* RIGHT: BET HISTORY */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Bets</h2>
          <div className="flex flex-col gap-3 max-h-[30rem] overflow-y-auto pr-1">
            {playerBets.length === 0 ? (
              <div className="bg-neutral-900/70 border border-purple-700/60 p-4 rounded-lg text-center text-purple-200/70 text-sm">
                No bets placed yet
              </div>
            ) : (
              playerBets.map((bet: any) => (
                (() => {
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
                    <span className="font-semibold">
                      {formatCoins(bet.betAmount)} coins
                    </span>
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
                      ID: {bet.matchId.substring(0, 8)}... • Odds: {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'}
                  </div>
                  <div className="text-xs text-purple-200/70 space-y-1">
                    {buildPredictionLines(bet, matchTeamInfoByMatchId).map((line, lineIdx) => (
                      line.type === "match" ? (
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
                })()
              ))
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-purple-200/80">
            <span>Page {playerBetsPage} / {Math.max(1, playerBetsTotalPages)}</span>
            <div className="flex gap-2">
              <a
                href={buildBetPageHref(playerBetsPage - 1, allBetsPage)}
                className={`px-2 py-1 rounded border ${playerBetsPage > 1 ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 pointer-events-none'}`}
              >
                Prev
              </a>
              <a
                href={buildBetPageHref(playerBetsPage + 1, allBetsPage)}
                className={`px-2 py-1 rounded border ${playerBetsPage < Math.max(1, playerBetsTotalPages) ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 pointer-events-none'}`}
              >
                Next
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* GLOBAL BET HISTORY */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">All Players Bet History</h2>
        <div className="bg-neutral-900/70 border border-purple-700/60 rounded-lg p-4 max-h-[26rem] overflow-y-auto">
          {allBetsHistory.length === 0 ? (
            <div className="text-sm text-purple-200/70">No bet history available.</div>
          ) : (
            <div className="space-y-2">
              {allBetsHistory.map((bet: any) => (
                (() => {
                  const subBetResultMap = getSubBetResultMap(bet);
                  return (
                <div key={bet.$id} className="p-3 rounded border border-purple-900/70 bg-neutral-950/70 flex justify-between gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-white">{bet.username}</div>
                    <div className="text-xs text-purple-200/70">Match {String(bet.matchId || '').substring(0, 8)}... • Bet {formatCoins(bet.betAmount || 0)} • Odds {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'}</div>
                    <div className="text-xs text-purple-200/70 space-y-1">
                      {buildPredictionLines(bet, matchTeamInfoByMatchId).map((line, lineIdx) => (
                        line.type === "match" ? (
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
                })()
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-purple-200/80">
          <span>Page {allBetsPage} / {Math.max(1, allBetsTotalPages)}</span>
          <div className="flex gap-2">
            <a
              href={buildBetPageHref(playerBetsPage, allBetsPage - 1)}
              className={`px-2 py-1 rounded border ${allBetsPage > 1 ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 pointer-events-none'}`}
            >
              Prev
            </a>
            <a
              href={buildBetPageHref(playerBetsPage, allBetsPage + 1)}
              className={`px-2 py-1 rounded border ${allBetsPage < Math.max(1, allBetsTotalPages) ? 'border-purple-600 bg-purple-900/40 hover:bg-purple-800/50' : 'border-neutral-700 bg-neutral-900/50 text-neutral-500 pointer-events-none'}`}
            >
              Next
            </a>
          </div>
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
        `
      }} />
    </div>
  );
}
