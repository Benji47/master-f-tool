import { Context } from "hono";
import { formatCoins } from "../../logic/format";

export function MatchResultPage({ c, result, username, bets = [] }: { c: Context; result: any, username: string | null; bets?: any[] }) {
  const players = result.players || [];
  const scores = result.scores || [];
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

  const buildPredictionLines = (bet: any): PredictionLine[] => {
    const predictions = bet?.predictions || {};
    const odds = bet?.odds || predictions?._odds || {};
    const lines: PredictionLine[] = [];

    [1, 2, 3].forEach((idx) => {
      const key = `match${idx}`;
      const pick = predictions?.[key];
      if (!pick) return;
      const scoreRow = scores[idx - 1] || {};
      const teamA = Array.isArray(scoreRow?.aNames) ? scoreRow.aNames.join(' & ') : '-';
      const teamB = Array.isArray(scoreRow?.bNames) ? scoreRow.bNames.join(' & ') : '-';
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
  };

  const getSubBetResultMap = (bet: any): Record<string, 'correct' | 'wrong' | 'pending'> => {
    const map: Record<string, 'correct' | 'wrong' | 'pending'> = {};
    (bet?.subBetResults || []).forEach((row: any) => {
      if (row?.key && (row?.result === 'correct' || row?.result === 'wrong' || row?.result === 'pending')) {
        map[String(row.key)] = row.result;
      }
    });
    return map;
  };

  const SubBetMarker = ({ result }: { result?: 'correct' | 'wrong' | 'pending' }) => {
    if (result === 'correct') return <span className="ml-2 text-emerald-300 font-bold">✓</span>;
    if (result === 'wrong') return <span className="ml-2 text-rose-300 font-bold">✕</span>;
    if (result === 'pending') return <span className="ml-2 text-amber-300 font-bold">•</span>;
    return null;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* HEADER ROW */}
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-[Orbitron]">Match Results</h1>
            <p className="text-neutral-400 mb-6">Match ID: {result.matchId}</p>
          </div>

          <button onclick="history.back()" class="px-4 py-2 bg-red-500 border-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer font-semibold transition-colors">
            ← Back
          </button>
        </div>

        <div className="bg-neutral-900/60 rounded-lg p-4 border border-purple-700/60 mb-6">
          <h3 className="text-lg text-white mb-3">Per-match scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scores.map((s:any, i:number)=>{
              const scoreA = Number(s.scoreA || 0);
              const scoreB = Number(s.scoreB || 0);
              const aWon = scoreA > scoreB;
              const bWon = scoreB > scoreA;

              const aHalfClass = aWon
                ? "bg-green-900/45 text-green-100"
                : bWon
                  ? "bg-red-900/45 text-red-100"
                  : "bg-neutral-800/60 text-neutral-200";

              const bHalfClass = bWon
                ? "bg-green-900/45 text-green-100"
                : aWon
                  ? "bg-red-900/45 text-red-100"
                  : "bg-neutral-800/60 text-neutral-200";

              return (
                <div key={i} className="rounded border border-purple-700/60 overflow-hidden">
                  <div className="text-xs uppercase tracking-wide text-purple-200/70 px-3 py-2 bg-neutral-900/80 border-b border-purple-700/50">Round {i + 1}</div>
                  <div className="grid grid-cols-2">
                    <div className={`p-3 border-r border-neutral-700/80 ${aHalfClass}`}>
                      <div className="text-xs opacity-80 mb-1">Team A</div>
                      <div className="text-sm font-semibold leading-snug">{s.aNames.join(' / ')}</div>
                      <div className="text-2xl font-bold mt-2">{scoreA}</div>
                    </div>
                    <div className={`p-3 ${bHalfClass}`}>
                      <div className="text-xs opacity-80 mb-1">Team B</div>
                      <div className="text-sm font-semibold leading-snug">{s.bNames.join(' / ')}</div>
                      <div className="text-2xl font-bold mt-2">{scoreB}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-neutral-900/60 rounded-lg p-4 border border-purple-700/60 mb-6">
          <h3 className="text-lg text-white mb-3">Players & Changes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map((p:any) => {
              const eloDelta = (p.newElo || 0) - (p.oldElo || 0);
              return (
                <div key={p.id} className="p-4 bg-neutral-900/70 rounded-lg border border-purple-700/60">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-white text-lg leading-tight">
                        {p.username}
                      </div>
                      <div className="text-xs text-neutral-400 mt-1">
                        Games +{p.gamesAdded} — Wins +{p.winsAdded} — Loses +{p.losesAdded}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.winsAdded === 3 && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-green-900/50 border border-green-700 text-green-300">Ultimate Winner</span>
                      )}
                      {p.losesAdded === 3 && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-red-900/50 border border-red-700 text-red-300">Ultimate Loser</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`rounded border p-2 ${eloDelta >= 0 ? 'bg-green-900/40 border-green-600/60' : 'bg-red-900/40 border-red-600/60'}`}>
                      <div className="text-xs text-neutral-200">
                        ELO: <span className="text-yellow-400 font-semibold">{p.oldElo}</span>
                        <span className="mx-1 text-neutral-500">→</span>
                        <span className={eloDelta >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{p.newElo}</span>
                        <span className={`ml-2 ${eloDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({eloDelta >= 0 ? '+' : ''}{eloDelta})
                        </span>
                      </div>
                    </div>

                    <div className="bg-purple-900/40 rounded border border-purple-600/60 p-2">
                      <div className="text-xs text-purple-200">
                        XP: <span className="font-semibold">+{p.xpGained || 0}</span>
                      </div>
                    </div>

                    <div className="bg-amber-900/40 rounded border border-amber-600/60 p-2">
                      <div className="text-xs text-amber-200">
                        Coins: <span className="font-semibold">+{formatCoins(p.coinsGained || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <details className="bg-neutral-900/50 rounded border border-purple-700/50 p-2 mb-2">
                    <summary className="cursor-pointer text-xs font-semibold text-neutral-300 hover:text-white">Show ELO breakdown</summary>
                    <div className="space-y-1 mt-2">
                      {(p.eloBreakdown?.breakdown || []).map((item: any, i: number) => (
                        <div key={i} className="text-xs text-neutral-400 flex justify-between">
                          <span>{item.reason}</span>
                          <span className={item.delta >= 0 ? 'text-green-400' : 'text-red-400'}>{item.delta >= 0 ? '+' : ''}{item.delta}</span>
                        </div>
                      ))}
                      <div className="text-xs font-semibold text-neutral-200 flex justify-between border-t border-neutral-700 pt-1 mt-1">
                        <span>Total ELO</span>
                        <span className={(p.eloBreakdown?.total || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>{(p.eloBreakdown?.total || 0) >= 0 ? '+' : ''}{p.eloBreakdown?.total || 0}</span>
                      </div>
                    </div>
                  </details>

                  <details className="bg-neutral-900/50 rounded border border-purple-700/50 p-2">
                    <summary className="cursor-pointer text-xs font-semibold text-neutral-300 hover:text-white">Show XP breakdown</summary>
                    <div className="space-y-1 mt-2">
                      {(p.xpBreakdown?.breakdown || []).map((item: any, i: number) => (
                        <div key={i} className="text-xs text-neutral-400 flex justify-between">
                          <span>{item.reason}</span>
                          <span className="text-green-400">+{item.delta}</span>
                        </div>
                      ))}
                      <div className="text-xs font-semibold text-neutral-200 flex justify-between border-t border-neutral-700 pt-1 mt-1">
                        <span>Total XP</span>
                        <span className="text-green-400">+{p.xpGained || 0}</span>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-neutral-900/60 rounded-lg p-4 border border-purple-700/60">
          <h3 className="text-lg text-white mb-2">Bets for this match</h3>
          {bets.length === 0 ? (
            <p className="text-neutral-400">No bets placed.</p>
          ) : (
            <div className="space-y-2">
              {bets.map((bet: any) => {
                const status = String(bet.status || 'pending').toLowerCase();
                const subBetResultMap = getSubBetResultMap(bet);
                return (
                  <div
                    key={bet.$id}
                    className="p-3 rounded border border-purple-900/70 bg-neutral-950/70 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-white">{bet.username} • {formatCoins(bet.betAmount || 0)} coins</span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          status === 'won'
                            ? 'bg-emerald-600 text-emerald-50'
                            : status === 'lost'
                              ? 'bg-rose-600 text-rose-50'
                              : 'bg-purple-600 text-purple-100'
                        }`}
                      >
                        {status === 'pending'
                          ? `${bet.correctPredictions || 0}/${bet.totalLegs ?? bet.numMatches ?? 0}`
                          : status === 'won'
                            ? `+${formatCoins(bet.winnings || 0)}`
                            : 'LOST'}
                      </span>
                    </div>
                    <div className="text-xs text-purple-200/70 mb-1">Odds: {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'} • Legs: {bet.totalLegs ?? bet.numMatches ?? 0}</div>
                    <div className="text-xs text-purple-200/70 space-y-1">
                      {buildPredictionLines(bet).map((line, lineIdx) => (
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
                    <div className="text-xs text-purple-200/60 mt-1">{new Date(bet.$createdAt || '').toLocaleString()}</div>
                    <div className="text-xs text-neutral-300 mt-1">Correct: {bet.correctPredictions || 0}/{bet.totalLegs ?? bet.numMatches ?? 0}</div>
                    <div className="text-xs text-yellow-300 font-semibold mt-1">Winnings: {formatCoins(bet.winnings || 0)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
