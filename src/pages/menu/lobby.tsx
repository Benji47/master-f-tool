import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { getAllPlayerProfiles, GlobalStats, PlayerProfile } from "../../logic/profile";
import { badges, rankTiers, computeLevel, getLevelBadgeColor, getRankInfoFromElo } from "../../static/data";
import GlobalStatsPanel from "./GlobalStats";
import PlayerProfilePanel from "./PlayerProfile";
import { DailyAchievementsPanel } from "./DailyAchievements";
import { getDailyAchievements } from "../../logic/dailyAchievements";
import { getCurrentSeasonIndex, getSeasonLabel, getSeasonWindow } from "../../logic/season";

// Season timer component
function SeasonTimerPanel() {
  const currentSeason = getCurrentSeasonIndex();
  const seasonWindow = getSeasonWindow(currentSeason);
  const seasonStartDate = seasonWindow.start;
  const seasonEndDate = seasonWindow.end;

  return (
    <div className="bg-neutral-900/50 rounded-lg border border-purple-600/50 p-4">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-white font-[Orbitron] mb-2">⏱️ Season Timer</h3>
        <div className="text-sm text-purple-400 font-semibold">{getSeasonLabel(currentSeason)}</div>
        <div id="season-timer-content" className="space-y-2">
          <div className="text-sm text-neutral-400">Season ends in:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-days" className="text-2xl font-bold text-purple-400">0</div>
              <div className="text-xs text-neutral-400">DAYS</div>
            </div>
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-hours" className="text-2xl font-bold text-purple-400">00</div>
              <div className="text-xs text-neutral-400">HOURS</div>
            </div>
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-minutes" className="text-2xl font-bold text-purple-400">00</div>
              <div className="text-xs text-neutral-400">MINS</div>
            </div>
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-seconds" className="text-2xl font-bold text-purple-400">00</div>
              <div className="text-xs text-neutral-400">SECS</div>
            </div>
          </div>
          <div className="text-xs text-neutral-300 mt-2">
            Current season: {seasonStartDate.toLocaleDateString()} → {seasonEndDate.toLocaleDateString()} (3 months)
          </div>
        </div>
        <div id="season-ended" className="hidden text-yellow-400 font-bold">
          ✨ New season started! 3 month season in progress.
        </div>
      </div>
    </div>
  );
}

export async function LobbyPage({
  c,
  playerProfile,
  globalStats,
  statsScope = "current",
  selectedSeasonIndex = 0,
  currentSeasonIndex = 0,
  availableSeasonIndexes = [0],
  walletCoins,
}: {
  c: Context;
  playerProfile: PlayerProfile | null;
  globalStats: GlobalStats | null;
  statsScope?: "overall" | "current" | "season";
  selectedSeasonIndex?: number;
  currentSeasonIndex?: number;
  availableSeasonIndexes?: number[];
  walletCoins?: number;
}) {
  const players = await getAllPlayerProfiles();
  const dailyAchievements = await getDailyAchievements(24);

  if (playerProfile === null || globalStats === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-6">
          <p className="text-white mb-4">Please log in to view the Lobby page.</p>
          <a href="/v1/auth/login" className="text-sm text-blue-400 underline">Go to login</a>
        </div>
      </div>
    );
  }

  const lvl = computeLevel(playerProfile.xp);
  const rank = getRankInfoFromElo(playerProfile.elo);
  const badgeColor = getLevelBadgeColor(lvl.level);
  const currentSeasonWindow = getSeasonWindow(currentSeasonIndex);
  const seasonStartDate = currentSeasonWindow.start;
  const seasonEndDate = currentSeasonWindow.end;
  const winrate = playerProfile.wins + playerProfile.loses > 0
    ? Math.round((playerProfile.wins / (playerProfile.wins + playerProfile.loses)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-4">
      {/* Top-center nav - Empty placeholder */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <nav className="flex gap-3 items-center"></nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - Player Profile */}
        <PlayerProfilePanel playerProfile={playerProfile} players={players} walletCoins={walletCoins} />

        {/* Center - 3x4 Grid with PLAY in Middle */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center gap-6 pt-6">
          <div className="w-full max-w-2xl">
            <SeasonTimerPanel />
          </div>
          <div className="grid grid-cols-3 gap-8 w-fit">
            {/* Row 1 */}
            <a href="/v1/leaderboard" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-blue-500/50">
                🪜
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Leaderboards</span>
            </a>

            <a href="/v1/match-history" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-indigo-500/50">
                📜
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Match History</span>
            </a>

            <a href="/v1/graphs" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-purple-500/50">
                📊
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Graphs</span>
            </a>

            {/* Row 2 */}
            <a href="/v1/changes-log" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-gray-500/50">
                🛠️
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Changes & Fixes</span>
            </a>

            <a href="/v1/match/lobby" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-green-500/50">
                ⚔️
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">PLAY</span>
            </a>

            <a href="/v1/f-bet" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-yellow-500/50">
                🎲
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">F Bet</span>
            </a>

            {/* Row 3 */}
            <a href="/v1/achievements" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-red-500/50">
                🎯
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Achievements</span>
            </a>

            <a href="/v1/tournaments" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-orange-500/50">
                🏆
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Tournaments</span>
            </a>

            <a href="/v1/shop" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-amber-500/50">
                🛒
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Shop</span>
            </a>

            {/* Row 4 */}
            <a href="/v1/hall-of-fame" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-amber-500/50">
                🏛️
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Hall of Fame</span>
            </a>

            <a href="/v1/faq" className="group relative">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-cyan-700 hover:from-cyan-400 hover:to-cyan-600 rounded-lg flex items-center justify-center text-5xl transition-all transform hover:scale-110 shadow-lg hover:shadow-cyan-500/50">
                ❓
              </div>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">FAQ</span>
            </a>

            <form action="/v1/auth/logout" method="post" className="group relative">
              <button
                type="submit"
                className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 rounded-lg flex items-center justify-center text-4xl transition-all transform hover:scale-110 shadow-lg hover:shadow-red-500/50 text-white"
              >
                🚪
              </button>
              <span className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Logout</span>
            </form>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Fixed Position */}
      <div className="fixed top-4 right-4 w-120 flex flex-col gap-4 z-40">
        {/* Showing Stats Box */}
        <div className="w-full rounded-md border border-purple-600/50 bg-neutral-900/60 p-3">
          <p className="text-xs text-neutral-400 mb-2 text-center">Showing stats:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a href="/v1/lobby?scope=current" className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "current" ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>
              Current Season
            </a>
            <a href="/v1/lobby?scope=overall" className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "overall" ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>
              Overall
            </a>
            {availableSeasonIndexes.filter((season) => season !== currentSeasonIndex).map((season) => (
              <a
                key={season}
                href={`/v1/lobby?scope=season&season=${season}`}
                className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "season" && selectedSeasonIndex === season ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}
              >
                {getSeasonLabel(season)}
              </a>
            ))}
          </div>
        </div>

        {/* Levels and Ranks Buttons */}
        <div className="w-full flex gap-2">
          <button
            type="button"
            onclick="document.getElementById('levels-modal')?.showModal()"
            className="flex-1 px-3 py-1 text-xs text-white/70 rounded-md bg-neutral-800/60 border border-purple-600/40 hover:border-purple-500/60 hover:bg-neutral-700 transition-colors"
          >
            Levels
          </button>
          <button
            type="button"
            onclick="document.getElementById('ranks-modal')?.showModal()"
            className="flex-1 px-3 py-1 text-xs text-white/70 rounded-md bg-neutral-800/60 border border-purple-600/40 hover:border-purple-500/60 hover:bg-neutral-700 transition-colors"
          >
            Ranks
          </button>
        </div>

        <DailyAchievementsPanel achievements={dailyAchievements} />
        <GlobalStatsPanel globalStats={globalStats} />
      </div>

      {/* Levels Modal */}
      <dialog
        id="levels-modal"
        onclick="if (event.target === this) this.close()"
        className="backdrop:bg-black/60 rounded-lg bg-neutral-900/95 border border-purple-600/50 p-0 w-full max-w-xl"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-white font-[Orbitron]">Levels & Badges</h4>
            <button
              type="button"
              onclick="document.getElementById('levels-modal')?.close()"
              className="text-neutral-400 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {badges.map((b, idx) => (
              <div
                key={b.name}
                className="flex items-center justify-between bg-neutral-800/40 rounded px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className={`${b.bg} ${b.text} px-2 py-0.5 rounded text-xs font-semibold w-28 text-left`}>
                    {b.name}
                  </span>
                  <div className="text-neutral-200 text-sm">
                    Level {idx + 1} ({b.minLevel} - {b.maxLevel})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </dialog>

      {/* Ranks Modal */}
      <dialog
        id="ranks-modal"
        onclick="if (event.target === this) this.close()"
        className="backdrop:bg-black/60 rounded-lg bg-neutral-900/95 border border-purple-600/50 p-0 w-full max-w-[95vw]"
      >
        <div className="p-7 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-white font-[Orbitron]">Ranks</h4>
            <button
              type="button"
              onclick="document.getElementById('ranks-modal')?.close()"
              className="text-neutral-400 hover:text-white text-xl"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-6">
            {[
              ["zElo", "Bronze", "Silver", "Gold"],
              ["Platinum", "Diamond", "Master", "Grandmaster"],
            ].map((rankRow, rowIdx) => (
              <div key={`row-${rowIdx}`} className="flex gap-5">
                {rankRow.map((rankName) => {
                  const tiers = rankTiers.filter((t) => t.name.startsWith(rankName));

                  if (tiers.length === 0) return null;

                  const firstTier = tiers[0];
                  const rankColors: Record<string, string> = {
                    zElo: "bg-gray-700/30",
                    Bronze: "bg-amber-900/40",
                    Silver: "bg-slate-600/40",
                    Gold: "bg-yellow-700/40",
                    Platinum: "bg-cyan-600/40",
                    Diamond: "bg-blue-600/40",
                    Master: "bg-purple-600/40",
                    Grandmaster: "bg-red-600/40",
                  };

                  return (
                    <div
                      key={rankName}
                      className={`flex-1 rounded-lg p-5 border-2 ${rankColors[rankName] || "bg-neutral-800/40"}`}
                      style={{ borderColor: firstTier.textColor.split(" ").pop() }}
                    >
                      <div className={`text-2xl font-bold text-center mb-4 ${firstTier.textColor}`}>
                        {rankName === "zElo" ? "🥬 zElo" : rankName}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {tiers.map((tier) => {
                          const playersInTier = players.filter((p) => getRankInfoFromElo(p.elo).name === tier.name);
                          const sortedPlayers = playersInTier.sort((a, b) => b.elo - a.elo);

                          return (
                            <div key={tier.name} className="flex flex-col gap-2 bg-neutral-800/50 rounded p-3">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-2.5 rounded-full bg-gradient-to-r ${tier.color}`} />
                                  <div className={`${tier.textColor} text-sm font-bold`}>
                                    {tier.name.split(" ")[1]}
                                  </div>
                                </div>
                                <div className="text-neutral-400 text-sm">
                                  ({tier.min}-{tier.max})
                                </div>
                              </div>

                              {sortedPlayers.length > 0 ? (
                                <ul className="text-neutral-300 text-sm list-disc pl-4 max-h-40 overflow-y-auto">
                                  {sortedPlayers.map((p) => (
                                    <li key={p.username} className="truncate">
                                      {p.username} ({p.elo})
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-neutral-600 text-sm italic"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </dialog>

      {/* Season Timer Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  const SEASON_START = new Date('${seasonStartDate.toISOString()}').getTime();
  const SEASON_END = new Date('${seasonEndDate.toISOString()}').getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const difference = SEASON_END - now;

    if (difference <= 0) {
      document.getElementById('season-timer-content').classList.add('hidden');
      document.getElementById('season-ended').classList.remove('hidden');
    } else {
      document.getElementById('season-timer-content').classList.remove('hidden');
      document.getElementById('season-ended').classList.add('hidden');

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      document.getElementById('timer-days').textContent = days;
      document.getElementById('timer-hours').textContent = String(hours).padStart(2, '0');
      document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
      document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');
    }
  }

  updateTimer();
  setInterval(updateTimer, 1000);
})();
          `,
        }}
      />
    </div>
  );
}
