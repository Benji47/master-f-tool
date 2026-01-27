import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { getAllPlayerProfiles, GlobalStats, PlayerProfile } from "../../v1/profile";
import { useEffect, useState } from "hono/jsx";
import { levelsXp, badges, rankTiers, PlayerData, computeLevel, getLevelBadgeColor, getRankInfoFromElo } from '../../static/data'; // Import static data
import GlobalStatsPanel from "./GlobalStats";
import PlayerProfilePanel from "./PlayerProfile";
import { DailyAchievementsPanel } from "./DailyAchievements";
import { getDailyAchievements } from "../../v1/dailyAchievements";

export async function LobbyPage({ c, playerProfile, globalStats } : { c: Context; playerProfile: PlayerProfile | null; globalStats: GlobalStats | null}) {
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
          <a href="/v1/changes-log" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">🛠️ Changes & Fixes</a>
          <a href="/v1/f-bet" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">F Bet</a>
          <a href="/v1/achievements" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">Achievements</a>
          <a href="/v1/tournaments" className="px-4 py-2 text-sm text-white bg-transparent border-2 border-neutral-700 hover:border-green-500 rounded-md font-bold">Tournaments</a>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Sidebar - Player Profile (moved to component) */}
        <PlayerProfilePanel playerProfile={playerProfile} players={players} />

        {/* Center - Main Actions (unchanged) */}
        <div className="lg:col-span-2 flex flex-col justify-start items-center gap-6 pt-110">
          <a href="/v1/match/lobby" className="w-full max-w-sm">
            <button className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 cursor-pointer text-white font-bold text-lg rounded-md transition-all">
              ⚔️ PLAY
            </button>
          </a>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4 mt-auto">
          <DailyAchievementsPanel achievements={dailyAchievements} />
          <GlobalStatsPanel globalStats={globalStats} />
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
    </div>
  );
}
