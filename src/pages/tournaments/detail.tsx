import { Context } from "hono";
import { getTournament, getTournamentTeams, getTeamAverageElo } from "../../logic/tournament";
import { getPlayerProfile } from "../../logic/profile";
import { getRankInfoFromElo } from "../../static/data";
import { getCookie } from "hono/cookie";

export async function TournamentDetailPage({ c }: { c: Context }) {
  const tournamentId = c.req.param('id');
  const userId = getCookie(c, 'user');

  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return (
        <div className="max-w-4xl mx-auto p-6 text-red-400">
          Tournament not found
          <br />
          <a href="/v1/tournaments" className="text-blue-400 hover:underline">Back to Tournaments</a>
        </div>
      );
    }

    const teams = await getTournamentTeams(tournamentId);
    const lockedTeams = teams.filter(t => t.status === 'locked');
    const lookingTeams = teams.filter(t => t.status === 'looking');

    // Check if current user is in this tournament
    const userTeam = teams.find(t => t.player1.id === userId || t.player2?.id === userId);
    const isTournamentCreator = tournament.creatorId === userId;

    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
              <p className="text-neutral-400">{tournament.description}</p>
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded font-semibold ${
                tournament.status === 'registration' ? 'bg-blue-900/50 text-blue-300' :
                tournament.status === 'started' ? 'bg-orange-900/50 text-orange-300' :
                'bg-green-900/50 text-green-300'
              }`}>
                {tournament.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-4">
              <p className="text-neutral-400 text-sm">Teams Registered</p>
              <p className="text-2xl font-bold text-purple-400">{lockedTeams.length}/{tournament.maxTeams}</p>
            </div>
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-4">
              <p className="text-neutral-400 text-sm">Looking for Partner</p>
              <p className="text-2xl font-bold text-orange-400">{lookingTeams.length}</p>
            </div>
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-4">
              <p className="text-neutral-400 text-sm">1st Place Prize</p>
              <p className="text-2xl font-bold text-yellow-400">💰 {tournament.rewards.first}</p>
            </div>
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-4">
              <p className="text-neutral-400 text-sm">Total Prize Pool</p>
              <p className="text-2xl font-bold text-green-400">💰 {(tournament.rewards.first + tournament.rewards.second + tournament.rewards.third + tournament.rewards.fourth) * 2}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {tournament.status === 'registration' && (
          <div className="mb-8 flex gap-4">
            {!userTeam && (
              <>
                <a href={`/v1/tournaments/${tournamentId}/teams/create`} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition">
                  Create Team
                </a>
                <a href={`/v1/tournaments/${tournamentId}/teams/join`} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded font-semibold transition">
                  Join Existing Team
                </a>
              </>
            )}
            {isTournamentCreator && lockedTeams.length >= 2 && (
              <button
                hx-post={`/v1/api/tournaments/${tournamentId}/start`}
                hx-swap="beforebegin"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
              >
                Start Tournament
              </button>
            )}
          </div>
        )}

        {/* Registered Teams */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Registered Teams ({lockedTeams.length})</h2>
          {lockedTeams.length === 0 ? (
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6 text-center">
              <p className="text-neutral-400">No teams registered yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {lockedTeams.map((team) => {
                const avgElo = getTeamAverageElo(team);
                const rank = getRankInfoFromElo(avgElo);

                return (
                  <div key={team.$id} className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded text-sm font-semibold bg-neutral-700 text-neutral-200`}>
                            {rank.name}
                          </span>
                          <span className="text-purple-400 font-bold">Elo: {avgElo}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-neutral-400 text-sm">Player 1</p>
                            <p className="font-semibold">{team.player1.username}</p>
                            <p className="text-neutral-400 text-sm">Elo: {team.player1.elo}</p>
                          </div>
                          <div>
                            <p className="text-neutral-400 text-sm">Player 2</p>
                            <p className="font-semibold">{team.player2?.username}</p>
                            <p className="text-neutral-400 text-sm">Elo: {team.player2?.elo}</p>
                          </div>
                        </div>
                      </div>
                      {userTeam?.$id === team.$id && (
                        <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded text-sm font-semibold">Your Team</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Looking for Partner */}
        {lookingTeams.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Players Looking for Partner ({lookingTeams.length})</h2>
            <div className="grid gap-4">
              {lookingTeams.map((team) => (
                <div key={team.$id} className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold mb-1">{team.player1.username}</p>
                      <p className="text-neutral-400 text-sm">Elo: {team.player1.elo}</p>
                    </div>
                    {!userTeam && userId !== team.player1.id && (
                      <a
                        href={`/v1/tournaments/${tournamentId}/teams/${team.$id}/join`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-semibold transition"
                      >
                        Join Team
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <a href="/v1/tournaments" className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
          Back to Tournaments
        </a>
      </div>
    );
  } catch (error) {
    console.error('Error loading tournament:', error);
    return (
      <div className="max-w-4xl mx-auto p-6 text-red-400">
        Error loading tournament
        <br />
        <a href="/v1/tournaments" className="text-blue-400 hover:underline">Back to Tournaments</a>
      </div>
    );
  }
}
