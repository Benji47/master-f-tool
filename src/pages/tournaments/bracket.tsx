import { Context } from "hono";
import { getTournament, getTournamentMatches, getTournamentTeams, getTeam } from "../../logic/tournament";
import { getRankInfoFromElo } from "../../static/data";

export async function TournamentBracketPage({ c }: { c: Context }) {
  const tournamentId = c.req.param('id');

  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return <div className="text-red-400">Tournament not found</div>;
    }

    const matches = await getTournamentMatches(tournamentId);
    const teams = await getTournamentTeams(tournamentId);

    // Organize matches by bracket and round
    const winnersMatches = matches.filter(m => m.bracket === 'winners');
    const losersMatches = matches.filter(m => m.bracket === 'losers');
    const finalMatches = matches.filter(m => m.bracket === 'final');

    const winnersRounds = new Map<number, typeof winnersMatches>();
    const losersRounds = new Map<number, typeof losersMatches>();

    winnersMatches.forEach(m => {
      if (!winnersRounds.has(m.round)) winnersRounds.set(m.round, []);
      winnersRounds.get(m.round)!.push(m);
    });

    losersMatches.forEach(m => {
      if (!losersRounds.has(m.round)) losersRounds.set(m.round, []);
      losersRounds.get(m.round)!.push(m);
    });

    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">{tournament.name} - Bracket</h1>

        {/* Winners Bracket */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-blue-400">Winners Bracket</h2>
          <div className="overflow-x-auto">
            <div className="flex gap-8 pb-6">
              {Array.from(winnersRounds.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([round, roundMatches]) => (
                  <div key={round} className="flex flex-col gap-4 min-w-max">
                    <h3 className="text-sm font-semibold text-neutral-400">Round {round}</h3>
                    {roundMatches
                      .sort((a, b) => a.position - b.position)
                      .map((match) => (
                        <MatchCard key={match.$id} match={match} teams={teams} />
                      ))}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Losers Bracket */}
        {losersRounds.size > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-orange-400">Losers Bracket</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-8 pb-6">
                {Array.from(losersRounds.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([round, roundMatches]) => (
                    <div key={round} className="flex flex-col gap-4 min-w-max">
                      <h3 className="text-sm font-semibold text-neutral-400">Round {round}</h3>
                      {roundMatches
                        .sort((a, b) => a.position - b.position)
                        .map((match) => (
                          <MatchCard key={match.$id} match={match} teams={teams} />
                        ))}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Grand Final */}
        {finalMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-yellow-400">Grand Final</h2>
            <div className="max-w-md">
              {finalMatches.map((match) => (
                <MatchCard key={match.$id} match={match} teams={teams} isGrandFinal />
              ))}
            </div>
          </div>
        )}

        <a href={`/v1/tournaments/${tournamentId}`} className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">
          Back to Tournament
        </a>
      </div>
    );
  } catch (error) {
    console.error('Error loading bracket:', error);
    return <div className="text-red-400">Error loading bracket</div>;
  }
}

function MatchCard({ match, teams, isGrandFinal }: { match: any; teams: any[]; isGrandFinal?: boolean }) {
  const team1 = teams.find(t => t.$id === match.team1Id);
  const team2 = teams.find(t => t.$id === match.team2Id);

  const getTeamDisplay = (team: any) => {
    if (!team) return { name: 'TBD', elo: '-' };
    const avgElo = (team.player1.elo + (team.player2?.elo || 0)) / 2;
    return {
      name: `${team.player1.username}${team.player2 ? ' & ' + team.player2.username : ''}`,
      elo: Math.round(avgElo),
    };
  };

  const team1Display = getTeamDisplay(team1);
  const team2Display = getTeamDisplay(team2);

  return (
    <a
      href={`/v1/tournaments/${match.tournamentId}/match/${match.$id}`}
      className="block bg-neutral-900/60 rounded-lg border border-neutral-800 hover:border-purple-600 p-3 w-64 transition"
    >
      {/* Team 1 */}
      <div className={`p-2 rounded mb-2 ${match.winner === match.team1Id ? 'bg-green-900/30' : 'bg-neutral-800/50'}`}>
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm">{team1Display.name}</p>
          {match.scores && (
            <p className="font-bold text-purple-400">{match.scores.team1Score}</p>
          )}
        </div>
        <p className="text-xs text-neutral-400">Elo: {team1Display.elo}</p>
      </div>

      {/* Separator */}
      <div className="my-1 h-px bg-neutral-700" />

      {/* Team 2 */}
      {match.isBye ? (
        <div className="p-2 text-center">
          <p className="text-xs text-neutral-400 font-semibold">BYE</p>
        </div>
      ) : (
        <div className={`p-2 rounded ${match.winner === match.team2Id ? 'bg-green-900/30' : 'bg-neutral-800/50'}`}>
          <div className="flex justify-between items-center">
            <p className="font-semibold text-sm">{team2Display.name}</p>
            {match.scores && (
              <p className="font-bold text-purple-400">{match.scores.team2Score}</p>
            )}
          </div>
          <p className="text-xs text-neutral-400">Elo: {team2Display.elo}</p>
        </div>
      )}

      {/* Status */}
      <div className="mt-2 pt-2 border-t border-neutral-700">
        <p className={`text-xs text-center font-semibold ${
          match.state === 'finished' ? 'text-green-400' :
          match.state === 'playing' ? 'text-orange-400' :
          'text-neutral-400'
        }`}>
          {match.state === 'finished' ? '✓ Finished' : match.state === 'playing' ? '⚡ Playing' : 'Waiting'}
        </p>
      </div>
    </a>
  );
}
