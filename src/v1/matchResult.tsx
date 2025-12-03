import { Context } from "hono";

export function MatchResultPage({ c, result }: { c: Context; result: any }) {
  const players = result.players || [];
  const scores = result.scores || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* HEADER ROW */}
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-[Orbitron]">Match Results</h1>
            <p className="text-neutral-400 mb-6">Match ID: {result.matchId}</p>
          </div>

          <a href="/v1/match-history">
            <button class="px-4 py-2 bg-red-500 border-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer font-semibold transition-colors">
              ← Back
            </button>
          </a>
        </div>

        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 mb-6">
          <h3 className="text-lg text-white mb-2">Players & Changes</h3>
          <div className="space-y-4">
            {players.map((p:any) => (
              <div key={p.id} className="p-4 bg-neutral-800/30 rounded border border-neutral-700">
                <div className="flex justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white text-lg">{p.username}</div>
                    <div className="text-xs text-neutral-400">Games +{p.gamesAdded} — Wins +{p.winsAdded} — Loses +{p.losesAdded}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-neutral-300">ELO: <span className="font-bold text-yellow-400">{p.oldElo}</span> → <span className={p.newElo - p.oldElo >= 0 ? 'text-green-400' : 'text-red-400'}>{p.newElo}</span> ({p.newElo - p.oldElo >= 0 ? '+' : ''}{p.newElo - p.oldElo})</div>
                    <div className="text-sm text-neutral-300">XP: <span className="font-bold text-green-400">+{p.xpGained}</span></div>
                  </div>
                </div>

                {/* ELO Breakdown */}
                <div className="bg-neutral-900/50 rounded p-2 mb-2">
                  <div className="text-xs font-semibold text-neutral-300 mb-1">ELO Breakdown:</div>
                  <div className="space-y-1">
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
                </div>

                {/* XP Breakdown */}
                <div className="bg-neutral-900/50 rounded p-2">
                  <div className="text-xs font-semibold text-neutral-300 mb-1">XP Breakdown:</div>
                  <div className="space-y-1">
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
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 mb-6">
          <h3 className="text-lg text-white mb-2">Per-match scores</h3>
          <div className="space-y-3">
            {scores.map((s:any, i:number)=>(
              <div key={i} className="p-3 bg-neutral-800/30 rounded flex items-center justify-between">
                <div className="text-white font-semibold">{s.aNames.join(' / ')} <span className="text-neutral-300">vs</span> {s.bNames.join(' / ')}</div>
                <div className="text-xl font-bold text-white">{s.scoreA} : {s.scoreB}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
