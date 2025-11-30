import { Context } from "hono";
import "../styles/Homepage.css";

interface LeaderboardPlayer {
  $id: string;
  username: string;
  elo: number;
  wins: number;
  loses: number;
  ultimate_wins: number;
  ultimate_loses: number;
}

export function LeaderboardPage({ players }: { players: LeaderboardPlayer[] }) {
  function eloColor(elo: number) {
    if (elo >= 5000) return "text-red-500";
    if (elo >= 4000) return "text-indigo-500";
    if (elo >= 3000) return "text-sky-500";
    if (elo >= 2000) return "text-amber-500";
    if (elo >= 1000) return "text-gray-400";
    return "text-yellow-600";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white font-[Orbitron] mb-2">Leaderboard</h1>
          <p className="text-neutral-400">Top players by ELO rating</p>
        </div>

        <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-neutral-800/50 font-bold text-neutral-200 text-sm">
            <div>Rank</div>
            <div>Player</div>
            <div>ELO</div>
            <div>Wins</div>
            <div>Loses</div>
            <div>Ultimate Wins</div>
            <div>Ultimate Loses</div>
          </div>

          <div className="divide-y divide-neutral-800">
            {players.map((player, idx) => (
              <div key={player.$id} className="grid grid-cols-7 gap-4 px-6 py-4 text-neutral-300 hover:bg-neutral-800/30 transition-colors">
                <div className="font-bold text-lg">#{idx + 1}</div>
                <div className="text-white font-semibold">{player.username}</div>
                <div className={`font-bold ${eloColor(player.elo)}`}>{player.elo}</div>
                <div className="text-green-400">{player.wins}</div>
                <div className="text-red-400">{player.loses}</div>
                <div className="text-yellow-400">{player.ultimate_wins}</div>
                <div className="text-red-300">{player.ultimate_loses}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <a href="/v1/lobby">
            <button className="px-6 py-2 bg-neutral-800/60 hover:bg-neutral-800 text-white rounded-md">
              ← Back to Lobby
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
