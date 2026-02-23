import { PlayerProfile } from "../../logic/profile";
import { formatCoins } from "../../logic/format";
import { badges, eloColor, getLevelBadgeColor, getRankInfoFromElo } from "../../static/data";
import { levelsXp, getCumulativeThresholds } from "../../static/data";
import { getSeasonLabel } from "../../logic/season";

type DuoMatch = {
  $id: string;
  createdAt?: string;
  players: { id: string; username: string }[];
  scores?: { a: string[]; b: string[]; scoreA: number; scoreB: number }[];
};

type GoldenTeamStat = {
  teamIds: string[];
  teamNames: string[];
  count: number;
  scorers: { id: string; username: string; count: number }[];
};

function PlayerLink({ username, children }: { username: string; children: any }) {
  return (
    <a 
      href={`/v1/match-history/players/${username}`} 
      className="cursor-pointer hover:underline"
    >
      {children}
    </a>
  );
}

function renderBadgeName(name: string, iconUrl?: string) {
  if (!iconUrl) return <span>{name}</span>;

  return (
    <span className="inline-flex items-center gap-1">
      <span>{name}</span>
      <img
        src={iconUrl}
        alt={`${name} icon`}
        className="w-4 h-4 object-contain drop-shadow-sm align-text-bottom"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export function LeaderboardPage({
  players,
  currentPlayer,
  duoMatches = [],
  goldenTeamsScored = [],
  goldenTeamsReceived = [],
  statsScope = "current",
  selectedSeasonIndex = 0,
  currentSeasonIndex = 0,
  availableSeasonIndexes = [0],
}: {
  players: PlayerProfile[];
  currentPlayer?: string;
  duoMatches?: DuoMatch[];
  goldenTeamsScored?: GoldenTeamStat[];
  goldenTeamsReceived?: GoldenTeamStat[];
  statsScope?: "overall" | "current" | "season";
  selectedSeasonIndex?: number;
  currentSeasonIndex?: number;
  availableSeasonIndexes?: number[];
}) {
  function getRowClass(isEven: boolean, isCurrentPlayer: boolean) {
    if (isCurrentPlayer) {
      return "bg-green-950/60 border-l-4 border-green-500";
    }
    return isEven ? "bg-neutral-900/40" : "bg-neutral-800/40";
  }

  const cumulativeLevelsXp = getCumulativeThresholds();

  function computeLevel(xp: number) { 
    let level = 1;
    let currentLevelXp = 0;
    let nextLevelXp = levelsXp[1];

    for (let i = 0; i < cumulativeLevelsXp.length; i++) {
      if (xp >= cumulativeLevelsXp[i]) {
        level = i + 1;
        currentLevelXp = cumulativeLevelsXp[i];
        nextLevelXp = cumulativeLevelsXp[i] + (levelsXp[i] || 0);
      } else {
        break;
      }
    }

    const xpInCurrentLevel = xp - currentLevelXp;
    const xpNeededForNext = levelsXp[level - 1] || 0;
    const progress = xpNeededForNext > 0 ? Math.round((xpInCurrentLevel / xpNeededForNext) * 100) : 100;
    const missing = Math.max(0, nextLevelXp - xp);

    return { level, currentLevelXp, nextLevelXp, xpInCurrentLevel, xpNeededForNext, missing, progress };
  }

  function safeJson(value: unknown) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
  }

  function formatScorers(scorers: { username: string; count: number }[]) {
    if (!scorers.length) return '—';
    return scorers
      .slice(0, 3)
      .map((s) => `${s.username} (${s.count})`)
      .join(', ');
  }

  function renderPlayerNameWithBadge(player: PlayerProfile) {
    const badge = badges[computeLevel(player.xp).level - 1];
    return (
      <>
        <span>{player.username} [</span>
        {renderBadgeName(badge?.name || "Unranked", badge?.iconUrl)}
        <span>]</span>
      </>
    );
  }

  function buildRankLabels<T>(items: T[], getValue: (item: T) => number): string[] {
    const labels: string[] = new Array(items.length).fill("");
    let i = 0;
    while (i < items.length) {
      const value = getValue(items[i]);
      let j = i;
      while (j + 1 < items.length && getValue(items[j + 1]) === value) {
        j += 1;
      }
      const start = i + 1;
      const end = j + 1;
      const label = start === end ? `#${start}` : `#${start}-${end}`;
      for (let k = i; k <= j; k += 1) {
        labels[k] = label;
      }
      i = j + 1;
    }
    return labels;
  }

  // Sort functions for different leaderboards
  const sortedByElo = [...players].sort((a, b) => b.elo - a.elo);
  const sortedByUltimateWins = [...players].sort((a, b) => b.ultimate_wins - a.ultimate_wins);
  const sortedByUltimateLoses = [...players].sort((a, b) => b.ultimate_loses - a.ultimate_loses);
  const sortedByVyrazacka = [...players].sort((a, b) => b.vyrazecky - a.vyrazecky);
  const sortedByTotalGames = [...players].sort((a, b) => (b.wins + b.loses) - (a.wins + a.loses));
  const sortedLevels = [...players].sort((a, b) => b.xp - a.xp);
  const sortedTenZeroLoses = [...players].sort((a, b) => b.ten_zero_loses - a.ten_zero_loses);
  const sortedTenZeroWins = [...players].sort((a, b) => b.ten_zero_wins - a.ten_zero_wins);
  const sortedCoins = [...players].sort((a, b) => b.coins - a.coins);
  const duoPlayers = players.map((p) => ({ id: p.$id, username: p.username }));

  const rankLabelsElo = buildRankLabels(sortedByElo, (p) => p.elo);
  const rankLabelsUltimateWins = buildRankLabels(sortedByUltimateWins, (p) => p.ultimate_wins);
  const rankLabelsUltimateLoses = buildRankLabels(sortedByUltimateLoses, (p) => p.ultimate_loses);
  const rankLabelsVyrazacka = buildRankLabels(sortedByVyrazacka, (p) => p.vyrazecky);
  const rankLabelsTotalGames = buildRankLabels(sortedByTotalGames, (p) => p.wins + p.loses);
  const rankLabelsLevels = buildRankLabels(sortedLevels, (p) => p.xp);
  const rankLabelsTenZeroLoses = buildRankLabels(sortedTenZeroLoses, (p) => p.ten_zero_loses);
  const rankLabelsTenZeroWins = buildRankLabels(sortedTenZeroWins, (p) => p.ten_zero_wins);
  const rankLabelsCoins = buildRankLabels(sortedCoins, (p) => p.coins);
  const rankLabelsGoldenScored = buildRankLabels(goldenTeamsScored, (t) => t.count);
  const rankLabelsGoldenReceived = buildRankLabels(goldenTeamsReceived, (t) => t.count);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white font-[Orbitron] mb-2">Leaderboards</h1>
          <p className="text-neutral-400">
            Top players across different categories — {statsScope === "overall" ? "Overall" : getSeasonLabel(selectedSeasonIndex)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <a href="/v1/leaderboard?scope=current" className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "current" ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>
            Current Season
          </a>
          <a href="/v1/leaderboard?scope=overall" className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "overall" ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>
            Overall
          </a>
          {availableSeasonIndexes.filter((season) => season !== currentSeasonIndex).map((season) => (
            <a
              key={season}
              href={`/v1/leaderboard?scope=season&season=${season}`}
              className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "season" && selectedSeasonIndex === season ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}
            >
              {getSeasonLabel(season)}
            </a>
          ))}
          <a href="/v1/hall-of-fame" className="px-3 py-1 rounded text-sm font-semibold bg-yellow-700 hover:bg-yellow-600 text-white">
            🏛️ Hall of Fame
          </a>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button data-tab="elo" className="tab-btn active px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 cursor-pointer text-white rounded-md font-semibold transition-colors">ELO</button>
          <button data-tab="ultimate_wins" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Ultimate Wins</button>
          <button data-tab="ultimate_loses" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Ultimate Loses</button>
          <button data-tab="vyrazacka" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Vyrážečky</button>
          <button data-tab="golden_scored" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Golden Scored</button>
          <button data-tab="golden_received" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Golden Received</button>
          <button data-tab="total_games" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Total Games</button>
          <button data-tab="level" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Level</button>
          <button data-tab="ten_zero_loses" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">10:0 Loses</button>
          <button data-tab="ten_zero_wins" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">10:0 Wins</button>
          <button data-tab="coins" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Coins</button>
          <button data-tab="duos" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Duos by Winrate</button>
          <button data-tab="duos_matches" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Duos by Matches</button>
          <button data-tab="duo" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Duo Analyzer</button>
          
          <div className="">
            <a href="/v1/lobby">
              <button className="px-4 py-2 w-full bg-red-500 border-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer font-semibold transition-colors">
                ← Back to Lobby
              </button>
            </a>
          </div>
        </div>

        {/* ELO Leaderboard */}
        <div id="elo" className="leaderboard-tab active bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>ELO</div>
            <div>Level</div>
            <div><span className="text-green-400">W</span> : <span className="text-red-400">L</span></div>
            <div>Goals</div>
            <div>Avg Goals/Match</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedByElo.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;
              const eloRank = getRankInfoFromElo(player.elo).name;
              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-7 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)} 
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsElo[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}> <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink></div>
                  <div className={`font-bold ${eloColor(player.elo)}`}>{player.elo} {'->'} {eloRank}</div>
                  <div className="text-blue-400">LVL {computeLevel(player.xp).level} ({player.xp}xp)</div>
                  <div className="text-neutral-400">{player.wins}:{player.loses} ({Math.round(player.wins / player.loses * 100) / 100})</div>
                  <div className="text-neutral-400">{player.goals_scored}:{player.goals_conceded} ({Math.round(player.goals_scored / player.goals_conceded * 100) / 100})</div>
                  <div className="text-neutral-400">{Math.round(((player.goals_scored) / (player.wins + player.loses)) * 100) / 100}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ultimate Wins Leaderboard */}
        <div id="ultimate_wins" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>Ultimate Wins</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedByUltimateWins.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;
              
              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)} 
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsUltimateWins[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>

                  <div className="text-green-400 font-bold">{player.ultimate_wins}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ultimate Loses Leaderboard */}
        <div id="ultimate_loses" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>Ultimate Loses</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedByUltimateLoses.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;

              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)} 
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsUltimateLoses[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>

                  <div className="text-red-400 font-bold">{player.ultimate_loses}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vyrážečky Leaderboard */}
        <div id="vyrazacka" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>Vyrážečky</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedByVyrazacka.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;
              const goals_scored = player.goals_scored;
              const vyrazeckyPercents = goals_scored > 0
                ? Math.round((player.vyrazecky / goals_scored) * 10000) / 100
                : 0;

              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsVyrazacka[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>

                  <div className="text-orange-400 font-bold">{player.vyrazecky} ({vyrazeckyPercents}%)</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Golden Vyrazacka Scored Leaderboard */}
        <div id="golden_scored" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div className="col-span-2">Team</div>
            <div>Golden</div>
            <div className="col-span-2">Scorers</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {goldenTeamsScored.length === 0 ? (
              <div className="px-6 py-4 text-neutral-400">No golden vyrážečka recorded yet.</div>
            ) : (
              goldenTeamsScored.map((team, idx) => (
                <div
                  key={team.teamIds.join('|')}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${idx % 2 === 0 ? 'bg-neutral-900/40' : 'bg-neutral-800/40'}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsGoldenScored[idx]}</div>
                  <div className="col-span-2 font-semibold">{team.teamNames.join(' / ')}</div>
                  <div className="text-yellow-400 font-bold">{team.count}</div>
                  <div className="col-span-2 text-neutral-300">{formatScorers(team.scorers)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Golden Vyrazacka Received Leaderboard */}
        <div id="golden_received" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div className="col-span-2">Team</div>
            <div>Received</div>
            <div className="col-span-2">Scorers</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {goldenTeamsReceived.length === 0 ? (
              <div className="px-6 py-4 text-neutral-400">No golden vyrážečka recorded yet.</div>
            ) : (
              goldenTeamsReceived.map((team, idx) => (
                <div
                  key={team.teamIds.join('|')}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${idx % 2 === 0 ? 'bg-neutral-900/40' : 'bg-neutral-800/40'}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsGoldenReceived[idx]}</div>
                  <div className="col-span-2 font-semibold">{team.teamNames.join(' / ')}</div>
                  <div className="text-red-400 font-bold">{team.count}</div>
                  <div className="col-span-2 text-neutral-300">{formatScorers(team.scorers)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total Games Leaderboard */}
        <div id="total_games" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>Total Games</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedByTotalGames.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;

              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsTotalGames[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>

                  <div className="text-purple-400 font-bold">{player.wins + player.loses}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level Leaderboard */}
        <div id="level" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-6 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>Level</div>
            <div>Xp</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedLevels.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;

              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsLevels[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>{computeLevel(player.xp).level}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>{player.xp}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ten Zero Loses Leaderboard */}
        <div id="ten_zero_loses" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>10:0 Loses</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedTenZeroLoses.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;

              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsTenZeroLoses[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>
                  <div className="text-yellow-400 font-bold">{player.ten_zero_loses}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ten Zero Wins Leaderboard */}
        <div id="ten_zero_wins" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>10:0 Wins</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedTenZeroWins.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;
              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsTenZeroWins[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>
                  <div className="text-yellow-400 font-bold">{player.ten_zero_wins}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coins Leaderboard */}
        <div id="coins" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div>Player</div>
            <div>Coins</div>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedCoins.map((player, idx) => {
              const isEven = idx % 2 === 0;
              const lvl = computeLevel(player.xp).level;
              const isCurrentPlayer = currentPlayer === player.username;
              return (
                <div
                  key={player.$id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 text-neutral-300 transition-colors
                    ${getRowClass(isEven, isCurrentPlayer)}
                    hover:bg-neutral-700/40`}
                >
                  <div className="font-bold text-lg">{rankLabelsCoins[idx]}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{renderPlayerNameWithBadge(player)}</PlayerLink>
                  </div>
                  <div className="text-yellow-400 font-bold">{formatCoins(player.coins)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duos Leaderboard */}
        <div id="duos" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div className="col-span-2">Duo</div>
            <div>Matches</div>
            <div>W-L</div>
            <div>Win Rate</div>
            <div>Goals</div>
          </div>
          <div id="duos-leaderboard-body" className="divide-y divide-neutral-800">
            {/* Populated by script */}
          </div>
        </div>

        {/* Duos by Matches Leaderboard */}
        <div id="duos_matches" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-neutral-500/50 font-bold text-neutral-200 text-lg">
            <div>Rank</div>
            <div className="col-span-2">Duo</div>
            <div>Matches</div>
            <div>W-L</div>
            <div>Win Rate</div>
            <div>Goals</div>
          </div>
          <div id="duos-matches-leaderboard-body" className="divide-y divide-neutral-800">
            {/* Populated by script */}
          </div>
        </div>

        {/* Duo Analyzer */}
        <div id="duo" className="leaderboard-tab hidden bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="px-6 py-6">
            <h2 className="text-2xl font-bold text-white mb-2">Duo Analyzer</h2>
            <p className="text-neutral-400 mb-6">Pick two players to see their matches together and how they perform against each opponent duo.</p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-neutral-300 text-sm" htmlFor="duo-player-a">Player A</label>
                <select id="duo-player-a" className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2">
                  <option value="">Select player</option>
                  {duoPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-neutral-300 text-sm" htmlFor="duo-player-b">Player B</label>
                <select id="duo-player-b" className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2">
                  <option value="">Select player</option>
                  {duoPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button id="duo-clear" className="px-4 py-2 w-full bg-neutral-700 hover:bg-neutral-600 text-white rounded-md font-semibold transition-colors">
                  Clear
                </button>
              </div>
            </div>

            <div id="duo-empty" className="text-neutral-400">Select two different players to see results.</div>

            <div id="duo-results" className="hidden">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-400">Together Record</div>
                  <div id="duo-record" className="text-white text-xl font-bold">-</div>
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-400">Win Rate</div>
                  <div id="duo-winrate" className="text-white text-xl font-bold">-</div>
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-400">Goals</div>
                  <div id="duo-goals" className="text-white text-xl font-bold">-</div>
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-400">Matches Together</div>
                  <div id="duo-matches-count" className="text-white text-xl font-bold">-</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-400 mb-1">Best Matchup</div>
                  <div id="duo-best" className="text-white text-sm">-</div>
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-400 mb-1">Worst Matchup</div>
                  <div id="duo-worst" className="text-white text-sm">-</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-neutral-200 font-semibold mb-2">Opponent Duos (ordered by best stats)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-neutral-800 rounded-lg overflow-hidden">
                    <thead className="bg-neutral-800 text-neutral-200">
                      <tr>
                        <th className="text-left px-3 py-2">Opponent Duo</th>
                        <th className="text-left px-3 py-2">W-L</th>
                        <th className="text-left px-3 py-2">Win Rate</th>
                        <th className="text-left px-3 py-2">Goals</th>
                        <th className="text-left px-3 py-2">Games</th>
                      </tr>
                    </thead>
                    <tbody id="duo-opponents-body" className="divide-y divide-neutral-800"></tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="text-neutral-200 font-semibold mb-2">Matches Together</div>
                <div id="duo-matches" className="flex flex-col gap-3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = document.querySelectorAll('.leaderboard-tab');

  // Calculate and populate Duos Leaderboard
  const duoMatches = ${safeJson(duoMatches)};
  const duoPlayers = ${safeJson(duoPlayers)};
  const currentPlayer = ${safeJson(currentPlayer || null)};
  const byIdToName = new Map();
  duoPlayers.forEach((p) => byIdToName.set(p.id, p.username));

  const duoStats = new Map();

  duoMatches.forEach((m) => {
    const rounds = Array.isArray(m.scores) ? m.scores : [];

    rounds.forEach((s) => {
      const a = Array.isArray(s.a) ? s.a : [];
      const b = Array.isArray(s.b) ? s.b : [];
      const scoreA = Number(s.scoreA || 0);
      const scoreB = Number(s.scoreB || 0);

      // Process team A duo
      if (a.length === 2) {
        const duoKey = a.slice().sort().join('|');
        const duoNames = a.slice().sort().map(id => byIdToName.get(id) || id).join(' & ');
        const row = duoStats.get(duoKey) || {
          duoKey,
          duoNames,
          player1: a[0],
          player2: a[1],
          wins: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          matches: 0
        };

        row.goalsFor += scoreA;
        row.goalsAgainst += scoreB;
        row.matches += 1;

        if (scoreA > scoreB) row.wins += 1;
        else if (scoreA < scoreB) row.losses += 1;

        duoStats.set(duoKey, row);
      }

      // Process team B duo
      if (b.length === 2) {
        const duoKey = b.slice().sort().join('|');
        const duoNames = b.slice().sort().map(id => byIdToName.get(id) || id).join(' & ');
        const row = duoStats.get(duoKey) || {
          duoKey,
          duoNames,
          player1: b[0],
          player2: b[1],
          wins: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          matches: 0
        };

        row.goalsFor += scoreB;
        row.goalsAgainst += scoreA;
        row.matches += 1;

        if (scoreB > scoreA) row.wins += 1;
        else if (scoreB < scoreA) row.losses += 1;

        duoStats.set(duoKey, row);
      }
    });
  });

  // Filter duos with at least 5 matches and calculate winrate
  const duoRows = Array.from(duoStats.values())
    .filter(row => row.matches >= 5)
    .map(row => ({
      ...row,
      winRate: row.wins + row.losses > 0 ? row.wins / (row.wins + row.losses) : 0,
      winRatePercent: row.wins + row.losses > 0 ? Math.round((row.wins / (row.wins + row.losses)) * 1000) / 10 : 0
    }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;

      const goalDiffA = a.goalsFor - a.goalsAgainst;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;

      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matches - a.matches;
    });

  const duoRowsByMatches = [...duoRows].sort((a, b) => {
    if (b.matches !== a.matches) return b.matches - a.matches;

    const goalDiffA = a.goalsFor - a.goalsAgainst;
    const goalDiffB = b.goalsFor - b.goalsAgainst;
    if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;

    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.wins - a.wins;
  });

  const buildRankLabels = (items, getValue) => {
    const labels = new Array(items.length).fill('');
    let i = 0;
    while (i < items.length) {
      const value = getValue(items[i]);
      let j = i;
      while (j + 1 < items.length && getValue(items[j + 1]) === value) {
        j += 1;
      }
      const start = i + 1;
      const end = j + 1;
      const label = start === end ? '#' + start : '#' + start + '-' + end;
      for (let k = i; k <= j; k += 1) {
        labels[k] = label;
      }
      i = j + 1;
    }
    return labels;
  };

  const duosRankLabels = buildRankLabels(duoRows, (row) => row.winRatePercent);
  const duosMatchesRankLabels = buildRankLabels(duoRowsByMatches, (row) => row.matches);

  const duosLeaderboardBody = document.getElementById('duos-leaderboard-body');
  if (duosLeaderboardBody) {
    if (duoRows.length === 0) {
      duosLeaderboardBody.innerHTML = '<div class="px-6 py-4 text-neutral-400">No duos with 5+ matches found.</div>';
    } else {
      duosLeaderboardBody.innerHTML = duoRows.map((row, idx) => {
        const isEven = idx % 2 === 0;
        const isCurrentPlayer = currentPlayer && (byIdToName.get(row.player1) === currentPlayer || byIdToName.get(row.player2) === currentPlayer);
        const rowClass = isCurrentPlayer
          ? 'bg-green-950/60 border-l-4 border-green-500'
          : (isEven ? 'bg-neutral-900/40' : 'bg-neutral-800/40');
        const winRateColor = row.winRatePercent >= 70 ? 'text-green-400' : (row.winRatePercent >= 50 ? 'text-blue-400' : 'text-red-400');
        const goalRatio = row.goalsAgainst > 0
          ? String(Math.round((row.goalsFor / row.goalsAgainst) * 100) / 100)
          : 'inf';
        return (
          '<div class="grid grid-cols-7 gap-4 px-6 py-4 text-neutral-300 ' + rowClass + ' hover:bg-neutral-700/40 transition-colors">' +
            '<div class="font-bold text-lg">' + duosRankLabels[idx] + '</div>' +
            '<div class="col-span-2 font-semibold text-white">' + row.duoNames + '</div>' +
            '<div class="text-purple-400 font-bold">' + row.matches + '</div>' +
            '<div class="text-neutral-400">' + row.wins + '-' + row.losses + '</div>' +
            '<div class="font-bold ' + winRateColor + '">' + row.winRatePercent + '%</div>' +
            '<div class="text-neutral-400">' + row.goalsFor + ':' + row.goalsAgainst + ' (' + goalRatio + ')</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  const duosMatchesLeaderboardBody = document.getElementById('duos-matches-leaderboard-body');
  if (duosMatchesLeaderboardBody) {
    if (duoRowsByMatches.length === 0) {
      duosMatchesLeaderboardBody.innerHTML = '<div class="px-6 py-4 text-neutral-400">No duos with 5+ matches found.</div>';
    } else {
      duosMatchesLeaderboardBody.innerHTML = duoRowsByMatches.map((row, idx) => {
        const isEven = idx % 2 === 0;
        const isCurrentPlayer = currentPlayer && (byIdToName.get(row.player1) === currentPlayer || byIdToName.get(row.player2) === currentPlayer);
        const rowClass = isCurrentPlayer
          ? 'bg-green-950/60 border-l-4 border-green-500'
          : (isEven ? 'bg-neutral-900/40' : 'bg-neutral-800/40');
        const winRateColor = row.winRatePercent >= 70 ? 'text-green-400' : (row.winRatePercent >= 50 ? 'text-blue-400' : 'text-red-400');
        const goalRatio = row.goalsAgainst > 0
          ? String(Math.round((row.goalsFor / row.goalsAgainst) * 100) / 100)
          : 'inf';
        return (
          '<div class="grid grid-cols-7 gap-4 px-6 py-4 text-neutral-300 ' + rowClass + ' hover:bg-neutral-700/40 transition-colors">' +
            '<div class="font-bold text-lg">' + duosMatchesRankLabels[idx] + '</div>' +
            '<div class="col-span-2 font-semibold text-white">' + row.duoNames + '</div>' +
            '<div class="text-purple-400 font-bold">' + row.matches + '</div>' +
            '<div class="text-neutral-400">' + row.wins + '-' + row.losses + '</div>' +
            '<div class="font-bold ' + winRateColor + '">' + row.winRatePercent + '%</div>' +
            '<div class="text-neutral-400">' + row.goalsFor + ':' + row.goalsAgainst + ' (' + goalRatio + ')</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Hide all tabs
      tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('hidden');
      });
      
      // Remove active state from all buttons
      tabButtons.forEach(b => {
        b.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-violet-600');
        b.classList.add('bg-neutral-700');
      });
      
      // Show selected tab
      const selectedTab = document.getElementById(tabName);
      if (selectedTab) {
        selectedTab.classList.remove('hidden');
        selectedTab.classList.add('active');
      }
      
      // Highlight active button
      this.classList.remove('bg-neutral-700');
      this.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-violet-600');
    });
  });

  const playerASelect = document.getElementById('duo-player-a');
  const playerBSelect = document.getElementById('duo-player-b');
  const clearButton = document.getElementById('duo-clear');

  if (playerASelect && playerBSelect) {
    const byIdToName = new Map();
    duoPlayers.forEach((p) => byIdToName.set(p.id, p.username));

    const emptyEl = document.getElementById('duo-empty');
    const resultsEl = document.getElementById('duo-results');
    const recordEl = document.getElementById('duo-record');
    const winrateEl = document.getElementById('duo-winrate');
    const goalsEl = document.getElementById('duo-goals');
    const matchesCountEl = document.getElementById('duo-matches-count');
    const bestEl = document.getElementById('duo-best');
    const worstEl = document.getElementById('duo-worst');
    const opponentsBody = document.getElementById('duo-opponents-body');
    const matchesWrap = document.getElementById('duo-matches');

    const escapeHtml = (value) => {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const toName = (id) => byIdToName.get(id) || id;
    const winRate = (row) => {
      const denom = row.wins + row.losses;
      return denom > 0 ? row.wins / denom : 0;
    };

    const renderDuo = () => {
      const playerA = playerASelect.value;
      const playerB = playerBSelect.value;

      if (!playerA || !playerB || playerA === playerB) {
        if (emptyEl) emptyEl.textContent = playerA && playerB && playerA === playerB
          ? 'Select two different players to see results.'
          : 'Select two different players to see results.';
        if (resultsEl) resultsEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (opponentsBody) opponentsBody.innerHTML = '';
        if (matchesWrap) matchesWrap.innerHTML = '';
        return;
      }

      const opponentStats = new Map();
      const matchSummary = new Map();
      let totalWins = 0;
      let totalLosses = 0;
      let totalGoalsFor = 0;
      let totalGoalsAgainst = 0;

      duoMatches.forEach((m) => {
        const rounds = Array.isArray(m.scores) ? m.scores : [];

        rounds.forEach((s) => {
          const a = Array.isArray(s.a) ? s.a : [];
          const b = Array.isArray(s.b) ? s.b : [];
          const duoInA = a.includes(playerA) && a.includes(playerB);
          const duoInB = b.includes(playerA) && b.includes(playerB);

          if (!duoInA && !duoInB) return;

          const opponentIds = duoInA ? b : a;
          if (opponentIds.length < 2) return;

          const opponentKey = opponentIds.slice().sort().join('|');
          const opponentName = opponentIds.slice().sort().map(toName).join(' & ');
          const scoreA = Number(s.scoreA || 0);
          const scoreB = Number(s.scoreB || 0);
          const goalsFor = duoInA ? scoreA : scoreB;
          const goalsAgainst = duoInA ? scoreB : scoreA;

          const row = opponentStats.get(opponentKey) || {
            opponentKey,
            opponentName,
            wins: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            games: 0,
          };

          row.goalsFor += goalsFor;
          row.goalsAgainst += goalsAgainst;
          row.games += 1;

          if ((duoInA && scoreA > scoreB) || (duoInB && scoreB > scoreA)) {
            row.wins += 1;
            totalWins += 1;
          } else {
            row.losses += 1;
            totalLosses += 1;
          }

          totalGoalsFor += goalsFor;
          totalGoalsAgainst += goalsAgainst;

          opponentStats.set(opponentKey, row);

          const matchId = m.$id;
          const matchRow = matchSummary.get(matchId) || {
            matchId,
            createdAt: m.createdAt,
            wins: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            opponentNames: new Set(),
          };

          matchRow.goalsFor += goalsFor;
          matchRow.goalsAgainst += goalsAgainst;
          matchRow.opponentNames.add(opponentName);

          if ((duoInA && scoreA > scoreB) || (duoInB && scoreB > scoreA)) matchRow.wins += 1;
          else matchRow.losses += 1;

          matchSummary.set(matchId, matchRow);
        });
      });

      const opponentRows = Array.from(opponentStats.values()).map((row) => ({
        ...row,
        winRate: winRate(row),
        goalDiff: row.goalsFor - row.goalsAgainst,
      }));

      opponentRows.sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.goalDiff - a.goalDiff;
      });

      const bestRow = opponentRows[0];
      const worstRow = opponentRows.length ? opponentRows[opponentRows.length - 1] : null;
      const matchesTogether = matchSummary.size;
      const totalWinRate = (totalWins + totalLosses) > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 1000) / 10
        : 0;

      if (recordEl) recordEl.textContent = totalWins + '-' + totalLosses;
      if (winrateEl) winrateEl.textContent = totalWinRate + '%';
      if (goalsEl) goalsEl.textContent = totalGoalsFor + ':' + totalGoalsAgainst;
      if (matchesCountEl) matchesCountEl.textContent = String(matchesTogether);

      if (bestEl) {
        bestEl.textContent = bestRow
          ? bestRow.opponentName + ' (' + bestRow.wins + '-' + bestRow.losses + ', ' + (Math.round(bestRow.winRate * 1000) / 10) + '%)'
          : 'No matches together yet.';
      }

      if (worstEl) {
        worstEl.textContent = worstRow
          ? worstRow.opponentName + ' (' + worstRow.wins + '-' + worstRow.losses + ', ' + (Math.round(worstRow.winRate * 1000) / 10) + '%)'
          : 'No matches together yet.';
      }

      if (opponentsBody) {
        if (opponentRows.length === 0) {
          opponentsBody.innerHTML = '<tr><td class="px-3 py-2 text-neutral-400" colspan="5">No matches together yet.</td></tr>';
        } else {
          opponentsBody.innerHTML = opponentRows.map((row) => {
            const rowWinRate = Math.round(row.winRate * 1000) / 10;
            const goals = row.goalsFor + ':' + row.goalsAgainst;
            return (
              '<tr class="text-neutral-200">' +
                '<td class="px-3 py-2">' + escapeHtml(row.opponentName) + '</td>' +
                '<td class="px-3 py-2">' + row.wins + '-' + row.losses + '</td>' +
                '<td class="px-3 py-2">' + rowWinRate + '%</td>' +
                '<td class="px-3 py-2">' + goals + '</td>' +
                '<td class="px-3 py-2">' + row.games + '</td>' +
              '</tr>'
            );
          }).join('');
        }
      }

      if (matchesWrap) {
        if (matchesTogether === 0) {
          matchesWrap.innerHTML = '<div class="text-neutral-400">No matches together yet.</div>';
        } else {
          const matchRows = Array.from(matchSummary.values()).sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          });

          matchesWrap.innerHTML = matchRows.map((row) => {
            const opponentNames = Array.from(row.opponentNames).join(', ');
            const dateLabel = row.createdAt ? new Date(row.createdAt).toLocaleString() : 'N/A';
            const record = row.wins + '-' + row.losses;
            const cardClass = row.wins > row.losses
              ? 'bg-green-900/70 border-green-700'
              : (row.wins < row.losses ? 'bg-red-900/70 border-red-700' : 'bg-neutral-900/70 border-neutral-800');
            return (
              '<div class="' + cardClass + ' border rounded-lg p-3">' +
                '<div class="text-neutral-200 font-semibold">' + escapeHtml(opponentNames) + '</div>' +
                '<div class="text-xs text-neutral-400">' + escapeHtml(dateLabel) + '</div>' +
                '<div class="text-sm text-neutral-200">Goals: ' + row.goalsFor + ':' + row.goalsAgainst + '</div>' +
              '</div>'
            );
          }).join('');
        }
      }

      if (resultsEl) resultsEl.classList.remove('hidden');
      if (emptyEl) emptyEl.classList.add('hidden');
    };

    playerASelect.addEventListener('change', renderDuo);
    playerBSelect.addEventListener('change', renderDuo);
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        playerASelect.value = '';
        playerBSelect.value = '';
        renderDuo();
      });
    }

    renderDuo();
  }
})();
          `,
        }}
      />
    </div>
  );
}
