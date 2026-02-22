import { PlayerProfile } from "../../logic/profile";
import { Tournament } from "../../logic/tournament";
import { eloColor } from "../../static/data";
import { getSeasonLabel } from "../../logic/season";

export function HallOfFamePage({
  selectedSeason,
  currentSeason,
  seasonIndexes,
  topPlayers,
  finishedTournaments,
}: {
  selectedSeason: number;
  currentSeason: number;
  seasonIndexes: number[];
  topPlayers: PlayerProfile[];
  finishedTournaments: Tournament[];
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white font-[Orbitron] mb-2">Hall of Fame</h1>
            <p className="text-neutral-400">Seasonal champions, top ELO players, and finished tournaments</p>
          </div>
          <a href="/v1/lobby" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-semibold transition-colors h-fit">
            ← Back to Lobby
          </a>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-3">Seasons</h2>
          <div className="flex flex-wrap gap-3">
            {seasonIndexes.map((season) => {
              const active = season === selectedSeason;
              return (
                <a
                  key={season}
                  href={`/v1/hall-of-fame?season=${season}`}
                  className={`px-6 py-4 rounded-lg border-2 font-bold text-lg transition-all ${
                    active
                      ? "border-yellow-400 bg-yellow-500/20 text-yellow-300"
                      : "border-neutral-700 bg-neutral-900/60 text-neutral-200 hover:border-green-500"
                  }`}
                >
                  {getSeasonLabel(season)}{season === currentSeason ? " (Current)" : ""}
                </a>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-800/50">
              <h3 className="text-2xl font-bold text-white">Top 10 ELO — {getSeasonLabel(selectedSeason)}</h3>
            </div>

            {topPlayers.length === 0 ? (
              <div className="p-6 text-neutral-400">No finished matches in this season yet.</div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {topPlayers.map((player, idx) => (
                  <div key={player.$id} className="px-5 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-neutral-300 w-10">#{idx + 1}</span>
                      <div>
                        <div className="text-white font-semibold">{player.username}</div>
                        <div className="text-sm text-neutral-400">W:{player.wins} / L:{player.loses}</div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${eloColor(player.elo)}`}>{player.elo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-800/50">
              <h3 className="text-2xl font-bold text-white">Finished Tournaments — {getSeasonLabel(selectedSeason)}</h3>
            </div>

            {finishedTournaments.length === 0 ? (
              <div className="p-6 text-neutral-400">No tournaments finished in this season.</div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {finishedTournaments.map((t) => (
                  <a
                    key={t.$id}
                    href={`/v1/tournaments/${t.$id}/results`}
                    className="px-5 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
                  >
                    <div>
                      <div className="text-white font-semibold">{t.name}</div>
                      <div className="text-sm text-neutral-400">{t.description || "No description"}</div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-neutral-800 rounded text-neutral-300">{t.finishedAt ? new Date(t.finishedAt).toLocaleDateString() : "Finished"}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
