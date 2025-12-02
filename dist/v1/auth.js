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
exports.registerUser = registerUser;
exports.loginUser = loginUser;
var sdk = require('node-appwrite');
var profile_1 = require("./profile");
var endpoint = process.env.APPWRITE_ENDPOINT;
var projectId = process.env.APPWRITE_PROJECT;
var apiKey = process.env.APPWRITE_KEY;
if (!projectId || !apiKey) {
    console.warn('⚠️ Missing APPWRITE_PROJECT or APPWRITE_KEY env vars');
}
function registerUser(username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var client, users, email, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!projectId || !apiKey) {
                        throw new Error('Appwrite credentials not configured');
                    }
                    client = new sdk.Client()
                        .setEndpoint(endpoint)
                        .setProject(projectId)
                        .setKey(apiKey);
                    users = new sdk.Users(client);
                    email = "".concat(username, "@local.example");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, users.create('unique()', email, null, password, username)];
                case 2:
                    result = _a.sent();
                    console.log('User created:', result.$id);
                    // Create player profile in database
                    return [4 /*yield*/, (0, profile_1.createPlayerProfile)(result.$id, username)];
                case 3:
                    // Create player profile in database
                    _a.sent();
                    return [2 /*return*/, result];
                case 4:
                    err_1 = _a.sent();
                    console.error('Appwrite create error:', err_1);
                    throw new Error((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || 'Failed to create user');
                case 5: return [2 /*return*/];
            }
        });
    });
}
function loginUser(username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var client, account, email, session, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!projectId || !apiKey) {
                        throw new Error('Appwrite credentials not configured');
                    }
                    client = new sdk.Client()
                        .setEndpoint(endpoint)
                        .setProject(projectId)
                        .setKey(apiKey);
                    account = new sdk.Account(client);
                    email = "".concat(username, "@local.example");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, account.createEmailPasswordSession(email, password)];
                case 2:
                    session = _a.sent();
                    console.log('Session created:', session.$id);
                    return [2 /*return*/, session];
                case 3:
                    err_2 = _a.sent();
                    console.error('Appwrite login error:', err_2);
                    throw new Error('Invalid username or password');
                case 4: return [2 /*return*/];
            }
        });
    });
}
