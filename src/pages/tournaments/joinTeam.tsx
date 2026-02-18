import { Context } from "hono";
import { getTournament, getTournamentTeams } from "../../logic/tournament";
import { getCookie } from "hono/cookie";

export async function JoinTeamPage({ c }: { c: Context }) {
  const tournamentId = c.req.param('id');
  const userId = getCookie(c, 'user');

  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return <div className="text-red-400">Tournament not found</div>;
    }

    const teams = await getTournamentTeams(tournamentId);
    const userExistingTeam = teams.find(t => t.player1.id === userId || t.player2?.id === userId);
    const lookingTeams = teams.filter(t => t.status === 'looking' && t.player1.id !== userId);

    if (userExistingTeam) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-6">
            <p className="text-orange-300 font-semibold mb-2">Already in Tournament</p>
            <p className="text-neutral-300 mb-4">You're already registered in this tournament.</p>
            <a href={`/v1/tournaments/${tournamentId}`} className="text-blue-400 hover:underline">Back to Tournament</a>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
        <p className="text-neutral-400 mb-8">Join an existing team</p>

        {lookingTeams.length === 0 ? (
          <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6 mb-6 text-center">
            <p className="text-neutral-400 mb-4">No teams are currently looking for partners</p>
            <a href={`/v1/tournaments/${tournamentId}/teams/create`} className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition">
              Create Your Own Team
            </a>
          </div>
        ) : (
          <div className="grid gap-4 mb-6">
            {lookingTeams.map((team) => (
              <div key={team.$id} className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-2xl font-bold mb-2">{team.player1.username}</p>
                    <p className="text-neutral-400 mb-4">Elo Rating: {team.player1.elo}</p>
                    <p className="text-sm text-neutral-400">Team ID: {team.$id}</p>
                  </div>
                  <form
                    hx-post={`/v1/api/tournaments/${tournamentId}/teams/${team.$id}/join`}
                    hx-swap="redirect:"
                    className="text-right"
                  >
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded font-semibold transition"
                    >
                      Join Team
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        <a href={`/v1/tournaments/${tournamentId}`} className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
          Back to Tournament
        </a>
      </div>
    );
  } catch (error) {
    console.error('Error loading join team page:', error);
    return <div className="text-red-400">Error loading page</div>;
  }
}
