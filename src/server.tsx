import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { Homepage } from "./pages/Homepage";
import { MainLayout } from "./layouts/main";
import { registerUser, loginUser } from "./v1/auth";
import { LoginPage } from "./v1/login";
import { RegisterPage } from "./v1/register";
import { LobbyPage } from "./v1/lobby";
import { LeaderboardPage } from "./v1/leaderboard";
import { getGlobalStats, getLeaderboard, getPlayerProfile, updateGlobalStats, updatePlayerStats } from "./v1/profile";
import { findOrCreateAndJoin, getMatch, startMatch, MatchDoc, MatchPlayer, leaveMatch, findPlayingMatch, deleteMatch, finishMatch, parseDoc, parseMatchHistoryDoc, MatchHistoryDoc, HistoryPlayers } from "./v1/match";
import { MatchLobbyPage } from "./v1/matchLobby";
import { updateGameScores } from "./v1/match";
import { MatchGamePage } from "./v1/matchGame";
import { MatchResultPage } from "./v1/matchResult";
import { findCurrentMatch } from "./v1/match";
import { MatchHistoryPage } from "./v1/matchHistory";
import { readFileSync } from "node:fs";
import { ChangesLogPage } from "./v1/changesLog";

const sdk = require('node-appwrite');

const app = new Hono<{
  Variables: {
  };
}>();

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
  // Allow these routes to skip auth check
  if (
    c.req.path == "/" ||
    c.req.path == "/v1/auth/login" ||
    c.req.path == "/v1/auth/register" ||
    c.req.path == "/v1/auth/logout"
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
                    || c.req.path.startsWith("/v1/match/game/score")
                    || c.req.path.startsWith("/v1/match/game/vyrazacka");

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
      date: "12.05.2025",
      updates: [
        "[Feature] -> Added this feature :D",
        "[Feature] -> You can see players match history from leaderboard! Click on a player's name to view their matches.",
        "[Feature] -> Added how many % of goals are \"vyrážečky\" in global stats.",
        "[Fix] -> sorting of leaderboard by level now works correctly.",
        "[Fix] -> there is no scroll in lobby anymore.",
        "[Fix] -> redirection to match history after finishing a match now works properly.",
      ],
    },
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

  // parse each document similar to match docs
  const matches = res.documents.map((doc: MatchDoc) => (parseDoc(doc)));

  const user = getCookie(c, "user") ?? "";

  return c.html(
    <MainLayout c={c}>
      <MatchHistoryPage c={c} matches={matches} username={user} />
    </MainLayout>
  );
});

app.get("/v1/match-history/:username", async (c) => {
  const username = c.req.param("username");

  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT!)
    .setKey(process.env.APPWRITE_KEY!);

  const databases = new sdk.Databases(client);

  const res = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID!,
    'matches_history',
    [
      sdk.Query.orderDesc("$createdAt")
    ]
  );

  // parse each document similar to match docs
  const matches = res.documents
  .filter((doc: any) => {
    // Parse JSON if it's a string
    const players = typeof doc.players_json === "string"
      ? JSON.parse(doc.players_json)
      : doc.players_json;

    return Array.isArray(players) &&
           players.some((p: any) => p.username === username);
  })
  .map((doc: MatchDoc) => parseDoc(doc));


  return c.html(
    <MainLayout c={c}>
      <MatchHistoryPage c={c} matches={matches} username={null} />
    </MainLayout>
  );
});

app.get("/", (c) => {
  return c.html(
    <MainLayout c={c}>
      <Homepage c={c} />
    </MainLayout>,
  );
});

// render login page (GET)
app.get("/v1/auth/login", (c) => {
  return c.html(
    <MainLayout c={c}>
      <LoginPage c={c} />
    </MainLayout>,
  );
});

// render register page (GET)
app.get("/v1/auth/register", (c) => {
  return c.html(
    <MainLayout c={c}>
      <RegisterPage c={c} />
    </MainLayout>,
  );
});

// render lobby page (GET)
app.get("/v1/lobby", async (c) => {
  try {
    const username = getCookie(c, "user") ?? "Player";
    
    // Try to get player profile from database
    // In a real app, you'd have userId from session, not just username
    // For now, we'll use username as a temporary identifier
    const playerData = await getPlayerProfile(username);
    const globalStats = await getGlobalStats();
    
    return c.html(
      <MainLayout c={c}>
        <LobbyPage c={c} playerProfile={playerData} globalStats={globalStats} />
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

// render leaderboard (GET)
app.get("/v1/leaderboard", async (c) => {
  try {
    const players = await getLeaderboard(100);
    return c.html(
      <MainLayout c={c}>
        <LeaderboardPage players={players} />
      </MainLayout>,
    );
  } catch (err: any) {
    console.error("Leaderboard error:", err);
    return c.text("Failed to load leaderboard", 500);
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
    if (!password || password.length < 6) {
      return c.text("Password must be at least 6 characters", 400);
    }
    if (password !== confirm) {
      return c.text("Passwords do not match", 400);
    }

    // create user in Appwrite
    await registerUser(username, password);

    // set a simple cookie and redirect to lobby
    c.res.headers.set("Set-Cookie", `user=${encodeURIComponent(username)}; Path=/; HttpOnly; SameSite=Lax`);
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
    c.res.headers.set("Set-Cookie", `user=${encodeURIComponent(username)}; Path=/; HttpOnly; SameSite=Lax`);
    return c.redirect("/v1/lobby");
  } catch (err: any) {
    console.error("login error:", err);
    return c.text("Invalid credentials", 401);
  }
});

// logout endpoint: clears user cookie and redirects to home
app.post("/v1/auth/logout", (c) => {
  // clear cookie (Set-Cookie with Max-Age=0)
  c.res.headers.set("Set-Cookie", "user=; Path=/; Max-Age=0; HttpOnly");
  c.res.headers.set("HX-Redirect", "/");
  return c.redirect("/");
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

// Match lobby page (GET)
app.get("/v1/match/lobby", async (c) => {
  try {
    const matchId = getCookie(c, "match_id") ?? '';
    const username = getCookie(c, "user") ?? 'Player';
    if (!matchId) return c.redirect("/v1/lobby");

    return c.html(
      <MainLayout c={c}>
        <MatchLobbyPage c={c} matchId={matchId} currentUser={username} />
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

// Leave match: remove player from players_json, delete match if empty
app.post("/v1/match/leave", async (c) => {
  try {
    const matchIdFromCookie = getCookie(c, "match_id") ?? "";
    const form = await c.req.formData();
    const matchId = String(form.get("matchId") ?? matchIdFromCookie ?? "");
    const username = getCookie(c, "user") ?? null;
    if (!matchId) return c.text("missing matchId", 400);
    if (!username) {
      // no user — just clear cookie and redirect
      c.res.headers.set("Set-Cookie", "match_id=; Path=/; Max-Age=0; HttpOnly");
      return c.redirect("/v1/lobby");
    }

    // resolve player id same way as join: profile id if exists, otherwise username
    const profile = await getPlayerProfile(username);
    const playerId = profile ? profile.$id : username;

    const res = await leaveMatch(matchId, playerId);
    // clear match cookie
    c.res.headers.set("Set-Cookie", "match_id=; Path=/; Max-Age=0; HttpOnly");
    return c.redirect("/v1/lobby");
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

    return c.html(
      <MainLayout c={c}>
        <MatchResultPage c={c} result={result}/>
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

// helper to get avg elo of a team
    function avgElo(p1Elo?: number, p2Elo?: number): number {
      const elo1 = (p1Elo && typeof p1Elo=== 'number') ? p1Elo : 500;
      const elo2 = (p2Elo && typeof p2Elo === 'number') ? p2Elo : 500;
      return Math.round((elo1 + elo2) / 2);
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

    const result = {
      matchId,
      players: ids.map(id=>({
        id,
        username: byId[id].username,
        oldElo: byId[id].oldElo,
        newElo: byId[id].newElo,
        xpGained: byId[id].xpGained,
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
          byId[id].gamesAdded += 1;
          byId[id].goals_conceded += bScore;
          byId[id].xpGained += aScore;
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
          byId[id].losesAdded += 1;
          byId[id].xpGained += 5;
          byId[id].newElo -= 20;
          byId[id].gamesAdded += 1;
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
          byId[id].gamesAdded += 1;
          byId[id].xpGained += bScore;
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
          byId[id].losesAdded += 1;
          byId[id].xpGained += 5;
          byId[id].newElo -= 20;
          byId[id].gamesAdded += 1;
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
      const newElo = Math.max(0, Math.round(rec.newElo));
      const xpGain = Math.max(0, Math.round(rec.xpGained));
      const winsAdd = rec.winsAdded || 0;
      const losesAdd = rec.losesAdded || 0;
      const ultimateWinInc = (ultimateWinnerId === id) ? 1 : 0;
      const ultimateLoseInc = (ultimateLoserId === id) ? 1 : 0;
      const gamesAdded = rec.gamesAdded || 0;

      // update DB profile
      try {
        const profile = await getPlayerProfile(id); // profile id or username may be used
        if (profile) {
          await updatePlayerStats(profile.$id, {
            xp: (profile.xp || 0) + xpGain,
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

    // Delete the match from database after finishing
    try {
      //finishMatch(matchId); 
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

export default app;
