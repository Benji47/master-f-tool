import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { getAllPlayerProfiles, GlobalStats, PlayerProfile } from "./profile";
import { useEffect, useState } from "hono/jsx";

interface PlayerData {
  username: string;
  elo: number;
  xp: number;
  wins: number;
  loses: number;
  ultimate_wins: number;
  ultimate_loses: number;
  goals_scored: number;
  goals_conceded: number;
  vyrazecky: number;
  ten_zero_wins: number;
  ten_zero_loses: number;
}

const levelsXp = [75, 150, 225, 300, 400, 500, 650, 800, 1000];

function getCumulativeThresholds(): number[] {
  let cumulative = 0;
  return levelsXp.map((xp) => {
    const threshold = cumulative;
    cumulative += xp;
    return threshold;
  });
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

export function getLevelBadgeColor(level: number): { bg: string; text: string, textInLeaderboards: string } {
  if (level <= 1) return { bg: "bg-red-600", text: "text-red-100", textInLeaderboards: "text-red-500" }; // Bronze
  if (level <= 2) return { bg: "bg-orange-600", text: "text-orange-100", textInLeaderboards: "text-orange-500" }; // Bronze
  if (level <= 3) return { bg: "bg-yellow-600", text: "text-yellow-100", textInLeaderboards: "text-yellow-500" }; // Bronze
  if (level <= 4) return { bg: "bg-lime-600", text: "text-lime-100", textInLeaderboards: "text-lime-500" }; // Bronze
  if (level <= 5) return { bg: "bg-green-600", text: "text-green-100", textInLeaderboards: "text-green-500" }; // Bronze
  if (level <= 6) return { bg: "bg-cyan-600", text: "text-cyan-100", textInLeaderboards: "text-cyan-500" }; // Bronze
  if (level <= 7) return { bg: "bg-blue-600", text: "text-blue-100", textInLeaderboards: "text-blue-500" }; // Bronze
  if (level <= 8) return { bg: "bg-indigo-600", text: "text-indigo-100", textInLeaderboards: "text-indigo-500" }; // Bronze
  if (level <= 9) return { bg: "bg-purple-600", text: "text-purple-100", textInLeaderboards: "text-purple-500" }; // Bronze
  if (level <= 10) return { bg: "bg-black", text: "text-neutral-100", textInLeaderboards: "text-neutral-500" }; // Bronze
  return { bg: "bg-indigo-600", text: "text-indigo-100", textInLeaderboards: "text-red-500" }; // Diamond+
}

// NEW: badges array (strings + optional metadata) 
export const badges = [
  { name: "Rookie ♖", minLevel: 0, maxLevel: 75, bg: "bg-red-600", text: "text-red-100" },
  { name: "Šnekpán 🐌", minLevel: 75, maxLevel: 225, bg: "bg-orange-600", text: "text-orange-100" },
  { name: "Cleaner 🧹", minLevel: 225, maxLevel: 450, bg: "bg-yellow-600", text: "text-yellow-100" },
  { name: "Own goals master 🥅🫣", minLevel: 450, maxLevel: 750, bg: "bg-lime-600", text: "text-lime-100" },
  { name: "Gods hand 🫳", minLevel: 750, maxLevel: 1150, bg: "bg-green-600", text: "text-green-100" },
  { name: "Ťukač do tyček", minLevel: 1150, maxLevel: 1550, bg: "bg-cyan-600", text: "text-cyan-100" },
  { name: "Tryhard", minLevel: 1550, maxLevel: 2050, bg: "bg-blue-600", text: "text-blue-100" },
  { name: "Fussmaster", minLevel: 2050, maxLevel: 2700, bg: "bg-indigo-600", text: "text-indigo-100" },
  { name: "▄︻デ══━一💥", minLevel: 2700, maxLevel: 3500, bg: "bg-purple-600", text: "text-purple-100" },
  { name: "Vyrážeč ➜]", minLevel: 3500, maxLevel: 4500, bg: "bg-black", text: "text-neutral-100" },
];

// NEW: ELO rank tiers (so Ranks panel can reuse same info as eloRank)
const rankTiers = [
  { name: "Bronze I", min: 0, max: 199, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },
  { name: "Bronze II", min: 200, max: 399, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },
  { name: "Bronze III", min: 400, max: 599, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },

  { name: "Silver I", min: 600, max: 749, color: "from-gray-900 to-gray-500", textColor: "text-gray-500" },
  { name: "Silver II", min: 750, max: 899, color: "from-gray-900 to-gray-500", textColor: "text-gray-500" },
  { name: "Silver III", min: 900, max: 1099, color: "from-gray-900 to-gray-500", textColor: "text-gray-500" },
  
  { name: "Gold I", min: 1100, max: 1249, color: "from-amber-900 to-amber-500", textColor: "text-amber-500" },
  { name: "Gold II", min: 1250, max: 1399, color: "from-amber-900 to-amber-500", textColor: "text-amber-500" },
  { name: "Gold III", min: 1400, max: 1549, color: "from-amber-900 to-amber-500", textColor: "text-amber-500" },
  
  { name: "Platinum I", min: 1550, max: 1749, color: "from-sky-900 to-sky-500", textColor: "text-sky-500" },
  { name: "Platinum II", min: 1750, max: 1949, color: "from-sky-900 to-sky-500", textColor: "text-sky-500" },
  { name: "Platinum III", min: 1950, max: 2149, color: "from-sky-900 to-sky-500", textColor: "text-sky-500" },
  
  { name: "Diamond I", min: 2150, max: 2349, color: "from-indigo-900 to-indigo-500", textColor: "text-indigo-500" },
  { name: "Diamond II", min: 2350, max: 2499, color: "from-indigo-900 to-indigo-500", textColor: "text-indigo-500" },
  { name: "Diamond III", min: 2500, max: 2749, color: "from-indigo-900 to-indigo-500", textColor: "text-indigo-500" },
  
  { name: "Master", min: 2750, max: 2999, color: "from-red-900 to-red-500", textColor: "text-red-500" },
  { name: "Master F", min: 3000, max: 3249, color: "from-red-900 to-red-500", textColor: "text-red-500" },
  { name: "Masters Blythe", min: 3250, max: 3499, color: "from-red-900 to-red-500", textColor: "text-red-500" },
];

function eloRank(elo: number) {
  const tiers = rankTiers;
  const tier = tiers.find(t => elo >= t.min && elo <= t.max) ?? tiers[0];
  const span = tier.max - tier.min + 1;
  const progress = Math.round(((elo - tier.min) / span) * 100);
  const tierIndex = tiers.indexOf(tier);
  const prevTier = tierIndex > 0 ? tiers[tierIndex - 1] : null;
  const nextTier = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;
  return { 
    name: tier.name, 
    progress, 
    color: tier.color, 
    colorKey: tier.textColor, 
    min: tier.min, 
    max: tier.max,
    prevTierName: prevTier?.name,
    nextTierName: nextTier?.name,
  };
}

export async function LobbyPage({ c, playerProfile, globalStats }: { c: Context; playerProfile: PlayerProfile | null; globalStats: GlobalStats | null}) {
  const players = await getAllPlayerProfiles();

  const playerData: PlayerData = playerProfile ? {
    username: playerProfile.username,
    elo: playerProfile.elo,
    xp: playerProfile.xp,
    wins: playerProfile.wins,
    loses: playerProfile.loses,
    ultimate_wins: playerProfile.ultimate_wins,
    ultimate_loses: playerProfile.ultimate_loses,
    goals_scored: playerProfile.goals_scored,
    goals_conceded: playerProfile.goals_conceded,
    vyrazecky: playerProfile.vyrazecky,
    ten_zero_wins: playerProfile.ten_zero_wins,
    ten_zero_loses: playerProfile.ten_zero_loses,
  } : {
    username: getCookie(c, "user") ?? "Player",
    elo: 500,
    xp: 0,
    wins: 0,
    loses: 0,
    ultimate_wins: 0,
    ultimate_loses: 0,
    goals_scored: 0,
    goals_conceded: 0,
    vyrazecky: 0,
    ten_zero_wins: 0,
    ten_zero_loses: 0,
  };

  const globalStatsData: GlobalStats = globalStats ? {
    totalGoals: globalStats.totalGoals,
    totalMatches: globalStats.totalMatches,
    totalPodlezani: globalStats.totalPodlezani,
    totalVyrazecka: globalStats.totalVyrazecka,
  } : {
    totalGoals: 0,
    totalMatches: 0,
    totalPodlezani: 0,
    totalVyrazecka: 0,
  };

  const lvl = computeLevel(playerData.xp);
  const rank = eloRank(playerData.elo);
  const badgeColor = getLevelBadgeColor(lvl.level);
  const winRate = playerData.wins + playerData.loses > 0 
    ? Math.round((playerData.wins / (playerData.wins + playerData.loses)) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-screen">
        
        {/* Left Sidebar - Player Info */}
        <div className="lg:col-span-1 bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 flex flex-col justify-between relative">
          <div>
            {/* Top row: username + small hover buttons */}
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-center">
                <h2 className="text-2xl font-bold text-white font-[Orbitron] mb-3 text-center">
                  {playerData.username}
                </h2>
              </div>

              {/* Buttons container (right of username) */}
                <div className="flex gap-2 items-start ml-2">

                  {/* Levels Hover Button */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs text-white/30 rounded-md bg-neutral-800/60 border border-neutral-700 hover:bg-neutral-700 transition-colors"
                    >
                      Levels
                    </button>

                    {/* POPUP: Levels */}
                    <div className="absolute -left-2 top-full mt-2 w-90 bg-neutral-900/95 border border-neutral-700 rounded-lg p-4 z-50 shadow-lg text-sm
                                    opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
                      <h4 className="font-bold mb-2 text-white">Levels & Badges</h4>

                      <div className="space-y-2">
                        {badges.map((b, idx) => (
                          <div key={b.name} className="flex items-center justify-between bg-neutral-800/40 rounded px-2 py-1">
                            <div className="flex items-center gap-2">
                              <span className={`${b.bg} ${b.text} px-2 py-0.5 rounded text-xs font-semibold w-26 text-left`}>
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
                  </div>

                  {/* Ranks Hover Button */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs text-white/30 rounded-md bg-neutral-800/60 border border-neutral-700 hover:bg-neutral-700 transition-colors"
                    >
                      Ranks
                    </button>

                    {/* POPUP: Ranks Grid */}
                    <div className="absolute -left-2 top-full mt-2 w-[1300px] bg-neutral-900/95 border border-neutral-700 rounded-lg p-4 z-50 shadow-lg text-sm
                                    opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">

                      {/* Grid layout */}
                      <div className="grid grid-cols-6 gap-4">
      {["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"].map((rankName) => {
  const tiers = rankTiers.filter(t => t.name.startsWith(rankName));
  const titleColor = tiers[0]?.textColor ?? "text-white";

  // Players who belong to this rank (Bronze, Silver...)
  let playersInRank = players.filter(
    (p) => eloRank(p.elo).name.split(" ")[0] === rankName
  );

   playersInRank = playersInRank.sort((a, b) => b.elo - a.elo);

  return (
    <div key={rankName} className="flex flex-col gap-2">
      
      {/* Rank Title */}
      <div className={`font-semibold mb-1 ${titleColor}`}>{rankName}</div>

      {/* Tier Bars (WITHOUT player list) */}
      {tiers.map((tier) => (
        <div key={tier.name} className="flex items-center gap-2 bg-neutral-800/40 rounded px-2 py-1">
          <div className={`w-8 h-3 rounded-full bg-gradient-to-r ${tier.color}`} />
          <div className={`${tier.textColor} text-xs font-semibold`}>
            {tier.name} ({tier.min}-{tier.max})
          </div>
        </div>
      ))}

      {/* Player List (only once per rank) */}
      <div className="mt-1 pl-4">
        {playersInRank.length > 0 ? (
          <ul className="text-neutral-300 text-xs list-disc">
            {playersInRank.map((p) => (
              <li key={p.username}>
                {p.username} — {p.elo} ELO
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-neutral-600 text-xs">No players</div>
        )}
      </div>

    </div>
  );
})}
    
                      </div>
                    </div>
                  </div>

                </div>
            </div>

            {/* divider: inset short line after nickname */}
            <div className="w-11/12 mb-5 mt-3 mx-auto h-px bg-white/35 my-3 rounded" />

            {/* Profile Level Section */}
            <div className="mb-6">
              <div className={`${badgeColor.bg} ${badgeColor.text} px-4 py-2 rounded-md font-bold text-center text-2xl mb-3`}>
                Level {lvl.level} [{badges[lvl.level - 1]?.name || "Unranked"}]
              </div>

              {/* XP Info with Hover */}
              <div className="relative group">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-neutral-300 cursor-help">{lvl.xpInCurrentLevel}/{lvl.xpNeededForNext} XP</p>
                  <div className="w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600">
                    i
                  </div>
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-48 border border-neutral-700 z-10">
                  <p className="font-bold mb-1 text-blue-400">XP Gains:</p>
                  <p>• Win: +15 XP</p>
                  <p>• Lose: +5 XP</p>
                  <p>• Ultimate Winner: +25 XP</p>
                  <p>• Perfect Win (10-0): +50 XP</p>
                  <p>• Goal: +1 XP</p>
                  <p>• Vyrážečka: +10 XP</p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
                <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${lvl.progress}%` }} />
              </div>

              <div className="flex justify-between text-xs mt-1 text-neutral-400">
                <span>0</span>
                <span>{lvl.xpNeededForNext}</span>
              </div>
            </div>

            {/* ... rest unchanged ... (ELO Rank Section, Stats, Goals) */}
            <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

            <div className="mb-6">
              <p className={`text-xl font-bold ${rank.colorKey} mb-2`}>{rank.name}</p>
              <div className="relative group">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-m text-neutral-300 cursor-help">{playerData.elo} ELO</p>
                  <div className="w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600">
                    i
                  </div>
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-84 border border-neutral-700 z-10">
                  <p className="font-bold mb-1 text-blue-400">ELO Changes:</p>
                  <p className="text-green-400">• Win: +20 ELO</p>
                  <p className="text-red-400">• Lose: -20 ELO</p>
                  <p className="text-green-400">• Ultimate Winner: 2 ELO from each opponent (total +6) </p>
                  <p className="text-red-400">• Ultimate Loser: 1 ELO to each opponent (total -3)</p>
                  <p>• ELO difference: (max ±10)</p>
                  <p className="pl-4 text-neutral-300">• ±min(10, avg elo difference / 25)</p>
                </div>
              </div>

              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
                <div className={`h-2 rounded-full bg-gradient-to-r ${rank.color}`} style={{ width: `${rank.progress}%` }} />
              </div>

              <div className="flex justify-between text-xs mt-1 text-neutral-400">
                <span>{rank.min}</span>
                <span>{rank.max}</span>
              </div>
            </div>

            <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-300">
                <span className="text-blue-400">Total Matches (games):</span>
                <span className="text-blue-400">{playerData.wins + playerData.loses} ({(playerData.wins + playerData.loses)/3})</span>
              </div>
              <div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-green-400">Wins:</span>
                  <span className="text-green-400">{playerData.wins} ({winRate}%)</span>
                </div>
                <div className="flex justify-between ml-4 text-sm text-neutral-400">
                  <span className="text-green-400">• Ultimate Wins</span>
                  <span className="text-green-400">{playerData.ultimate_wins}</span>
                </div>
                <div className="flex justify-between ml-4 text-sm text-neutral-400">
                  <span className="text-green-400">• 10-0 wins</span>
                  <span className="text-green-400">{playerData.ten_zero_wins}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-red-400">Loses:</span>
                  <span className="text-red-400">{playerData.loses} ({100 - winRate}%)</span>
                </div>
                <div className="flex justify-between ml-4 text-sm text-neutral-400">
                  <span className="text-red-400">• Ultimate Loses</span>
                  <span className="text-red-400">{playerData.ultimate_loses}</span>
                </div>
                <div className="flex justify-between ml-4 text-sm text-neutral-400">
                  <span className="text-red-400">• 0-10 loses</span>
                  <span className="text-red-400">{playerData.ten_zero_loses}</span>
                </div>
              </div>
            </div>

            <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-300">
                <span className="text-purple-400">Goals (Scored:Conceded):</span>
                <span className="text-purple-400">{playerData.goals_scored}:{playerData.goals_conceded}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-orange-400">Vyrážečka Count:</span>
                <span className="text-orange-400">{playerData.vyrazecky}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Main Actions (unchanged) */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center gap-6">
          <form action="/v1/match/join" method="post" className="w-full max-w-sm">
            <button type="submit" className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 cursor-pointer text-white font-bold text-lg rounded-md transition-all">
              ⚔️ JOIN MATCH
            </button>
          </form>

          <a href="/v1/leaderboard" className="w-full max-w-sm">
            <button className="w-full py-4 bg-transparent border-2 border-neutral-700 hover:border-green-500 text-white font-bold text-lg cursor-pointer rounded-md transition-all">
              🪜 LEADERBOARDS
            </button>
          </a>

          <a href="/v1/match-history" className="w-full max-w-sm">
            <button className="w-full py-4 bg-transparent border-2 border-neutral-700 hover:border-green-500 text-white font-bold text-lg cursor-pointer rounded-md transition-all">
              📜 MATCH HISTORY
            </button>
          </a>

          <button disabled className="w-full max-w-sm py-4 bg-neutral-700/40 text-neutral-400 font-bold text-lg rounded-md cursor-not-allowed opacity-60">
            🏆 TOURNAMENTS
            <div className="text-xs mt-1">Coming Soon</div>
          </button>

          <button disabled className="w-full max-w-sm py-4 bg-neutral-700/40 text-neutral-400 font-bold text-lg rounded-md cursor-not-allowed opacity-60">
            CREATE MATCH
            <div className="text-xs mt-1">Coming Soon</div>
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1" />

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

            {/* Bottom-right Global Stats panel */}
      <div className="fixed bottom-4 right-4 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 w-64 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-3">Global Stats</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-300">
            <span className="text-blue-400">Total Matches (games):</span>
            <span className="text-blue-400">{globalStatsData.totalMatches} ({globalStatsData.totalMatches/3})</span>
          </div>

          <div className="flex justify-between text-neutral-300">
            <span className="text-green-400">Total Goals:</span>
            <span className="text-green-400">{globalStatsData.totalGoals}</span>
          </div>

          <div className="flex justify-between text-neutral-300">
            <span className="text-orange-400">Podlézání:</span>
            <span className="text-orange-400">{globalStatsData.totalPodlezani}</span>
          </div>

          <div className="flex justify-between text-neutral-300">
            <span className="text-purple-400">Vyrážečka:</span>
            <span className="text-purple-400">{globalStatsData.totalVyrazecka}</span>
          </div>

          <div className="flex justify-between text-neutral-300">
            <span className="text-purple-400">Vyrážečka %:</span>
            <span className="text-purple-400">{Math.round(globalStatsData.totalVyrazecka / globalStatsData.totalGoals * 10000) / 100} %</span>
          </div>
        </div>
      </div>

    </div>
  );
}
