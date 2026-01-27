import { GlobalStats } from "../../logic/profile";

export default function GlobalStatsPanel({ globalStats }: { globalStats: GlobalStats }) {
  const vyrazPct = globalStats.totalGoals > 0
    ? Math.round((globalStats.totalVyrazecka / globalStats.totalGoals) * 10000) / 100
    : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 w-64 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-3">Global Stats</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-neutral-300">
          <span className="text-blue-400">Total Matches (games):</span>
          <span className="text-blue-400">{globalStats.totalMatches} ({globalStats.totalMatches/3})</span>
        </div>

        <div className="flex justify-between text-neutral-300">
          <span className="text-green-400">Total Goals:</span>
          <span className="text-green-400">{globalStats.totalGoals}</span>
        </div>

        <div className="flex justify-between text-neutral-300">
          <span className="text-orange-400">Podlézání:</span>
          <span className="text-orange-400">{globalStats.totalPodlezani}</span>
        </div>

        <div className="flex justify-between text-neutral-300">
          <span className="text-purple-400">Vyrážečka:</span>
          <span className="text-purple-400">{globalStats.totalVyrazecka} ({vyrazPct} %)</span>
        </div>
      </div>
    </div>
  );
}
