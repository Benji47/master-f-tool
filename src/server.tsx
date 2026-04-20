import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { Homepage } from "./pages/auth/homepage";
import { BlackGardenPage } from "./pages/fun/blackGarden";
import { MainLayout } from "./main";
import { listAllUsersForAdmin, loginUser, registerUser, resetUserPasswordById } from "./logic/auth";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { AdminLoginPage } from "./pages/auth/adminLogin";
import { LobbyPage } from "./pages/menu/lobby";
import { LeaderboardPage } from "./pages/menu/leaderboard";
import { GraphsPage } from "./pages/menu/graphs";
import { ShopPage } from "./pages/menu/shop";
import { getAllPlayerProfiles, getGlobalStats, getPlayerProfile, updateGlobalStats, updatePlayerStats, selectBadge } from "./logic/profile";
import { purchaseItem, getUserOrders, SHOP_ITEMS } from "./logic/shop";
import { getAllPlayersEloHistory, getAllPlayersXPHistory, getAllPlayersVyrazeckaHistory, getAllPlayersGamesHistory } from "./logic/graphs";
import { findOrCreateAndJoin, getMatch, startMatch, MatchDoc, MatchPlayer, leaveMatch, findPlayingMatch, deleteMatch, finishMatch, parseDoc, parseMatchHistoryDoc, MatchHistoryDoc, HistoryPlayers, createMatch, joinMatch, listAvailableMatches } from "./logic/match";
import { MatchLobbyPage } from "./pages/match/matchLobby";
import { updateGameScores } from "./logic/match";
import { MatchGamePage } from "./pages/match/matchGame";
import { MatchResultPage } from "./pages/match/matchResult";
import { findCurrentMatch } from "./logic/match";
import { MatchHistoryPage } from "./pages/menu/matchHistory";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { FBetPage } from "./pages/menu/f-bet";
import { TournamentsPage } from "./pages/tournaments/tournaments";
import { CreateTournamentPage } from "./pages/tournaments/create";
import { TournamentDetailPage } from "./pages/tournaments/detail";
import { TournamentBracketPage } from "./pages/tournaments/bracket";
import { TournamentMatchPage } from "./pages/tournaments/match";
import { TournamentResultsPage } from "./pages/tournaments/results";
import { CreateTeamPage } from "./pages/tournaments/createTeam";
import { JoinTeamPage } from "./pages/tournaments/joinTeam";
import { AdminPasswordResetPage } from "./pages/admin/passwordReset";
import { AdminContentManagerPage } from "./pages/admin/contentManager";
import { AdminContentEditorPage } from "./pages/admin/contentEditor";
import { ChangesLogPage } from "./pages/menu/changesLog";
import { FAQPage } from "./pages/menu/faq";
import { 
  getSiteContent, 
  updateSiteContent, 
  getAllSiteContent,
  parseMatchRules, 
  parseTextContent,
  serializeMatchRules, 
  getDefaultContent,
  getContentSection,
  CONTENT_SECTIONS,
  DEFAULT_MATCH_RULES, 
  MatchRule,
  ContentSection 
} from "./logic/siteContent";
import { HallOfFamePage } from "./pages/menu/hallOfFame";
import { FeatureRequestsPage } from "./pages/menu/featureRequests";
import { listFeatureRequests, createFeatureRequest, updateFeatureRequest, deleteFeatureRequest, toggleUpvote, setRequestStatus, toggleFlag } from "./logic/featureRequests";
import { recordAchievement } from "./logic/dailyAchievements";
import { updateAchievementProgressAndUnlock, claimAchievementReward, getAllAchievementsForPlayer, getPlayerAchievements, unlockAchievement } from "./logic/achievements";
import { computeLevel, getRankInfoFromElo } from "./static/data";
import { placeBet, getAllBets, getAllBetsPaginated, getBetsForMatch, getBetsForPlayerPaginated, resolveBets, getRoundOdds, getTotalGoalsOdds, getVyrazackaOutcomeOdds, VyrazackaOutcome } from "./logic/betting";
import { spin, getSpinState, getSpinStats, getNextResetIso, RESET_HOUR, SPIN_PRIZES, FREE_SPINS_PER_DAY } from "./logic/freeSpins";
import { aggregateSeasonStats, buildEmptySeasonPlayer, filterMatchesForSeason, getAvailableSeasonIndexes, getCurrentSeasonIndex, getScopeFromQuery, getSeasonLabel, getSeasonWindow, StatsScope } from "./logic/season";
import { buildFromMatchHistory, appendMatch, getComputedStats, isReady as computedStatsReady } from "./logic/computedStats";
import { loadAllIntoMemory, getProfileFromMemory, getAllProfilesFromMemory, getGlobalStatsFromMemory, updateProfileInMemory, updateGlobalStatsInMemory, refreshProfileFromDb, isMemoryReady } from "./logic/memoryStore";
import { 
  createTournament, 
  getTournament, 
  updateTournamentStatus, 
  createTeam, 
  joinTeam, 
  leaveTournamentTeam,
  getTournamentTeams, 
  generateDoubleEliminationBracket, 
  createBracketMatches, 
  getTournamentMatches, 
  getMatch as getTournamentMatch,
  getTeam,
  updateMatchState,
  createTournamentResult,
  getTournamentResults,
  listTournaments
} from "./logic/tournament";

const sdk = require('node-appwrite');
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME ?? "admin").trim();
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const SEASON_STATE_FILE = "./.season-state.json";
const MAX_TIMEOUT_MS = 2_147_000_000;
const MAX_COIN_TRANSFER_MESSAGES = 15;

let seasonRolloverInProgress = false;
let seasonRolloverTimer: Timer | null = null;

type CoinTransferMessage = {
  from: string;
  amount: number;
  text: string;
  createdAt: string;
};

async function getAllPlayerProfilesCached(forceRefresh: boolean = false) {
  if (isMemoryReady() && !forceRefresh) return getAllProfilesFromMemory();
  return getAllPlayerProfiles();
}

function getPlayerProfileFast(id: string) {
  if (isMemoryReady()) {
    const mem = getProfileFromMemory(id);
    if (mem) return Promise.resolve(mem);
  }
  return getPlayerProfile(id);
}

function getGlobalStatsFast() {
  if (isMemoryReady()) {
    const mem = getGlobalStatsFromMemory();
    if (mem) return Promise.resolve(mem);
  }
  return getGlobalStats();
}

// Wrapper that updates memory after DB write
async function updatePlayerStatsAndMemory(userId: string, updates: any) {
  const result = await updatePlayerStats(userId, updates);
  updateProfileInMemory(result);
  return result;
}

async function updateGlobalStatsAndMemory(updates: any) {
  const result = await updateGlobalStats(updates);
  updateGlobalStatsInMemory(result);
  return result;
}

function invalidateMatchHistoryCache() {
  // no-op: caching removed
}

async function appendCoinTransferMessage(
  recipientUserId: string,
  senderUsername: string,
  amount: number,
  messageText: string
): Promise<void> {
  try {
    const client = new sdk.Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT)
      .setKey(process.env.APPWRITE_KEY);
    const users = new sdk.Users(client);

    const user = await users.get(recipientUserId);
    const prefs = (user?.prefs && typeof user.prefs === 'object') ? user.prefs : {};
    const existing = Array.isArray((prefs as any).coinTransferMessages) ? (prefs as any).coinTransferMessages : [];
    const nextMessages: CoinTransferMessage[] = [
      ...existing,
      {
        from: senderUsername,
        amount,
        text: messageText,
        createdAt: new Date().toISOString(),
      },
    ].slice(-MAX_COIN_TRANSFER_MESSAGES);

    await users.updatePrefs(recipientUserId, {
      ...prefs,
      coinTransferMessages: nextMessages,
    });
  } catch (error) {
    console.error('appendCoinTransferMessage error:', error);
  }
}

async function consumeCoinTransferMessages(userId: string): Promise<CoinTransferMessage[]> {
  try {
    const client = new sdk.Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT)
      .setKey(process.env.APPWRITE_KEY);
    const users = new sdk.Users(client);

    const user = await users.get(userId);
    const prefs = (user?.prefs && typeof user.prefs === 'object') ? user.prefs : {};
    const messages: CoinTransferMessage[] = Array.isArray((prefs as any).coinTransferMessages)
      ? (prefs as any).coinTransferMessages
      : [];

    if (messages.length > 0) {
      await users.updatePrefs(userId, {
        ...prefs,
        coinTransferMessages: [],
      });
    }

    return messages;
  } catch (error) {
    console.error('consumeCoinTransferMessages error:', error);
    return [];
  }
}

function applyEloSeasonReset(elo: number): number {
  const mapRange = (
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
  ): number => {
    if (inMax === inMin) return outMin;
    const clamped = Math.min(inMax, Math.max(inMin, value));
    const ratio = (clamped - inMin) / (inMax - inMin);
    return outMin + ratio * (outMax - outMin);
  };

  if (elo < 0) return Math.round(mapRange(elo, -1000, 0, 325, 375));
  if (elo <= 200) return Math.round(mapRange(elo, 0, 200, 375, 425));
  if (elo <= 400) return Math.round(mapRange(elo, 200, 400, 425, 475));
  if (elo <= 600) return Math.round(mapRange(elo, 400, 600, 475, 525));
  if (elo <= 800) return Math.round(mapRange(elo, 600, 800, 525, 575));
  if (elo <= 1000) return Math.round(mapRange(elo, 800, 1000, 575, 625));
  if (elo <= 1200) return Math.round(mapRange(elo, 1000, 1200, 625, 675));
  if (elo <= 2000) return Math.round(mapRange(elo, 1200, 2200, 675, 750));

  return 750;
}

function readLastProcessedSeason(): number {
  try {
    if (!existsSync(SEASON_STATE_FILE)) return 0;
    const raw = readFileSync(SEASON_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const value = Number(parsed?.lastProcessedSeason ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch {
    return 0;
  }
}

function writeLastProcessedSeason(season: number): void {
  try {
    writeFileSync(SEASON_STATE_FILE, JSON.stringify({ lastProcessedSeason: season }, null, 2), "utf-8");
  } catch (error) {
    console.error("failed writing season state", error);
  }
}

async function applySeasonRolloverIfNeeded(): Promise<void> {
  return;
  if (seasonRolloverInProgress) return;

  const currentSeason = getCurrentSeasonIndex();
  const lastProcessed = readLastProcessedSeason();

  if (currentSeason <= lastProcessed) return;

  seasonRolloverInProgress = true;
  try {
    for (let season = lastProcessed + 1; season <= currentSeason; season++) {
      if (season <= 0) continue;

      const players = await getAllPlayerProfilesCached();
      for (const player of players) {
        const shrunkElo = applyEloSeasonReset(player.elo || 500);
        if (shrunkElo !== (player.elo || 0)) {
          try {
            await updatePlayerStatsAndMemory(player.$id, { elo: shrunkElo });
          } catch (error) {
            console.error("failed to shrink elo for player", player.$id, error);
          }
        }
      }

      writeLastProcessedSeason(season);
      console.log(`season rollover applied for season ${season} using tiered soft reset`);
    }
  } finally {
    seasonRolloverInProgress = false;
  }
}

function scheduleSeasonRolloverTimer(): void {
  if (seasonRolloverTimer) {
    clearTimeout(seasonRolloverTimer);
    seasonRolloverTimer = null;
  }

  const now = Date.now();
  const currentSeason = getCurrentSeasonIndex(new Date(now));
  const nextBoundary = getSeasonWindow(currentSeason).end.getTime();
  let delay = nextBoundary - now + 1000;

  if (!Number.isFinite(delay) || delay < 1000) delay = 1000;
  if (delay > MAX_TIMEOUT_MS) delay = MAX_TIMEOUT_MS;

  seasonRolloverTimer = setTimeout(async () => {
    try {
      await applySeasonRolloverIfNeeded();
    } catch (error) {
      console.error("season rollover timer error", error);
    } finally {
      scheduleSeasonRolloverTimer();
    }
  }, delay);
}

function buildUserCookie(username: string): string {
  const encoded = encodeURIComponent(username);
  return `user=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

function isAdminUsername(username: string): boolean {
  return username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase();
}

const app = new Hono<{
  Variables: {
  };
}>();

void applySeasonRolloverIfNeeded();
scheduleSeasonRolloverTimer();

app.use("/static/*", serveStatic({ root: "./" }));
// app.get('/favicon.ico', serveStatic({ root: './public' }));
// app.get('/icon.jpg', serveStatic({ root: './public' }));

app.get("/favicon.ico", (c) => {
  const file = readFileSync("./public/favicon.ico");
  return c.body(file, 200, {
    "Content-Type": "image/x-icon",
  });
});

app.get("/icon.jpg", (c) => {
  const file = readFileSync("./public/icon.jpg");
  return c.body(file, 200, {
    "Content-Type": "image/jpeg",
  });
});

app.use(async (c, next) => {
  await applySeasonRolloverIfNeeded();

  // Allow these routes to skip auth check
  if (
    c.req.path == "/" ||
    c.req.path == "/v1/black-garden" ||
    c.req.path.startsWith("/v1/auth/")
  ) {
    await next();
    return;
  }

  // Check for user cookie on protected routes
  const user = getCookie(c, "user") ?? "";

  if (user) {
  // Match redirect logic is disabled - skip the expensive findCurrentMatch DB query
  // to save reads. If re-enabled, uncomment the block below.

  // const activeMatch = await findCurrentMatch(user);
  // const isApiRequest = c.req.header("Accept")?.includes("application/json")
  //                   || c.req.path.startsWith("/v1/match/state")
  //                   || c.req.path.startsWith("/v1/match/list")
  //                   || c.req.path.startsWith("/v1/match/game/score")
  //                   || c.req.path.startsWith("/v1/match/game/vyrazacka")
  //                   || c.req.path.startsWith("/v1/match/game/golden-vyrazacka");
  }

  
  if (!user && c.req.path.startsWith("/v1/")) {
    return c.redirect("/v1/auth/login");
  }

  await next();
});

app.get("/v1/changes-log", async (c) => {
  const changes = [
    {
      date: "24.02.2026",
      updates: [
        "[Feature] -> Ton of new stuff! Explore it yourself :D",
      ],
    },
    {
      date: "17.02.2026",
      updates: [
        "[Feature] -> Added tournaments!",
        "[Feature] -> Added graph analyzer with one graph for now :)",
        "[Feature] -> Added achievements with 10 achievements to unlock for now. Generated randomly by AI, for testing purposes.",
        "[Feature] -> Added duos leaderboard by winrate and at least 5 games together.",
        "[Feature] -> Added logic that players see their team on the left in game page for all 3 matches.",
      ],
    },
    {
      date: "16.02.2026",
      updates: [
        "[Feature] -> Added 'podlézání to daily log!' ",
        "[Feature] -> Added 'DUO ANALYZER in leaderboards.' ",
        "[Feature] -> You can now send coins.' ",
        "[Feature] -> You can see betting history for each match in match history view.' ",
      ],
    },
    {
      date: "02.02.2026",
      updates: [
        "[Feature] -> Added coins.",
        "[Feature] -> Added 10:0 loses leaderboard.",
        "[Feature] -> Added 10:0 wins leaderboard.",
        "[Feature] -> Added season timer to lobby.",
        "[Feature] -> Improve match history. Mainly player's matches view.",
        "[Feature] -> Added leaderboard for coins",
        "[Feature - EXPERIMENTAL] -> Added bet feature (F Bet). Place bets on matches and win coins!",
      ],
    },
    {
      date: "01.02.2026",
      updates: [
        "[Fix] -> Daily achievements panel now shows correct data. (Hopefully :D)",
      ],
    },
    {
      date: "26.01.2026",
      updates: [
        "[Feature] -> Added daily achievements panel to lobby sidebar. Only in testing phase now.",
        "[Feature] -> Current players is highlighted in leaderboard now.",
        "[Feature] -> Added % of vyrážečky to player profile and leaderboard.",
        "[Fix] -> Fix 'golden vyrážečka' to work properly. Now you should type for example (score 3-9) and then click on 'golden vyrážečka' button.",
        "[Fix] -> Now 0-10 loses are added to players stats automaticall.",
        "[Fix] -> You can properly see full list of any player matches.",
        "[Fix] -> Menu leaderbords for ranks now shows all players.",
      ],
    },
    {
      date: "08.12.2025",
      updates: [
        "[Feature] -> Added average goals per match column to elo leaderboard.",
        "[Feature] -> Added W/L amd goals ratio as float number to leaderboard.",
      ],
    },
    {
      date: "05.12.2025",
      updates: [
        "[Feature] -> Added this feature :D",
        "[Feature] -> You can see players match history from leaderboard! Click on a player's name to view their matches.",
        "[Feature] -> Added how many % of goals are \"vyrážečky\" in global stats.",
        "[Fix] -> Sorting of leaderboard by level now works correctly.",
        "[Fix] -> There is no scroll in lobby anymore.",
        "[Fix] -> Redirection to match history after finishing a match now works properly.",
      ],
    }
  ];

  return c.html(
    <MainLayout c={c}>
      <ChangesLogPage changes={changes} />
    </MainLayout>
  );
});

app.get("/v1/match-history", async (c) => {
  const matches = await listRecentMatchHistoryDocs(10);

  interface BetSummary {
    lostAmount: number;
    profitWon: number;
  }

  interface MatchWithBetSummary extends MatchHistoryDoc {
    betSummary: BetSummary;
  }

  const allBets = await getAllBets(20);
  const betsByMatchId = new Map<string, typeof allBets>();
  for (const bet of allBets) {
    const existing = betsByMatchId.get(bet.matchId) || [];
    existing.push(bet);
    betsByMatchId.set(bet.matchId, existing);
  }

  const matchesWithBetSummary: MatchWithBetSummary[] = matches.map((match: MatchHistoryDoc): MatchWithBetSummary => {
    const bets = betsByMatchId.get(match.matchId) || [];
    const totalLostAmount: number = bets
      .filter((b) => b.status === "lost")
      .reduce((sum: number, b) => sum + Number(b.betAmount || 0), 0);
    const totalProfitWon: number = bets
      .filter((b) => b.status === "won")
      .reduce((sum: number, b) => sum + Math.max(0, Number(b.winnings || 0) - Number(b.betAmount || 0)), 0);

    return {
      ...match,
      betSummary: {
        lostAmount: totalLostAmount,
        profitWon: totalProfitWon,
      },
    };
  });

  const user = getCookie(c, "user") ?? null;

  return c.html(
    <MainLayout c={c}>
      <MatchHistoryPage c={c} matches={matchesWithBetSummary} currentUser={user} filterUsername={null} />
    </MainLayout>
  );
});

app.get("/v1/match-history/players/:username", async (c) => {
  const username = c.req.param("username");

  const allMatches = await listRecentMatchHistoryDocs(30);

  // Filter for matches that include this player
  const matches = allMatches.filter((match: MatchHistoryDoc) => {
    return (match.players || []).some((p: HistoryPlayers) => p.id === username);
  });

  const allBets = await getAllBets(20);
  const betsByMatchId = new Map<string, typeof allBets>();
  for (const bet of allBets) {
    const existing = betsByMatchId.get(bet.matchId) || [];
    existing.push(bet);
    betsByMatchId.set(bet.matchId, existing);
  }

  const matchesWithBetSummary = matches.map((match) => {
    const bets = betsByMatchId.get(match.matchId) || [];
    const totalLostAmount = bets
      .filter((b) => b.status === "lost")
      .reduce((sum, b) => sum + Number(b.betAmount || 0), 0);
    const totalProfitWon = bets
      .filter((b) => b.status === "won")
      .reduce((sum, b) => sum + Math.max(0, Number(b.winnings || 0) - Number(b.betAmount || 0)), 0);

    return {
      ...match,
      betSummary: {
        lostAmount: totalLostAmount,
        profitWon: totalProfitWon,
      },
    };
  });

  return c.html(
    <MainLayout c={c}>
      <MatchHistoryPage c={c} matches={matchesWithBetSummary} currentUser={null} filterUsername={username} />
    </MainLayout>
  );
});

app.get("/", (c) => {
  const username = getCookie(c, "user") ?? "";
  if (username) {
    if (isAdminUsername(username)) return c.redirect("/v1/admin");
    return c.redirect("/v1/lobby");
  }

  return c.html(
    <MainLayout c={c}>
      <Homepage c={c} />
    </MainLayout>,
  );
});

app.get("/v1/black-garden", (c) => {
  return c.html(
    <MainLayout c={c}>
      <BlackGardenPage />
    </MainLayout>,
  );
});

// render login page (GET)
app.get("/v1/auth/login", (c) => {
  const username = getCookie(c, "user") ?? "";
  if (username) {
    if (isAdminUsername(username)) return c.redirect("/v1/admin");
    return c.redirect("/v1/lobby");
  }

  return c.html(
    <MainLayout c={c}>
      <LoginPage c={c} />
    </MainLayout>,
  );
});

// render register page (GET)
app.get("/v1/auth/register", (c) => {
  const username = getCookie(c, "user") ?? "";
  if (username) {
    if (isAdminUsername(username)) return c.redirect("/v1/admin");
    return c.redirect("/v1/lobby");
  }

  return c.html(
    <MainLayout c={c}>
      <RegisterPage c={c} />
    </MainLayout>,
  );
});

app.get("/v1/auth/admin-login", (c) => {
  const username = getCookie(c, "user") ?? "";
  if (username && isAdminUsername(username)) {
    return c.redirect("/v1/admin");
  }

  return c.html(
    <MainLayout c={c}>
      <AdminLoginPage c={c} />
    </MainLayout>,
  );
});

// render lobby page (GET)
app.get("/v1/lobby", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "Player";
    const { scope, selectedSeasonIndex, currentSeasonIndex, availableSeasonIndexes } = resolveSeasonSelection(c);

    const overallProfile = await getPlayerProfileFast(username);
    const overallGlobalStats = await getGlobalStatsFast();
    const allProfiles = await getAllPlayerProfilesCached();
    const incomingCoinMessages = overallProfile?.userId
      ? await consumeCoinTransferMessages(overallProfile.userId)
      : [];

    let playerData = overallProfile;
    let globalStats = overallGlobalStats;

    if (overallProfile && scope !== "overall") {
      const computed = getComputedStats();
      const seasonData = computed.seasonStats[String(selectedSeasonIndex)] || {};
      const s = seasonData[overallProfile.$id];
      const base = s || buildEmptySeasonPlayer(overallProfile.$id);

      playerData = {
        ...overallProfile,
        wins: s?.wins ?? 0,
        loses: s?.loses ?? 0,
        ultimate_wins: s?.ultimate_wins ?? 0,
        ultimate_loses: s?.ultimate_loses ?? 0,
        xp: overallProfile.xp,
        elo: scope === "current" ? overallProfile.elo : (s?.elo ?? 500),
        vyrazecky: s?.vyrazecky ?? 0,
        goals_scored: s?.goals_scored ?? 0,
        goals_conceded: s?.goals_conceded ?? 0,
        ten_zero_wins: s?.ten_zero_wins ?? 0,
        ten_zero_loses: s?.ten_zero_loses ?? 0,
      };

      const sg = computed.seasonGlobalStats[String(selectedSeasonIndex)];
      if (sg) {
        globalStats = { totalMatches: sg.totalMatches, totalGoals: sg.totalGoals, totalPodlezani: sg.totalPodlezani, totalVyrazecka: sg.totalVyrazecka };
      }
    }
    
    return c.html(
      <MainLayout c={c}>
        <LobbyPage
          c={c}
          playerProfile={playerData}
          globalStats={globalStats}
          statsScope={scope}
          selectedSeasonIndex={selectedSeasonIndex}
          currentSeasonIndex={currentSeasonIndex}
          availableSeasonIndexes={availableSeasonIndexes}
          walletCoins={overallProfile?.coins}
          players={allProfiles}
          incomingCoinMessages={incomingCoinMessages}
        />
      </MainLayout>,
    );
  } catch (err: any) {
    console.error("Lobby error:", err);
    return c.html(
      <MainLayout c={c}>
        <LobbyPage c={c} playerProfile={null} globalStats={null}/>
      </MainLayout>,
    );
  }
});

// Helper function for golden stat tracking (outside route handler to avoid strict mode issues)
function addGoldenStat(
  map: Map<string, { teamIds: string[]; teamNames: string[]; count: number; scorers: Map<string, { id: string; username: string; count: number }> }>,
  teamIds: string[],
  teamNames: string[],
  scorerId: string,
  scorerName: string
) {
  const sortedIds = teamIds.slice().sort();
  const key = sortedIds.join('|');
  const sortedNames = teamNames.slice().sort();
  const row = map.get(key) || {
    teamIds: sortedIds,
    teamNames: sortedNames,
    count: 0,
    scorers: new Map<string, { id: string; username: string; count: number }>(),
  };
  row.count += 1;
  if (scorerId) {
    const scorerRow = row.scorers.get(scorerId) || { id: scorerId, username: scorerName, count: 0 };
    scorerRow.count += 1;
    row.scorers.set(scorerId, scorerRow);
  }
  map.set(key, row);
}

async function listRecentMatchHistoryDocs(maxDocs: number = 100): Promise<MatchHistoryDoc[]> {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_KEY);
  const databases = new sdk.Databases(client);

  let allDocuments: any[] = [];
  let offset = 0;
  const limit = 100;

  while (allDocuments.length < maxDocs) {
    const batchSize = Math.min(limit, maxDocs - allDocuments.length);
    const res = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      'matches_history',
      [
        sdk.Query.orderDesc("$createdAt"),
        sdk.Query.limit(batchSize),
        sdk.Query.offset(offset),
      ]
    );

    if (res.documents.length === 0) break;

    allDocuments = allDocuments.concat(res.documents);
    offset += batchSize;
  }

  return allDocuments.map((doc: any) => parseMatchHistoryDoc(doc));
}

// Alias for backward compat — pages that truly need everything
async function listAllMatchHistoryDocs(): Promise<MatchHistoryDoc[]> {
  return listRecentMatchHistoryDocs(10000);
}

function resolveSeasonSelection(c: any): {
  scope: StatsScope;
  selectedSeasonIndex: number;
  currentSeasonIndex: number;
  availableSeasonIndexes: number[];
} {
  const scope = getScopeFromQuery(c.req.query("scope"));
  const currentSeasonIndex = getCurrentSeasonIndex();
  const availableSeasonIndexes = getAvailableSeasonIndexes();
  const seasonRaw = Number(c.req.query("season"));

  const selectedSeasonIndex = Number.isFinite(seasonRaw)
    ? Math.max(0, Math.min(currentSeasonIndex, Math.floor(seasonRaw)))
    : currentSeasonIndex;

  return {
    scope,
    selectedSeasonIndex: scope === "current" ? currentSeasonIndex : selectedSeasonIndex,
    currentSeasonIndex,
    availableSeasonIndexes,
  };
}

// render leaderboard (GET)
app.get("/v1/leaderboard", async (c) => {
  try {
    const allProfiles = await getAllPlayerProfilesCached();
    const username = getCookie(c, "user") ?? undefined;
    const { scope, selectedSeasonIndex, currentSeasonIndex, availableSeasonIndexes } = resolveSeasonSelection(c);

    const computed = getComputedStats();

    // Build player list — from profiles (overall) or pre-computed season stats
    const players = scope === "overall"
      ? allProfiles
      : (() => {
          const seasonData = computed.seasonStats[String(selectedSeasonIndex)] || {};
          return allProfiles.map((profile) => {
            const s = seasonData[profile.$id];
            if (!s) return { ...buildEmptySeasonPlayer(profile.$id), $id: profile.$id, userId: profile.userId, username: profile.username, selectedBadge: profile.selectedBadge, xp: profile.xp, elo: scope === "current" ? profile.elo : 500, coins: profile.coins };
            return {
              ...profile,
              wins: s.wins, loses: s.loses,
              ultimate_wins: s.ultimate_wins, ultimate_loses: s.ultimate_loses,
              xp: profile.xp,
              elo: scope === "current" ? profile.elo : s.elo,
              vyrazecky: s.vyrazecky, goals_scored: s.goals_scored, goals_conceded: s.goals_conceded,
              ten_zero_wins: s.ten_zero_wins, ten_zero_loses: s.ten_zero_loses,
              coins: profile.coins,
            };
          });
        })();

    // Duo stats from pre-computed (convert to the format LeaderboardPage expects)
    const duoMatches = (computed.duoStats || []).map((d, i) => ({
      $id: `duo-${i}`,
      createdAt: '',
      players: d.ids.map((id, j) => ({ id, username: d.names[j] || id })),
      scores: Array.from({ length: d.total }, (_, k) => ({
        a: d.ids, b: [],
        scoreA: k < d.wins ? 10 : 0,
        scoreB: k < d.wins ? 0 : 10,
      })),
      _precomputed: { wins: d.wins, losses: d.losses, total: d.total, names: d.names },
    }));

    return c.html(
      <MainLayout c={c}>
        <LeaderboardPage
          players={players}
          currentPlayer={username}
          duoMatches={duoMatches}
          goldenTeamsScored={computed.goldenScored}
          goldenTeamsReceived={computed.goldenReceived}
          statsScope={scope}
          selectedSeasonIndex={selectedSeasonIndex}
          currentSeasonIndex={currentSeasonIndex}
          availableSeasonIndexes={availableSeasonIndexes}
        />
      </MainLayout>,
    );
  } catch (err: any) {
    console.error("Leaderboard error:", err);
    return c.text("Failed to load leaderboard", 500);
  }
});

app.get("/v1/profile/summary/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const viewer = getCookie(c, "user") ?? "";
    const profile = await getPlayerProfileFast(username);
    if (!profile) return c.json({ error: "Player not found" }, 404);

    const levelInfo = computeLevel(profile.xp || 0);
    const rankInfo = getRankInfoFromElo(profile.elo || 0);
    const achievements = await getAllAchievementsForPlayer(profile.$id);

    const allMatches = await listRecentMatchHistoryDocs(10);
    const recentMatches: Array<{ matchId: string; createdAt?: string; outcome: string; scoreLine: string }> = [];

    for (const match of allMatches) {
      if (recentMatches.length >= 5) break;
      const playerRow = (match.players || []).find((p: HistoryPlayers) => p.id === profile.$id);
      if (!playerRow) continue;

      const winsAdd = Number(playerRow.winsAdd || 0);
      const losesAdd = Number(playerRow.losesAdd || 0);
      const outcome = winsAdd >= 2 ? 'win' : (losesAdd >= 2 ? 'loss' : 'draw');
      const scoreLine = `${winsAdd}:${losesAdd}`;

      recentMatches.push({
        matchId: match.matchId || match.$id,
        createdAt: match.createdAt,
        outcome,
        scoreLine,
      });
    }

    return c.json({
      profile: {
        username: profile.username,
        elo: profile.elo,
        coins: profile.coins,
        xp: profile.xp,
        wins: profile.wins,
        loses: profile.loses,
        goals_scored: profile.goals_scored,
        goals_conceded: profile.goals_conceded,
        vyrazecky: profile.vyrazecky,
        ultimate_wins: profile.ultimate_wins,
        ultimate_loses: profile.ultimate_loses,
        ten_zero_wins: profile.ten_zero_wins,
        ten_zero_loses: profile.ten_zero_loses,
        level: levelInfo.level,
        levelProgress: levelInfo.progress,
        rank: rankInfo,
        selectedBadge: profile.selectedBadge ?? null,
      },
      achievements,
      recentMatches,
      canClaim: viewer === username,
    });
  } catch (err: any) {
    console.error("profile summary error", err);
    return c.json({ error: "Failed to load profile summary" }, 500);
  }
});

app.post("/v1/achievements/claim", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username) return c.redirect("/v1/auth/login");

    const form = await c.req.formData();
    const achievementId = String(form.get("achievementId") ?? "").trim();
    if (!achievementId) return c.redirect("/v1/lobby");

    const profile = await getPlayerProfileFast(username);
    if (!profile) return c.redirect("/v1/lobby");

    const claim = await claimAchievementReward(profile.$id, achievementId);
    if (claim.status === 'claimed' && claim.rewardCoins > 0) {
      await updatePlayerStatsAndMemory(profile.$id, {
        coins: (profile.coins || 0) + claim.rewardCoins,
      });
    }

    const referer = c.req.header("Referer");
    return c.redirect(referer || "/v1/lobby");
  } catch (err: any) {
    console.error("claim achievement error", err);
    return c.redirect("/v1/lobby");
  }
});

// Graphs page - show Elo history over time
app.get("/v1/graphs", async (c) => {
  try {
    const eloHistories = await getAllPlayersEloHistory();
    const xpHistories = await getAllPlayersXPHistory();
    const vyrazeckaHistories = await getAllPlayersVyrazeckaHistory();
    const gamesHistories = await getAllPlayersGamesHistory();
    
    return c.html(
      <MainLayout c={c}>
        <GraphsPage c={c} eloHistories={eloHistories} xpHistories={xpHistories} vyrazeckaHistories={vyrazeckaHistories} gamesHistories={gamesHistories} />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("Graphs error:", err);
    return c.text("Failed to load graphs", 500);
  }
});

/* NEW: Register endpoint
   Expects form data with fields: username, password, (confirmPassword optional)
*/
app.post("/v1/auth/register", async (c) => {
  try {
    const form = await c.req.formData();
    const usernameRaw = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();
    const confirm = String(form.get("confirmPassword") ?? "").trim();

    if (!usernameRaw || usernameRaw.length < 3) {
      return c.text("Username must be at least 3 characters", 400);
    }
    if (isAdminUsername(usernameRaw)) {
      return c.text("This username is reserved", 400);
    }
    if (!password || password.length < 6) {
      return c.text("Password must be at least 6 characters", 400);
    }
    if (password !== confirm) {
      return c.text("Passwords do not match", 400);
    }

    // Check for existing user with same name (case-insensitive)
    const allProfiles = await getAllPlayerProfiles();
    const existing = allProfiles.find(p => p.username.toLowerCase() === usernameRaw.toLowerCase());
    if (existing) {
      return c.text("Username already taken", 400);
    }

    // create user in Appwrite
    await registerUser(usernameRaw, password);

    // Refresh new profile into memory
    await refreshProfileFromDb(usernameRaw);

    // set a simple cookie and redirect to lobby
    c.res.headers.set("Set-Cookie", buildUserCookie(usernameRaw));
    return c.redirect("/v1/lobby");
  } catch (err: any) {
    console.error("register error:", err);
    const msg = err?.message || "Registration failed";
    return c.text(msg, 500);
  }
});

/* NEW: Login endpoint
   Expects form data with fields: username, password
*/
app.post("/v1/auth/login", async (c) => {
  try {
    const form = await c.req.formData();
    const usernameInput = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!usernameInput || !password) {
      return c.text("Username and password required", 400);
    }

    // Find the canonical username (case-insensitive)
    const allProfiles = await getAllPlayerProfiles();
    const match = allProfiles.find(p => p.username.toLowerCase() === usernameInput.toLowerCase());
    const username = match ? match.username : usernameInput;

    // create session using Appwrite; exception thrown on invalid creds
    await loginUser(username, password);

    // set a cookie and redirect to lobby
    c.res.headers.set("Set-Cookie", buildUserCookie(username));
    return c.redirect("/v1/lobby");
  } catch (err: any) {
    console.error("login error:", err);
    return c.text("Invalid credentials", 401);
  }
});

app.post("/v1/auth/admin-login", async (c) => {
  try {
    const form = await c.req.formData();
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!username || !password) {
      return c.text("Username and password required", 400);
    }
    if (!isAdminUsername(username)) {
      return c.text("Only configured admin account can use admin login", 403);
    }

    await loginUser(username, password);

    c.res.headers.set("Set-Cookie", buildUserCookie(username));
    return c.redirect("/v1/admin");
  } catch (err: any) {
    console.error("admin login error:", err);
    return c.text("Invalid admin credentials", 401);
  }
});

app.get("/v1/admin", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username || !isAdminUsername(username)) {
      return c.redirect("/v1/auth/admin-login");
    }

    const users = await listAllUsersForAdmin();

    return c.html(
      <MainLayout c={c}>
        <AdminPasswordResetPage c={c} adminUsername={username} users={users} />
      </MainLayout>,
    );
  } catch (err: any) {
    console.error("admin panel error:", err);
    return c.text("Failed to load admin panel", 500);
  }
});

app.post("/v1/admin/reset-password", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username || !isAdminUsername(username)) {
      return c.redirect("/v1/auth/admin-login");
    }

    const form = await c.req.formData();
    const targetUserId = String(form.get("targetUserId") ?? "").trim();
    const newPassword = String(form.get("newPassword") ?? "").trim();
    const confirmPassword = String(form.get("confirmPassword") ?? "").trim();

    if (!targetUserId) return c.text("User is required", 400);
    if (!newPassword || newPassword.length < 6) return c.text("Password must be at least 6 characters", 400);
    if (newPassword !== confirmPassword) return c.text("Passwords do not match", 400);

    await resetUserPasswordById(targetUserId, newPassword);
    return c.redirect("/v1/admin");
  } catch (err: any) {
    console.error("admin reset password error:", err);
    return c.text("Failed to reset password", 500);
  }
});

app.post("/v1/admin/reset-coins", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username || !isAdminUsername(username)) {
      return c.redirect("/v1/auth/admin-login");
    }

    const form = await c.req.formData();
    const amountRaw = Number(form.get("amount") ?? 10000);
    const amount = Math.max(0, Math.floor(amountRaw));

    const players = await getAllPlayerProfilesCached();
    for (const player of players) {
      try {
        await updatePlayerStatsAndMemory(player.$id, { coins: amount });
      } catch (error) {
        console.error("failed to reset coins for player", player.$id, error);
      }
    }

    return c.redirect("/v1/admin");
  } catch (err: any) {
    console.error("admin reset coins error:", err);
    return c.text("Failed to reset coins", 500);
  }
});

app.get("/v1/admin/faq", async (c) => {
  // Legacy redirect - redirect old FAQ editor link to new content manager
  return c.redirect("/v1/admin/content/match_rules");
});

app.get("/v1/admin/content", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username || !isAdminUsername(username)) {
      return c.redirect("/v1/auth/admin-login");
    }

    const existingContent = await getAllSiteContent();

    return c.html(
      <MainLayout c={c}>
        <AdminContentManagerPage 
          c={c} 
          adminUsername={username} 
          sections={CONTENT_SECTIONS}
          existingContent={existingContent}
        />
      </MainLayout>,
    );
  } catch (err: any) {
    console.error("admin content manager error:", err);
    return c.text("Failed to load content manager", 500);
  }
});

app.get("/v1/admin/content/:sectionKey", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username || !isAdminUsername(username)) {
      return c.redirect("/v1/auth/admin-login");
    }

    const sectionKey = c.req.param("sectionKey");
    const section = getContentSection(sectionKey);

    if (!section) {
      return c.text("Invalid content section", 404);
    }

    const config = await getSiteContent(sectionKey);
    let content: any;

    if (section.contentType === 'json_rules') {
      content = config ? parseMatchRules(config.content) : parseMatchRules(getDefaultContent(sectionKey));
    } else if (section.contentType === 'text') {
      content = config ? config.content : getDefaultContent(sectionKey);
    } else {
      content = config ? config.content : getDefaultContent(sectionKey);
    }

    return c.html(
      <MainLayout c={c}>
        <AdminContentEditorPage 
          c={c} 
          adminUsername={username} 
          section={section}
          content={content}
        />
      </MainLayout>,
    );
  } catch (err: any) {
    console.error("admin content editor error:", err);
    return c.text("Failed to load content editor", 500);
  }
});

app.post("/v1/admin/faq/update", async (c) => {
  // Legacy redirect - redirect old FAQ update to new content update
  return c.redirect("/v1/admin/content/match_rules");
});

app.post("/v1/admin/content/:sectionKey/update", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "";
    if (!username || !isAdminUsername(username)) {
      return c.redirect("/v1/auth/admin-login");
    }

    const sectionKey = c.req.param("sectionKey");
    const section = getContentSection(sectionKey);

    if (!section) {
      return c.text("Invalid content section", 404);
    }

    const form = await c.req.formData();
    let content: string;

    if (section.contentType === 'json_rules') {
      // Parse rules from form data
      const rules: MatchRule[] = [];
      let index = 0;
      while (true) {
        const label = form.get(`rule_${index}_label`);
        const value = form.get(`rule_${index}_value`);
        
        if (!label || !value) break;
        
        rules.push({
          label: String(label).trim(),
          value: String(value).trim(),
        });
        
        index++;
      }

      if (rules.length === 0) {
        return c.text("At least one rule is required", 400);
      }

      content = serializeMatchRules(rules);
    } else if (section.contentType === 'text') {
      // Get text content from form
      const textContent = String(form.get("content") ?? "").trim();
      if (!textContent) {
        return c.text("Content is required", 400);
      }
      content = textContent;
    } else {
      return c.text("Unsupported content type", 400);
    }

    await updateSiteContent(sectionKey, content);
    return c.redirect(`/v1/admin/content/${sectionKey}`);
  } catch (err: any) {
    console.error("admin content update error:", err);
    return c.text("Failed to update content", 500);
  }
});

// logout endpoint: clears user cookie and redirects to home
app.post("/v1/auth/logout", (c) => {
  // clear cookie (Set-Cookie with Max-Age=0)
  c.res.headers.set("Set-Cookie", "user=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  c.res.headers.set("HX-Redirect", "/");
  return c.redirect("/");
});

// send coins to another player
app.post("/v1/coins/send", async (c) => {
  try {
    const senderUsername = getCookie(c, "user") ?? null;
    if (!senderUsername) return c.redirect("/v1/auth/login");

    const form = await c.req.formData();
    const recipientUsername = String(form.get("recipient") ?? "").trim();
    const customMessage = String(form.get("message") ?? "").trim().slice(0, 180);
    const amountRaw = Number(form.get("amount") ?? 0);
    const amount = Math.floor(amountRaw);

    if (!recipientUsername) return c.text("Recipient is required", 400);
    if (!Number.isFinite(amount) || amount <= 0) return c.text("Invalid amount", 400);
    if (recipientUsername === senderUsername) return c.text("Cannot send coins to yourself", 400);

    const senderProfile = await getPlayerProfileFast(senderUsername);
    const recipientProfile = await getPlayerProfileFast(recipientUsername);

    if (!senderProfile || !recipientProfile) return c.text("Player not found", 404);
    if ((senderProfile.coins || 0) < amount) return c.text("Insufficient coins", 400);

    await updatePlayerStatsAndMemory(senderProfile.$id, { coins: (senderProfile.coins || 0) - amount });
    await updatePlayerStatsAndMemory(recipientProfile.$id, { coins: (recipientProfile.coins || 0) + amount });
    await appendCoinTransferMessage(
      recipientProfile.userId,
      senderUsername,
      amount,
      customMessage || "Enjoy the coins! 🎉"
    );

    return c.redirect("/v1/lobby");
  } catch (err: any) {
    console.error("send coins error:", err);
    return c.text("Failed to send coins", 500);
  }
});

// Shop page (GET)
app.get("/v1/shop", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    const profile = await getPlayerProfileFast(username);
    if (!profile) return c.redirect("/v1/auth/login");

    const userOrders = await getUserOrders(profile.userId);
    const purchasedItemIds = new Set(userOrders.map((o: any) => o.itemId));

    return c.html(
      <MainLayout c={c}>
        <ShopPage c={c} profile={profile} purchasedItemIds={purchasedItemIds} />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("Shop page error:", err);
    return c.text("Failed to load shop", 500);
  }
});

// Purchase item from shop (POST)
app.post("/v1/shop/purchase", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    const profile = await getPlayerProfileFast(username);
    if (!profile) return c.redirect("/v1/auth/login");

    const form = await c.req.formData();
    const itemId = String(form.get("itemId") ?? "").trim();

    if (!itemId) {
      return c.html(
        <MainLayout c={c}>
          <ShopPage c={c} profile={profile} message={{ type: "error", text: "No item selected" }} />
        </MainLayout>
      );
    }

    const result = await purchaseItem(profile.userId, profile.username, itemId);

    // Reload profile to get updated coins
    const updatedProfile = await getPlayerProfileFast(username);
    if (!updatedProfile) return c.redirect("/v1/auth/login");

    const userOrders = await getUserOrders(updatedProfile.userId);
    const purchasedItemIds = new Set(userOrders.map((o: any) => o.itemId));

    return c.html(
      <MainLayout c={c}>
        <ShopPage
          c={c}
          profile={updatedProfile}
          purchasedItemIds={purchasedItemIds}
          message={{ type: result.success ? "success" : "error", text: result.message }}
        />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("Shop purchase error:", err);
    const profile = await getPlayerProfileFast(getCookie(c, "user") ?? "");
    if (!profile) return c.redirect("/v1/auth/login");
    const userOrders = await getUserOrders(profile.userId);
    const purchasedItemIds = new Set(userOrders.map((o: any) => o.itemId));

    return c.html(
      <MainLayout c={c}>
        <ShopPage
          c={c}
          profile={profile}
          purchasedItemIds={purchasedItemIds}
          message={{ type: "error", text: "Failed to complete purchase" }}
        />
      </MainLayout>
    );
  }
});

// Select/equip a badge (POST)
app.post("/v1/profile/select-badge", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    const form = await c.req.formData();
    const badgeName = String(form.get("badgeName") ?? "").trim();

    // If empty string, unequip badge (set to null)
    const result = await selectBadge(username, badgeName || null);

    // Refresh in-memory profile so the lobby shows the updated badge immediately
    if (result.success) {
      await refreshProfileFromDb(username);
    }

    // Always redirect back to lobby
    return c.redirect("/v1/lobby");
  } catch (err: any) {
    console.error("Select badge error:", err);
    return c.redirect("/v1/lobby");
  }
});

// Join match (create or join existing) and redirect to match lobby
app.post("/v1/match/join", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    // check if there's a playing match in progress
    const playingMatch = await findPlayingMatch();
    if (playingMatch) {
      return c.text('A match is already in progress. Please wait for it to finish.', 409);
    }

    // fetch player profile doc by username (we use username as id for profile)
    const profile = await getPlayerProfileFast(username);
    const player: MatchPlayer = {
      id: profile ? profile.$id : username,
      username: username,
      wins: profile ? profile.wins : 0,
      loses: profile ? profile.loses : 0,
      elo: profile ? profile.elo : 500,
    };

    const match = await findOrCreateAndJoin(player);

    // set match cookie and redirect to match lobby
    c.res.headers.set("Set-Cookie", `match_id=${encodeURIComponent(match.$id)}; Path=/; HttpOnly; SameSite=Lax`);
    return c.redirect("/v1/match/lobby");
  } catch (err: any) {
    console.error("join match error:", err);
    return c.text('Failed to join match', 500);
  }
});

// Match lobby page (GET) - show all matches
app.get("/v1/match/lobby", async (c) => {
  try {
    const username = getCookie(c, "user") ?? 'Player';
    const profiles = await getAllPlayerProfilesCached();
    const allUsernames = (profiles || [])
      .map((p: any) => p?.username)
      .filter((u: any) => typeof u === 'string' && u.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));

    return c.html(
      <MainLayout c={c}>
        <MatchLobbyPage c={c} currentUser={username} allUsernames={allUsernames} />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("match lobby error", err);
    return c.redirect("/v1/lobby");
  }
});

// Match state JSON (polled by client)
app.get("/v1/match/state", async (c) => {
  const matchId = String(c.req.query('matchId') ?? '');
  if (!matchId) return c.json({ error: 'missing matchId' }, 400);
  try {
    const match = await getMatch(matchId);
    if (!match) return c.json({ error: 'not found' }, 404);
    return c.json(match);
  } catch (err: any) {
    return c.json({ error: 'failed' }, 500);
  }
});

// List all available matches (open or full)
app.get("/v1/match/list", async (c) => {
  try {
    const matches = await listAvailableMatches();
    return c.json({ matches });
  } catch (err: any) {
    console.error("list matches error:", err);
    return c.json({ matches: [], error: 'failed' }, 500);
  }
});

// Create a new match
app.post("/v1/match/create", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    // fetch player profile doc by username
    const profile = await getPlayerProfileFast(username);
    const player: MatchPlayer = {
      id: profile ? profile.$id : username,
      username: username,
      wins: profile ? profile.wins : 0,
      loses: profile ? profile.loses : 0,
      elo: profile ? profile.elo : 500,
    };

    const match = await createMatch(player, 4);
    return c.redirect("/v1/match/lobby");
  } catch (err: any) {
    console.error("create match error:", err);
    return c.text('Failed to create match', 500);
  }
});

// Quick match: type in 4 usernames, create and start immediately
app.post("/v1/match/create-quick", async (c) => {
  try {
    const form = await c.req.formData();
    const rawNames = [1, 2, 3, 4].map((i) => String(form.get(`player${i}`) ?? '').trim()).filter(Boolean);
    if (rawNames.length !== 4) return c.text('Vyplň všetkých 4 hráčov.', 400);

    // Validate all distinct (case-insensitive)
    const lower = rawNames.map((n) => n.toLowerCase());
    const dedup = new Set(lower);
    if (dedup.size !== 4) return c.text('Hráči musia byť rôzni.', 400);

    // Resolve profiles using memory cache: match by username or $id (case-insensitive)
    const allProfiles = await getAllPlayerProfilesCached();
    const byLowerUsername = new Map<string, any>();
    for (const p of (allProfiles || [])) {
      if (p?.username) byLowerUsername.set(String(p.username).toLowerCase(), p);
      if (p?.$id) byLowerUsername.set(String(p.$id).toLowerCase(), p);
    }

    const players: MatchPlayer[] = [];
    for (const name of rawNames) {
      const profile = byLowerUsername.get(name.toLowerCase()) || await getPlayerProfileFast(name);
      if (!profile) return c.text(`Hráč '${name}' neexistuje.`, 400);
      players.push({
        id: profile.$id,
        username: profile.username ?? name,
        wins: profile.wins ?? 0,
        loses: profile.loses ?? 0,
        elo: profile.elo ?? 500,
      });
    }

    // Create match with first player, join the remaining three, then start
    const match = await createMatch(players[0], 4);
    for (let i = 1; i < players.length; i++) {
      await joinMatch(match.$id, players[i]);
    }
    await startMatch(match.$id);

    // If caller is one of the 4 players, send them to the game; otherwise back to lobby
    const callerUsername = (getCookie(c, "user") ?? '').toLowerCase();
    const callerIsPlayer = players.some((p) => (p.username || '').toLowerCase() === callerUsername);
    if (callerIsPlayer) {
      c.res.headers.set("Set-Cookie", `match_id=${encodeURIComponent(match.$id)}; Path=/; HttpOnly; SameSite=Lax`);
      return c.redirect("/v1/match/game");
    }
    return c.redirect("/v1/match/lobby");
  } catch (err: any) {
    console.error('create-quick match error', err);
    return c.text('Failed to create quick match', 500);
  }
});

// Join a specific match
app.post("/v1/match/join-specific", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? "");
    if (!matchId) return c.text("missing matchId", 400);

    // Check if match is playing - if so, redirect to game
    const matchCheck = await getMatch(matchId);
    if (matchCheck && matchCheck.state === 'playing') {
      // Check if player is in the match
      const profile = await getPlayerProfileFast(username);
      const playerId = profile ? profile.$id : username;
      const isPlayerInMatch = matchCheck.players.some(p => p.id === playerId);
      
      if (isPlayerInMatch) {
        // Player is in this match, redirect to game
        c.res.headers.set("Set-Cookie", `match_id=${encodeURIComponent(matchId)}; Path=/; HttpOnly; SameSite=Lax`);
        return c.redirect("/v1/match/game");
      } else {
        // Player is not in this match, reject
        return c.text("Cannot join a match in progress", 400);
      }
    }

    // fetch player profile doc by username
    const profile = await getPlayerProfileFast(username);
    const player: MatchPlayer = {
      id: profile ? profile.$id : username,
      username: username,
      wins: profile ? profile.wins : 0,
      loses: profile ? profile.loses : 0,
      elo: profile ? profile.elo : 500,
    };

    const match = await joinMatch(matchId, player);
    return c.redirect("/v1/match/lobby");
  } catch (err: any) {
    console.error("join specific match error:", err);
    return c.text('Failed to join match', 500);
  }
});

// Leave match: remove player from players_json, delete match if empty
app.post("/v1/match/leave", async (c) => {
  try {
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? "");
    const username = getCookie(c, "user") ?? null;
    if (!matchId) return c.text("missing matchId", 400);
    if (!username) {
      // no user — just clear cookie and redirect
      c.res.headers.set("Set-Cookie", "match_id=; Path=/; Max-Age=0; HttpOnly");
      return c.redirect("/v1/match/lobby");
    }

    // resolve player id same way as join: profile id if exists, otherwise username
    const profile = await getPlayerProfileFast(username);
    const playerId = profile ? profile.$id : username;

    const res = await leaveMatch(matchId, playerId);
    // clear match cookie
    c.res.headers.set("Set-Cookie", "match_id=; Path=/; Max-Age=0; HttpOnly");
    return c.redirect("/v1/match/lobby");
  } catch (err: any) {
    console.error("leave match error:", err);
    return c.text("Failed to leave match", 500);
  }
});

// Start match (only host allowed client-side controls this)
app.post("/v1/match/start", async (c) => {
  try {
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? '');
    const username = getCookie(c, "user") ?? '';
    if (!matchId) return c.text('missing matchId', 400);

    // start match and initialize scores
    await startMatch(matchId);
    // set match cookie and redirect to game
    c.res.headers.set("Set-Cookie", `match_id=${encodeURIComponent(matchId)}; Path=/; HttpOnly; SameSite=Lax`);
    return c.redirect("/v1/match/game");
  } catch (err: any) {
    console.error('start error', err);
    return c.text('Failed to start', 500);
  }
});

app.get("/v1/match-history/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const result = await matchResults(id);
    if (!result) return c.text("Match history not found", 404);
    const bets = await getBetsForMatch(result.matchId);
    const user = getCookie(c, "user") ?? "";

    return c.html(
      <MainLayout c={c}>
        <MatchResultPage c={c} result={result} username={user} bets={bets} />
      </MainLayout>
    );

  } catch (e) {
    return c.text("Match history not found", 404);
  }
});

// render match game page (GET)
app.get("/v1/match/game", async (c) => {
  try {
    const matchId = getCookie(c, "match_id") ?? '';
    if (!matchId) return c.redirect("/v1/lobby");
    const match = await getMatch(matchId);
    if (!match) return c.redirect("/v1/lobby");
    return c.html(
      <MainLayout c={c}>
        <MatchGamePage c={c} match={match} />
      </MainLayout>
    );
  } catch (err: any) {
    console.error('match game error', err);
    return c.redirect("/v1/lobby");
  }
});

// update score API for match game (server-side enforces bounds)
app.post("/v1/match/game/score", async (c) => {
  try {
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? '');
    const index = Number(form.get("index") ?? 0);
    const side = String(form.get("side") ?? 'a'); // 'a' or 'b'
    const delta = Number(form.get("delta") ?? 0);

    if (!matchId) return c.json({ error: 'missing matchId' }, 400);

    const match = await getMatch(matchId);
    if (!match) return c.json({ error: 'match not found' }, 404);

    const scores = match.scores || [];
    if (!scores[index]) return c.json({ error: 'invalid index' }, 400);

    // apply delta with clamping 0..10
    const s = scores[index];
    if (side === 'a') {
      s.scoreA = Math.min(10, Math.max(0, (s.scoreA || 0) + delta));
    } else {
      s.scoreB = Math.min(10, Math.max(0, (s.scoreB || 0) + delta));
    }

    const updated = await updateGameScores(matchId, scores);
    return c.json({ ok: true, scores: updated.scores });
  } catch (err: any) {
    console.error('update score error', err);
    return c.json({ error: 'failed' }, 500);
  }
});

// update vyrazacka API for match game
app.post("/v1/match/game/vyrazacka", async (c) => {
  try {
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? '');
    const index = Number(form.get("index") ?? 0);
    const playerId = String(form.get("playerId") ?? '');
    const delta = Number(form.get("delta") ?? 0);

    if (!matchId) return c.json({ error: 'missing matchId' }, 400);
    if (!playerId) return c.json({ error: 'missing playerId' }, 400);

    const match = await getMatch(matchId);
    if (!match) return c.json({ error: 'match not found' }, 404);

    const scores = match.scores || [];
    if (!scores[index]) return c.json({ error: 'invalid index' }, 400);

    // initialize vyrazacka object if not exists
    if (!scores[index].vyrazacka) {
      scores[index].vyrazacka = {};
    }

    // apply delta with clamping 0..infinity (min 0)
    const currentVyr = scores[index].vyrazacka[playerId] ?? 0;
    const newValue = Math.max(0, currentVyr + delta);
    scores[index].vyrazacka[playerId] = newValue;

    const updated = await updateGameScores(matchId, scores);
    return c.json({ ok: true, newValue });
  } catch (err: any) {
    console.error('update vyrazacka error', err);
    return c.json({ error: 'failed' }, 500);
  }
});

// golden vyrazacka API for match game
app.post("/v1/match/game/golden-vyrazacka", async (c) => {
  try {
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? '');
    const index = Number(form.get("index") ?? 0);
    const playerId = String(form.get("playerId") ?? ''); // player ID or empty
    const diff = Number(form.get("diff") ?? 0);

    if (!matchId) return c.json({ error: 'missing matchId' }, 400);

    const match = await getMatch(matchId);
    if (!match) return c.json({ error: 'match not found' }, 404);

    const scores = match.scores || [];
    if (!scores[index]) return c.json({ error: 'invalid index' }, 400);

    const s = scores[index];

    if (playerId) {
      const side = s.a?.includes(playerId) ? 'a' : (s.b?.includes(playerId) ? 'b' : null);
      if (!side) return c.json({ error: 'player not in match side' }, 400);

      // Enable golden vyrážečka for this player
      s.goldenVyrazacka = { playerId, side, diff: Math.max(0, Math.min(10, diff)) };
    } else {
      // Disable golden vyrážečka
      delete s.goldenVyrazacka;
    }

    const updated = await updateGameScores(matchId, scores);
    return c.json({ 
      ok: true, 
      goldenVyrazacka: updated.scores?.[index]?.goldenVyrazacka ?? null,
    });
  } catch (err: any) {
    console.error('update golden vyrazacka error', err);
    return c.json({ error: 'failed' }, 500);
  }
});

// helper to get avg elo of a team
    function avgElo(p1Elo?: number, p2Elo?: number): number {
      const elo1 = (p1Elo && typeof p1Elo=== 'number') ? p1Elo : 500;
      const elo2 = (p2Elo && typeof p2Elo === 'number') ? p2Elo : 500;
      return Math.round((elo1 + elo2) / 2);
    }

function buildPlayerEloMap(match: MatchDoc): Record<string, number> {
  const map: Record<string, number> = {};
  (match.players || []).forEach((p: MatchPlayer) => {
    map[p.id] = typeof p.elo === 'number' ? p.elo : 500;
  });
  return map;
}

function buildRecentFormMap(match: MatchDoc, history: MatchHistoryDoc[], lookback: number = 12): Record<string, { winRate: number; samples: number }> {
  const targetIds = new Set((match.players || []).map((p: MatchPlayer) => p.id));
  const rows: Record<string, { wins: number; samples: number }> = {};
  targetIds.forEach((id) => {
    rows[id] = { wins: 0, samples: 0 };
  });

  const sortedHistory = [...history].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });

  for (const pastMatch of sortedHistory) {
    const rounds = Array.isArray(pastMatch.scores) ? pastMatch.scores : [];
    for (const round of rounds) {
      const a = Array.isArray(round?.a) ? round.a : [];
      const b = Array.isArray(round?.b) ? round.b : [];
      const aScore = Number(round?.scoreA || 0);
      const bScore = Number(round?.scoreB || 0);
      if (aScore === bScore) continue;

      const winnerSide: 'a' | 'b' = aScore > bScore ? 'a' : 'b';
      targetIds.forEach((playerId) => {
        const row = rows[playerId];
        if (!row || row.samples >= lookback) return;
        const inA = a.includes(playerId);
        const inB = b.includes(playerId);
        if (!inA && !inB) return;
        const won = winnerSide === 'a' ? inA : inB;
        row.samples += 1;
        if (won) row.wins += 1;
      });
    }

    const complete = Array.from(targetIds).every((id) => (rows[id]?.samples || 0) >= lookback);
    if (complete) break;
  }

  const result: Record<string, { winRate: number; samples: number }> = {};
  targetIds.forEach((id) => {
    const row = rows[id] || { wins: 0, samples: 0 };
    result[id] = {
      samples: row.samples,
      winRate: row.samples > 0 ? row.wins / row.samples : 0.5,
    };
  });

  return result;
}

async function buildPlayerStatsMap(
  match: MatchDoc,
  profilesByKey?: Map<string, any>
): Promise<Record<string, { vyrazecky: number; wins: number; loses: number }>> {
  const map: Record<string, { vyrazecky: number; wins: number; loses: number }> = {};
  for (const p of match.players || []) {
    let profile = null;
    if (profilesByKey) {
      profile = profilesByKey.get(p.id) || (p.username ? profilesByKey.get(p.username) : null) || null;
    } else {
      try {
        profile = await getPlayerProfileFast(p.id);
      } catch {
        profile = null;
      }
      if (!profile && p.username && p.username !== p.id) {
        try {
          profile = await getPlayerProfileFast(p.username);
        } catch {
          profile = null;
        }
      }
    }
    map[p.id] = {
      vyrazecky: profile?.vyrazecky ?? 0,
      wins: profile?.wins ?? p.wins ?? 0,
      loses: profile?.loses ?? p.loses ?? 0,
    };
  }
  return map;
}

function buildRoundOdds(
  match: MatchDoc,
  playerElosById: Record<string, number>,
  recentFormById?: Record<string, { winRate: number; samples: number }>
): { a: number; b: number }[] {
  return (match.scores || []).map((s: any) => getRoundOdds(s.a || [], s.b || [], playerElosById, recentFormById));
}

function buildVyrazackaOutcomeOdds(
  match: MatchDoc,
  statsById: Record<string, { vyrazecky: number; wins: number; loses: number }>
): Record<VyrazackaOutcome, number> {
  const rounds = (match.scores || []).length || 3;
  const rows: Record<string, { vyrazecky: number; wins: number; loses: number }> = {};
  (match.players || []).forEach((p: MatchPlayer) => {
    rows[p.id] = statsById[p.id] || { vyrazecky: 0, wins: 0, loses: 0 };
  });
  return getVyrazackaOutcomeOdds(rows, rounds);
}

function buildTotalGoalsOdds(match: MatchDoc, roundOdds: { a: number; b: number }[]): Record<number, number> {
  const rounds = Math.max(1, (match.scores || []).length || 3);
  const sourceOdds = roundOdds.length ? roundOdds : Array.from({ length: rounds }, () => ({ a: 2, b: 2 }));
  return getTotalGoalsOdds(sourceOdds);
}

export async function getMatchFromHistory(matchId: string): Promise<MatchHistoryDoc | null> {
  const client = new sdk.Client().setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT).setKey(process.env.APPWRITE_KEY);
  const databases = new sdk.Databases(client);
  try {
    const doc = await databases.getDocument(process.env.APPWRITE_DATABASE_ID, 'matches_history', matchId);
    return parseMatchHistoryDoc(doc);
  } catch (err: any) {
    console.error('getMatch error', err);
    return null;
  }
}

export async function matchResults(matchId: string) {
    let totalSumGoals = 0;
    let totalSumMatches = 3;
    let totalSumPodlezani = 0;
    let totalSumVyrazecka = 0;

    const match = await getMatchFromHistory(matchId);
    if (!match) return null;

    const scores = match.scores || [];
    const players = match.players || [];

    const lostByGolden: Record<string, boolean> = {};
    scores.forEach((s: any) => {
      const golden = s?.goldenVyrazacka;
      if (!golden?.playerId) return;
      const a = Array.isArray(s.a) ? s.a : [];
      const b = Array.isArray(s.b) ? s.b : [];
      if (a.includes(golden.playerId)) {
        b.forEach((id: string) => { lostByGolden[id] = true; });
      } else if (b.includes(golden.playerId)) {
        a.forEach((id: string) => { lostByGolden[id] = true; });
      }
    });

    // prepare per-player accumulators
    const byId: Record<string, any> = {};
    players.forEach((p: any) => {
      byId[p.id] = {
        id: p.id,
        username: p.username,
        oldElo: p.oldElo,
        newElo: p.newElo,
        xpGained: 0,
        winsAdded: 0,
        losesAdded: 0,
        gamesAdded: 0,
        ten_zero_wins: 0,
        coinsGained: 0,
        vyrazecky: 0,
        ten_zero_loses: 0,
        goals_scored: 0,
        goals_conceded: 0,
      };
    });

    // per pairing resolution
    scores.forEach((s: any) => {
      const a = s.a || [];
      const b = s.b || [];
      const aScore = Number(s.scoreA || 0);
      const bScore = Number(s.scoreB || 0);

      // determine winner/loser/tie
      let winnerSide: 'a'|'b'|null = null;
      if (aScore > bScore) winnerSide = 'a';
      else if (bScore > aScore) winnerSide = 'b';
      // compute avg elos

      const a0 = players.find((x:any)=>x.id===a[0]);
      const a1 = players.find((x:any)=>x.id===a[1]);
      const b0 = players.find((x:any)=>x.id===b[0]);
      const b1 = players.find((x:any)=>x.id===b[1]);

      const avgA = avgElo(a0?.oldElo, a1?.oldElo);
      const avgB = avgElo(b0?.oldElo, b1?.oldElo);
      const diff = Math.abs(avgA - avgB);
      const adj = Math.min(10, Math.floor(diff / 25));

      totalSumGoals += aScore + bScore;

      if (winnerSide === 'a') {
        // winners a
        a.forEach((id:string) => {
          byId[id].winsAdded += 1;
          byId[id].xpGained += 15;
          byId[id].gamesAdded += 1;
          byId[id].goals_conceded += bScore;
          byId[id].xpGained += aScore;
          byId[id].coinsGained += 200; // +200 coins for winning
          byId[id].coinsGained += aScore * 2; // +2 coins per goal scored
          byId[id].goals_scored += aScore;
          if (aScore === 10 && bScore === 0) {
            byId[id].xpGained += 50;
            byId[id].ten_zero_wins += 1;
            totalSumPodlezani += 2;
          }
        });
        b.forEach((id:string) => {
          byId[id].goals_conceded += aScore;
          byId[id].goals_scored += bScore;
          byId[id].xpGained += bScore;
          byId[id].coinsGained += 100; // +100 coins participation reward
          byId[id].coinsGained += bScore * 2; // +2 coins per goal scored
          byId[id].losesAdded += 1;
          byId[id].xpGained += 5;
          byId[id].gamesAdded += 1;
        });

      } else if (winnerSide === 'b') {
        b.forEach((id:string) => {
          byId[id].winsAdded += 1;
          byId[id].xpGained += 15;
          byId[id].gamesAdded += 1;
          byId[id].xpGained += bScore;
          byId[id].coinsGained += 200; // +200 coins for winning
          byId[id].coinsGained += bScore * 2; // +2 coins per goal scored
          byId[id].goals_conceded += aScore;
          byId[id].goals_scored += bScore;
          if (bScore === 10 && aScore === 0) {
            byId[id].xpGained += 50;
            byId[id].ten_zero_wins += 1;
            totalSumPodlezani += 2;
          }
        });
        a.forEach((id:string) => {
          byId[id].goals_conceded += bScore;
          byId[id].goals_scored += aScore;
          byId[id].xpGained += aScore;
          byId[id].coinsGained += 100; // +100 coins participation reward
          byId[id].coinsGained += aScore * 2; // +2 coins per goal scored
          byId[id].losesAdded += 1;
          byId[id].xpGained += 5;
          byId[id].gamesAdded += 1;
        });
        
      } else {
        // tie -> treat as no wins/losses (no xp/elo)
        a.forEach((id:string)=> byId[id].gamesAdded += 1);
        b.forEach((id:string)=> byId[id].gamesAdded += 1);
      }
    });

    const totalRounds = scores.length || 0;
    // ultimate winner/loser logic
    const ids = Object.keys(byId);
    let ultimateWinnerId: string | null = null;
    let ultimateLoserId: string | null = null;
    ids.forEach(id=>{
      if (byId[id].winsAdded === totalRounds && totalRounds>0) ultimateWinnerId = id;
      if (byId[id].losesAdded === totalRounds && totalRounds>0) ultimateLoserId = id;
    });

    if (ultimateWinnerId) {
      // award ultimate winner
      ids.forEach(id=>{
        if (id === ultimateWinnerId) {
          byId[id].xpGained += 25;
        } else {
        }
      });
    }
    if (ultimateLoserId) {
      ids.forEach(id=>{
        if (id === ultimateLoserId) {
        } else {
        }
      });
    }

    // Add vyrazacka bonus: 10 XP per vyrazacka
    scores.forEach((s: any) => {
      if (s.vyrazacka) {
        Object.entries(s.vyrazacka).forEach(([playerId, vyrazeckaCount]: [string, any]) => {
          if (byId[playerId]) {
            byId[playerId].xpGained += Number(vyrazeckaCount) * 10;
            byId[playerId].vyrazecky += Number(vyrazeckaCount);
            totalSumVyrazecka += Number(vyrazeckaCount);
          }
        });
      }
    });

    const originalMatchId = match.matchId || matchId;
    const result = {
      matchId: originalMatchId,
      players: ids.map(id=>({
        id,
        username: byId[id].username,
        oldElo: byId[id].oldElo,
        newElo: byId[id].newElo,
        xpGained: byId[id].xpGained,
        coinsGained: byId[id].coinsGained,
        winsAdded: byId[id].winsAdded,
        losesAdded: byId[id].losesAdded,
        gamesAdded: byId[id].gamesAdded,
        // detailed breakdown
        eloBreakdown: computeEloBreakdown(id, byId[id], scores, players, totalRounds, ultimateWinnerId, ultimateLoserId),
        xpBreakdown: computeXpBreakdown(id, byId[id], scores, players, totalRounds, ultimateWinnerId),
      })),
      scores: scores.map((s:any) => {
        const aNames = (s.a || []).map((id:string) => {
          const p = players.find((x:any)=>x.id===id);
          return p ? p.username : id;
        });
        const bNames = (s.b || []).map((id:string) => {
          const p = players.find((x:any)=>x.id===id);
          return p ? p.username : id;
        });
        return {
          aNames,
          bNames,
          scoreA: s.scoreA,
          scoreB: s.scoreB,
        };
      }),
    };

    return result;
}

// Finish match endpoint: computes results, updates profiles, saves history, renders result
app.post("/v1/match/game/finish", async (c) => {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT;
    const apiKey = process.env.APPWRITE_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    let totalSumGoals = 0;
    let totalSumMatches = 3;
    let totalSumPodlezani = 0;
    let totalSumVyrazecka = 0;
  try {
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? c.req.query('matchId') ?? '');
    if (!matchId) return c.text('missing matchId', 400);

    const match = await getMatch(matchId);
    if (!match) return c.text('match not found', 404);

    const scores = match.scores || [];
    const players = match.players || [];

    const lostByGolden: Record<string, boolean> = {};
    scores.forEach((s: any) => {
      const golden = s?.goldenVyrazacka;
      if (!golden?.playerId) return;
      const a = Array.isArray(s.a) ? s.a : [];
      const b = Array.isArray(s.b) ? s.b : [];
      if (a.includes(golden.playerId)) {
        b.forEach((id: string) => { lostByGolden[id] = true; });
      } else if (b.includes(golden.playerId)) {
        a.forEach((id: string) => { lostByGolden[id] = true; });
      }
    });

    // prepare per-player accumulators
    const byId: Record<string, any> = {};
    players.forEach((p: any) => {
      byId[p.id] = {
        id: p.id,
        username: p.username,
        oldElo: p.elo,
        newElo: p.elo,
        xpGained: 0,
        coinsGained: 0,
        winsAdded: 0,
        losesAdded: 0,
        gamesAdded: 0,
        ten_zero_wins: 0,
        vyrazecky: 0,
        ten_zero_loses: 0,
        goals_scored: 0,
        goals_conceded: 0,
      };
    });

    // per pairing resolution
    scores.forEach((s: any) => {
      const a = s.a || [];
      const b = s.b || [];
      const aScore = Number(s.scoreA || 0);
      const bScore = Number(s.scoreB || 0);

      // determine winner/loser/tie
      let winnerSide: 'a'|'b'|null = null;
      if (aScore > bScore) winnerSide = 'a';
      else if (bScore > aScore) winnerSide = 'b';
      // compute avg elos

      const a0 = players.find((x:any)=>x.id===a[0]);
      const a1 = players.find((x:any)=>x.id===a[1]);
      const b0 = players.find((x:any)=>x.id===b[0]);
      const b1 = players.find((x:any)=>x.id===b[1]);

      const avgA = avgElo(a0?.elo, a1?.elo);
      const avgB = avgElo(b0?.elo, b1?.elo);
      const diff = Math.abs(avgA - avgB);
      const adj = Math.min(10, Math.floor(diff / 25));

      totalSumGoals += aScore + bScore;

      if (winnerSide === 'a') {
        // winners a
        a.forEach((id:string) => {
          byId[id].winsAdded += 1;
          byId[id].xpGained += 15;
          byId[id].newElo += 20;
          byId[id].coinsGained += 200; // +100 coins for winning
          byId[id].coinsGained += aScore * 2; // +2 coins per goal scored
          byId[id].gamesAdded += 1;
          byId[id].goals_conceded += bScore;
          byId[id].xpGained += aScore;
          byId[id].goals_scored += aScore;
          if (aScore === 10 && bScore === 0) {
            byId[id].xpGained += 50;
            byId[id].ten_zero_wins += 1;
            totalSumPodlezani += 0.5;
          }
        });
        b.forEach((id:string) => {
          byId[id].goals_conceded += aScore;
          byId[id].goals_scored += bScore;
          byId[id].xpGained += bScore;
          byId[id].coinsGained += 100; // +100 coins participation reward
          byId[id].coinsGained += bScore * 2; // +2 coins per goal scored (even if lost)
          byId[id].losesAdded += 1;
          byId[id].xpGained += 5;
          byId[id].newElo -= 20;
          byId[id].gamesAdded += 1;
          if (aScore === 10 && bScore === 0) {
            byId[id].ten_zero_loses += 1;
          }
        });
        // elo adjust by relative strength
        if (avgA > avgB) {
          // winners stronger -> penalty
          a.forEach((id:string) => byId[id].newElo -= adj);
          b.forEach((id:string) => byId[id].newElo += adj);
        } else if (avgA < avgB) {
          // winners weaker -> bonus
          a.forEach((id:string) => byId[id].newElo += adj);
          b.forEach((id:string) => byId[id].newElo -= adj);
        }
      } else if (winnerSide === 'b') {
        b.forEach((id:string) => {
          byId[id].winsAdded += 1;
          byId[id].xpGained += 15;
          byId[id].newElo += 20;
          byId[id].coinsGained += 200; // +100 coins for winning
          byId[id].coinsGained += bScore * 2; // +2 coins per goal scored
          byId[id].gamesAdded += 1;
          byId[id].xpGained += bScore;
          byId[id].goals_conceded += aScore;
          byId[id].goals_scored += bScore;
          if (bScore === 10 && aScore === 0) {
            byId[id].xpGained += 50;
            byId[id].ten_zero_wins += 1;
            totalSumPodlezani += 0.5;
          }
        });
        a.forEach((id:string) => {
          byId[id].goals_conceded += bScore;
          byId[id].goals_scored += aScore;
          byId[id].xpGained += aScore;
          byId[id].coinsGained += 100; // +100 coins participation reward
          byId[id].coinsGained += aScore * 2; // +2 coins per goal scored (even if lost)
          byId[id].losesAdded += 1;
          byId[id].xpGained += 5;
          byId[id].newElo -= 20;
          byId[id].gamesAdded += 1;
          if (bScore === 10 && aScore === 0) {
            byId[id].ten_zero_loses += 1;
          }
        });
        if (avgB > avgA) {
          b.forEach((id:string) => byId[id].newElo -= adj);
          a.forEach((id:string) => byId[id].newElo += adj);
        } else if (avgB < avgA) {
          b.forEach((id:string) => byId[id].newElo += adj);
          a.forEach((id:string) => byId[id].newElo -= adj);
        }
      } else {
        // tie -> treat as no wins/losses (no xp/elo)
        a.forEach((id:string)=> byId[id].gamesAdded += 1);
        b.forEach((id:string)=> byId[id].gamesAdded += 1);
      }
    });

    const totalRounds = scores.length || 0;
    // ultimate winner/loser logic
    const ids = Object.keys(byId);
    let ultimateWinnerId: string | null = null;
    let ultimateLoserId: string | null = null;
    ids.forEach(id=>{
      if (byId[id].winsAdded === totalRounds && totalRounds>0) ultimateWinnerId = id;
      if (byId[id].losesAdded === totalRounds && totalRounds>0) ultimateLoserId = id;
    });

    if (ultimateWinnerId) {
      // award ultimate winner
      ids.forEach(id=>{
        if (id === ultimateWinnerId) {
          byId[id].xpGained += 25;
          byId[id].newElo += 6;
        } else {
          byId[id].newElo -= 2;
        }
      });
    }
    if (ultimateLoserId) {
      ids.forEach(id=>{
        if (id === ultimateLoserId) {
          byId[id].newElo -= 3;
        } else {
          byId[id].newElo += 1;
        }
      });
    }

    // Add vyrazacka bonus: 10 XP per vyrazacka
    scores.forEach((s: any) => {
      if (s.vyrazacka) {
        Object.entries(s.vyrazacka).forEach(([playerId, vyrazeckaCount]: [string, any]) => {
          if (byId[playerId]) {
            byId[playerId].xpGained += Number(vyrazeckaCount) * 10;
            byId[playerId].vyrazecky += Number(vyrazeckaCount);
            totalSumVyrazecka += Number(vyrazeckaCount);
          }
        });
      }
    });

    // Prepare updates and history data
    const historyPlayers: HistoryPlayers[] = [];
    for (const id of ids) {
      const rec = byId[id];
      // compute final changes
      const oldElo = Math.round(rec.oldElo);
      const newElo = Math.round(rec.newElo);
      const eloDelta = newElo - oldElo;
      const xpGain = Math.max(0, Math.round(rec.xpGained));
      const coinsGain = Math.max(0, Math.round(rec.coinsGained));
      const winsAdd = rec.winsAdded || 0;
      const losesAdd = rec.losesAdded || 0;
      const ultimateWinInc = (ultimateWinnerId === id) ? 1 : 0;
      const ultimateLoseInc = (ultimateLoserId === id) ? 1 : 0;
      const gamesAdded = rec.gamesAdded || 0;

      let oldEloForResult = oldElo;
      let newEloForResult = newElo;

      // update DB profile
      try {
        const profile = await getPlayerProfileFast(id); // profile id or username may be used
        if (profile) {
          const oldEloTotal = Math.round(profile.elo || 0);
          const newEloTotal = oldEloTotal + eloDelta;
          const oldXp = profile.xp || 0;
          const newXp = oldXp + xpGain;
          const oldLevel = computeLevel(oldXp).level;
          const newLevel = computeLevel(newXp).level;
          
          await updatePlayerStatsAndMemory(profile.$id, {
            xp: newXp,
            elo: newEloTotal,
            wins: (profile.wins || 0) + winsAdd,
            loses: (profile.loses || 0) + losesAdd,
            ultimate_wins: (profile.ultimate_wins || 0) + ultimateWinInc,
            ultimate_loses: (profile.ultimate_loses || 0) + ultimateLoseInc,
            vyrazecky: (profile.vyrazecky || 0) + rec.vyrazecky,
            ten_zero_wins: (profile.ten_zero_wins || 0) + rec.ten_zero_wins,
            ten_zero_loses: (profile.ten_zero_loses || 0) + rec.ten_zero_loses,
            goals_scored: (profile.goals_scored || 0) + rec.goals_scored,
            goals_conceded: (profile.goals_conceded || 0) + rec.goals_conceded,
            coins: (profile.coins || 0) + coinsGain,
          });

          // Record achievements
          const timestamp = Date.now();

          // Level up achievement (only if level actually increased)
          if (newLevel > oldLevel) {
            await recordAchievement({
              timestamp,
              type: 'level_up',
              playerId: id,
              username: rec.username,
              data: {
                oldValue: oldLevel,
                newValue: newLevel,
                matchId,
              },
            });
          }
          
          // ELO rank changes — only record when rank tier/name actually changes
          if (newEloTotal !== oldEloTotal) {
            const oldRank = getRankInfoFromElo(oldEloTotal || 0);
            const newRank = getRankInfoFromElo(newEloTotal || 0);
            const rankChanged = oldRank.name !== newRank.name;

            if (rankChanged) {
              const type = newEloTotal > oldEloTotal ? 'elo_rank_up' : 'elo_rank_down';
              await recordAchievement({
                timestamp,
                type,
                playerId: id,
                username: rec.username,
                data: {
                  oldValue: oldEloTotal,
                  newValue: newEloTotal,
                  matchId,
                },
              });
            }
          }

          // 10-0 shutout wins
          if (rec.ten_zero_wins > 0) {
            await recordAchievement({
              timestamp,
              type: 'shutout_win',
              playerId: id,
              username: rec.username,
              data: {
                matchId,
              },
            });
          }

          // 0-10 losses (podlezani)
          if (rec.ten_zero_loses > 0) {
            await recordAchievement({
              timestamp,
              type: 'podlézání',
              playerId: id,
              username: rec.username,
              data: {
                matchId,
              },
            });
          }

          // Vyrazecky achievements
          if (rec.vyrazecky > 0) {
            await recordAchievement({
              timestamp,
              type: 'vyrazecka',
              playerId: id,
              username: rec.username,
              data: {
                vyrazeckaCount: rec.vyrazecky,
                matchId,
              },
            });
          }

          const newWins = (profile.wins || 0) + winsAdd;
          const newVyrazecky = (profile.vyrazecky || 0) + rec.vyrazecky;
          const newCoins = (profile.coins || 0) + coinsGain;
          const hasGoldenVyrazecka = (scores || []).some((s: any) => {
            const golden = s?.goldenVyrazacka;
            return golden?.playerId === id;
          });

          const unlocked = await updateAchievementProgressAndUnlock(id, rec.username, matchId, {
            matchWon: winsAdd > losesAdd,
            matchLost: losesAdd > winsAdd,
            matchUltimateWin: winsAdd === 3,
            matchUltimateLose: losesAdd === 3,
            hadShutoutWin: rec.ten_zero_wins > 0,
            lostByGoldenVyrazecka: !!lostByGolden[id],
            vyrazeckyAdded: rec.vyrazecky || 0,
            newLevel,
            newElo: newEloTotal,
            newCoins,
          });

          oldEloForResult = oldEloTotal;
          newEloForResult = newEloTotal;

          for (const def of unlocked) {
            await recordAchievement({
              timestamp,
              type: 'achievement_unlocked',
              playerId: id,
              username: rec.username,
              data: {
                achievementId: def.achievementId,
                achievementName: def.name,
                rewardCoins: def.rewardCoins,
                matchId,
              },
            });
          }
        }
      } catch (e) {
        console.error('failed updating profile', id, e);
      }

      historyPlayers.push({
        id,
        username: rec.username,
        oldElo: oldEloForResult,
        newElo: newEloForResult,
        xpGain,
        winsAdd,
        losesAdd,
        ultimateWinInc,
        ultimateLoseInc,
        gamesAdded,
      });

      // for result page
      byId[id].oldElo = oldEloForResult;
      byId[id].newElo = newEloForResult;
      byId[id].xpGained = xpGain;
    }

    // Save global stats document in Appwrite with JSON stringified
    try {
      if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite not configured for history');
      const client = new sdk.Client().setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT).setKey(process.env.APPWRITE_KEY);
      const databases = new sdk.Databases(client);
      
      try {
        const globalStats = await getGlobalStatsFast(); // profile id or username may be used
        if (globalStats) {
          await updateGlobalStatsAndMemory({
            totalGoals: (globalStats.totalGoals || 0) + totalSumGoals,
            totalMatches: (globalStats.totalMatches || 0) + totalSumMatches,
            totalPodlezani: (globalStats.totalPodlezani || 0) + totalSumPodlezani,
            totalVyrazecka: (globalStats.totalVyrazecka || 0) + totalSumVyrazecka,
          });
        }
      } catch (e) {
        console.error('failed updating gloal stats', e);
      }
    } catch (e) {
      console.error('failed to write match history', e);
    }

    // Save match history document in Appwrite with JSON stringified
    try {
      if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite not configured for history');
      const client = new sdk.Client().setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT).setKey(process.env.APPWRITE_KEY);
      const databases = new sdk.Databases(client);
      
      // convert scores and historyPlayers to JSON strings for storage
      const historyDoc = await databases.createDocument(
        databaseId,
        'matches_history',
        'unique()',
        {
          matchId,
          players_json: JSON.stringify(historyPlayers), // stringify
          scores_json: JSON.stringify(scores), // stringify
        }
      );
      invalidateMatchHistoryCache();

      // Update in-memory computed stats incrementally
      try {
        appendMatch(
          { players: historyPlayers, scores, createdAt: new Date().toISOString() },
          (date) => getCurrentSeasonIndex(date),
        );
      } catch (e) {
        console.error('failed to append to computed stats', e);
      }
    } catch (e) {
      console.error('failed to write match history', e);
    }

    // After history is saved, resolve bets
    try {
      await resolveBets(matchId, scores);
    } catch (e) {
      console.error('failed to resolve bets', e);
    }

    // Delete the match from database after finishing
    try {
      await deleteMatch(matchId);
    } catch (e) {
      console.error('failed to delete match after finish', e);
    }
  } catch (err: any) {
    console.error('finish match error', err);
    return c.text('Failed to finish match', 500);
  }

  return c.redirect(`/v1/match-history`);
});

// Place a bet endpoint
app.post("/v1/bet/place", async (c) => {
  try {
    const form = await c.req.formData();
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");

    const matchId = String(form.get("matchId") ?? "");
    const betAmount = Number(form.get("betAmount") ?? 0);
    const match1 = String(form.get("match1") ?? "");
    const match2 = String(form.get("match2") ?? "");
    const match3 = String(form.get("match3") ?? "");
    const vyrazackaOutcomeRaw = String(form.get("vyrazackaOutcome") ?? "");
    const totalGoalsRaw = form.get("totalGoals");

    if (!matchId || !Number.isFinite(betAmount) || betAmount < 1) {
      return c.text("Invalid bet parameters", 400);
    }

    const vyrazackaOutcome = (["zero", "gte1", "gte2", "gte3"].includes(vyrazackaOutcomeRaw)
      ? vyrazackaOutcomeRaw
      : "") as VyrazackaOutcome | "";
    const hasTotalGoals = totalGoalsRaw !== null && String(totalGoalsRaw).trim().length > 0;
    const totalGoals = hasTotalGoals ? Number(totalGoalsRaw) : null;

    if (hasTotalGoals && (!Number.isInteger(totalGoals) || Number(totalGoals) < 30 || Number(totalGoals) > 57)) {
      return c.text("Total goals must be between 30 and 57", 400);
    }

    const predictions: any = {};
    let predictionCount = 0;
    if (match1) { predictions.match1 = match1; predictionCount++; }
    if (match2) { predictions.match2 = match2; predictionCount++; }
    if (match3) { predictions.match3 = match3; predictionCount++; }
    if (vyrazackaOutcome) {
      predictions.vyrazackaOutcome = vyrazackaOutcome;
      predictionCount++;
    }
    if (hasTotalGoals) {
      predictions.totalGoals = Number(totalGoals);
      predictionCount++;
    }

    if (predictionCount === 0) {
      return c.text("Select at least one bet option", 400);
    }

    const match = await getMatch(matchId);
    if (!match) return c.text("Match not found", 404);

    const profile = await getPlayerProfileFast(username);
    if (!profile || (profile.coins || 0) < betAmount) {
      return c.text("Insufficient coins", 400);
    }

    const playerElosById = buildPlayerEloMap(match);
    const recentHistory = await listRecentMatchHistoryDocs(20);
    const recentFormById = buildRecentFormMap(match, recentHistory);
    const roundOdds = buildRoundOdds(match, playerElosById, recentFormById);
    const statsById = await buildPlayerStatsMap(match);
    const vyrazackaOutcomeOdds = buildVyrazackaOutcomeOdds(match, statsById);
    const totalGoalsOdds = buildTotalGoalsOdds(match, roundOdds);

    const odds: any = {};
    const oddsValues: number[] = [];
    if (match1) {
      const oddsValue = roundOdds[0]?.[match1 as keyof typeof roundOdds[0]] ?? 1.05;
      odds.match1 = oddsValue;
      oddsValues.push(oddsValue);
    }
    if (match2) {
      const oddsValue = roundOdds[1]?.[match2 as keyof typeof roundOdds[1]] ?? 1.05;
      odds.match2 = oddsValue;
      oddsValues.push(oddsValue);
    }
    if (match3) {
      const oddsValue = roundOdds[2]?.[match3 as keyof typeof roundOdds[2]] ?? 1.05;
      odds.match3 = oddsValue;
      oddsValues.push(oddsValue);
    }

    if (predictions.vyrazackaOutcome) {
      const value = vyrazackaOutcomeOdds[predictions.vyrazackaOutcome as VyrazackaOutcome] ?? 1.05;
      odds.vyrazackaOutcome = value;
      oddsValues.push(value);
    }

    if (Number.isFinite(Number(predictions.totalGoals))) {
      const value = totalGoalsOdds[Number(predictions.totalGoals)] ?? 1.05;
      odds.totalGoals = value;
      oddsValues.push(value);
    }

    const totalLegs = predictionCount;
    odds.total = Number((oddsValues.reduce((sum, value) => sum * value, 1)).toFixed(2));

    predictions._odds = odds;
    predictions._totalLegs = totalLegs;

    const existingBetsForMatch = await getBetsForMatch(matchId);
    const isDuplicateRecentBet = existingBetsForMatch.some((existingBet) => {
      if (existingBet.playerId !== profile.$id) return false;
      if (Number(existingBet.betAmount || 0) !== betAmount) return false;

      const existingPredictions = existingBet.predictions || {};
      const sameMatch1 = String(existingPredictions.match1 || "") === String(predictions.match1 || "");
      const sameMatch2 = String(existingPredictions.match2 || "") === String(predictions.match2 || "");
      const sameMatch3 = String(existingPredictions.match3 || "") === String(predictions.match3 || "");
      const sameVyrazackaOutcome = String(existingPredictions.vyrazackaOutcome || "") === String(predictions.vyrazackaOutcome || "");
      const sameTotalGoals = Number(existingPredictions.totalGoals || 0) === Number(predictions.totalGoals || 0);

      if (!(sameMatch1 && sameMatch2 && sameMatch3 && sameVyrazackaOutcome && sameTotalGoals)) {
        return false;
      }

      const createdAtMs = existingBet.$createdAt ? new Date(existingBet.$createdAt).getTime() : NaN;
      if (!Number.isFinite(createdAtMs)) return false;
      return Date.now() - createdAtMs <= 15_000;
    });

    if (isDuplicateRecentBet) {
      return c.redirect("/v1/f-bet");
    }

    // Deduct coins
    await updatePlayerStatsAndMemory(profile.$id, { coins: (profile.coins || 0) - betAmount });

    // Create bet
    await placeBet({
      playerId: profile.$id,
      username,
      matchId,
      predictions,
      betAmount,
      numMatches: [match1, match2, match3].filter(Boolean).length,
    });

    return c.redirect("/v1/f-bet");
  } catch (err: any) {
    console.error("place bet error:", err);
    return c.text("Failed to place bet", 500);
  }
});

// Free spin endpoint
app.post("/v1/f-bet/spin", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.json({ ok: false, message: "Not logged in" }, 401);
    const profile = await getPlayerProfileFast(username);
    if (!profile) return c.json({ ok: false, message: "Profile not found" }, 404);
    const result = await spin(profile.userId, profile.$id);
    return c.json(result);
  } catch (err: any) {
    console.error("spin endpoint error:", err);
    return c.json({ ok: false, message: "Spin failed" }, 500);
  }
});

// GET /v1/f-bet route (replace previous minimal implementation) - include per-match bets
app.get("/v1/f-bet", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    const profile = username ? await getPlayerProfileFast(username) : null;
    const spinState = profile ? await getSpinState(profile.userId) : { dayKey: "", used: 0, totalWon: 0, hitsByIndex: {}, totalSpins: 0, totalWonAllTime: 0 };
    const spinStatsData = getSpinStats();
    const spinNextReset = getNextResetIso();
    const playerPageRaw = Number(c.req.query("playerPage") ?? 1);
    const allPageRaw = Number(c.req.query("allPage") ?? 1);
    const playerPage = Number.isFinite(playerPageRaw) ? Math.max(1, Math.floor(playerPageRaw)) : 1;
    const allPage = Number.isFinite(allPageRaw) ? Math.max(1, Math.floor(allPageRaw)) : 1;
    const playerPageSize = 12;
    const allPageSize = 24;

    const allMatches = await listAvailableMatches();
    const allHistory = await listRecentMatchHistoryDocs(20);
    const allProfiles = await getAllPlayerProfilesCached();
    const profilesByKey = new Map<string, any>();
    allProfiles.forEach((profileRow: any) => {
      if (profileRow?.$id) profilesByKey.set(profileRow.$id, profileRow);
      if (profileRow?.userId) profilesByKey.set(profileRow.userId, profileRow);
      if (profileRow?.username) profilesByKey.set(profileRow.username, profileRow);
    });

    const recentBets = await getAllBets(50);
    const betsByMatchId = new Map<string, any[]>();
    recentBets.forEach((bet) => {
      const key = bet.matchId;
      if (!key) return;
      const row = betsByMatchId.get(key) || [];
      row.push(bet);
      betsByMatchId.set(key, row);
    });

    // enrich with bets for each match and only keep 'playing' matches
    const playingMatches: any[] = [];
    for (const m of allMatches) {
      const bets = betsByMatchId.get(m.$id) || [];
      const playerElosById = buildPlayerEloMap(m);
      const recentFormById = buildRecentFormMap(m, allHistory);
      const roundOdds = buildRoundOdds(m, playerElosById, recentFormById);
      const statsById = await buildPlayerStatsMap(m, profilesByKey);
      const vyrazackaOutcomeOdds = buildVyrazackaOutcomeOdds(m, statsById);
      const totalGoalsOdds = buildTotalGoalsOdds(m, roundOdds);
      const enriched = { ...m, bets, bettingOdds: roundOdds, vyrazackaOutcomeOdds, totalGoalsOdds };
      if (m.state === 'playing') playingMatches.push(enriched);
    }

    const playerBetsPageData = profile
      ? await getBetsForPlayerPaginated(profile.$id, playerPage, playerPageSize)
      : { bets: [], total: 0, page: 1, pageSize: playerPageSize };
    const allBetsHistoryPageData = await getAllBetsPaginated(allPage, allPageSize);
    const playerBets = playerBetsPageData.bets;
    const allBetsHistory = allBetsHistoryPageData.bets;
    const playerBetsTotalPages = Math.max(1, Math.ceil((playerBetsPageData.total || 0) / playerBetsPageData.pageSize));
    const allBetsTotalPages = Math.max(1, Math.ceil((allBetsHistoryPageData.total || 0) / allBetsHistoryPageData.pageSize));

    const historyByMatchId = new Map<string, MatchHistoryDoc>();
    allHistory.forEach((h) => {
      const key = h.matchId || h.$id;
      if (key) historyByMatchId.set(key, h);
    });

    const evaluateSubBets = (bet: any): Array<{ key: string; label: string; result: "correct" | "wrong" | "pending" }> => {
      const predictions = bet?.predictions || {};
      const history = historyByMatchId.get(bet?.matchId);
      if (!history) {
        const pendingRows: Array<{ key: string; label: string; result: "pending" }> = [];
        if (predictions.match1) pendingRows.push({ key: "match1", label: "Match 1", result: "pending" });
        if (predictions.match2) pendingRows.push({ key: "match2", label: "Match 2", result: "pending" });
        if (predictions.match3) pendingRows.push({ key: "match3", label: "Match 3", result: "pending" });
        if (predictions.vyrazackaOutcome) pendingRows.push({ key: "vyrazackaOutcome", label: "Vyrazecka", result: "pending" });
        if (Number.isFinite(Number(predictions.totalGoals))) pendingRows.push({ key: "totalGoals", label: "Total Goals", result: "pending" });
        if (predictions?.vyrazacka?.playerCounts && typeof predictions.vyrazacka.playerCounts === 'object') {
          Object.keys(predictions.vyrazacka.playerCounts).forEach((playerId) => {
            pendingRows.push({ key: `legacy-${playerId}`, label: `Legacy Vyrazecka ${playerId}`, result: "pending" });
          });
        }
        return pendingRows;
      }

      const scores = Array.isArray(history.scores) ? history.scores : [];
      const winners: ('a'|'b'|'tie')[] = scores.map((s: any) => {
        const a = Number(s?.scoreA || 0);
        const b = Number(s?.scoreB || 0);
        if (a > b) return 'a';
        if (b > a) return 'b';
        return 'tie';
      });

      const totalGoals = scores.reduce((sum: number, s: any) => sum + Number(s?.scoreA || 0) + Number(s?.scoreB || 0), 0);
      const totalVyrazacky = scores.reduce((sum: number, s: any) => {
        if (!s?.vyrazacka || typeof s.vyrazacka !== 'object') return sum;
        return sum + Object.values(s.vyrazacka).reduce((acc: number, v: any) => acc + Number(v || 0), 0);
      }, 0);
      const vyrazackyByPlayer: Record<string, number> = {};
      scores.forEach((s: any) => {
        if (!s?.vyrazacka || typeof s.vyrazacka !== 'object') return;
        Object.entries(s.vyrazacka).forEach(([playerId, count]: [string, any]) => {
          vyrazackyByPlayer[playerId] = (vyrazackyByPlayer[playerId] || 0) + Number(count || 0);
        });
      });

      const rows: Array<{ key: string; label: string; result: "correct" | "wrong" | "pending" }> = [];

      if (predictions.match1) {
        rows.push({ key: "match1", label: "Match 1", result: winners[0] === predictions.match1 ? "correct" : "wrong" });
      }
      if (predictions.match2) {
        rows.push({ key: "match2", label: "Match 2", result: winners[1] === predictions.match2 ? "correct" : "wrong" });
      }
      if (predictions.match3) {
        rows.push({ key: "match3", label: "Match 3", result: winners[2] === predictions.match3 ? "correct" : "wrong" });
      }
      if (predictions.vyrazackaOutcome) {
        const outcome = predictions.vyrazackaOutcome;
        const ok =
          (outcome === 'zero' && totalVyrazacky === 0) ||
          (outcome === 'gte1' && totalVyrazacky >= 1) ||
          (outcome === 'gte2' && totalVyrazacky >= 2) ||
          (outcome === 'gte3' && totalVyrazacky >= 3);
        rows.push({ key: "vyrazackaOutcome", label: "Vyrazecka", result: ok ? "correct" : "wrong" });
      }
      const totalGoalsPrediction = Number(predictions.totalGoals);
      if (Number.isFinite(totalGoalsPrediction) && totalGoalsPrediction >= 30) {
        rows.push({ key: "totalGoals", label: "Total Goals", result: totalGoalsPrediction === totalGoals ? "correct" : "wrong" });
      }
      if (predictions?.vyrazacka?.playerCounts && typeof predictions.vyrazacka.playerCounts === 'object') {
        Object.entries(predictions.vyrazacka.playerCounts).forEach(([playerId, minCount]: [string, any]) => {
          const ok = (vyrazackyByPlayer[playerId] || 0) >= Number(minCount || 0);
          rows.push({ key: `legacy-${playerId}`, label: `Legacy Vyrazecka ${playerId}`, result: ok ? "correct" : "wrong" });
        });
      }

      return rows;
    };

    const playerBetsEvaluated = playerBets.map((bet: any) => ({
      ...bet,
      subBetResults: evaluateSubBets(bet),
    }));

    const allBetsHistoryEvaluated = allBetsHistory.map((bet: any) => ({
      ...bet,
      subBetResults: evaluateSubBets(bet),
    }));

    const matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }> = {};

    for (const m of allMatches) {
      const nameById = new Map<string, string>();
      (m.players || []).forEach((p: MatchPlayer) => {
        nameById.set(p.id, p.username || p.id);
      });

      const rounds = (m.scores || []).slice(0, 3);
      const rows: any = {};
      rounds.forEach((round: any, idx: number) => {
        const key = `match${idx + 1}`;
        rows[key] = {
          a: (Array.isArray(round?.a) ? round.a : []).map((id: string) => nameById.get(id) || id),
          b: (Array.isArray(round?.b) ? round.b : []).map((id: string) => nameById.get(id) || id),
        };
      });
      if (Object.keys(rows).length > 0) {
        matchTeamInfoByMatchId[m.$id] = rows;
      }
    }

    for (const h of allHistory) {
      const key = h.matchId || h.$id;
      if (!key || matchTeamInfoByMatchId[key]) continue;

      const nameById = new Map<string, string>();
      (h.players || []).forEach((p: any) => {
        nameById.set(p.id, p.username || p.id);
      });

      const rounds = (h.scores || []).slice(0, 3);
      const rows: any = {};
      rounds.forEach((round: any, idx: number) => {
        const rowKey = `match${idx + 1}`;
        rows[rowKey] = {
          a: (Array.isArray(round?.a) ? round.a : []).map((id: string) => nameById.get(id) || id),
          b: (Array.isArray(round?.b) ? round.b : []).map((id: string) => nameById.get(id) || id),
        };
      });
      if (Object.keys(rows).length > 0) {
        matchTeamInfoByMatchId[key] = rows;
      }
    }

    return c.html(
      <MainLayout c={c}>
        <FBetPage
          c={c}
          currentUser={username}
          currentUserProfile={profile}
          availableMatches={playingMatches}
          playerBets={playerBetsEvaluated}
          allBetsHistory={allBetsHistoryEvaluated}
          playerBetsPage={playerBetsPageData.page}
          playerBetsTotalPages={playerBetsTotalPages}
          allBetsPage={allBetsHistoryPageData.page}
          allBetsTotalPages={allBetsTotalPages}
          matchTeamInfoByMatchId={matchTeamInfoByMatchId}
          spinsUsed={spinState.used}
          spinsTotalWon={spinState.totalWon}
          spinPrizes={SPIN_PRIZES}
          freeSpinsPerDay={FREE_SPINS_PER_DAY}
          spinHitsByIndex={spinStatsData.hitsByIndex}
          spinTotalSpins={spinStatsData.totalSpins}
          spinJackpotHits={spinStatsData.jackpotHits}
          spinNextResetIso={spinNextReset}
          spinResetHour={RESET_HOUR}
          myHitsByIndex={spinState.hitsByIndex}
          myTotalSpins={spinState.totalSpins}
          myTotalWonAllTime={spinState.totalWonAllTime}
        />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("f-bet page error:", err);
    return c.html(
      <MainLayout c={c}>
        <FBetPage c={c} currentUser={null} currentUserProfile={null} availableMatches={[]} playerBets={[]} allBetsHistory={[]} playerBetsPage={1} playerBetsTotalPages={1} allBetsPage={1} allBetsTotalPages={1} matchTeamInfoByMatchId={{}} spinsUsed={0} spinsTotalWon={0} spinPrizes={SPIN_PRIZES} freeSpinsPerDay={FREE_SPINS_PER_DAY} spinHitsByIndex={{}} spinTotalSpins={0} spinJackpotHits={[]} spinNextResetIso={getNextResetIso()} spinResetHour={RESET_HOUR} myHitsByIndex={{}} myTotalSpins={0} myTotalWonAllTime={0} />
      </MainLayout>
    );
  }
});

app.get("/v1/achievements", async (c) => {
  return c.redirect("/v1/lobby");
});

app.get("/v1/tournaments", (c) => {
  return c.html(
    <MainLayout c={c}>
      <TournamentsPage c={c} />
    </MainLayout>
  );
});

app.get("/v1/faq", async (c) => {
  try {
    const config = await getSiteContent('match_rules');
    const matchRules = config ? parseMatchRules(config.content) : DEFAULT_MATCH_RULES;
    
    return c.html(
      <MainLayout c={c}>
        <FAQPage c={c} matchRules={matchRules} />
      </MainLayout>,
    );
  } catch (error: any) {
    console.error('FAQ page error:', error);
    return c.html(
      <MainLayout c={c}>
        <FAQPage c={c} matchRules={DEFAULT_MATCH_RULES} />
      </MainLayout>,
    );
  }
});

app.get("/v1/hall-of-fame", async (c) => {
  try {
    const currentSeason = getCurrentSeasonIndex();
    const seasonRaw = Number(c.req.query("season"));
    const selectedSeason = Number.isFinite(seasonRaw)
      ? Math.max(0, Math.min(currentSeason, Math.floor(seasonRaw)))
      : currentSeason;

    const allProfiles = await getAllPlayerProfilesCached();
    const computed = getComputedStats();
    const seasonData = computed.seasonStats[String(selectedSeason)] || {};
    const topPlayers = allProfiles
      .map((p) => {
        const s = seasonData[p.$id];
        if (!s) return null;
        return { ...buildEmptySeasonPlayer(p.$id), ...p, elo: s.elo, wins: s.wins, loses: s.loses, vyrazecky: s.vyrazecky, goals_scored: s.goals_scored };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.elo - a.elo)
      .slice(0, 10);

    const finishedTournaments = (await listTournaments('finished'))
      .filter((t) => {
        const w = getSeasonWindow(selectedSeason);
        const finishedAt = t.finishedAt ? new Date(t.finishedAt) : null;
        if (!finishedAt || Number.isNaN(finishedAt.getTime())) return false;
        return finishedAt >= w.start && finishedAt < w.end;
      })
      .sort((a, b) => {
        const aTime = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
        const bTime = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
        return bTime - aTime;
      });

    return c.html(
      <MainLayout c={c}>
        <HallOfFamePage
          selectedSeason={selectedSeason}
          currentSeason={currentSeason}
          seasonIndexes={getAvailableSeasonIndexes()}
          topPlayers={topPlayers}
          finishedTournaments={finishedTournaments}
        />
      </MainLayout>
    );
  } catch (error: any) {
    console.error("Hall of Fame error:", error);
    return c.text("Failed to load Hall of Fame", 500);
  }
});

// Tournament creation
app.get("/v1/tournaments/create", (c) => {
  return c.html(
    <MainLayout c={c}>
      <CreateTournamentPage c={c} />
    </MainLayout>
  );
});

// Tournament detail page
app.get("/v1/tournaments/:id", (c) => {
  return c.html(
    <MainLayout c={c}>
      <TournamentDetailPage c={c} />
    </MainLayout>
  );
});

// Tournament bracket view
app.get("/v1/tournaments/:id/bracket", (c) => {
  return c.html(
    <MainLayout c={c}>
      <TournamentBracketPage c={c} />
    </MainLayout>
  );
});

// Tournament match page
app.get("/v1/tournaments/:id/match/:matchId", (c) => {
  return c.html(
    <MainLayout c={c}>
      <TournamentMatchPage c={c} />
    </MainLayout>
  );
});

// Tournament results/standings
app.get("/v1/tournaments/:id/results", (c) => {
  return c.html(
    <MainLayout c={c}>
      <TournamentResultsPage c={c} />
    </MainLayout>
  );
});

// Create team page
app.get("/v1/tournaments/:id/teams/create", (c) => {
  return c.html(
    <MainLayout c={c}>
      <CreateTeamPage c={c} />
    </MainLayout>
  );
});

// Join team page
app.get("/v1/tournaments/:id/teams/join", (c) => {
  return c.html(
    <MainLayout c={c}>
      <JoinTeamPage c={c} />
    </MainLayout>
  );
});

// ============ API Routes ============

// Create tournament
app.post("/v1/api/tournaments/create", async (c) => {
  try {
    const userId = getCookie(c, "user");
    if (!userId) return c.redirect("/v1/auth/login");
    
    const body = await c.req.formData();
    const name = body.get("name") as string;
    const description = body.get("description") as string;
    const maxTeams = parseInt(body.get("maxTeams") as string) || 16;

    const profile = await getPlayerProfileFast(userId);
    if (!profile) {
      return c.json({ error: "Player profile not found" }, 400);
    }

    const tournament = await createTournament(userId, name, maxTeams, description);
    return c.redirect(`/v1/tournaments/${tournament.$id}`);
  } catch (error: any) {
    console.error("Create tournament error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Create team
app.post("/v1/api/tournaments/:id/teams/create", async (c) => {
  try {
    const tournamentId = c.req.param("id");
    const userId = getCookie(c, "user");
    if (!userId) return c.redirect("/v1/auth/login");

    const profile = await getPlayerProfileFast(userId);
    if (!profile) {
      return c.json({ error: "Player profile not found" }, 400);
    }

    const team = await createTeam(tournamentId, userId, profile.username, profile.elo);
    return c.redirect(`/v1/tournaments/${tournamentId}`);
  } catch (error: any) {
    console.error("Create team error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Join team
app.post("/v1/api/tournaments/:tourId/teams/:teamId/join", async (c) => {
  try {
    const tournamentId = c.req.param("tourId");
    const teamId = c.req.param("teamId");
    const userId = getCookie(c, "user");
    if (!userId) return c.redirect("/v1/auth/login");

    const profile = await getPlayerProfileFast(userId);
    if (!profile) {
      return c.json({ error: "Player profile not found" }, 400);
    }

    const team = await joinTeam(teamId, userId, profile.username, profile.elo);
    return c.redirect(`/v1/tournaments/${tournamentId}`);
  } catch (error: any) {
    console.error("Join team error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Leave team (registration only)
app.post("/v1/api/tournaments/:id/teams/leave", async (c) => {
  try {
    const tournamentId = c.req.param("id");
    const userId = getCookie(c, "user");
    if (!userId) return c.redirect("/v1/auth/login");

    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return c.json({ error: "Tournament not found" }, 404);
    }

    if (tournament.status !== "registration") {
      return c.json({ error: "Tournament already started" }, 400);
    }

    await leaveTournamentTeam(tournamentId, userId);
    return c.redirect(`/v1/tournaments/${tournamentId}`);
  } catch (error: any) {
    console.error("Leave tournament error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Start tournament
app.post("/v1/api/tournaments/:id/start", async (c) => {
  try {
    const tournamentId = c.req.param("id");
    const userId = getCookie(c, "user");

    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return c.json({ error: "Tournament not found" }, 404);
    }

    if (tournament.creatorId !== userId) {
      return c.json({ error: "Only tournament creator can start" }, 403);
    }

    if (tournament.status !== "registration") {
      return c.json({ error: "Tournament is not in registration state" }, 400);
    }

    const teams = await getTournamentTeams(tournamentId);
    const lockedTeams = teams.filter((t) => t.status === "locked");

    if (lockedTeams.length < 2) {
      return c.json({ error: "Need at least 2 teams to start" }, 400);
    }

    // Update tournament status
    await updateTournamentStatus(tournamentId, "started");

    // Generate bracket
    const bracketMatches = generateDoubleEliminationBracket(lockedTeams);

    // Create bracket matches in database
    await createBracketMatches(tournamentId, bracketMatches);

    return c.redirect(`/v1/tournaments/${tournamentId}/bracket`);
  } catch (error: any) {
    console.error("Start tournament error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Start a match
app.post("/v1/api/tournaments/:tourId/match/:matchId/start", async (c) => {
  try {
    const tournamentId = c.req.param("tourId");
    const matchId = c.req.param("matchId");
    const userId = getCookie(c, "user");
    if (!userId) return c.redirect("/v1/auth/login");

    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return c.json({ error: "Tournament not found" }, 404);
    }
    if (tournament.status !== "started") {
      return c.json({ error: "Tournament has not started yet" }, 400);
    }

    const match = await getTournamentMatch(matchId);
    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }
    if (match.tournamentId !== tournamentId) {
      return c.json({ error: "Match does not belong to this tournament" }, 400);
    }

    const team1 = await getTeam(match.team1Id);
    const team2 = match.team2Id ? await getTeam(match.team2Id) : null;
    const userInMatch =
      team1?.player1.id === userId ||
      team1?.player2?.id === userId ||
      team2?.player1.id === userId ||
      team2?.player2?.id === userId;

    if (!userInMatch) {
      return c.json({ error: "Only match participants can start this match" }, 403);
    }

    if (match.state !== "waiting") {
      return c.json({ error: "Match cannot be started from current state" }, 400);
    }

    await updateMatchState(matchId, "playing");
    return c.redirect(`/v1/tournaments/${tournamentId}/match/${matchId}`);
  } catch (error: any) {
    console.error("Start match error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Finish a match
app.post("/v1/api/tournaments/:tourId/match/:matchId/finish", async (c) => {
  try {
    const tournamentId = c.req.param("tourId");
    const matchId = c.req.param("matchId");
    const userId = getCookie(c, "user");
    if (!userId) return c.redirect("/v1/auth/login");

    const body = await c.req.formData();

    const team1Score = parseInt(body.get("team1Score") as string) || 0;
    const team2Score = parseInt(body.get("team2Score") as string) || 0;

    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return c.json({ error: "Tournament not found" }, 404);
    }
    if (tournament.status !== "started") {
      return c.json({ error: "Tournament has not started yet" }, 400);
    }

    const match = await getTournamentMatch(matchId);
    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }

    if (match.tournamentId !== tournamentId) {
      return c.json({ error: "Match does not belong to this tournament" }, 400);
    }

    if (match.state !== "playing") {
      return c.json({ error: "Match is not in playing state" }, 400);
    }

    if (team1Score === team2Score) {
      return c.json({ error: "Match cannot end in a draw" }, 400);
    }

    const team1 = await getTeam(match.team1Id);
    const team2 = match.team2Id ? await getTeam(match.team2Id) : null;
    const userInMatch =
      team1?.player1.id === userId ||
      team1?.player2?.id === userId ||
      team2?.player1.id === userId ||
      team2?.player2?.id === userId;

    if (!userInMatch) {
      return c.json({ error: "Only match participants can submit score" }, 403);
    }

    // Determine winner
    let winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;

    await updateMatchState(matchId, "finished", team1Score, team2Score, winnerId);

    return c.redirect(`/v1/tournaments/${match.tournamentId}/bracket`);
  } catch (error: any) {
    console.error("Finish match error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// helper functions for detailed breakdowns
function computeEloBreakdown(playerId: string, rec: any, scores: any[], players: any[], totalRounds: number, ultimateWinnerId: string | null, ultimateLoserId: string | null) {
  const breakdown: any[] = [];
  let total = 0;

  scores.forEach((s: any, idx: number) => {
    const a = s.a || [];
    const b = s.b || [];
    const aScore = Number(s.scoreA || 0);
    const bScore = Number(s.scoreB || 0);

    let isWinner = false;
    let isLoser = false;
    let delta = 0;

    if (aScore > bScore) {
      isWinner = a.includes(playerId);
      isLoser = b.includes(playerId);
    } else if (bScore > aScore) {
      isWinner = b.includes(playerId);
      isLoser = a.includes(playerId);
    }

    const winnerTeam = aScore > bScore ? a : b;
    const loserTeam  = aScore > bScore ? b : a;
    
    const w0 = players.find(x => x.id === winnerTeam[0]);
    const w1 = players.find(x => x.id === winnerTeam[1]);
    const l0 = players.find(x => x.id === loserTeam[0]);
    const l1 = players.find(x => x.id === loserTeam[1]);
    
    const avgWinner = avgElo(w0.oldElo, w1.oldElo);
    const avgLoser  = avgElo(l0.oldElo, l1.oldElo);

    const diff = Math.abs(avgWinner - avgLoser);
    const adj = Math.min(10, Math.floor(diff / 25));

    if (isWinner) {
      delta = 20;
      breakdown.push({ match: idx + 1, reason: `Won match ${idx + 1}`, delta });
      total += delta;

      // strength adjustment
      if (avgWinner > avgLoser) {
        breakdown.push({ match: idx + 1, reason: `Stronger team penalty`, delta: -adj });
        total -= adj;
      } else if (avgWinner < avgLoser) {
        breakdown.push({ match: idx + 1, reason: `Weaker team bonus`, delta: adj });
        total += adj;
      }
    } else if (isLoser) {
      delta = -20;
      breakdown.push({ match: idx + 1, reason: `Lost match ${idx + 1}`, delta });
      total += delta;

      // strength adjustment
      if (avgWinner > avgLoser) {
        breakdown.push({ match: idx + 1, reason: `Weaker team bonus`, delta: +adj });
        total += adj;
      } else if (avgWinner < avgLoser) {
        breakdown.push({ match: idx + 1, reason: `Stronger team penalty`, delta: -adj });
        total -= adj;
      }
    }
  });

  if (ultimateWinnerId === playerId) {
    breakdown.push({ match: null, reason: `Ultimate winner bonus`, delta: 6 });
    total += 6;
  } else if (ultimateWinnerId && playerId !== ultimateWinnerId) {
    breakdown.push({ match: null, reason: `Ultimate winner penalty`, delta: -2 });
    total -= 2;
  }

  if (ultimateLoserId === playerId) {
    breakdown.push({ match: null, reason: `Ultimate loser penalty`, delta: -3 });
    total -= 3;
  } else if (ultimateLoserId && playerId !== ultimateLoserId) {
    breakdown.push({ match: null, reason: `Ultimate loser bonus`, delta: 1 });
    total += 1;
  }

  return { breakdown, total };
}

function computeXpBreakdown(playerId: string, rec: any, scores: any[], players: any[], totalRounds: number, ultimateWinnerId: string | null) {
  const breakdown: any[] = [];
  let total = 0;
  let totalGoals = 0;
  let totalVyrazacka = 0;

  scores.forEach((s: any, idx: number) => {
    const a = s.a || [];
    const b = s.b || [];
    const aScore = Number(s.scoreA || 0);
    const bScore = Number(s.scoreB || 0);

    let isWinner = false;
    let isLoser = false;

    if (aScore > bScore) {
      isWinner = a.includes(playerId);
      isLoser = b.includes(playerId);
    } else if (bScore > aScore) {
      isWinner = b.includes(playerId);
      isLoser = a.includes(playerId);
    }

    if (a.includes(playerId)) {
      totalGoals += aScore;
    } else if (b.includes(playerId)) {
      totalGoals += bScore;
    }

    // Count vyrazacka for this player
    const playerVyrazacka = s.vyrazacka?.[playerId] ?? 0;
    totalVyrazacka += playerVyrazacka;

    if (isWinner) {
      breakdown.push({ match: idx + 1, reason: `Won match ${idx + 1}`, delta: 15 });
      total += 15;

      if (aScore === 10 && bScore === 0) {
        breakdown.push({ match: idx + 1, reason: `Perfect win (10-0)`, delta: 50 });
        total += 50;
      } else if (bScore === 10 && aScore === 0) {
        breakdown.push({ match: idx + 1, reason: `Perfect win (10-0)`, delta: 50 });
        total += 50;
      }
    } else if (isLoser) {
      breakdown.push({ match: idx + 1, reason: `Lost match ${idx + 1}`, delta: 5 });
      total += 5;
    }
  });

  if (ultimateWinnerId === playerId) {
    breakdown.push({ match: null, reason: `Ultimate winner bonus`, delta: 25 });
    total += 25;
  }

  breakdown.push({ match: null, reason: `Number of goals`, delta: totalGoals });
  
  // Add vyrazacka XP bonus: 10 XP per vyrazacka
  const vyrazackaBonus = totalVyrazacka * 10;
  if (vyrazackaBonus > 0) {
    breakdown.push({ match: null, reason: `Vyrážečka bonus (${totalVyrazacka} × 10)`, delta: vyrazackaBonus });
    total += vyrazackaBonus;
  }

  return { breakdown, total };
}

// ============ ACHIEVEMENTS API ============

app.post("/v1/api/achievements/unlock", async (c) => {
  try {
    const form = await c.req.formData();
    const playerId = String(form.get("playerId") ?? '');
    const username = String(form.get("username") ?? '');
    const achievementId = String(form.get("achievementId") ?? '');
    const data = form.get("data") ? JSON.parse(String(form.get("data"))) : undefined;

    if (!playerId || !achievementId) {
      return c.json({ error: 'missing required fields' }, 400);
    }

    const result = await unlockAchievement(playerId, username, achievementId, data);
    
    if (!result) {
      return c.json({ alreadyUnlocked: true }, 200);
    }

    return c.json({ ok: true, achievement: result }, 201);
  } catch (err: any) {
    console.error('unlock achievement error', err);
    return c.json({ error: 'failed to unlock achievement' }, 500);
  }
});

app.get("/v1/api/achievements/player/:playerId", async (c) => {
  try {
    const playerId = c.req.param('playerId');
    if (!playerId) {
      return c.json({ error: 'playerId required' }, 400);
    }

    const achievements = await getPlayerAchievements(playerId);
    return c.json({ achievements }, 200);
  } catch (err: any) {
    console.error('get achievements error', err);
    return c.json({ error: 'failed to fetch achievements' }, 500);
  }
});

// ---- Feature Requests ----

app.get("/v1/feature-requests", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    if (!username) return c.redirect("/v1/auth/login");
    const profile = await getPlayerProfileFast(username);
    if (!profile) return c.redirect("/v1/auth/login");
    const requests = await listFeatureRequests();
    return c.html(
      <MainLayout c={c}>
        <FeatureRequestsPage c={c} requests={requests} currentUser={username} currentUserId={profile.$id} isAdmin={isAdminUsername(username)} />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("Feature requests error:", err);
    return c.text("Failed to load feature requests", 500);
  }
});

app.post("/v1/feature-requests/create", async (c) => {
  const username = getCookie(c, "user") ?? null;
  if (!username) return c.redirect("/v1/auth/login");
  const profile = await getPlayerProfileFast(username);
  if (!profile) return c.redirect("/v1/auth/login");
  const form = await c.req.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!title || title.length < 3) return c.text("Nazov musi mat aspon 3 znaky", 400);
  await createFeatureRequest(profile.$id, username, title, description);
  return c.redirect("/v1/feature-requests");
});

app.post("/v1/feature-requests/update", async (c) => {
  const username = getCookie(c, "user") ?? null;
  if (!username) return c.redirect("/v1/auth/login");
  const form = await c.req.formData();
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!id || !title) return c.text("Missing data", 400);
  await updateFeatureRequest(id, title, description);
  return c.redirect("/v1/feature-requests");
});

app.post("/v1/feature-requests/delete", async (c) => {
  const username = getCookie(c, "user") ?? null;
  if (!username) return c.redirect("/v1/auth/login");
  const form = await c.req.formData();
  const id = String(form.get("id") ?? "");
  if (!id) return c.text("Missing id", 400);
  await deleteFeatureRequest(id);
  return c.redirect("/v1/feature-requests");
});

app.post("/v1/feature-requests/upvote", async (c) => {
  const username = getCookie(c, "user") ?? null;
  if (!username) return c.redirect("/v1/auth/login");
  const profile = await getPlayerProfileFast(username);
  if (!profile) return c.redirect("/v1/auth/login");
  const form = await c.req.formData();
  const id = String(form.get("id") ?? "");
  if (!id) return c.text("Missing id", 400);
  await toggleUpvote(id, profile.$id);
  return c.redirect("/v1/feature-requests");
});

app.post("/v1/feature-requests/status", async (c) => {
  const username = getCookie(c, "user") ?? null;
  if (!username || !isAdminUsername(username)) return c.text("Unauthorized", 403);
  const form = await c.req.formData();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as any;
  if (!id || !['open', 'done', 'rejected'].includes(status)) return c.text("Invalid data", 400);
  await setRequestStatus(id, status);
  return c.redirect("/v1/feature-requests");
});

app.post("/v1/feature-requests/toggle", async (c) => {
  const username = getCookie(c, "user") ?? null;
  if (!username) return c.redirect("/v1/auth/login");
  const form = await c.req.formData();
  const id = String(form.get("id") ?? "");
  const flag = String(form.get("flag") ?? "");
  if (!id || (flag !== 'isDone' && flag !== 'isTested')) return c.text("Invalid data", 400);
  await toggleFlag(id, flag);
  return c.redirect("/v1/feature-requests");
});

// Load all data into memory at server start
(async () => {
  try {
    // Load profiles + global stats into memory (2 DB reads total)
    await loadAllIntoMemory();

    // Build computed stats from match history (N reads, one-time)
    console.log('[init] Building computed stats from match history...');
    const allMatches = await listRecentMatchHistoryDocs(10000);
    buildFromMatchHistory(allMatches, (date) => getCurrentSeasonIndex(date));
    console.log('[init] Computed stats ready');
  } catch (e) {
    console.error('[init] Failed to initialize:', e);
  }
})();

export default app;
