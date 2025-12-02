"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("hono/jsx/jsx-runtime");
var hono_1 = require("hono");
var bun_1 = require("hono/bun");
var cookie_1 = require("hono/cookie");
var Homepage_1 = require("./pages/Homepage");
var main_1 = require("./layouts/main");
var auth_1 = require("./v1/auth");
var login_1 = require("./v1/login");
var register_1 = require("./v1/register");
var lobby_1 = require("./v1/lobby");
var leaderboard_1 = require("./v1/leaderboard");
var profile_1 = require("./v1/profile");
var match_1 = require("./v1/match");
var matchLobby_1 = require("./v1/matchLobby");
var match_2 = require("./v1/match");
var matchGame_1 = require("./v1/matchGame");
var matchResult_1 = require("./v1/matchResult");
var sdk = require('node-appwrite');
var app = new hono_1.Hono();
app.use("/static/*", (0, bun_1.serveStatic)({ root: "./" }));
app.use(function (c, next) { return __awaiter(void 0, void 0, void 0, function () {
    var user;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!(c.req.path == "/" ||
                    c.req.path == "/v1/auth/login" ||
                    c.req.path == "/v1/auth/register" ||
                    c.req.path == "/v1/auth/logout")) return [3 /*break*/, 2];
                return [4 /*yield*/, next()];
            case 1:
                _b.sent();
                return [2 /*return*/];
            case 2:
                user = (_a = (0, cookie_1.getCookie)(c, "user")) !== null && _a !== void 0 ? _a : "";
                if (!user && c.req.path.startsWith("/v1/")) {
                    return [2 /*return*/, c.redirect("/v1/auth/login")];
                }
                return [4 /*yield*/, next()];
            case 3:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
app.get("/", function (c) {
    return c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(Homepage_1.Homepage, { c: c }) }));
});
// render login page (GET)
app.get("/v1/auth/login", function (c) {
    return c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(login_1.LoginPage, { c: c }) }));
});
// render register page (GET)
app.get("/v1/auth/register", function (c) {
    return c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(register_1.RegisterPage, { c: c }) }));
});
// render lobby page (GET)
app.get("/v1/lobby", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var username, playerData, err_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                username = (_a = (0, cookie_1.getCookie)(c, "user")) !== null && _a !== void 0 ? _a : "Player";
                return [4 /*yield*/, (0, profile_1.getPlayerProfile)(username)];
            case 1:
                playerData = _b.sent();
                return [2 /*return*/, c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(lobby_1.LobbyPage, { c: c, playerProfile: playerData }) }))];
            case 2:
                err_1 = _b.sent();
                console.error("Lobby error:", err_1);
                return [2 /*return*/, c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(lobby_1.LobbyPage, { c: c, playerProfile: null }) }))];
            case 3: return [2 /*return*/];
        }
    });
}); });
// render leaderboard (GET)
app.get("/v1/leaderboard", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var players, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, profile_1.getLeaderboard)(100)];
            case 1:
                players = _a.sent();
                return [2 /*return*/, c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(leaderboard_1.LeaderboardPage, { players: players }) }))];
            case 2:
                err_2 = _a.sent();
                console.error("Leaderboard error:", err_2);
                return [2 /*return*/, c.text("Failed to load leaderboard", 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
/* NEW: Register endpoint
   Expects form data with fields: username, password, (confirmPassword optional)
*/
app.post("/v1/auth/register", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var form, username, password, confirm_1, err_3, msg;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                return [4 /*yield*/, c.req.formData()];
            case 1:
                form = _d.sent();
                username = String((_a = form.get("username")) !== null && _a !== void 0 ? _a : "").trim();
                password = String((_b = form.get("password")) !== null && _b !== void 0 ? _b : "").trim();
                confirm_1 = String((_c = form.get("confirmPassword")) !== null && _c !== void 0 ? _c : "").trim();
                if (!username || username.length < 3) {
                    return [2 /*return*/, c.text("Username must be at least 3 characters", 400)];
                }
                if (!password || password.length < 6) {
                    return [2 /*return*/, c.text("Password must be at least 6 characters", 400)];
                }
                if (password !== confirm_1) {
                    return [2 /*return*/, c.text("Passwords do not match", 400)];
                }
                // create user in Appwrite
                return [4 /*yield*/, (0, auth_1.registerUser)(username, password)];
            case 2:
                // create user in Appwrite
                _d.sent();
                // set a simple cookie and redirect to lobby
                c.res.headers.set("Set-Cookie", "user=".concat(encodeURIComponent(username), "; Path=/; HttpOnly; SameSite=Lax"));
                return [2 /*return*/, c.redirect("/v1/lobby")];
            case 3:
                err_3 = _d.sent();
                console.error("register error:", err_3);
                msg = (err_3 === null || err_3 === void 0 ? void 0 : err_3.message) || "Registration failed";
                return [2 /*return*/, c.text(msg, 500)];
            case 4: return [2 /*return*/];
        }
    });
}); });
/* NEW: Login endpoint
   Expects form data with fields: username, password
*/
app.post("/v1/auth/login", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var form, username, password, err_4;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                return [4 /*yield*/, c.req.formData()];
            case 1:
                form = _c.sent();
                username = String((_a = form.get("username")) !== null && _a !== void 0 ? _a : "").trim();
                password = String((_b = form.get("password")) !== null && _b !== void 0 ? _b : "").trim();
                if (!username || !password) {
                    return [2 /*return*/, c.text("Username and password required", 400)];
                }
                // create session using Appwrite; exception thrown on invalid creds
                return [4 /*yield*/, (0, auth_1.loginUser)(username, password)];
            case 2:
                // create session using Appwrite; exception thrown on invalid creds
                _c.sent();
                // set a cookie and redirect to lobby
                c.res.headers.set("Set-Cookie", "user=".concat(encodeURIComponent(username), "; Path=/; HttpOnly; SameSite=Lax"));
                return [2 /*return*/, c.redirect("/v1/lobby")];
            case 3:
                err_4 = _c.sent();
                console.error("login error:", err_4);
                return [2 /*return*/, c.text("Invalid credentials", 401)];
            case 4: return [2 /*return*/];
        }
    });
}); });
// logout endpoint: clears user cookie and redirects to home
app.post("/v1/auth/logout", function (c) {
    // clear cookie (Set-Cookie with Max-Age=0)
    c.res.headers.set("Set-Cookie", "user=; Path=/; Max-Age=0; HttpOnly");
    c.res.headers.set("HX-Redirect", "/");
    return c.redirect("/");
});
// Join match (create or join existing) and redirect to match lobby
app.post("/v1/match/join", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var username, playingMatch, profile, player, match, err_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                username = (_a = (0, cookie_1.getCookie)(c, "user")) !== null && _a !== void 0 ? _a : null;
                if (!username)
                    return [2 /*return*/, c.redirect("/v1/auth/login")];
                return [4 /*yield*/, (0, match_1.findPlayingMatch)()];
            case 1:
                playingMatch = _b.sent();
                if (playingMatch) {
                    return [2 /*return*/, c.text('A match is already in progress. Please wait for it to finish.', 409)];
                }
                return [4 /*yield*/, (0, profile_1.getPlayerProfile)(username)];
            case 2:
                profile = _b.sent();
                player = {
                    id: profile ? profile.$id : username,
                    username: username,
                    wins: profile ? profile.wins : 0,
                    loses: profile ? profile.loses : 0,
                    elo: profile ? profile.elo : 500,
                };
                return [4 /*yield*/, (0, match_1.findOrCreateAndJoin)(player)];
            case 3:
                match = _b.sent();
                // set match cookie and redirect to match lobby
                c.res.headers.set("Set-Cookie", "match_id=".concat(encodeURIComponent(match.$id), "; Path=/; HttpOnly; SameSite=Lax"));
                return [2 /*return*/, c.redirect("/v1/match/lobby")];
            case 4:
                err_5 = _b.sent();
                console.error("join match error:", err_5);
                return [2 /*return*/, c.text('Failed to join match', 500)];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Match lobby page (GET)
app.get("/v1/match/lobby", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var matchId, username;
    var _a, _b;
    return __generator(this, function (_c) {
        try {
            matchId = (_a = (0, cookie_1.getCookie)(c, "match_id")) !== null && _a !== void 0 ? _a : '';
            username = (_b = (0, cookie_1.getCookie)(c, "user")) !== null && _b !== void 0 ? _b : 'Player';
            if (!matchId)
                return [2 /*return*/, c.redirect("/v1/lobby")];
            return [2 /*return*/, c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(matchLobby_1.MatchLobbyPage, { c: c, matchId: matchId, currentUser: username }) }))];
        }
        catch (err) {
            console.error("match lobby error", err);
            return [2 /*return*/, c.redirect("/v1/lobby")];
        }
        return [2 /*return*/];
    });
}); });
// Match state JSON (polled by client)
app.get("/v1/match/state", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var matchId, match, err_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                matchId = String((_a = c.req.query('matchId')) !== null && _a !== void 0 ? _a : '');
                if (!matchId)
                    return [2 /*return*/, c.json({ error: 'missing matchId' }, 400)];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, match_1.getMatch)(matchId)];
            case 2:
                match = _b.sent();
                if (!match)
                    return [2 /*return*/, c.json({ error: 'not found' }, 404)];
                return [2 /*return*/, c.json(match)];
            case 3:
                err_6 = _b.sent();
                console.error('state error', err_6);
                return [2 /*return*/, c.json({ error: 'failed' }, 500)];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Leave match: remove player from players_json, delete match if empty
app.post("/v1/match/leave", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var matchIdFromCookie, form, matchId, username, profile, playerId, res, err_7;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 4, , 5]);
                matchIdFromCookie = (_a = (0, cookie_1.getCookie)(c, "match_id")) !== null && _a !== void 0 ? _a : "";
                return [4 /*yield*/, c.req.formData()];
            case 1:
                form = _e.sent();
                matchId = String((_c = (_b = form.get("matchId")) !== null && _b !== void 0 ? _b : matchIdFromCookie) !== null && _c !== void 0 ? _c : "");
                username = (_d = (0, cookie_1.getCookie)(c, "user")) !== null && _d !== void 0 ? _d : null;
                if (!matchId)
                    return [2 /*return*/, c.text("missing matchId", 400)];
                if (!username) {
                    // no user — just clear cookie and redirect
                    c.res.headers.set("Set-Cookie", "match_id=; Path=/; Max-Age=0; HttpOnly");
                    return [2 /*return*/, c.redirect("/v1/lobby")];
                }
                return [4 /*yield*/, (0, profile_1.getPlayerProfile)(username)];
            case 2:
                profile = _e.sent();
                playerId = profile ? profile.$id : username;
                return [4 /*yield*/, (0, match_1.leaveMatch)(matchId, playerId)];
            case 3:
                res = _e.sent();
                // clear match cookie
                c.res.headers.set("Set-Cookie", "match_id=; Path=/; Max-Age=0; HttpOnly");
                return [2 /*return*/, c.redirect("/v1/lobby")];
            case 4:
                err_7 = _e.sent();
                console.error("leave match error:", err_7);
                return [2 /*return*/, c.text("Failed to leave match", 500)];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Start match (only host allowed client-side controls this)
app.post("/v1/match/start", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var form, matchId, username, err_8;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                return [4 /*yield*/, c.req.formData()];
            case 1:
                form = _c.sent();
                matchId = String((_a = form.get("matchId")) !== null && _a !== void 0 ? _a : '');
                username = (_b = (0, cookie_1.getCookie)(c, "user")) !== null && _b !== void 0 ? _b : '';
                if (!matchId)
                    return [2 /*return*/, c.text('missing matchId', 400)];
                // start match and initialize scores
                return [4 /*yield*/, (0, match_1.startMatch)(matchId)];
            case 2:
                // start match and initialize scores
                _c.sent();
                return [2 /*return*/, c.redirect("/v1/match/game")];
            case 3:
                err_8 = _c.sent();
                console.error('start error', err_8);
                return [2 /*return*/, c.text('Failed to start', 500)];
            case 4: return [2 /*return*/];
        }
    });
}); });
// render match game page (GET)
app.get("/v1/match/game", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var matchId, match, err_9;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                matchId = (_a = (0, cookie_1.getCookie)(c, "match_id")) !== null && _a !== void 0 ? _a : '';
                if (!matchId)
                    return [2 /*return*/, c.redirect("/v1/lobby")];
                return [4 /*yield*/, (0, match_1.getMatch)(matchId)];
            case 1:
                match = _b.sent();
                if (!match)
                    return [2 /*return*/, c.redirect("/v1/lobby")];
                return [2 /*return*/, c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(matchGame_1.MatchGamePage, { c: c, match: match }) }))];
            case 2:
                err_9 = _b.sent();
                console.error('match game error', err_9);
                return [2 /*return*/, c.redirect("/v1/lobby")];
            case 3: return [2 /*return*/];
        }
    });
}); });
// update score API for match game (server-side enforces bounds)
app.post("/v1/match/game/score", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var form, matchId, index, side, delta, match, scores, s, updated, err_10;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 4, , 5]);
                return [4 /*yield*/, c.req.formData()];
            case 1:
                form = _e.sent();
                matchId = String((_a = form.get("matchId")) !== null && _a !== void 0 ? _a : '');
                index = Number((_b = form.get("index")) !== null && _b !== void 0 ? _b : 0);
                side = String((_c = form.get("side")) !== null && _c !== void 0 ? _c : 'a');
                delta = Number((_d = form.get("delta")) !== null && _d !== void 0 ? _d : 0);
                if (!matchId)
                    return [2 /*return*/, c.json({ error: 'missing matchId' }, 400)];
                return [4 /*yield*/, (0, match_1.getMatch)(matchId)];
            case 2:
                match = _e.sent();
                if (!match)
                    return [2 /*return*/, c.json({ error: 'match not found' }, 404)];
                scores = match.scores || [];
                if (!scores[index])
                    return [2 /*return*/, c.json({ error: 'invalid index' }, 400)];
                s = scores[index];
                if (side === 'a') {
                    s.scoreA = Math.min(10, Math.max(0, (s.scoreA || 0) + delta));
                }
                else {
                    s.scoreB = Math.min(10, Math.max(0, (s.scoreB || 0) + delta));
                }
                return [4 /*yield*/, (0, match_2.updateGameScores)(matchId, scores)];
            case 3:
                updated = _e.sent();
                return [2 /*return*/, c.json({ ok: true, scores: updated.scores })];
            case 4:
                err_10 = _e.sent();
                console.error('update score error', err_10);
                return [2 /*return*/, c.json({ error: 'failed' }, 500)];
            case 5: return [2 /*return*/];
        }
    });
}); });
// helper to get avg elo of a team
function avgElo(p1, p2) {
    var elo1 = (p1 && typeof p1.elo === 'number') ? p1.elo : 500;
    var elo2 = (p2 && typeof p2.elo === 'number') ? p2.elo : 500;
    return Math.round((elo1 + elo2) / 2);
}
// Finish match endpoint: computes results, updates profiles, saves history, renders result
app.post("/v1/match/game/finish", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var endpoint, projectId, apiKey, databaseId, form, matchId, match, scores_1, players_1, byId_1, totalRounds_1, ids, ultimateWinnerId_1, ultimateLoserId_1, historyPlayers, _i, ids_1, id, rec, oldElo, newElo, xpGain, winsAdd, losesAdd, ultimateWinInc, ultimateLoseInc, gamesAdded, profile, e_1, client, databases, historyDoc, e_2, e_3, result, err_11;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
                projectId = process.env.APPWRITE_PROJECT;
                apiKey = process.env.APPWRITE_KEY;
                databaseId = process.env.APPWRITE_DATABASE_ID;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 19, , 20]);
                return [4 /*yield*/, c.req.formData()];
            case 2:
                form = _c.sent();
                matchId = String((_b = (_a = form.get("matchId")) !== null && _a !== void 0 ? _a : c.req.query('matchId')) !== null && _b !== void 0 ? _b : '');
                if (!matchId)
                    return [2 /*return*/, c.text('missing matchId', 400)];
                return [4 /*yield*/, (0, match_1.getMatch)(matchId)];
            case 3:
                match = _c.sent();
                if (!match)
                    return [2 /*return*/, c.text('match not found', 404)];
                scores_1 = match.scores || [];
                players_1 = match.players || [];
                byId_1 = {};
                players_1.forEach(function (p) {
                    byId_1[p.id] = {
                        id: p.id,
                        username: p.username,
                        oldElo: p.elo,
                        newElo: p.elo,
                        xpGained: 0,
                        winsAdded: 0,
                        losesAdded: 0,
                        perfectWins: 0,
                        gamesAdded: 0,
                    };
                });
                // per pairing resolution
                scores_1.forEach(function (s) {
                    var a = s.a || [];
                    var b = s.b || [];
                    var aScore = Number(s.scoreA || 0);
                    var bScore = Number(s.scoreB || 0);
                    // determine winner/loser/tie
                    var winnerSide = null;
                    if (aScore > bScore)
                        winnerSide = 'a';
                    else if (bScore > aScore)
                        winnerSide = 'b';
                    // compute avg elos
                    var a0 = players_1.find(function (x) { return x.id === a[0]; });
                    var a1 = players_1.find(function (x) { return x.id === a[1]; });
                    var b0 = players_1.find(function (x) { return x.id === b[0]; });
                    var b1 = players_1.find(function (x) { return x.id === b[1]; });
                    var avgA = avgElo(a0, a1);
                    var avgB = avgElo(b0, b1);
                    var diff = Math.abs(avgA - avgB);
                    var adj = Math.min(10, Math.floor(diff / 25));
                    if (winnerSide === 'a') {
                        // winners a
                        a.forEach(function (id) {
                            byId_1[id].winsAdded += 1;
                            byId_1[id].xpGained += 15;
                            byId_1[id].newElo += 20;
                            byId_1[id].gamesAdded += 1;
                            if (aScore === 10 && bScore === 0) {
                                byId_1[id].xpGained += 50;
                                byId_1[id].perfectWins += 1;
                            }
                        });
                        b.forEach(function (id) {
                            byId_1[id].losesAdded += 1;
                            byId_1[id].xpGained += 5;
                            byId_1[id].newElo -= 20;
                            byId_1[id].gamesAdded += 1;
                        });
                        // elo adjust by relative strength
                        if (avgA > avgB) {
                            // winners stronger -> penalty
                            a.forEach(function (id) { return byId_1[id].newElo -= adj; });
                            b.forEach(function (id) { return byId_1[id].newElo += adj; });
                        }
                        else if (avgA < avgB) {
                            // winners weaker -> bonus
                            a.forEach(function (id) { return byId_1[id].newElo += adj; });
                            b.forEach(function (id) { return byId_1[id].newElo -= adj; });
                        }
                    }
                    else if (winnerSide === 'b') {
                        b.forEach(function (id) {
                            byId_1[id].winsAdded += 1;
                            byId_1[id].xpGained += 15;
                            byId_1[id].newElo += 20;
                            byId_1[id].gamesAdded += 1;
                            if (bScore === 10 && aScore === 0) {
                                byId_1[id].xpGained += 50;
                                byId_1[id].perfectWins = (byId_1[id].perfectWins || 0) + 1;
                            }
                        });
                        a.forEach(function (id) {
                            byId_1[id].losesAdded += 1;
                            byId_1[id].xpGained += 5;
                            byId_1[id].newElo -= 20;
                            byId_1[id].gamesAdded += 1;
                        });
                        if (avgB > avgA) {
                            b.forEach(function (id) { return byId_1[id].newElo -= adj; });
                            a.forEach(function (id) { return byId_1[id].newElo += adj; });
                        }
                        else if (avgB < avgA) {
                            b.forEach(function (id) { return byId_1[id].newElo += adj; });
                            a.forEach(function (id) { return byId_1[id].newElo -= adj; });
                        }
                    }
                    else {
                        // tie -> treat as no wins/losses (no xp/elo)
                        a.forEach(function (id) { return byId_1[id].gamesAdded += 1; });
                        b.forEach(function (id) { return byId_1[id].gamesAdded += 1; });
                    }
                });
                totalRounds_1 = scores_1.length || 0;
                ids = Object.keys(byId_1);
                ultimateWinnerId_1 = null;
                ultimateLoserId_1 = null;
                ids.forEach(function (id) {
                    if (byId_1[id].winsAdded === totalRounds_1 && totalRounds_1 > 0)
                        ultimateWinnerId_1 = id;
                    if (byId_1[id].losesAdded === totalRounds_1 && totalRounds_1 > 0)
                        ultimateLoserId_1 = id;
                });
                if (ultimateWinnerId_1) {
                    // award ultimate winner
                    ids.forEach(function (id) {
                        if (id === ultimateWinnerId_1) {
                            byId_1[id].xpGained += 25;
                            byId_1[id].newElo += 6;
                        }
                        else {
                            byId_1[id].newElo -= 2;
                        }
                    });
                }
                if (ultimateLoserId_1) {
                    ids.forEach(function (id) {
                        if (id === ultimateLoserId_1) {
                            byId_1[id].newElo -= 3;
                        }
                        else {
                            byId_1[id].newElo += 1;
                        }
                    });
                }
                historyPlayers = [];
                _i = 0, ids_1 = ids;
                _c.label = 4;
            case 4:
                if (!(_i < ids_1.length)) return [3 /*break*/, 12];
                id = ids_1[_i];
                rec = byId_1[id];
                oldElo = rec.oldElo;
                newElo = Math.max(0, Math.round(rec.newElo));
                xpGain = Math.max(0, Math.round(rec.xpGained));
                winsAdd = rec.winsAdded || 0;
                losesAdd = rec.losesAdded || 0;
                ultimateWinInc = (ultimateWinnerId_1 === id) ? 1 : 0;
                ultimateLoseInc = (ultimateLoserId_1 === id) ? 1 : 0;
                gamesAdded = rec.gamesAdded || 0;
                _c.label = 5;
            case 5:
                _c.trys.push([5, 9, , 10]);
                return [4 /*yield*/, (0, profile_1.getPlayerProfile)(id)];
            case 6:
                profile = _c.sent();
                if (!profile) return [3 /*break*/, 8];
                return [4 /*yield*/, (0, profile_1.updatePlayerStats)(profile.$id, {
                        xp: (profile.xp || 0) + xpGain,
                        elo: (profile.elo || 0) + (newElo - oldElo),
                        wins: (profile.wins || 0) + winsAdd,
                        loses: (profile.loses || 0) + losesAdd,
                        ultimate_wins: (profile.ultimate_wins || 0) + ultimateWinInc,
                        ultimate_loses: (profile.ultimate_loses || 0) + ultimateLoseInc,
                    })];
            case 7:
                _c.sent();
                _c.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                e_1 = _c.sent();
                console.error('failed updating profile', id, e_1);
                return [3 /*break*/, 10];
            case 10:
                historyPlayers.push({
                    id: id,
                    username: rec.username,
                    oldElo: oldElo,
                    newElo: newElo,
                    xpGain: xpGain,
                    winsAdd: winsAdd,
                    losesAdd: losesAdd,
                    ultimateWinInc: ultimateWinInc,
                    ultimateLoseInc: ultimateLoseInc,
                    gamesAdded: gamesAdded,
                });
                // for result page
                byId_1[id].oldElo = oldElo;
                byId_1[id].newElo = newElo;
                byId_1[id].xpGained = xpGain;
                _c.label = 11;
            case 11:
                _i++;
                return [3 /*break*/, 4];
            case 12:
                _c.trys.push([12, 14, , 15]);
                if (!projectId || !apiKey || !databaseId)
                    throw new Error('Appwrite not configured for history');
                client = new sdk.Client().setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT).setKey(process.env.APPWRITE_KEY);
                databases = new sdk.Databases(client);
                return [4 /*yield*/, databases.createDocument(databaseId, 'matches_history', 'unique()', {
                        matchId: matchId,
                        players_json: JSON.stringify(historyPlayers), // stringify
                        scores_json: JSON.stringify(scores_1), // stringify
                    })];
            case 13:
                historyDoc = _c.sent();
                return [3 /*break*/, 15];
            case 14:
                e_2 = _c.sent();
                console.error('failed to write match history', e_2);
                return [3 /*break*/, 15];
            case 15:
                _c.trys.push([15, 17, , 18]);
                return [4 /*yield*/, (0, match_1.deleteMatch)(matchId)];
            case 16:
                _c.sent();
                return [3 /*break*/, 18];
            case 17:
                e_3 = _c.sent();
                console.error('failed to delete match after finish', e_3);
                return [3 /*break*/, 18];
            case 18:
                result = {
                    matchId: matchId,
                    players: ids.map(function (id) { return ({
                        id: id,
                        username: byId_1[id].username,
                        oldElo: byId_1[id].oldElo,
                        newElo: byId_1[id].newElo,
                        xpGained: byId_1[id].xpGained,
                        winsAdded: byId_1[id].winsAdded,
                        losesAdded: byId_1[id].losesAdded,
                        gamesAdded: byId_1[id].gamesAdded,
                        // detailed breakdown
                        eloBreakdown: computeEloBreakdown(id, byId_1[id], scores_1, players_1, totalRounds_1, ultimateWinnerId_1, ultimateLoserId_1),
                        xpBreakdown: computeXpBreakdown(id, byId_1[id], scores_1, players_1, totalRounds_1, ultimateWinnerId_1),
                    }); }),
                    scores: scores_1.map(function (s) {
                        var aNames = (s.a || []).map(function (id) {
                            var p = players_1.find(function (x) { return x.id === id; });
                            return p ? p.username : id;
                        });
                        var bNames = (s.b || []).map(function (id) {
                            var p = players_1.find(function (x) { return x.id === id; });
                            return p ? p.username : id;
                        });
                        return {
                            aNames: aNames,
                            bNames: bNames,
                            scoreA: s.scoreA,
                            scoreB: s.scoreB,
                        };
                    }),
                };
                return [2 /*return*/, c.html((0, jsx_runtime_1.jsx)(main_1.MainLayout, { c: c, children: (0, jsx_runtime_1.jsx)(matchResult_1.MatchResultPage, { c: c, result: result }) }))];
            case 19:
                err_11 = _c.sent();
                console.error('finish match error', err_11);
                return [2 /*return*/, c.text('Failed to finish match', 500)];
            case 20: return [2 /*return*/];
        }
    });
}); });
// helper functions for detailed breakdowns
function computeEloBreakdown(playerId, rec, scores, players, totalRounds, ultimateWinnerId, ultimateLoserId) {
    var breakdown = [];
    var total = 0;
    scores.forEach(function (s, idx) {
        var a = s.a || [];
        var b = s.b || [];
        var aScore = Number(s.scoreA || 0);
        var bScore = Number(s.scoreB || 0);
        var isWinner = false;
        var isLoser = false;
        var delta = 0;
        if (aScore > bScore) {
            isWinner = a.includes(playerId);
            isLoser = b.includes(playerId);
        }
        else if (bScore > aScore) {
            isWinner = b.includes(playerId);
            isLoser = a.includes(playerId);
        }
        var a0 = players.find(function (x) { return x.id === a[0]; });
        var a1 = players.find(function (x) { return x.id === a[1]; });
        var b0 = players.find(function (x) { return x.id === b[0]; });
        var b1 = players.find(function (x) { return x.id === b[1]; });
        var avgWinner = avgElo(isWinner ? a0 : b0, isWinner ? a1 : b1);
        var avgLoser = avgElo(isLoser ? a0 : b0, isLoser ? a1 : b1);
        var diff = Math.abs(avgWinner - avgLoser);
        var adj = Math.min(10, Math.floor(diff / 25));
        if (isWinner) {
            delta = 20;
            breakdown.push({ match: idx + 1, reason: "Won match ".concat(idx + 1), delta: delta });
            total += delta;
            // strength adjustment
            if (avgWinner > avgLoser) {
                breakdown.push({ match: idx + 1, reason: "Stronger team penalty", delta: -adj });
                total -= adj;
            }
            else if (avgWinner < avgLoser) {
                breakdown.push({ match: idx + 1, reason: "Weaker team bonus", delta: adj });
                total += adj;
            }
        }
        else if (isLoser) {
            delta = -20;
            breakdown.push({ match: idx + 1, reason: "Lost match ".concat(idx + 1), delta: delta });
            total += delta;
            // strength adjustment
            if (avgWinner > avgLoser) {
                breakdown.push({ match: idx + 1, reason: "Weaker team bonus", delta: +adj });
                total += adj;
            }
            else if (avgWinner < avgLoser) {
                breakdown.push({ match: idx + 1, reason: "Stronger team penalty", delta: -adj });
                total -= adj;
            }
        }
    });
    if (ultimateWinnerId === playerId) {
        breakdown.push({ match: null, reason: "Ultimate winner bonus", delta: 6 });
        total += 6;
    }
    else if (ultimateWinnerId && playerId !== ultimateWinnerId) {
        breakdown.push({ match: null, reason: "Ultimate winner penalty", delta: -2 });
        total -= 2;
    }
    if (ultimateLoserId === playerId) {
        breakdown.push({ match: null, reason: "Ultimate loser penalty", delta: -3 });
        total -= 3;
    }
    else if (ultimateLoserId && playerId !== ultimateLoserId) {
        breakdown.push({ match: null, reason: "Ultimate loser bonus", delta: 1 });
        total += 1;
    }
    return { breakdown: breakdown, total: total };
}
function computeXpBreakdown(playerId, rec, scores, players, totalRounds, ultimateWinnerId) {
    var breakdown = [];
    var total = 0;
    scores.forEach(function (s, idx) {
        var a = s.a || [];
        var b = s.b || [];
        var aScore = Number(s.scoreA || 0);
        var bScore = Number(s.scoreB || 0);
        var isWinner = false;
        var isLoser = false;
        if (aScore > bScore) {
            isWinner = a.includes(playerId);
            isLoser = b.includes(playerId);
        }
        else if (bScore > aScore) {
            isWinner = b.includes(playerId);
            isLoser = a.includes(playerId);
        }
        if (isWinner) {
            breakdown.push({ match: idx + 1, reason: "Won match ".concat(idx + 1), delta: 15 });
            total += 15;
            if (aScore === 10 && bScore === 0) {
                breakdown.push({ match: idx + 1, reason: "Perfect win (10-0)", delta: 50 });
                total += 50;
            }
            else if (bScore === 10 && aScore === 0) {
                breakdown.push({ match: idx + 1, reason: "Perfect win (10-0)", delta: 50 });
                total += 50;
            }
        }
        else if (isLoser) {
            breakdown.push({ match: idx + 1, reason: "Lost match ".concat(idx + 1), delta: 5 });
            total += 5;
        }
    });
    if (ultimateWinnerId === playerId) {
        breakdown.push({ match: null, reason: "Ultimate winner bonus", delta: 25 });
        total += 25;
    }
    return { breakdown: breakdown, total: total };
}
exports.default = app;
