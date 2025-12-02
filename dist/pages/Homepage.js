"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Homepage = Homepage;
var jsx_runtime_1 = require("hono/jsx/jsx-runtime");
require("../styles/Homepage.css");
function Homepage(_a) {
    var c = _a.c;
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-md", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-center mb-8", children: (0, jsx_runtime_1.jsx)("h1", { className: "text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2 font-[Orbitron]", children: "MASTER F TOOL" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-3 mb-6", children: [(0, jsx_runtime_1.jsx)("a", { href: "/v1/auth/login", className: "flex-1", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-md transition-all duration-200 font-[Orbitron]", children: "LOGIN" }) }), (0, jsx_runtime_1.jsx)("a", { href: "/v1/auth/register", className: "flex-1", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "w-full px-4 py-2 bg-transparent hover:bg-neutral-800 text-white font-bold rounded-md border border-neutral-700 transition-all duration-200 font-[Orbitron]", children: "REGISTER" }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-center mt-6", children: (0, jsx_runtime_1.jsx)("p", { className: "text-neutral-500 text-sm font-[Exo_2]", children: "Rise to the top of table football glory!" }) })] }) }));
}
