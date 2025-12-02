"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardPage = LeaderboardPage;
var jsx_runtime_1 = require("hono/jsx/jsx-runtime");
require("../styles/Homepage.css");
function LeaderboardPage(_a) {
    var players = _a.players;
    function eloColor(elo) {
        if (elo >= 5000)
            return "text-red-500";
        if (elo >= 4000)
            return "text-indigo-500";
        if (elo >= 3000)
            return "text-sky-500";
        if (elo >= 2000)
            return "text-amber-500";
        if (elo >= 1000)
            return "text-gray-400";
        return "text-yellow-600"; // Bronze
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-8", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-5xl font-bold text-white font-[Orbitron] mb-2", children: "Leaderboard" }), (0, jsx_runtime_1.jsx)("p", { className: "text-neutral-400", children: "Top players by ELO rating" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-7 gap-4 px-6 py-4 bg-neutral-800/50 font-bold text-neutral-200 text-sm", children: [(0, jsx_runtime_1.jsx)("div", { children: "Rank" }), (0, jsx_runtime_1.jsx)("div", { children: "Player" }), (0, jsx_runtime_1.jsx)("div", { children: "ELO" }), (0, jsx_runtime_1.jsx)("div", { children: "Wins" }), (0, jsx_runtime_1.jsx)("div", { children: "Loses" }), (0, jsx_runtime_1.jsx)("div", { children: "Ultimate Wins" }), (0, jsx_runtime_1.jsx)("div", { children: "Ultimate Loses" })] }), (0, jsx_runtime_1.jsx)("div", { className: "divide-y divide-neutral-800", children: players.map(function (player, idx) { return ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-7 gap-4 px-6 py-4 text-neutral-300 hover:bg-neutral-800/30 transition-colors", children: [(0, jsx_runtime_1.jsxs)("div", { className: "font-bold text-lg", children: ["#", idx + 1] }), (0, jsx_runtime_1.jsx)("div", { className: "text-white font-semibold", children: player.username }), (0, jsx_runtime_1.jsx)("div", { className: "font-bold ".concat(eloColor(player.elo)), children: player.elo }), (0, jsx_runtime_1.jsx)("div", { className: "text-green-400", children: player.wins }), (0, jsx_runtime_1.jsx)("div", { className: "text-red-400", children: player.loses }), (0, jsx_runtime_1.jsx)("div", { className: "text-green-400", children: player.ultimate_wins }), (0, jsx_runtime_1.jsx)("div", { className: "text-red-400", children: player.ultimate_loses })] }, player.$id)); }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-6", children: (0, jsx_runtime_1.jsx)("a", { href: "/v1/lobby", children: (0, jsx_runtime_1.jsx)("button", { className: "px-6 py-2 bg-neutral-800/60 hover:bg-neutral-800 text-white rounded-md", children: "\u2190 Back to Lobby" }) }) })] }) }));
}
