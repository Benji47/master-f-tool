"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbyPage = LobbyPage;
var jsx_runtime_1 = require("hono/jsx/jsx-runtime");
var cookie_1 = require("hono/cookie");
require("../styles/Homepage.css");
function computeLevel(xp) {
    var level = 1;
    var currentLevelXp = 0;
    var nextLevelXp = levelsXp[1];
    for (var i = 0; i < levelsXp.length; i++) {
        if (xp >= levelsXp[i]) {
            level = i + 1;
            currentLevelXp = levelsXp[i];
            nextLevelXp = levelsXp[i + 1] || levelsXp[levelsXp.length - 1];
        }
        else {
            break;
        }
    }
    var xpInCurrentLevel = xp - currentLevelXp;
    var xpNeededForNext = nextLevelXp - currentLevelXp;
    var progress = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);
    var missing = Math.max(0, nextLevelXp - xp);
    return { level: level, currentLevelXp: currentLevelXp, nextLevelXp: nextLevelXp, xpInCurrentLevel: xpInCurrentLevel, xpNeededForNext: xpNeededForNext, missing: missing, progress: progress };
}
function getLevelBadgeColor(level) {
    if (level <= 2)
        return { bg: "bg-yellow-600", text: "text-yellow-100" }; // Bronze
    if (level <= 4)
        return { bg: "bg-gray-500", text: "text-gray-100" }; // Silver
    if (level <= 6)
        return { bg: "bg-amber-500", text: "text-amber-100" }; // Gold
    if (level <= 8)
        return { bg: "bg-sky-500", text: "text-sky-100" }; // Platinum
    return { bg: "bg-indigo-600", text: "text-indigo-100" }; // Diamond+
}
function getLevelBadgeName(level) {
    if (level <= 1)
        return "Rookie";
    if (level <= 2)
        return "Štekpán";
}
function eloRank(elo) {
    var _a;
    var tiers = [
        { name: "Bronze", min: 0, max: 999, color: "from-amber-800 to-amber-600", colorKey: "text-amber-800" },
        { name: "Silver", min: 1000, max: 1999, color: "from-gray-900 to-gray-500", colorKey: "text-gray-500" },
        { name: "Gold", min: 2000, max: 2999, color: "from-amber-900 to-amber-500", colorKey: "text-amber-500" },
        { name: "Platinum", min: 3000, max: 3999, color: "from-sky-900 to-sky-500", colorKey: "text-sky-500" },
        { name: "Diamond", min: 4000, max: 4999, color: "from-indigo-900 to-indigo-500", colorKey: "text-indigo-500" },
        { name: "Master", min: 5000, max: 99999, color: "from-red-900 to-red-500", colorKey: "text-red-500" },
    ];
    var tier = (_a = tiers.find(function (t) { return elo >= t.min && elo <= t.max; })) !== null && _a !== void 0 ? _a : tiers[0];
    var span = tier.max - tier.min + 1;
    var progress = Math.round(((elo - tier.min) / span) * 100);
    var tierIndex = tiers.indexOf(tier);
    var prevTier = tierIndex > 0 ? tiers[tierIndex - 1] : null;
    var nextTier = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;
    return {
        name: tier.name,
        progress: progress,
        color: tier.color,
        colorKey: tier.colorKey,
        min: tier.min,
        max: tier.max,
        prevTierName: prevTier === null || prevTier === void 0 ? void 0 : prevTier.name,
        nextTierName: nextTier === null || nextTier === void 0 ? void 0 : nextTier.name,
    };
}
function LobbyPage(_a) {
    var _b;
    var c = _a.c, playerProfile = _a.playerProfile;
    // Use real player data from database, fallback to defaults
    var playerData = playerProfile ? {
        username: playerProfile.username,
        elo: playerProfile.elo,
        xp: playerProfile.xp,
        wins: playerProfile.wins,
        loses: playerProfile.loses,
        ultimate_wins: playerProfile.ultimate_wins,
        ultimate_loses: playerProfile.ultimate_loses,
    } : {
        username: (_b = (0, cookie_1.getCookie)(c, "user")) !== null && _b !== void 0 ? _b : "Player",
        elo: 500,
        xp: 0,
        wins: 0,
        loses: 0,
        ultimate_wins: 0,
        ultimate_loses: 0,
    };
    var lvl = computeLevel(playerData.xp);
    var rank = eloRank(playerData.elo);
    var badgeColor = getLevelBadgeColor(lvl.level);
    var winRate = playerData.wins + playerData.loses > 0
        ? Math.round((playerData.wins / (playerData.wins + playerData.loses)) * 100)
        : 0;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-4 h-screen", children: [(0, jsx_runtime_1.jsx)("div", { className: "lg:col-span-1 bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 flex flex-col justify-between", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-white font-[Orbitron] mb-3", children: playerData.username }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-11/12 mb-5 mt-3 mx-auto h-px bg-white/35 my-3 rounded" }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "".concat(badgeColor.bg, " ").concat(badgeColor.text, " px-4 py-2 rounded-md font-bold text-center text-2xl mb-3"), children: ["Level ", lvl.level] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative group", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-2", children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-neutral-300 cursor-help", children: [lvl.xpInCurrentLevel, "/", lvl.xpNeededForNext, " XP"] }), (0, jsx_runtime_1.jsx)("div", { className: "w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600", children: "i" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-48 border border-neutral-700 z-10", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold mb-1 text-blue-400", children: "XP Gains:" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 Win: +15 XP" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 Lose: +5 XP" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 Ultimate Winner: +25 XP" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 Perfect Win (10-0): +50 XP" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: "h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400", style: { width: "".concat(lvl.progress, "%") } }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xl font-bold ".concat(rank.colorKey, " mb-2"), children: rank.name }), (0, jsx_runtime_1.jsxs)("div", { className: "relative group", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-3", children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-m text-neutral-300 cursor-help", children: [playerData.elo, " ELO"] }), (0, jsx_runtime_1.jsx)("div", { className: "w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600", children: "i" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-84 border border-neutral-700 z-10", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold mb-1 text-blue-400", children: "ELO Changes:" }), (0, jsx_runtime_1.jsx)("p", { className: "text-green-400", children: "\u2022 Win: +20 ELO" }), (0, jsx_runtime_1.jsx)("p", { className: "text-red-400", children: "\u2022 Lose: -20 ELO" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 Opponent avg \u00B125 ELO: \u00B11 (max \u00B110)" }), (0, jsx_runtime_1.jsx)("p", { className: "text-green-400", children: "\u2022 Ultimate Winner: 2 ELO from each opponent (total +6) " }), (0, jsx_runtime_1.jsx)("p", { className: "text-red-400", children: "\u2022 Ultimate Loser: 1 ELO to each opponent (total -3)" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: "h-2 rounded-full bg-gradient-to-r ".concat(rank.color), style: { width: "".concat(rank.progress, "%") } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-xs mt-1 text-neutral-400", children: [(0, jsx_runtime_1.jsx)("span", { children: rank.min }), (0, jsx_runtime_1.jsx)("span", { children: rank.max })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-neutral-300", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-blue-400", children: "Total Games:" }), (0, jsx_runtime_1.jsx)("span", { className: "text-blue-400", children: playerData.wins + playerData.loses })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-neutral-300", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-green-400", children: "Wins:" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-green-400", children: [playerData.wins, " (", winRate, "%)"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between ml-4 text-sm text-neutral-400", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-green-400", children: "\u2022 Ultimate Wins" }), (0, jsx_runtime_1.jsx)("span", { className: "text-green-400", children: playerData.ultimate_wins })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-neutral-300", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-red-400", children: "Loses:" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-red-400", children: [playerData.loses, " (", 100 - winRate, "%)"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between ml-4 text-sm text-neutral-400", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-red-400", children: "\u2022 Ultimate Loses" }), (0, jsx_runtime_1.jsx)("span", { className: "text-red-400", children: playerData.ultimate_loses })] })] })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "lg:col-span-2 flex flex-col justify-center items-center gap-6", children: [(0, jsx_runtime_1.jsx)("form", { action: "/v1/match/join", method: "post", className: "w-full max-w-sm", children: (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold text-lg rounded-md transition-all", children: "JOIN MATCH" }) }), (0, jsx_runtime_1.jsx)("a", { href: "/v1/leaderboard", className: "w-full max-w-sm", children: (0, jsx_runtime_1.jsx)("button", { className: "w-full py-4 bg-transparent border-2 border-neutral-700 hover:border-green-500 text-white font-bold text-lg rounded-md transition-all", children: "LEADERBOARDS" }) }), (0, jsx_runtime_1.jsxs)("button", { disabled: true, className: "w-full max-w-sm py-4 bg-neutral-700/40 text-neutral-400 font-bold text-lg rounded-md cursor-not-allowed opacity-60", children: ["\uD83C\uDFC6 TOURNAMENTS", (0, jsx_runtime_1.jsx)("div", { className: "text-xs mt-1", children: "Coming Soon" })] }), (0, jsx_runtime_1.jsxs)("button", { disabled: true, className: "w-full max-w-sm py-4 bg-neutral-700/40 text-neutral-400 font-bold text-lg rounded-md cursor-not-allowed opacity-60", children: ["MATCH HISTORY", (0, jsx_runtime_1.jsx)("div", { className: "text-xs mt-1", children: "Coming Soon" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "lg:col-span-1" })] }), (0, jsx_runtime_1.jsx)("form", { action: "/v1/auth/logout", method: "post", className: "fixed top-4 right-4 z-50", children: (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "px-3 py-2 bg-red-400 hover:bg-red-500 text-white rounded-md font-semibold shadow-sm", children: "Logout" }) })] }));
}
