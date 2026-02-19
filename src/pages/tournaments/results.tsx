import { Context } from "hono";
import { getTournament, getTournamentResults, getTeam } from "../../logic/tournament";
import { formatCoins } from "../../logic/format";

export async function TournamentResultsPage({ c }: { c: Context }) {
  const tournamentId = c.req.param('id');

  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return <div className="text-red-400">Tournament not found</div>;
    }

    const results = await getTournamentResults(tournamentId);

    const getRewardInfo = (rank: number) => {
      const medals: { [key: number]: string } = {
        1: '🥇',
        2: '🥈',
        3: '🥉',
        4: '4️⃣',
      };
      const colors: { [key: number]: string } = {
        1: 'from-yellow-900 to-yellow-700',
        2: 'from-gray-700 to-gray-600',
        3: 'from-orange-900 to-orange-700',
        4: 'from-neutral-800 to-neutral-700',
      };
      return { medal: medals[rank], color: colors[rank] };
    };

    return (
      <div className="max-w-4xl mx-auto p-6 text-neutral-100">
        <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
        <p className="text-neutral-400 mb-8">Tournament Results</p>

        {results.length === 0 ? (
          <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6 text-center">
            <p className="text-neutral-400">Tournament is still in progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => {
              const { medal, color } = getRewardInfo(result.rank);

              return (
                <div
                  key={result.$id}
                  className={`rounded-lg border p-6 bg-gradient-to-r ${color}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <p className="text-4xl">{medal}</p>
                      <div>
                        <p className="text-2xl font-bold mb-1">
                          Place #{result.rank}
                        </p>
                        <p className="text-neutral-300">
                          {result.rank === 1 ? 'CHAMPIONS' : result.rank === 2 ? 'RUNNERS-UP' : result.rank === 3 ? 'BRONZE' : '4TH PLACE'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-yellow-300 mb-1">💰 {formatCoins(result.coinsAwarded)}</p>
                      <p className="text-sm text-neutral-300">coins per player</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-sm text-neutral-300 mb-2">Team Members:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <p className="font-semibold">🎮 {result.player1Id}</p>
                      <p className="font-semibold">🎮 {result.player2Id}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-6 bg-neutral-900/60 rounded-lg border border-neutral-800">
          <h3 className="font-bold mb-3">Rewards Summary</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-400">1st Place</p>
              <p className="font-bold text-yellow-400">{formatCoins(tournament.rewards.first)} coins</p>
            </div>
            <div>
              <p className="text-neutral-400">2nd Place</p>
              <p className="font-bold text-gray-300">{formatCoins(tournament.rewards.second)} coins</p>
            </div>
            <div>
              <p className="text-neutral-400">3rd Place</p>
              <p className="font-bold text-orange-400">{formatCoins(tournament.rewards.third)} coins</p>
            </div>
            <div>
              <p className="text-neutral-400">4th Place</p>
              <p className="font-bold text-neutral-300">{formatCoins(tournament.rewards.fourth)} coins</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-3">*Coins are awarded to each player in the team</p>
        </div>

        <a href="/v1/tournaments" className="inline-block mt-6 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
          Back to Tournaments
        </a>
      </div>
    );
  } catch (error) {
    console.error('Error loading results:', error);
    return <div className="text-red-400">Error loading results</div>;
  }
}
