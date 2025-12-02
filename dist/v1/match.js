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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOpenMatch = findOpenMatch;
exports.createMatch = createMatch;
exports.getMatch = getMatch;
exports.joinMatch = joinMatch;
exports.findOrCreateAndJoin = findOrCreateAndJoin;
exports.startMatch = startMatch;
exports.updateGameScores = updateGameScores;
exports.leaveMatch = leaveMatch;
exports.findPlayingMatch = findPlayingMatch;
exports.deleteMatch = deleteMatch;
var sdk = require('node-appwrite');
var endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
var projectId = process.env.APPWRITE_PROJECT;
var apiKey = process.env.APPWRITE_KEY;
var databaseId = process.env.APPWRITE_DATABASE_ID;
var collectionId = 'matches';
if (!projectId || !apiKey) {
    console.warn('⚠️ Missing APPWRITE_PROJECT or APPWRITE_KEY env vars for match logic');
}
function client() {
    if (!projectId || !apiKey || !databaseId)
        throw new Error('Appwrite credentials/database not configured');
    return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}
function parseDoc(raw) {
    var _a, _b, _c, _d, _e;
    var playersJson = (_b = (_a = raw.players_json) !== null && _a !== void 0 ? _a : raw.players) !== null && _b !== void 0 ? _b : '[]';
    var scoresJsonRaw = (_c = raw.scores_json) !== null && _c !== void 0 ? _c : '[]';
    var players = [];
    var scores = [];
    try {
        // players_json is always a string
        if (typeof playersJson === 'string') {
            players = JSON.parse(playersJson || '[]');
        }
        else {
            players = playersJson;
        }
    }
    catch (e) {
        console.warn('Failed to parse players_json', e);
        players = [];
    }
    try {
        // scores_json is always a string
        if (typeof scoresJsonRaw === 'string') {
            scores = JSON.parse(scoresJsonRaw || '[]');
        }
        else {
            scores = scoresJsonRaw;
        }
    }
    catch (e) {
        console.warn('Failed to parse scores_json', e);
        scores = [];
    }
    return {
        $id: raw.$id,
        state: raw.state,
        players: players,
        maxPlayers: (_d = raw.maxPlayers) !== null && _d !== void 0 ? _d : 4,
        createdAt: (_e = raw.$createdAt) !== null && _e !== void 0 ? _e : raw.createdAt,
        scores: scores,
    };
}
function findOpenMatch() {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, databases.listDocuments(databaseId, collectionId, [
                            sdk.Query.equal('state', 'open'),
                            sdk.Query.limit(1),
                        ])];
                case 2:
                    res = _a.sent();
                    if (res.documents && res.documents.length)
                        return [2 /*return*/, parseDoc(res.documents[0])];
                    return [2 /*return*/, null];
                case 3:
                    err_1 = _a.sent();
                    console.error('findOpenMatch error', err_1);
                    throw err_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function createMatch(creator_1) {
    return __awaiter(this, arguments, void 0, function (creator, maxPlayers) {
        var c, databases, doc, err_2;
        if (maxPlayers === void 0) { maxPlayers = 4; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, databases.createDocument(databaseId, collectionId, 'unique()', {
                            state: maxPlayers === 1 ? 'full' : 'open',
                            players_json: JSON.stringify([creator]),
                            maxPlayers: maxPlayers,
                        })];
                case 2:
                    doc = _a.sent();
                    return [2 /*return*/, parseDoc(doc)];
                case 3:
                    err_2 = _a.sent();
                    console.error('createMatch error', err_2);
                    throw err_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getMatch(matchId) {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, doc, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, databases.getDocument(databaseId, collectionId, matchId)];
                case 2:
                    doc = _a.sent();
                    return [2 /*return*/, parseDoc(doc)];
                case 3:
                    err_3 = _a.sent();
                    console.error('getMatch error', err_3);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function joinMatch(matchId, player) {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, doc, exists, players, newState, updated, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    return [4 /*yield*/, getMatch(matchId)];
                case 1:
                    doc = _a.sent();
                    if (!doc)
                        throw new Error('Match not found');
                    if (doc.state === 'playing' || doc.state === 'full')
                        throw new Error('Match not joinable');
                    exists = (doc.players || []).some(function (p) { return p.id === player.id; });
                    if (exists)
                        return [2 /*return*/, doc];
                    players = __spreadArray(__spreadArray([], (doc.players || []), true), [player], false);
                    newState = players.length >= (doc.maxPlayers || 4) ? 'full' : 'open';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, databases.updateDocument(databaseId, collectionId, matchId, {
                            players_json: JSON.stringify(players),
                            state: newState,
                        })];
                case 3:
                    updated = _a.sent();
                    return [2 /*return*/, parseDoc(updated)];
                case 4:
                    err_4 = _a.sent();
                    console.error('joinMatch update error', err_4);
                    throw err_4;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function findOrCreateAndJoin(player) {
    return __awaiter(this, void 0, void 0, function () {
        var open, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, findOpenMatch()];
                case 1:
                    open = _a.sent();
                    if (!open) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, joinMatch(open.$id, player)];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    err_5 = _a.sent();
                    // race condition or full -> create new
                    console.warn('join existing failed, creating new', err_5);
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, createMatch(player, 4)];
                case 6: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function createInitialScoresForPlayers(players) {
    // expects up to 4 players
    // pairings: (0,1)-(2,3), (0,2)-(1,3), (0,3)-(1,2)
    var ids = players.map(function (p) { return p.id; });
    var pairings = [];
    // only create pairings when exactly 4 players, otherwise create best-effort
    if (ids.length >= 4) {
        pairings.push({ a: [ids[0], ids[1]], b: [ids[2], ids[3]], scoreA: 0, scoreB: 0 });
        pairings.push({ a: [ids[0], ids[2]], b: [ids[1], ids[3]], scoreA: 0, scoreB: 0 });
        pairings.push({ a: [ids[0], ids[3]], b: [ids[1], ids[2]], scoreA: 0, scoreB: 0 });
    }
    else {
        // fallback: create a single pairing using available players (duplicates allowed)
        var a = ids.slice(0, Math.ceil(ids.length / 2));
        var b = ids.slice(Math.ceil(ids.length / 2));
        pairings.push({ a: a, b: b, scoreA: 0, scoreB: 0 });
    }
    return pairings;
}
function startMatch(matchId) {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, raw, parsed, scores, updated, err_6;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, databases.getDocument(databaseId, collectionId, matchId)];
                case 2:
                    raw = _b.sent();
                    parsed = parseDoc(raw);
                    scores = (_a = parsed.scores) !== null && _a !== void 0 ? _a : [];
                    if (!scores || scores.length === 0) {
                        // initialize scores based on current players
                        scores = createInitialScoresForPlayers(parsed.players);
                    }
                    return [4 /*yield*/, databases.updateDocument(databaseId, collectionId, matchId, {
                            state: 'playing',
                            scores_json: JSON.stringify(scores), // explicitly stringify
                        })];
                case 3:
                    updated = _b.sent();
                    return [2 /*return*/, parseDoc(updated)];
                case 4:
                    err_6 = _b.sent();
                    console.error('startMatch error', err_6);
                    throw err_6;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function updateGameScores(matchId, scores) {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, updated, err_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, databases.updateDocument(databaseId, collectionId, matchId, {
                            scores_json: JSON.stringify(scores), // explicitly stringify
                        })];
                case 2:
                    updated = _a.sent();
                    return [2 /*return*/, parseDoc(updated)];
                case 3:
                    err_7 = _a.sent();
                    console.error('updateGameScores error', err_7);
                    throw err_7;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Remove a player from a match. If no players remain, delete the match document.
 * Returns the updated MatchDoc, or null if the match was deleted.
 */
function leaveMatch(matchId, playerId) {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, doc, players, err_8, newState, updated, err_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    return [4 /*yield*/, getMatch(matchId)];
                case 1:
                    doc = _a.sent();
                    if (!doc)
                        throw new Error('Match not found');
                    players = (doc.players || []).filter(function (p) { return p.id !== playerId; });
                    if (!(players.length === 0)) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, databases.deleteDocument(databaseId, collectionId, matchId)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, null];
                case 4:
                    err_8 = _a.sent();
                    console.error('deleteMatch error', err_8);
                    throw err_8;
                case 5:
                    newState = players.length >= (doc.maxPlayers || 4) ? 'full' : 'open';
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, databases.updateDocument(databaseId, collectionId, matchId, {
                            players_json: JSON.stringify(players),
                            state: newState,
                        })];
                case 7:
                    updated = _a.sent();
                    return [2 /*return*/, parseDoc(updated)];
                case 8:
                    err_9 = _a.sent();
                    console.error('leaveMatch update error', err_9);
                    throw err_9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
function findPlayingMatch() {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, res, err_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, databases.listDocuments(databaseId, collectionId, [
                            sdk.Query.equal('state', 'playing'),
                            sdk.Query.limit(1),
                        ])];
                case 2:
                    res = _a.sent();
                    if (res.documents && res.documents.length)
                        return [2 /*return*/, parseDoc(res.documents[0])];
                    return [2 /*return*/, null];
                case 3:
                    err_10 = _a.sent();
                    console.error('findPlayingMatch error', err_10);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** deleteMatch utility (explicit delete) */
function deleteMatch(matchId) {
    return __awaiter(this, void 0, void 0, function () {
        var c, databases, err_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = client();
                    databases = new sdk.Databases(c);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, databases.deleteDocument(databaseId, collectionId, matchId)];
                case 2:
                    _a.sent();
                    console.log('Match deleted:', matchId);
                    return [3 /*break*/, 4];
                case 3:
                    err_11 = _a.sent();
                    console.error('deleteMatch error', err_11);
                    throw err_11;
                case 4: return [2 /*return*/];
            }
        });
    });
}
