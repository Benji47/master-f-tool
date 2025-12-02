"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameContext = void 0;
exports.GameContextProvider = GameContextProvider;
exports.MainLayout = MainLayout;
var jsx_runtime_1 = require("hono/jsx/jsx-runtime");
var jsx_1 = require("hono/jsx");
exports.GameContext = (0, jsx_1.createContext)(null);
function GameContextProvider(_a) {
    var children = _a.children;
    return ((0, jsx_runtime_1.jsx)(exports.GameContext.Provider, { value: null, children: children }));
}
function MainLayout(_a) {
    var children = _a.children, c = _a.c;
    return ((0, jsx_runtime_1.jsxs)("html", { children: [(0, jsx_runtime_1.jsxs)("head", { children: [(0, jsx_runtime_1.jsx)("title", { children: "Master F Tool" }), (0, jsx_runtime_1.jsx)("meta", { name: "theme-color", content: "#0a0a0a" }), (0, jsx_runtime_1.jsx)("meta", { name: "msapplication-navbutton-color", content: "#0a0a0a" }), (0, jsx_runtime_1.jsx)("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }), (0, jsx_runtime_1.jsx)("meta", { charset: "utf-8" }), (0, jsx_runtime_1.jsx)("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }), (0, jsx_runtime_1.jsx)("script", { src: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" }), (0, jsx_runtime_1.jsx)("script", { src: "https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js", integrity: "sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz", crossorigin: "anonymous" }), (0, jsx_runtime_1.jsx)("link", { href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600;700&display=swap", rel: "stylesheet" }), (0, jsx_runtime_1.jsx)("link", { rel: "stylesheet", href: "/static/style.css" })] }), (0, jsx_runtime_1.jsx)("body", { class: "m-0 p-0 min-h-screen bg-neutral-950", children: (0, jsx_runtime_1.jsx)(GameContextProvider, { children: children }) })] }));
}
