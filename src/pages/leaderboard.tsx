import { PlayerProfile } from "../logic/profile";
import { badges, getLevelBadgeColor, getRankInfoFromElo } from "../static/data";
import { levelsXp, getCumulativeThresholds } from "../static/data";

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

export function LeaderboardPage({ players, currentPlayer }: { players: PlayerProfile[]; currentPlayer?: string }) {
  function eloColor(elo: number) {
    if (elo >= 1000) return "text-red-500";
    if (elo >= 800) return "text-indigo-500";
    if (elo >= 600) return "text-sky-500";
    if (elo >= 400) return "text-amber-500";
    if (elo >= 200) return "text-gray-400";
    return "text-yellow-800";
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white font-[Orbitron] mb-2">Leaderboards</h1>
          <p className="text-neutral-400">Top players across different categories</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button data-tab="elo" className="tab-btn active px-4 py-2 bg-green-600 hover:bg-green-700 cursor-pointer text-white rounded-md font-semibold transition-colors">ELO</button>
          <button data-tab="ultimate_wins" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Ultimate Wins</button>
          <button data-tab="ultimate_loses" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Ultimate Loses</button>
          <button data-tab="vyrazacka" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Vyrážečky</button>
          <button data-tab="total_games" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Total Games</button>
          <button data-tab="level" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Level</button>
          <button data-tab="ten_zero_loses" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">10:0 Loses</button>
          <button data-tab="ten_zero_wins" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">10:0 Wins</button>
          <button data-tab="coins" className="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Coins</button>
          
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}> <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink></div>
                  <div className={`font-bold ${eloColor(player.elo)}`}>{player.elo} -> {eloRank}</div>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
                  </div>

                  <div className="text-orange-400 font-bold">{player.vyrazecky} ({vyrazeckyPercents}%)</div>
                </div>
              );
            })}
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
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
                  <div className="font-bold text-lg">#{idx + 1}</div>
                  <div className={`font-semibold ${getLevelBadgeColor(lvl).textInLeaderboards}`}>
                    <PlayerLink username={player.username}>{player.username} [{badges[computeLevel(player.xp).level - 1]?.name || "Unranked"}]</PlayerLink>
                  </div>
                  <div className="text-yellow-400 font-bold">{player.coins}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = document.querySelectorAll('.leaderboard-tab');

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
        b.classList.remove('bg-green-600');
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
      this.classList.add('bg-green-600');
    });
  });
})();
          `,
        }}
      />
    </div>
  );
}
