import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { PlayerProfile } from "./profile";
import "../styles/Homepage.css";

interface PlayerData {
  username: string;
  elo: number;
  xp: number;
  wins: number;
  loses: number;
  ultimate_wins: number;
  ultimate_loses: number;
}

const levelsXp = [0, 15, 45, 95, 170, 270, 300, 480, 600, 1000]; // Example XP thresholds for levels 1-10

function computeLevel(xp: number) {
  let level = 1;
  let currentLevelXp = 0;
  let nextLevelXp = levelsXp[1] || 100;

  for (let i = 0; i < levelsXp.length; i++) {
    if (xp >= levelsXp[i]) {
      level = i + 1;
      currentLevelXp = levelsXp[i];
      nextLevelXp = levelsXp[i + 1] || levelsXp[levelsXp.length - 1];
    } else {
      break;
    }
  }

  const xpInCurrentLevel = xp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;
  const progress = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);
  const missing = Math.max(0, nextLevelXp - xp);

  return { level, currentLevelXp, nextLevelXp, xpInCurrentLevel, xpNeededForNext, missing, progress };
}

function getLevelBadgeColor(level: number): { bg: string; text: string } {
  if (level <= 2) return { bg: "bg-yellow-600", text: "text-yellow-100" }; // Bronze
  if (level <= 4) return { bg: "bg-gray-500", text: "text-gray-100" }; // Silver
  if (level <= 6) return { bg: "bg-amber-500", text: "text-amber-100" }; // Gold
  if (level <= 8) return { bg: "bg-sky-500", text: "text-sky-100" }; // Platinum
  return { bg: "bg-indigo-600", text: "text-indigo-100" }; // Diamond+
}

function eloRank(elo: number) {
  const tiers = [
    { name: "Bronze", min: 0, max: 999, color: "from-yellow-900 to-yellow-500", colorKey: "text-yellow-500" },
    { name: "Silver", min: 1000, max: 1999, color: "from-gray-900 to-gray-500", colorKey: "text-gray-500" },
    { name: "Gold", min: 2000, max: 2999, color: "from-amber-900 to-amber-500", colorKey: "text-amber-500" },
    { name: "Platinum", min: 3000, max: 3999, color: "from-sky-900 to-sky-500", colorKey: "text-sky-500" },
    { name: "Diamond", min: 4000, max: 4999, color: "from-indigo-900 to-indigo-500", colorKey: "text-indigo-500" },
    { name: "Master", min: 5000, max: 99999, color: "from-red-900 to-red-500", colorKey: "text-red-500" },
  ];
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
    colorKey: tier.colorKey, 
    min: tier.min, 
    max: tier.max,
    prevTierName: prevTier?.name,
    nextTierName: nextTier?.name,
  };
}

export function LobbyPage({ c, playerProfile }: { c: Context; playerProfile: PlayerProfile | null }) {
  // Use real player data from database, fallback to defaults
  const playerData: PlayerData = playerProfile ? {
    username: playerProfile.username,
    elo: playerProfile.elo,
    xp: playerProfile.xp,
    wins: playerProfile.wins,
    loses: playerProfile.loses,
    ultimate_wins: playerProfile.ultimate_wins,
    ultimate_loses: playerProfile.ultimate_loses,
  } : {
    username: getCookie(c, "user") ?? "Player",
    elo: 500,
    xp: 0,
    wins: 0,
    loses: 0,
    ultimate_wins: 0,
    ultimate_loses: 0,
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
        <div className="lg:col-span-1 bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white font-[Orbitron] mb-6">{playerData.username}</h2>

            {/* divider: inset short line after nickname */}
            <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />


            {/* Profile Level Section */}
            <div className="mb-6">
              {/* Level Badge */}
              <div className={`${badgeColor.bg} ${badgeColor.text} px-4 py-2 rounded-md font-bold text-center text-2xl mb-3`}>
                Level {lvl.level}
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
                  <p className="font-bold mb-1">XP Gains:</p>
                  <p>• Win: +15 XP</p>
                  <p>• Lose: +5 XP</p>
                  <p>• Ultimate Winner: +25 XP</p>
                  <p>• Perfect Win (10-0): +50 XP</p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
                <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${lvl.progress}%` }} />
              </div>
            </div>

            {/* divider: inset short line after profile level */}
            <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

            {/* ELO Rank Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <p className={`text-sm font-bold ${rank.colorKey}`}>Rank</p>
              </div>
              <p className={`text-xl font-bold ${rank.colorKey} mb-1`}>{rank.name}</p>
              
              {/* ELO Thresholds */}
              <p className="text-xs text-neutral-400 mb-2">{rank.min} - {rank.max} ELO</p>
              
              {/* Previous/Next Rank Info */}
              <p className="text-xs text-neutral-500 mb-2">
                {rank.prevTierName && <span>← {rank.prevTierName} | </span>}
                {rank.nextTierName && <span>{rank.nextTierName} →</span>}
              </p>

              {/* ELO Info with Hover and Icon */}
              <div className="relative group">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-neutral-300 cursor-help">{playerData.elo} ELO</p>
                  <div className="w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600">
                    i
                  </div>
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-56 border border-neutral-700 z-10">
                  <p className="font-bold mb-1">ELO Changes:</p>
                  <p>• Win: +20 ELO</p>
                  <p>• Lose: -20 ELO</p>
                  <p>• Opponent avg ±25 ELO: ±1 (max ±10)</p>
                  <p>• Ultimate Winner: 2 ELO from each opponent (total +6) </p>
                  <p>• Ultimate Loser: 1 ELO to each opponent (total -3)</p>
                </div>
              </div>

              {/* ELO Progress Bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
                <div className={`h-2 rounded-full bg-gradient-to-r ${rank.color}`} style={{ width: `${rank.progress}%` }} />
              </div>
            </div>

            {/* divider: inset short line after elo rank */}
            <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />


            {/* Stats */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-300">
                <span className="text-blue-400">Total Games:</span>
                <span className="text-blue-400">{playerData.wins + playerData.loses}</span>
              </div>
              
              {/* Wins + sub item */}
              <div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-green-400">Wins:</span>
                  <span className="text-green-400">{playerData.wins} ({winRate}%)</span>
                </div>
                <div className="flex justify-between ml-4 text-sm text-neutral-400">
                  <span className="text-green-400">• Ultimate Wins</span>
                  <span className="text-green-400">{playerData.ultimate_wins}</span>
                </div>
              </div>
              
              {/* Loses + sub item */}
              <div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-red-400">Loses:</span>
                  <span className="text-red-400">{playerData.loses} ({100 - winRate}%)</span>
                </div>
                <div className="flex justify-between ml-4 text-sm text-neutral-400">
                  <span className="text-red-400">• Ultimate Loses</span>
                  <span className="text-red-400">{playerData.ultimate_loses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Main Actions */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center gap-6">
          <form action="/v1/match/join" method="post" className="w-full max-w-sm">
            <button type="submit" className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold text-lg rounded-md transition-all">
              JOIN MATCH
            </button>
          </form>

          <a href="/v1/leaderboard" className="w-full max-w-sm">
            <button className="w-full py-4 bg-transparent border-2 border-neutral-700 hover:border-green-500 text-white font-bold text-lg rounded-md transition-all">
              LEADERBOARDS
            </button>
          </a>

          <button disabled className="w-full max-w-sm py-4 bg-neutral-700/40 text-neutral-400 font-bold text-lg rounded-md cursor-not-allowed opacity-60">
            🏆 TOURNAMENTS
            <div className="text-xs mt-1">Coming Soon</div>
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          {/* logout button moved to top-right fixed position */}
        </div>
      </div>

      {/* Top-right logout button */}
      <form action="/v1/auth/logout" method="post" className="fixed top-4 right-4 z-50">
        <button
          type="submit"
          className="px-3 py-2 bg-red-400 hover:bg-red-500 text-white rounded-md font-semibold shadow-sm"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
