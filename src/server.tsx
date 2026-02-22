import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { Homepage } from "./pages/auth/homepage";
import { MainLayout } from "./main";
import { listAllUsersForAdmin, loginUser, registerUser, resetUserPasswordById } from "./logic/auth";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { AdminLoginPage } from "./pages/auth/adminLogin";
import { LobbyPage } from "./pages/menu/lobby";
import { LeaderboardPage } from "./pages/menu/leaderboard";
import { GraphsPage } from "./pages/menu/graphs";
import { getAllPlayerProfiles, getGlobalStats, getPlayerProfile, updateGlobalStats, updatePlayerStats } from "./logic/profile";
import { getAllPlayersEloHistory } from "./logic/graphs";
import { findOrCreateAndJoin, getMatch, startMatch, MatchDoc, MatchPlayer, leaveMatch, findPlayingMatch, deleteMatch, finishMatch, parseDoc, parseMatchHistoryDoc, MatchHistoryDoc, HistoryPlayers, createMatch, joinMatch, listAvailableMatches } from "./logic/match";
import { MatchLobbyPage } from "./pages/match/matchLobby";
import { updateGameScores } from "./logic/match";
import { MatchGamePage } from "./pages/match/matchGame";
import { MatchResultPage } from "./pages/match/matchResult";
import { findCurrentMatch } from "./logic/match";
import { MatchHistoryPage } from "./pages/menu/matchHistory";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { FBetPage } from "./pages/menu/f-bet";
import { AchievementsPage } from "./pages/menu/achievements";
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
import { recordAchievement } from "./logic/dailyAchievements";
import { checkAndUnlockMatchAchievements, unlockAchievement, getPlayerAchievements } from "./logic/achievements";
import { computeLevel, getRankInfoFromElo } from "./static/data";
import { placeBet, getBetsForMatch, resolveBets, MULTIPLIERS, getBetsForPlayer, getRoundOdds, getVyrazackaOdds } from "./logic/betting";
import { aggregateSeasonStats, buildEmptySeasonPlayer, filterMatchesForSeason, getAvailableSeasonIndexes, getCurrentSeasonIndex, getScopeFromQuery, getSeasonLabel, getSeasonWindow, StatsScope } from "./logic/season";
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

let seasonRolloverInProgress = false;
let seasonRolloverTimer: Timer | null = null;

function applyEloSeasonReset(elo: number): number {
  const value = Number(elo || 0);
  const delta = value - 500;
  const sign = delta >= 0 ? 1 : -1;
  const dist = Math.abs(delta);

  let compressedDist = 0;
  if (dist <= 300) {
    compressedDist = dist * 0.8;
  } else if (dist <= 500) {
    compressedDist = 240 + (dist - 300) * 0.7;
  } else if (dist <= 700) {
    compressedDist = 380 + (dist - 500) * 0.6;
  } else {
    compressedDist = 500 + (dist - 700) * 0.5;
  }

  return Math.max(0, Math.round(500 + sign * compressedDist));
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
  if (seasonRolloverInProgress) return;

  const currentSeason = getCurrentSeasonIndex();
  const lastProcessed = readLastProcessedSeason();

  if (currentSeason <= lastProcessed) return;

  seasonRolloverInProgress = true;
  try {
    for (let season = lastProcessed + 1; season <= currentSeason; season++) {
      if (season <= 0) continue;

      const players = await getAllPlayerProfiles();
      for (const player of players) {
        const shrunkElo = applyEloSeasonReset(player.elo || 500);
        if (shrunkElo !== (player.elo || 0)) {
          try {
            await updatePlayerStats(player.$id, { elo: shrunkElo });
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
    c.req.path.startsWith("/v1/auth/")
  ) {
    await next();
    return;
  }

  // Check for user cookie on protected routes
  const user = getCookie(c, "user") ?? "";

  if (user) {
    const activeMatch = await findCurrentMatch(user);

  // ❗ do not redirect JSON/API endpoints
  const isApiRequest = c.req.header("Accept")?.includes("application/json")
                    || c.req.path.startsWith("/v1/match/state")
                    || c.req.path.startsWith("/v1/match/list")
                    || c.req.path.startsWith("/v1/match/game/score")
                    || c.req.path.startsWith("/v1/match/game/vyrazacka")
                    || c.req.path.startsWith("/v1/match/game/golden-vyrazacka");

  // if (!isApiRequest && activeMatch) {

  //   if (activeMatch.state === "playing" &&
  //       !c.req.path.startsWith("/v1/match/game")) {
  //     return c.redirect(`/v1/match/game`);
  //   }

  //   // if (activeMatch.state === "open" &&
  //   //     !c.req.path.startsWith("/v1/match/lobby")) {
  //   //   return c.redirect(`/v1/match/lobby`);
  //   // }
  // }
  }

  
  if (!user && c.req.path.startsWith("/v1/")) {
    return c.redirect("/v1/auth/login");
  }

  await next();
});

app.get("/v1/changes-log", async (c) => {
  const changes = [
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
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT!)
    .setKey(process.env.APPWRITE_KEY!);

  const databases = new sdk.Databases(client);

  const res = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID!,
    'matches_history',
    [sdk.Query.orderDesc("$createdAt")]
  );

  // parse each document as match history (includes elo deltas / xp gains)
  const matches = res.documents.map((doc: any) => (parseMatchHistoryDoc(doc)));

  const user = getCookie(c, "user") ?? null;

  return c.html(
    <MainLayout c={c}>
      <MatchHistoryPage c={c} matches={matches} currentUser={user} filterUsername={null} />
    </MainLayout>
  );
});

app.get("/v1/match-history/players/:username", async (c) => {
  const username = c.req.param("username");

  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT!)
    .setKey(process.env.APPWRITE_KEY!);

  const databases = new sdk.Databases(client);

  // Fetch ALL documents with pagination
  let allDocuments: any[] = [];
  let offset = 0;
  const limit = 100; // Fetch 100 at a time

  while (true) {
    const res = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      'matches_history',
      [
        sdk.Query.orderDesc("$createdAt"),
        sdk.Query.limit(limit),
        sdk.Query.offset(offset)
      ]
    );

    if (res.documents.length === 0) break;
    
    allDocuments = allDocuments.concat(res.documents);
    offset += limit;
    
    // Safety check to prevent infinite loops
    if (allDocuments.length > 10000) {
      break;
    }
  }

  // parse each document similar to match docs
  const matches = allDocuments
  .filter((doc: any) => {
    try {
      // Parse JSON if it's a string
      let players = typeof doc.players_json === "string"
        ? JSON.parse(doc.players_json)
        : doc.players_json;
      
      if (!Array.isArray(players)) {
        return false;
      }
      
      const hasPlayer = players.some((p: any) => p.id === username);
      return hasPlayer;
    } catch (err: any) {
      return false;
    }
  })
  .map((doc: any) => parseMatchHistoryDoc(doc));

  return c.html(
    <MainLayout c={c}>
      <MatchHistoryPage c={c} matches={matches} currentUser={null} filterUsername={username} />
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

    const overallProfile = await getPlayerProfile(username);
    const overallGlobalStats = await getGlobalStats();

    let playerData = overallProfile;
    let globalStats = overallGlobalStats;

    if (overallProfile && scope !== "overall") {
      const allProfiles = await getAllPlayerProfiles();
      const allMatches = await listAllMatchHistoryDocs();
      const seasonMatches = filterMatchesForSeason(allMatches, selectedSeasonIndex);
      const seasonAggregate = aggregateSeasonStats(seasonMatches, allProfiles);

      const seasonProfile = seasonAggregate.players.find((p) => p.$id === overallProfile.$id);
      const base = seasonProfile ?? buildEmptySeasonPlayer(overallProfile.$id);

      playerData = {
        ...overallProfile,
        wins: base.wins,
        loses: base.loses,
        ultimate_wins: base.ultimate_wins,
        ultimate_loses: base.ultimate_loses,
        xp: overallProfile.xp,
        elo: base.elo,
        vyrazecky: base.vyrazecky,
        goals_scored: base.goals_scored,
        goals_conceded: base.goals_conceded,
        ten_zero_wins: base.ten_zero_wins,
        ten_zero_loses: base.ten_zero_loses,
      };

      globalStats = seasonAggregate.globalStats;
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

async function listAllMatchHistoryDocs(): Promise<MatchHistoryDoc[]> {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_KEY);
  const databases = new sdk.Databases(client);

  let allDocuments: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      'matches_history',
      [
        sdk.Query.orderDesc("$createdAt"),
        sdk.Query.limit(limit),
        sdk.Query.offset(offset),
      ]
    );

    if (res.documents.length === 0) break;

    allDocuments = allDocuments.concat(res.documents);
    offset += limit;

    if (allDocuments.length > 10000) break;
  }

  return allDocuments.map((doc: any) => parseMatchHistoryDoc(doc));
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
    const allProfiles = await getAllPlayerProfiles();
    const username = getCookie(c, "user") ?? undefined;
    const { scope, selectedSeasonIndex, currentSeasonIndex, availableSeasonIndexes } = resolveSeasonSelection(c);
    const allMatches = await listAllMatchHistoryDocs();
    const parsedMatches = scope === "overall"
      ? allMatches
      : filterMatchesForSeason(allMatches, selectedSeasonIndex);

    const players = scope === "overall"
      ? allProfiles
      : aggregateSeasonStats(parsedMatches, allProfiles).players.map((seasonRow) => {
          const overall = allProfiles.find((p) => p.$id === seasonRow.$id);
          return {
            ...seasonRow,
            xp: overall?.xp ?? seasonRow.xp,
          };
        });

    const duoMatches = parsedMatches.map((match: MatchHistoryDoc) => ({
      $id: match.$id,
      createdAt: match.createdAt,
      players: (match.players || []).map((p: HistoryPlayers) => ({
        id: p.id,
        username: p.username,
      })),
      scores: (match.scores || []).map((s: any) => ({
        a: s.a,
        b: s.b,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
      })),
    }));

    const goldenScoredMap = new Map<string, {
      teamIds: string[];
      teamNames: string[];
      count: number;
      scorers: Map<string, { id: string; username: string; count: number }>;
    }>();
    const goldenReceivedMap = new Map<string, {
      teamIds: string[];
      teamNames: string[];
      count: number;
      scorers: Map<string, { id: string; username: string; count: number }>;
    }>();

    parsedMatches.forEach((match: MatchHistoryDoc) => {
      const nameById = new Map<string, string>();
      (match.players || []).forEach((p: HistoryPlayers) => nameById.set(p.id, p.username));

      const rounds = match.scores || [];
      rounds.forEach((s: any) => {
        const golden = s?.goldenVyrazacka;
        if (!golden || !golden.playerId) return;

        const a = Array.isArray(s.a) ? s.a : [];
        const b = Array.isArray(s.b) ? s.b : [];
        if (!a.length || !b.length) return;

        let scoringSide = golden.side;
        if (scoringSide !== 'a' && scoringSide !== 'b') {
          if (a.includes(golden.playerId)) scoringSide = 'a';
          else if (b.includes(golden.playerId)) scoringSide = 'b';
        }
        if (scoringSide !== 'a' && scoringSide !== 'b') return;

        const scoringTeamIds = scoringSide === 'a' ? a : b;
        const receivingTeamIds = scoringSide === 'a' ? b : a;

        const scoringTeamNames = scoringTeamIds.map((id: string) => nameById.get(id) || id);
        const receivingTeamNames = receivingTeamIds.map((id: string) => nameById.get(id) || id);

        const scorerName = nameById.get(golden.playerId) || golden.playerId;

        addGoldenStat(goldenScoredMap, scoringTeamIds, scoringTeamNames, golden.playerId, scorerName);
        addGoldenStat(goldenReceivedMap, receivingTeamIds, receivingTeamNames, golden.playerId, scorerName);
      });
    });

    const goldenTeamsScored = Array.from(goldenScoredMap.values()).map((row) => ({
      teamIds: row.teamIds,
      teamNames: row.teamNames,
      count: row.count,
      scorers: Array.from(row.scorers.values()).sort((a, b) => b.count - a.count),
    })).sort((a, b) => b.count - a.count);

    const goldenTeamsReceived = Array.from(goldenReceivedMap.values()).map((row) => ({
      teamIds: row.teamIds,
      teamNames: row.teamNames,
      count: row.count,
      scorers: Array.from(row.scorers.values()).sort((a, b) => b.count - a.count),
    })).sort((a, b) => b.count - a.count);

    return c.html(
      <MainLayout c={c}>
        <LeaderboardPage
          players={players}
          currentPlayer={username}
          duoMatches={duoMatches}
          goldenTeamsScored={goldenTeamsScored}
          goldenTeamsReceived={goldenTeamsReceived}
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

// Graphs page - show Elo history over time
app.get("/v1/graphs", async (c) => {
  try {
    const eloHistories = await getAllPlayersEloHistory();
    
    return c.html(
      <MainLayout c={c}>
        <GraphsPage c={c} eloHistories={eloHistories} />
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
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();
    const confirm = String(form.get("confirmPassword") ?? "").trim();

    if (!username || username.length < 3) {
      return c.text("Username must be at least 3 characters", 400);
    }
    if (isAdminUsername(username)) {
      return c.text("This username is reserved", 400);
    }
    if (!password || password.length < 6) {
      return c.text("Password must be at least 6 characters", 400);
    }
    if (password !== confirm) {
      return c.text("Passwords do not match", 400);
    }

    // create user in Appwrite
    await registerUser(username, password);

    // set a simple cookie and redirect to lobby
    c.res.headers.set("Set-Cookie", buildUserCookie(username));
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
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!username || !password) {
      return c.text("Username and password required", 400);
    }

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
    const amountRaw = Number(form.get("amount") ?? 0);
    const amount = Math.floor(amountRaw);

    if (!recipientUsername) return c.text("Recipient is required", 400);
    if (!Number.isFinite(amount) || amount <= 0) return c.text("Invalid amount", 400);
    if (recipientUsername === senderUsername) return c.text("Cannot send coins to yourself", 400);

    const senderProfile = await getPlayerProfile(senderUsername);
    const recipientProfile = await getPlayerProfile(recipientUsername);

    if (!senderProfile || !recipientProfile) return c.text("Player not found", 404);
    if ((senderProfile.coins || 0) < amount) return c.text("Insufficient coins", 400);

    await updatePlayerStats(senderProfile.$id, { coins: (senderProfile.coins || 0) - amount });
    await updatePlayerStats(recipientProfile.$id, { coins: (recipientProfile.coins || 0) + amount });

    return c.redirect("/v1/lobby");
  } catch (err: any) {
    console.error("send coins error:", err);
    return c.text("Failed to send coins", 500);
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
    const profile = await getPlayerProfile(username);
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

    return c.html(
      <MainLayout c={c}>
        <MatchLobbyPage c={c} currentUser={username} />
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
    const profile = await getPlayerProfile(username);
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
      const profile = await getPlayerProfile(username);
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
    const profile = await getPlayerProfile(username);
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
    const profile = await getPlayerProfile(username);
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

async function buildPlayerStatsMap(match: MatchDoc): Promise<Record<string, { vyrazecky: number; wins: number; loses: number }>> {
  const map: Record<string, { vyrazecky: number; wins: number; loses: number }> = {};
  for (const p of match.players || []) {
    let profile = null;
    try {
      profile = await getPlayerProfile(p.id);
    } catch {
      profile = null;
    }
    if (!profile && p.username && p.username !== p.id) {
      try {
        profile = await getPlayerProfile(p.username);
      } catch {
        profile = null;
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

function buildRoundOdds(match: MatchDoc, playerElosById: Record<string, number>): { a: number; b: number }[] {
  return (match.scores || []).map((s: any) => getRoundOdds(s.a || [], s.b || [], playerElosById));
}

function buildVyrazackaOdds(
  match: MatchDoc,
  statsById: Record<string, { vyrazecky: number; wins: number; loses: number }>,
  minCounts: number[]
): Record<string, Record<number, number>> {
  const rounds = (match.scores || []).length || 3;
  const oddsByPlayer: Record<string, Record<number, number>> = {};
  (match.players || []).forEach((p: MatchPlayer) => {
    const stats = statsById[p.id] || { vyrazecky: 0, wins: 0, loses: 0 };
    oddsByPlayer[p.id] = {};
    minCounts.forEach((minCount) => {
      oddsByPlayer[p.id][minCount] = getVyrazackaOdds(stats, minCount, rounds);
    });
  });
  return oddsByPlayer;
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
          byId[id].coinsGained += 100; // +100 coins for winning
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
          byId[id].coinsGained += 100; // +100 coins for winning
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
      const oldElo = rec.oldElo;
      const newElo = Math.round(rec.newElo);
      const xpGain = Math.max(0, Math.round(rec.xpGained));
      const coinsGain = Math.max(0, Math.round(rec.coinsGained));
      const winsAdd = rec.winsAdded || 0;
      const losesAdd = rec.losesAdded || 0;
      const ultimateWinInc = (ultimateWinnerId === id) ? 1 : 0;
      const ultimateLoseInc = (ultimateLoserId === id) ? 1 : 0;
      const gamesAdded = rec.gamesAdded || 0;

      // update DB profile
      try {
        const profile = await getPlayerProfile(id); // profile id or username may be used
        if (profile) {
          const oldXp = profile.xp || 0;
          const newXp = oldXp + xpGain;
          const oldLevel = computeLevel(oldXp).level;
          const newLevel = computeLevel(newXp).level;
          
          await updatePlayerStats(profile.$id, {
            xp: newXp,
            elo: (profile.elo || 0) + (newElo - oldElo),
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
          if (newElo !== oldElo) {
            const oldRank = getRankInfoFromElo(oldElo || 0);
            const newRank = getRankInfoFromElo(newElo || 0);
            const rankChanged = oldRank.name !== newRank.name;

            if (rankChanged) {
              const type = newElo > oldElo ? 'elo_rank_up' : 'elo_rank_down';
              await recordAchievement({
                timestamp,
                type,
                playerId: id,
                username: rec.username,
                data: {
                  oldValue: oldElo,
                  newValue: newElo,
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
          const newEloTotal = (profile.elo || 0) + (newElo - oldElo);
          const newVyrazecky = (profile.vyrazecky || 0) + rec.vyrazecky;
          const hasGoldenVyrazecka = (scores || []).some((s: any) => {
            const golden = s?.goldenVyrazacka;
            return golden?.playerId === id;
          });

          await checkAndUnlockMatchAchievements(id, rec.username, matchId, {
            wins: newWins,
            elo: newEloTotal,
            level: newLevel,
            vyrazecky: newVyrazecky,
            tenZeroWins: (profile.ten_zero_wins || 0) + rec.ten_zero_wins,
            winsAdded: winsAdd,
            hadShutoutWin: rec.ten_zero_wins > 0,
            hasGoldenVyrazecka,
          });
        }
      } catch (e) {
        console.error('failed updating profile', id, e);
      }

      historyPlayers.push({
        id,
        username: rec.username,
        oldElo,
        newElo,
        xpGain,
        winsAdd,
        losesAdd,
        ultimateWinInc,
        ultimateLoseInc,
        gamesAdded,
      });

      // for result page
      byId[id].oldElo = oldElo;
      byId[id].newElo = newElo;
      byId[id].xpGained = xpGain;
    }

    // Save global stats document in Appwrite with JSON stringified
    try {
      if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite not configured for history');
      const client = new sdk.Client().setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT).setKey(process.env.APPWRITE_KEY);
      const databases = new sdk.Databases(client);
      
      try {
        const globalStats = await getGlobalStats(); // profile id or username may be used
        if (globalStats) {
          await updateGlobalStats({
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
    const numMatches = Number(form.get("numMatches") ?? 1);
    const match1 = String(form.get("match1") ?? "");
    const match2 = String(form.get("match2") ?? "");
    const match3 = String(form.get("match3") ?? "");
    const vyrazackaMin = Number(form.get("vyrazackaMin") ?? 0);

    if (!matchId || betAmount < 1 || ![0,1,2,3].includes(numMatches)) {
      return c.text("Invalid bet parameters", 400);
    }

    const predictions: any = {};
    let predictionCount = 0;
    if (match1) { predictions.match1 = match1; predictionCount++; }
    if (match2) { predictions.match2 = match2; predictionCount++; }
    if (match3) { predictions.match3 = match3; predictionCount++; }

    if (predictionCount !== numMatches) {
      return c.text(`Please select ${numMatches} predictions`, 400);
    }

    const vyrazackaPlayerCounts: Record<string, number> = {};
    for (const [key, value] of Array.from(form.entries())) {
      if (!key.startsWith("vyrazackaCount_")) continue;
      const playerId = key.replace("vyrazackaCount_", "");
      const count = Number(value || 0);
      if (playerId && count > 0) {
        vyrazackaPlayerCounts[playerId] = count;
      }
    }

    if (Object.keys(vyrazackaPlayerCounts).length === 0 && numMatches === 0) {
      return c.text("Select matches or a vyrazacka bet", 400);
    }

    const match = await getMatch(matchId);
    if (!match) return c.text("Match not found", 404);

    if (Object.keys(vyrazackaPlayerCounts).length) {
      const matchPlayerIds = new Set((match.players || []).map((p: MatchPlayer) => p.id));
      const allInMatch = Object.keys(vyrazackaPlayerCounts).every((id) => matchPlayerIds.has(id));
      if (!allInMatch) return c.text("Vyrazacka player not in match", 400);
      const invalidCount = Object.values(vyrazackaPlayerCounts).some((count) => !Number.isFinite(count) || count < 1);
      if (invalidCount) {
        return c.text("Invalid vyrazacka count", 400);
      }
      predictions.vyrazacka = { playerCounts: vyrazackaPlayerCounts };
    }

    const profile = await getPlayerProfile(username);
    if (!profile || (profile.coins || 0) < betAmount) {
      return c.text("Insufficient coins", 400);
    }

    const playerElosById = buildPlayerEloMap(match);
    const roundOdds = buildRoundOdds(match, playerElosById);
    const statsById = await buildPlayerStatsMap(match);

    const odds: any = {};
    const oddsValues: number[] = [];
    if (match1) {
      const oddsValue = roundOdds[0]?.[match1 as keyof typeof roundOdds[0]] ?? MULTIPLIERS[1];
      odds.match1 = oddsValue;
      oddsValues.push(oddsValue);
    }
    if (match2) {
      const oddsValue = roundOdds[1]?.[match2 as keyof typeof roundOdds[1]] ?? MULTIPLIERS[1];
      odds.match2 = oddsValue;
      oddsValues.push(oddsValue);
    }
    if (match3) {
      const oddsValue = roundOdds[2]?.[match3 as keyof typeof roundOdds[2]] ?? MULTIPLIERS[1];
      odds.match3 = oddsValue;
      oddsValues.push(oddsValue);
    }
    if (predictions.vyrazacka) {
      let vyProduct = 1;
      Object.entries(predictions.vyrazacka.playerCounts).forEach(([playerId, minCount]) => {
        const vyStats = statsById[playerId] || { vyrazecky: 0, wins: 0, loses: 0 };
        const vyOdds = getVyrazackaOdds(vyStats, Number(minCount), roundOdds.length || 3);
        vyProduct *= vyOdds;
      });
      odds.vyrazacka = Number(vyProduct.toFixed(2));
      oddsValues.push(odds.vyrazacka);
    }

    const totalLegs = numMatches + (predictions.vyrazacka ? Object.keys(predictions.vyrazacka.playerCounts).length : 0);
    odds.total = Number((oddsValues.reduce((sum, value) => sum * value, 1)).toFixed(2));
    predictions._odds = odds;
    predictions._totalLegs = totalLegs;

    // Deduct coins
    await updatePlayerStats(profile.$id, { coins: (profile.coins || 0) - betAmount });

    // Create bet
    await placeBet({
      playerId: profile.$id,
      username,
      matchId,
      predictions,
      betAmount,
      numMatches,
    });

    return c.redirect("/v1/f-bet");
  } catch (err: any) {
    console.error("place bet error:", err);
    return c.text("Failed to place bet", 500);
  }
});

// GET /v1/f-bet route (replace previous minimal implementation) - include per-match bets
app.get("/v1/f-bet", async (c) => {
  try {
    const username = getCookie(c, "user") ?? null;
    const profile = username ? await getPlayerProfile(username) : null;

    const allMatches = await listAvailableMatches();
    // enrich with bets for each match and only keep 'playing' matches
    const playingMatches: any[] = [];
    for (const m of allMatches) {
      const bets = await getBetsForMatch(m.$id);
      const playerElosById = buildPlayerEloMap(m);
      const roundOdds = buildRoundOdds(m, playerElosById);
      const statsById = await buildPlayerStatsMap(m);
      const vyrazackaOdds = buildVyrazackaOdds(m, statsById, [1, 2, 3, 4, 5]);
      const enriched = { ...m, bets, bettingOdds: roundOdds, vyrazackaOdds };
      if (m.state === 'playing') playingMatches.push(enriched);
    }

    const playerBets = profile ? await getBetsForPlayer(profile.$id) : [];

    return c.html(
      <MainLayout c={c}>
        <FBetPage
          c={c}
          currentUser={username}
          currentUserProfile={profile}
          availableMatches={playingMatches}
          playerBets={playerBets}
        />
      </MainLayout>
    );
  } catch (err: any) {
    console.error("f-bet page error:", err);
    return c.html(
      <MainLayout c={c}>
        <FBetPage c={c} currentUser={null} currentUserProfile={null} availableMatches={[]} playerBets={[]} />
      </MainLayout>
    );
  }
});

app.get("/v1/achievements", async (c) => {
  const playerParam = c.req.query('player');
  return c.html(
    <MainLayout c={c}>
      <AchievementsPage c={c} viewingPlayerId={playerParam} />
    </MainLayout>
  );
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

    const allProfiles = await getAllPlayerProfiles();
    const allMatches = await listAllMatchHistoryDocs();
    const seasonMatches = filterMatchesForSeason(allMatches, selectedSeason);
    const seasonStats = aggregateSeasonStats(seasonMatches, allProfiles);
    const topPlayers = [...seasonStats.players]
      .sort((a, b) => b.elo - a.elo)
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

    const profile = await getPlayerProfile(userId);
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

    const profile = await getPlayerProfile(userId);
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

    const profile = await getPlayerProfile(userId);
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
    const matchId = c.req.param("matchId");

    await updateMatchState(matchId, "playing");
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Start match error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Finish a match
app.post("/v1/api/tournaments/:tourId/match/:matchId/finish", async (c) => {
  try {
    const matchId = c.req.param("matchId");
    const body = await c.req.formData();

    const team1Score = parseInt(body.get("team1Score") as string) || 0;
    const team2Score = parseInt(body.get("team2Score") as string) || 0;

    const match = await getTournamentMatch(matchId);
    if (!match) {
      return c.json({ error: "Match not found" }, 404);
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

export default app;
