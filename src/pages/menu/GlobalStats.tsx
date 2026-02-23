import { GlobalStats } from "../../logic/profile";

export default function GlobalStatsPanel({ globalStats }: { globalStats: GlobalStats }) {
  const vyrazPct = globalStats.totalGoals > 0
    ? Math.round((globalStats.totalVyrazecka / globalStats.totalGoals) * 10000) / 100
    : 0;

  return (
    <div className="bg-neutral-900/50 rounded-lg border border-purple-600/50 p-4">
      <h3 className="text-lg font-bold text-white mb-3">Global Stats</h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-neutral-800/50 rounded-lg border border-purple-600/30 p-3">
          <div className="text-xs text-neutral-400 mb-1">Total Matches</div>
          <div className="text-lg font-bold text-blue-400">{globalStats.totalMatches}</div>
          <div className="text-xs text-neutral-500">({globalStats.totalMatches / 3} games)</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg border border-purple-600/30 p-3">
          <div className="text-xs text-neutral-400 mb-1">Total Goals</div>
          <div className="text-lg font-bold text-green-400">{globalStats.totalGoals}</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg border border-purple-600/30 p-3">
          <div className="text-xs text-neutral-400 mb-1">Podlezani</div>
          <div className="text-lg font-bold text-orange-400">{globalStats.totalPodlezani}</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg border border-purple-600/30 p-3">
          <div className="text-xs text-neutral-400 mb-1">Vyrazecka</div>
          <div className="text-lg font-bold text-purple-400">{globalStats.totalVyrazecka}</div>
          <div className="text-xs text-neutral-500">{vyrazPct}% of goals</div>
        </div>
      </div>
    </div>
  );
}
