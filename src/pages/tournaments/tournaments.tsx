import { Context } from "hono";
import { listTournaments } from "../../logic/tournament";
import { formatCoins } from "../../logic/format";

export async function TournamentsPage({ c }: { c: Context }) {
  try {
    const allTournaments = await listTournaments();
    const activeTournaments = allTournaments.filter(t => t.status === 'registration' || t.status === 'started');
    const completedTournaments = allTournaments.filter(t => t.status === 'finished');

    return (
      <div className="max-w-6xl mx-auto p-6 text-neutral-100">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <a href="/v1/tournaments/create" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition">
            Create Tournament
          </a>
        </div>

        {/* Active Tournaments */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-purple-400">Active Tournaments</h2>
          {activeTournaments.length === 0 ? (
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6 text-center">
              <p className="text-neutral-400">No active tournaments at the moment</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeTournaments.map((tournament) => (
                <a
                  key={tournament.$id}
                  href={`/v1/tournaments/${tournament.$id}`}
                  className="block bg-neutral-900/60 rounded-lg border border-neutral-800 hover:border-purple-600 p-6 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                      <p className="text-neutral-400 mb-2">{tournament.description}</p>
                      <div className="flex gap-4 text-sm text-neutral-400">
                        <span className="px-2 py-1 bg-neutral-800 rounded">
                          Status: <span className="text-purple-400 font-semibold">{tournament.status}</span>
                        </span>
                        <span className="px-2 py-1 bg-neutral-800 rounded">
                          Teams: <span className="text-purple-400 font-semibold">{tournament.maxTeams}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-400 mb-2">Rewards Pool</p>
                      <p className="text-purple-400 font-bold">💰 {formatCoins((tournament.rewards.first + tournament.rewards.second + tournament.rewards.third + tournament.rewards.fourth) * 2)}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tournaments */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-neutral-400">Completed Tournaments</h2>
          {completedTournaments.length === 0 ? (
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6 text-center">
              <p className="text-neutral-400">No completed tournaments yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {completedTournaments.map((tournament) => (
                <a
                  key={tournament.$id}
                  href={`/v1/tournaments/${tournament.$id}/results`}
                  className="block bg-neutral-900/60 rounded-lg border border-neutral-800 hover:border-neutral-600 p-6 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                      <p className="text-neutral-400">{tournament.description}</p>
                    </div>
                    <span className="text-sm px-3 py-1 bg-neutral-800 rounded text-neutral-300">Finished</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <a href="/v1/lobby" className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
            Back to Lobby
          </a>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading tournaments:', error);
    return (
      <div className="max-w-3xl mx-auto p-6 bg-neutral-900/60 rounded-lg border border-neutral-800 text-neutral-100">
        <p className="text-red-400">Error loading tournaments</p>
        <a href="/v1/lobby" className="inline-block mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
          Back to Lobby
        </a>
      </div>
    );
  }
}
