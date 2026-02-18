import { Context } from "hono";
import { getTournament, getTournamentTeams } from "../../logic/tournament";
import { getCookie } from "hono/cookie";

export async function CreateTeamPage({ c }: { c: Context }) {
  const tournamentId = c.req.param('id');
  const userId = getCookie(c, 'user');

  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return <div className="text-red-400">Tournament not found</div>;
    }

    const teams = await getTournamentTeams(tournamentId);
    const userExistingTeam = teams.find(t => t.player1.id === userId || t.player2?.id === userId);

    if (userExistingTeam) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-6">
            <p className="text-orange-300 font-semibold mb-2">Already in Tournament</p>
            <p className="text-neutral-300 mb-4">You're already registered for this tournament with team {userExistingTeam.player1.username}.</p>
            <a href={`/v1/tournaments/${tournamentId}`} className="text-blue-400 hover:underline">Back to Tournament</a>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
        <p className="text-neutral-400 mb-8">Create a new team</p>

        <form hx-post={`/v1/api/tournaments/${tournamentId}/teams/create`} hx-swap="redirect:" className="space-y-6">
          <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6">
            <h3 className="text-lg font-bold mb-4">Your Profile Information</h3>
            <p className="text-neutral-300 mb-2">Your user profile will be used to create the team.</p>
            <p className="text-sm text-neutral-400 mb-4">Once you create the team, another player can join you.</p>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition"
            >
              Create Team
            </button>
          </div>

          <div>
            <a href={`/v1/tournaments/${tournamentId}`} className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
              Cancel
            </a>
          </div>
        </form>

        <div className="mt-8 p-6 bg-neutral-900/60 rounded-lg border border-neutral-800">
          <h3 className="font-bold mb-3">How it works:</h3>
          <ol className="space-y-2 text-sm text-neutral-300">
            <li>1. Create your team - you'll be player 1</li>
            <li>2. Share your team ID with a friend</li>
            <li>3. They join your team as player 2</li>
            <li>4. Both must be present when the tournament starts</li>
          </ol>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading create team page:', error);
    return <div className="text-red-400">Error loading page</div>;
  }
}
