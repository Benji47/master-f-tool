import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { getAllPlayerProfiles, GlobalStats, PlayerProfile } from "../../logic/profile";
import { useEffect, useState } from "hono/jsx";
import { levelsXp, badges, rankTiers, PlayerData, computeLevel, getLevelBadgeColor, getRankInfoFromElo } from '../../static/data'; // Import static data
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
    <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-4">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-white font-[Orbitron] mb-2">⏱️ Season Timer</h3>
        <div className="text-sm text-green-400 font-semibold">{getSeasonLabel(currentSeason)}</div>
        <div id="season-timer-content" className="space-y-2">
          <div className="text-sm text-neutral-400">Season ends in:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-days" className="text-2xl font-bold text-green-400">0</div>
              <div className="text-xs text-neutral-400">DAYS</div>
            </div>
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-hours" className="text-2xl font-bold text-green-400">00</div>
              <div className="text-xs text-neutral-400">HOURS</div>
            </div>
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-minutes" className="text-2xl font-bold text-green-400">00</div>
              <div className="text-xs text-neutral-400">MINS</div>
            </div>
            <div className="bg-neutral-800/60 rounded p-2">
              <div id="timer-seconds" className="text-2xl font-bold text-green-400">00</div>
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
} : {
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
      {/* Top-center nav (buttons styled like main action, no rectangle background) */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <nav className="flex gap-2 items-center overflow-x-auto whitespace-nowrap">
          <a href="/v1/leaderboard" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">🪜 Leaderboards</a>
          <a href="/v1/match-history" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">📜 Match History</a>
          <a href="/v1/graphs" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">📊 Graphs</a>
          <a href="/v1/changes-log" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">🛠️ Changes & Fixes</a>
          <a href="/v1/f-bet" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">🎲 F Bet</a>
          <a href="/v1/achievements" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">🎯 Achievements</a>
          <a href="/v1/tournaments" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">🏆 Tournaments</a>
          <a href="/v1/faq" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">❓ FAQ</a>
          <a href="/v1/hall-of-fame" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-yellow-400 rounded-md font-bold">🏛️ Hall of Fame</a>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Sidebar - Player Profile (moved to component) */}
        <PlayerProfilePanel playerProfile={playerProfile} players={players} walletCoins={walletCoins} />

        {/* Center - Main Actions */}
        <div className="lg:col-span-2 flex flex-col justify-start items-center gap-6 pt-110">
          <div className="w-full max-w-sm rounded-md border border-neutral-800 bg-neutral-900/60 p-3">
            <p className="text-xs text-neutral-400 mb-2">Showing stats:</p>
            <div className="flex flex-wrap gap-2">
              <a href="/v1/lobby?scope=current" className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "current" ? "bg-green-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>
                Current Season
              </a>
              <a href="/v1/lobby?scope=overall" className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "overall" ? "bg-green-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>
                Overall
              </a>
              {availableSeasonIndexes.filter((season) => season !== currentSeasonIndex).map((season) => (
                <a
                  key={season}
                  href={`/v1/lobby?scope=season&season=${season}`}
                  className={`px-3 py-1 rounded text-sm font-semibold ${statsScope === "season" && selectedSeasonIndex === season ? "bg-green-600 text-white" : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}
                >
                  {getSeasonLabel(season)}
                </a>
              ))}
            </div>
          </div>

          <a href="/v1/match/lobby" className="w-full max-w-sm">
            <button className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 cursor-pointer text-white font-bold text-lg rounded-md transition-all">
              ⚔️ PLAY
            </button>
          </a>
        </div>

      </div>

      {/* Top-right logout button */}
      <form action="/v1/auth/logout" method="post" className="fixed top-4 right-4 z-50">
        <button
          type="submit"
          className="px-3 py-2 w-full bg-red-500 border-red-500 text-white rounded-md hover:bg-red-700 cursor-pointer transition-all"
        >
          Logout
        </button>
      </form>

      {/* Right Sidebar - Fixed Position */}
      <div className="fixed top-18 right-4 w-120 flex flex-col gap-4 z-40">
        <SeasonTimerPanel />
        <DailyAchievementsPanel achievements={dailyAchievements} />
        <GlobalStatsPanel globalStats={globalStats} />
      </div>

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
