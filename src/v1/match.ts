const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'matches';

if (!projectId || !apiKey) {
  console.warn('⚠️ Missing APPWRITE_PROJECT or APPWRITE_KEY env vars for match logic');
}

export type MatchPlayer = {
  id: string; // document id of player profile or username
  username: string;
  wins: number;
  loses: number;
  elo: number;
};

export type MatchDoc = {
  $id: string;
  state: string; // open | full | playing | finished
  players: MatchPlayer[]; // parsed from players_json
  maxPlayers: number;
  createdAt?: string;
  scores?: { a: string[]; b: string[]; scoreA: number; scoreB: number; vyrazacka?: Record<string, number> }[]; // parsed from scores_json
  // raw players_json / scores_json exist in DB but not required by callers
};

function client() {
  if (!projectId || !apiKey || !databaseId) throw new Error('Appwrite credentials/database not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function parseDoc(raw: any): MatchDoc {
  const playersJson = raw.players_json ?? raw.players ?? '[]';
  const scoresJsonRaw = raw.scores_json ?? '[]';
  let players: MatchPlayer[] = [];
  let scores: { a: string[]; b: string[]; scoreA: number; scoreB: number }[] = [];
  
  try {
    // players_json is always a string
    if (typeof playersJson === 'string') {
      players = JSON.parse(playersJson || '[]');
    } else {
      players = playersJson;
    }
  } catch (e) {
    console.warn('Failed to parse players_json', e);
    players = [];
  }
  
  try {
    // scores_json is always a string
    if (typeof scoresJsonRaw === 'string') {
      scores = JSON.parse(scoresJsonRaw || '[]');
    } else {
      scores = scoresJsonRaw;
    }
  } catch (e) {
    console.warn('Failed to parse scores_json', e);
    scores = [];
  }
  
  return {
    $id: raw.$id,
    state: raw.state,
    players,
    maxPlayers: raw.maxPlayers ?? 4,
    createdAt: raw.$createdAt ?? raw.createdAt,
    scores,
  };
}

export async function findOpenMatch(): Promise<MatchDoc | null> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal('state', 'open'),
      sdk.Query.limit(1),
    ]);
    if (res.documents && res.documents.length) return parseDoc(res.documents[0]);
    return null;
  } catch (err: any) {
    console.error('findOpenMatch error', err);
    throw err;
  }
}

export async function createMatch(creator: MatchPlayer, maxPlayers = 4): Promise<MatchDoc> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    const doc = await databases.createDocument(
      databaseId,
      collectionId,
      'unique()',
      {
        state: maxPlayers === 1 ? 'full' : 'open',
        players_json: JSON.stringify([creator]),
        maxPlayers,
      }
    );
    return parseDoc(doc);
  } catch (err: any) {
    console.error('createMatch error', err);
    throw err;
  }
}

export async function getMatch(matchId: string): Promise<MatchDoc | null> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    const doc = await databases.getDocument(databaseId, collectionId, matchId);
    return parseDoc(doc);
  } catch (err: any) {
    console.error('getMatch error', err);
    return null;
  }
}

export async function joinMatch(matchId: string, player: MatchPlayer): Promise<MatchDoc> {
  const c = client();
  const databases = new sdk.Databases(c);

  // load current doc (parsed)
  const doc = await getMatch(matchId);
  if (!doc) throw new Error('Match not found');
  if (doc.state === 'playing' || doc.state === 'full') throw new Error('Match not joinable');

  // don't add duplicates
  const exists = (doc.players || []).some((p: MatchPlayer) => p.id === player.id);
  if (exists) return doc;

  const players = [...(doc.players || []), player];
  const newState = players.length >= (doc.maxPlayers || 4) ? 'full' : 'open';

  try {
    const updated = await databases.updateDocument(databaseId, collectionId, matchId, {
      players_json: JSON.stringify(players),
      state: newState,
    });
    return parseDoc(updated);
  } catch (err: any) {
    console.error('joinMatch update error', err);
    throw err;
  }
}

export async function findOrCreateAndJoin(player: MatchPlayer): Promise<MatchDoc> {
  // ensure only one active match at a time: prefer existing open match
  const open = await findOpenMatch();
  if (open) {
    try {
      return await joinMatch(open.$id, player);
    } catch (err) {
      // race condition or full -> create new
      console.warn('join existing failed, creating new', err);
    }
  }
  return await createMatch(player, 4);
}

function createInitialScoresForPlayers(players: MatchPlayer[]) {
  // expects up to 4 players
  // pairings: (0,1)-(2,3), (0,2)-(1,3), (0,3)-(1,2)
  const ids = players.map(p => p.id);
  const pairings: { a: string[]; b: string[]; scoreA: number; scoreB: number; vyrazacka?: Record<string, number> }[] = [];

  // initialize vyrazacka for all players
  const vyrazackaInit: Record<string, number> = {};
  ids.forEach(id => vyrazackaInit[id] = 0);

  // only create pairings when exactly 4 players, otherwise create best-effort
  if (ids.length >= 4) {
    pairings.push({ a: [ids[0], ids[1]], b: [ids[2], ids[3]], scoreA: 0, scoreB: 0, vyrazacka: { ...vyrazackaInit } });
    pairings.push({ a: [ids[0], ids[2]], b: [ids[1], ids[3]], scoreA: 0, scoreB: 0, vyrazacka: { ...vyrazackaInit } });
    pairings.push({ a: [ids[0], ids[3]], b: [ids[1], ids[2]], scoreA: 0, scoreB: 0, vyrazacka: { ...vyrazackaInit } });
  } else {
    // fallback: create a single pairing using available players (duplicates allowed)
    const a = ids.slice(0, Math.ceil(ids.length/2));
    const b = ids.slice(Math.ceil(ids.length/2));
    pairings.push({ a, b, scoreA:0, scoreB:0, vyrazacka: { ...vyrazackaInit } });
  }
  return pairings;
}

export async function startMatch(matchId: string): Promise<MatchDoc> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    // fetch current doc to inspect players
    const raw = await databases.getDocument(databaseId, collectionId, matchId);
    const parsed = parseDoc(raw);
    let scores = parsed.scores ?? [];
    if (!scores || scores.length === 0) {
      // initialize scores based on current players
      scores = createInitialScoresForPlayers(parsed.players);
    }
    const updated = await databases.updateDocument(databaseId, collectionId, matchId, {
      state: 'playing',
      scores_json: JSON.stringify(scores), // explicitly stringify
    });
    return parseDoc(updated);
  } catch (err: any) {
    console.error('startMatch error', err);
    throw err;
  }
}

export async function updateGameScores(matchId: string, scores: any): Promise<MatchDoc> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    const updated = await databases.updateDocument(databaseId, collectionId, matchId, {
      scores_json: JSON.stringify(scores), // explicitly stringify
    });
    return parseDoc(updated);
  } catch (err: any) {
    console.error('updateGameScores error', err);
    throw err;
  }
}

/**
 * Remove a player from a match. If no players remain, delete the match document.
 * Returns the updated MatchDoc, or null if the match was deleted.
 */
export async function leaveMatch(matchId: string, playerId: string): Promise<MatchDoc | null> {
  const c = client();
  const databases = new sdk.Databases(c);

  const doc = await getMatch(matchId);
  if (!doc) throw new Error('Match not found');

  const players = (doc.players || []).filter((p) => p.id !== playerId);

  if (players.length === 0) {
    // delete match from DB
    try {
      await databases.deleteDocument(databaseId, collectionId, matchId);
      return null;
    } catch (err: any) {
      console.error('deleteMatch error', err);
      throw err;
    }
  }

  const newState = players.length >= (doc.maxPlayers || 4) ? 'full' : 'open';
  try {
    const updated = await databases.updateDocument(databaseId, collectionId, matchId, {
      players_json: JSON.stringify(players),
      state: newState,
    });
    return parseDoc(updated);
  } catch (err: any) {
    console.error('leaveMatch update error', err);
    throw err;
  }
}

export async function findPlayingMatch(): Promise<MatchDoc | null> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal('state', 'playing'),
      sdk.Query.limit(1),
    ]);
    if (res.documents && res.documents.length) return parseDoc(res.documents[0]);
    return null;
  } catch (err: any) {
    console.error('findPlayingMatch error', err);
    return null;
  }
}

/** deleteMatch utility (explicit delete) */
export async function deleteMatch(matchId: string): Promise<void> {
  const c = client();
  const databases = new sdk.Databases(c);
  try {
    await databases.deleteDocument(databaseId, collectionId, matchId);
    console.log('Match deleted:', matchId);
  } catch (err: any) {
    console.error('deleteMatch error', err);
    throw err;
  }
}
