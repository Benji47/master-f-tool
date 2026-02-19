import { Context } from "hono";
import { getMatch, getTournament, getTeam } from "../../logic/tournament";
import { getCookie } from "hono/cookie";

export async function TournamentMatchPage({ c }: { c: Context }) {
  const matchId = c.req.param('matchId');
  const tournamentId = c.req.param('id');
  const userId = getCookie(c, 'user');

  try {
    const match = await getMatch(matchId);
    if (!match) {
      return <div className="text-red-400">Match not found</div>;
    }

    const tournament = await getTournament(tournamentId);
    const team1 = await getTeam(match.team1Id);
    const team2 = match.team2Id ? await getTeam(match.team2Id) : null;

    const getTeamDisplay = (team: any) => {
      if (!team) return { name: 'TBD', avg: 0, p1: 'N/A', p2: 'N/A' };
      const avg = (team.player1.elo + (team.player2?.elo || 0)) / 2;
      return {
        name: `${team.player1.username}${team.player2 ? ' & ' + team.player2.username : ''}`,
        avg: Math.round(avg),
        p1: team.player1.username,
        p2: team.player2?.username || 'N/A',
      };
    };

    const t1 = getTeamDisplay(team1);
    const t2 = getTeamDisplay(team2);

    // Check if user is in this match
    const userInTeam1 = team1?.player1.id === userId || team1?.player2?.id === userId;
    const userInTeam2 = team2?.player1.id === userId || team2?.player2?.id === userId;
    const isUserInMatch = userInTeam1 || userInTeam2;

    if (match.state === 'waiting' && !match.isBye) {
      return (
        <div className="max-w-2xl mx-auto p-6 text-neutral-100">
          <h1 className="text-3xl font-bold mb-8">{tournament?.name} - Tournament Match</h1>
          <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-8">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <p className="text-sm text-neutral-400 mb-2">Team 1</p>
                <p className="text-2xl font-bold mb-2">{t1.name}</p>
                <p className="text-lg text-purple-400">Avg Elo: {t1.avg}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-400 mb-2">Team 2</p>
                <p className="text-2xl font-bold mb-2">{t2.name}</p>
                <p className="text-lg text-purple-400">Avg Elo: {t2.avg}</p>
              </div>
            </div>
            <div className="mb-8">
              <p className="text-center text-neutral-400 mb-4">Waiting for match to start...</p>
              {isUserInMatch && (
                <button
                  hx-post={`/v1/api/tournaments/${tournamentId}/match/${matchId}/start`}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
                >
                  Start Match
                </button>
              )}
            </div>
          </div>
          <a href={`/v1/tournaments/${tournamentId}/bracket`} className="inline-block mt-6 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
            Back to Bracket
          </a>
        </div>
      );
    }

    if (match.state === 'playing') {
      return (
        <div className="max-w-3xl mx-auto p-6 text-neutral-100">
          <h1 className="text-3xl font-bold mb-8">{tournament?.name} - Match In Progress</h1>

          <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-8 mb-8">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <p className="text-sm text-neutral-400 mb-2">Team 1</p>
                <p className="text-xl font-bold mb-2">{t1.name}</p>
                <input
                  type="number"
                  placeholder="0"
                  id="team1-score"
                  min="0"
                  max="10"
                  className="w-full px-4 py-2 text-center text-3xl font-bold bg-neutral-800 border border-neutral-700 rounded focus:border-purple-500"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-400 mb-2">Team 2</p>
                <p className="text-xl font-bold mb-2">{t2.name}</p>
                <input
                  type="number"
                  placeholder="0"
                  id="team2-score"
                  min="0"
                  max="10"
                  className="w-full px-4 py-2 text-center text-3xl font-bold bg-neutral-800 border border-neutral-700 rounded focus:border-purple-500"
                />
              </div>
            </div>

            {isUserInMatch && (
              <button
                hx-post={`/v1/api/tournaments/${tournamentId}/match/${matchId}/finish`}
                hx-vals='{"team1Score": document.getElementById("team1-score").value, "team2Score": document.getElementById("team2-score").value}'
                hx-swap="redirect:"
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
              >
                Submit Score
              </button>
            )}
          </div>

          <a href={`/v1/tournaments/${tournamentId}/bracket`} className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
            Back to Bracket
          </a>
        </div>
      );
    }

    // Match finished
    return (
      <div className="max-w-2xl mx-auto p-6 text-neutral-100">
        <h1 className="text-3xl font-bold mb-8">{tournament?.name} - Match Result</h1>

        <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-8 mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div className={`text-center p-4 rounded ${match.winner === match.team1Id ? 'bg-green-900/30 border border-green-700' : 'bg-neutral-800/50'}`}>
              <p className="text-sm text-neutral-400 mb-2">Team 1</p>
              <p className="text-xl font-bold mb-2">{t1.name}</p>
              <p className="text-3xl font-bold text-purple-400 mb-2">{match.scores?.team1Score ?? '0'}</p>
              {match.winner === match.team1Id && <p className="text-green-400 font-semibold">WINNER</p>}
            </div>
            <div className={`text-center p-4 rounded ${match.winner === match.team2Id ? 'bg-green-900/30 border border-green-700' : 'bg-neutral-800/50'}`}>
              <p className="text-sm text-neutral-400 mb-2">Team 2</p>
              <p className="text-xl font-bold mb-2">{t2.name}</p>
              <p className="text-3xl font-bold text-purple-400 mb-2">{match.scores?.team2Score ?? '0'}</p>
              {match.winner === match.team2Id && <p className="text-green-400 font-semibold">WINNER</p>}
            </div>
          </div>
        </div>

        <a href={`/v1/tournaments/${tournamentId}/bracket`} className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
          Back to Bracket
        </a>
      </div>
    );
  } catch (error) {
    console.error('Error loading match:', error);
    return <div className="text-red-400">Error loading match</div>;
  }
}
