import { Context } from "hono";

export function MatchHistoryPage({ c, matches, currentUser, filterUsername }: { c: Context; matches: any[]; currentUser: string | null; filterUsername: string | null}) {
  // matches: parsed with parseMatchHistoryDoc -> players include oldElo/newElo/xpGain
  return (
    <div class="p-6 text-white max-w-2xl mx-auto">
      {/* HEADER ROW */}
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Match History</h1>

        <div class="flex gap-2">
          <a href={`/v1/match-history`}>
            <button class="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">
              All Matches
            </button>
          </a>
          {currentUser && (
            <a href={`/v1/match-history/players/${currentUser}`}>
              <button class="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">
                Your Matches
              </button>
            </a>
          )}
        </div>

        <a href={`/v1/lobby`}>
          <button class="px-4 py-2 bg-red-500 border-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer font-semibold transition-colors">
            Back to lobby
          </button>
        </a>
      </div>

      <div class="flex flex-col gap-4">
        {matches.length === 0 ? (
          <p>No matches have been played yet.</p>
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
                class={`p-4 ${boxBaseClass} rounded-xl hover:bg-neutral-800 transition flex flex-col gap-2`}
              >
                <div class="flex justify-between items-center">
                  <span class="text-lg font-semibold">Match #{m.$id}</span>
                  <span class="opacity-70 text-sm">{m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A'}</span>
                </div>

                {/* Summary score (only for player-specific listings) */}
                {isPlayerView && (
                  <div class="flex items-center gap-3">
                    <div class="text-sm text-neutral-200">Result:</div>
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
                      {(playerWinsOverall === rounds.length && rounds.length >= 3) && <div className="text-xs text-green-100 font-bold">Ultimate Winner</div>}
                      {(playerWinsOverall === 0 && rounds.length >= 3) && <div className="text-xs text-red-100 font-bold">Ultimate Loser</div>}
                    </div>
                  </div>
                )}

                {/* Players list with details */}
                <div class="flex flex-wrap gap-2 text-sm">
                  {m.players.map((p: any) => {
                    const eloDelta = (p.newElo != null && p.oldElo != null) ? (p.newElo - p.oldElo) : null;
                    const vy = vyrazaTotals[p.id] || 0;
                    return (
                      <div class="px-2 py-1 bg-neutral-800 rounded-md">
                        <div className="font-semibold">{p.username || p.id}</div>
                        <div className="opacity-70 text-xs">Elo: {p.newElo ?? p.elo ?? '-'}{eloDelta != null ? (eloDelta >= 0 ? <span className="text-green-300"> (+{eloDelta})</span> : <span className="text-red-300"> ({eloDelta})</span>) : null}</div>
                        <div className="opacity-70 text-xs">Vyrážečky: <span className="text-neutral-100">{vy}</span></div>
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
