import { Context } from "hono";

export function MatchHistoryPage({ c, matches, currentUser, filterUsername }: { c: Context; matches: any[]; currentUser: string | null; filterUsername: string | null}) {
  // matches: parsed with parseMatchHistoryDoc -> players include oldElo/newElo/xpGain
  const formatCoins = (value: number) => new Intl.NumberFormat("cs-CZ").format(Math.max(0, Math.floor(value || 0)));

  return (
    <div class="min-h-screen p-6 text-white max-w-5xl mx-auto">
      {/* HEADER ROW */}
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-4xl font-bold font-[Orbitron] text-purple-200">Match History</h1>

        <div class="flex gap-2">
          <a href={`/v1/match-history`}>
            <button class="tab-btn px-4 py-2 bg-neutral-800/70 border border-purple-600/40 hover:bg-neutral-700/80 hover:border-purple-500/60 cursor-pointer text-white rounded-md font-semibold transition-colors">
              All Matches
            </button>
          </a>
          {currentUser && (
            <a href={`/v1/match-history/players/${currentUser}`}>
              <button class="tab-btn px-4 py-2 bg-neutral-800/70 border border-purple-600/40 hover:bg-neutral-700/80 hover:border-purple-500/60 cursor-pointer text-white rounded-md font-semibold transition-colors">
                Your Matches
              </button>
            </a>
          )}
        </div>

        <a href={`/v1/lobby`}>
          <button class="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-md hover:from-purple-500 hover:to-violet-500 cursor-pointer font-semibold transition-colors">
            Back to lobby
          </button>
        </a>
      </div>

      <div class="flex flex-col gap-4">
        {matches.length === 0 ? (
          <p className="text-neutral-300">No matches have been played yet.</p>
        ) : (
          matches.map((m) => {
            // compute aggregate pairing wins for teams
            const rounds = Array.isArray(m.scores) ? m.scores : [];

            // totals per side across rounds
            let teamAWins = 0;
            let teamBWins = 0;
            rounds.forEach((r: any) => {
              if ((r.scoreA ?? 0) > (r.scoreB ?? 0)) teamAWins++;
              else if ((r.scoreB ?? 0) > (r.scoreA ?? 0)) teamBWins++;
            });

            // helper to compute vyrazacky per player
            const vyrazaTotals: Record<string, number> = {};
            rounds.forEach((r: any) => {
              if (r.vyrazacka) {
                Object.keys(r.vyrazacka).forEach((id) => {
                  vyrazaTotals[id] = (vyrazaTotals[id] || 0) + (r.vyrazacka[id] || 0);
                });
              }
            });

            const totalVyrazacky = Object.values(vyrazaTotals).reduce((sum, value) => sum + Number(value || 0), 0);
            const goldenEvents = rounds
              .map((r: any) => r?.goldenVyrazacka)
              .filter((g: any) => g && g.playerId);
            const hasGoldenVyrazacka = goldenEvents.length > 0;

            const playerNameById: Record<string, string> = {};
            (m.players || []).forEach((p: any) => {
              playerNameById[p.id] = p.username || p.id;
            });

            const roundWinCounts: Record<string, number> = {};
            const roundLoseCounts: Record<string, number> = {};
            rounds.forEach((r: any) => {
              const a = Array.isArray(r.a) ? r.a : [];
              const b = Array.isArray(r.b) ? r.b : [];
              const scoreA = Number(r.scoreA ?? 0);
              const scoreB = Number(r.scoreB ?? 0);
              if (scoreA === scoreB) return;

              const winners = scoreA > scoreB ? a : b;
              const losers = scoreA > scoreB ? b : a;

              winners.forEach((id: string) => {
                roundWinCounts[id] = (roundWinCounts[id] || 0) + 1;
              });
              losers.forEach((id: string) => {
                roundLoseCounts[id] = (roundLoseCounts[id] || 0) + 1;
              });
            });

            const ultimateWinnerId = rounds.length === 3
              ? (m.players || []).find((p: any) => (roundWinCounts[p.id] || 0) === 3)?.id
              : undefined;
            const ultimateLoserId = rounds.length === 3
              ? (m.players || []).find((p: any) => (roundLoseCounts[p.id] || 0) === 3)?.id
              : undefined;

            const ultimateWinnerName = ultimateWinnerId ? (playerNameById[ultimateWinnerId] || ultimateWinnerId) : null;
            const ultimateLoserName = ultimateLoserId ? (playerNameById[ultimateLoserId] || ultimateLoserId) : null;
            const hasUltimate = !!ultimateWinnerName || !!ultimateLoserName;

            const ultimateSummary = ultimateWinnerName && ultimateLoserName
              ? `Ultimate Winner: ${ultimateWinnerName} • Ultimate Loser: ${ultimateLoserName}`
              : ultimateWinnerName
                ? `Ultimate Winner: ${ultimateWinnerName}`
                : ultimateLoserName
                  ? `Ultimate Loser: ${ultimateLoserName}`
                  : "Ultimate Winner/Loser: none";

            const lostInBets = Number(m?.betSummary?.lostAmount || 0);
            const wonInBetsProfit = Number(m?.betSummary?.profitWon || 0);

            // determine if this render is for a specific player listing
            const isPlayerView = !!filterUsername;

            // compute player's wins/opponent wins when player view
            let playerWinsOverall = 0;
            let opponentWinsOverall = 0;
            if (isPlayerView) {
              rounds.forEach((r: any) => {
                const a = Array.isArray(r.a) ? r.a : [];
                const b = Array.isArray(r.b) ? r.b : [];
                const isInA = a.includes(filterUsername as string);
                const isInB = b.includes(filterUsername as string);
                if (isInA && (r.scoreA ?? 0) > (r.scoreB ?? 0)) playerWinsOverall++;
                else if (isInA && (r.scoreB ?? 0) > (r.scoreA ?? 0)) opponentWinsOverall++;
                else if (isInB && (r.scoreB ?? 0) > (r.scoreA ?? 0)) playerWinsOverall++;
                else if (isInB && (r.scoreA ?? 0) > (r.scoreB ?? 0)) opponentWinsOverall++;
              });
            }

            const boxBaseClass = isPlayerView
              ? (playerWinsOverall > opponentWinsOverall ? 'bg-green-700 text-white' : (playerWinsOverall < opponentWinsOverall ? 'bg-red-700 text-white' : 'bg-neutral-900'))
              : 'bg-neutral-900';

            return (
              <a
                href={`/v1/match-history/${m.$id}`}
                class={`p-4 ${boxBaseClass} rounded-xl border border-purple-700/50 bg-black hover:bg-neutral-900 hover:border-purple-500/80 hover:shadow-[0_0_28px_rgba(147,51,234,0.35)] hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-200 ease-out flex flex-col gap-3`}
              >
                <div class="flex justify-between items-center">
                  <span class="text-lg font-semibold text-purple-100">Match #{m.$id}</span>
                  <span class="text-purple-200/80 text-sm">{m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className={`px-4 py-3 rounded-md border ${ultimateWinnerName ? "bg-green-900/40 border-green-500/60 text-green-100" : "bg-red-900/40 border-red-500/60 text-red-100"}`}>
                    {ultimateSummary}
                  </div>
                  <div className="text-sm overflow-hidden">
                    <div className="grid grid-cols-2 gap-3 h-full">
                      <div className="px-4 py-3 rounded-md h-full bg-red-900/40 border border-red-500/60 text-red-100">
                        Lost: <span className="font-semibold">{formatCoins(lostInBets)}</span>
                      </div>
                      <div className="px-4 py-3 rounded-md h-full bg-green-900/40 border border-green-500/60 text-green-100">
                        Won: <span className="font-semibold">{formatCoins(wonInBetsProfit)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-3 rounded-md border ${totalVyrazacky >= 1 ? "bg-green-900/40 border-green-500/60 text-green-100" : "bg-red-900/40 border-red-500/60 text-red-100"}`}>
                    Total Vyrážečky (all rounds): <span className="font-semibold">{totalVyrazacky}</span>
                  </div>
                  <div className={`px-4 py-3 rounded-md border ${hasGoldenVyrazacka ? "bg-amber-900/40 border-amber-500/60 text-amber-100" : "bg-red-900/40 border-red-500/60 text-red-100"}`}>
                    Golden Vyrážečka: {hasGoldenVyrazacka ? <span className="font-semibold">Yes</span> : <span className="font-semibold">No</span>}
                  </div>
                </div>

                {/* Summary score (only for player-specific listings) */}
                {isPlayerView && (
                  <div class="flex items-center gap-3">
                    <div class="text-sm text-purple-200">Result:</div>
                    <div class="flex items-center gap-4">
                      {(() => {
                        const scoreBoxClass = playerWinsOverall > opponentWinsOverall
                          ? 'px-4 py-2 rounded-md text-3xl font-extrabold bg-green-800 text-green-50'
                          : (playerWinsOverall < opponentWinsOverall
                            ? 'px-4 py-2 rounded-md text-3xl font-extrabold bg-red-800 text-red-50'
                            : 'px-4 py-2 rounded-md text-3xl font-extrabold bg-neutral-800 text-white');

                        return (
                          <div className={scoreBoxClass}>
                            <span>{playerWinsOverall}</span>
                            <span class="mx-2 text-neutral-200">:</span>
                            <span>{opponentWinsOverall}</span>
                          </div>
                        );
                      })()}

                      {/* ultimate badges only in player view */}
                      {(rounds.length === 3 && playerWinsOverall === 3) && <div className="text-xs text-green-100 font-bold">Ultimate Winner</div>}
                      {(rounds.length === 3 && playerWinsOverall === 0) && <div className="text-xs text-red-100 font-bold">Ultimate Loser</div>}
                    </div>
                  </div>
                )}

                {/* Players list with details */}
                <div class="flex flex-wrap gap-3 text-sm">
                  {m.players.map((p: any) => {
                    const eloDelta = (p.newElo != null && p.oldElo != null) ? (p.newElo - p.oldElo) : null;
                    const vy = vyrazaTotals[p.id] || 0;
                    const playerBoxClass = eloDelta == null
                      ? "bg-neutral-900/70 border-purple-600/30"
                      : eloDelta >= 0
                        ? "bg-green-900/35 border-green-500/60"
                        : "bg-red-900/35 border-red-500/60";
                    return (
                      <div class={`px-3 py-2 border rounded-md ${playerBoxClass}`}>
                        <div className="font-semibold">{p.username || p.id}</div>
                        <div className="opacity-80 text-xs text-purple-100">Elo: {p.newElo ?? p.elo ?? '-'}{eloDelta != null ? (eloDelta >= 0 ? <span className="text-green-300"> (+{eloDelta})</span> : <span className="text-red-300"> ({eloDelta})</span>) : null}</div>
                        <div className="opacity-80 text-xs text-purple-100">Vyrážečky: <span className="text-cyan-200 font-semibold">{vy}</span></div>
                      </div>
                    );
                  })}
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
