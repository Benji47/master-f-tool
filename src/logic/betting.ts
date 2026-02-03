const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'bets';

export interface Bet {
  $id?: string;
  playerId: string;
  username: string;
  matchId: string;
  predictions: {
    match1?: 'a' | 'b';
    match2?: 'a' | 'b';
    match3?: 'a' | 'b';
  };
  betAmount: number;
  numMatches: number;
  status: 'pending' | 'won' | 'lost';
  winnings: number;
  correctPredictions: number;
  $createdAt?: string;
}

// Multipliers: 1 match = x2, 2 matches = x4, 3 matches = x8
const MULTIPLIERS: Record<number, number> = {
  1: 2,
  2: 4,
  3: 8,
};

function client() {
  if (!projectId || !apiKey) throw new Error('Appwrite credentials not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function parseBetDoc(doc: any): Bet {
  return {
    $id: doc.$id,
    playerId: doc.playerId,
    username: doc.username,
    matchId: doc.matchId,
    predictions: typeof doc.predictions === 'string' ? JSON.parse(doc.predictions) : doc.predictions,
    betAmount: doc.betAmount,
    numMatches: doc.numMatches,
    status: doc.status,
    winnings: doc.winnings || 0,
    correctPredictions: doc.correctPredictions || 0,
    $createdAt: doc.$createdAt,
  };
}

export async function placeBet(b: Omit<Bet, '$id' | 'status' | 'winnings' | 'correctPredictions'>): Promise<Bet> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  const doc = await databases.createDocument(
    databaseId,
    collectionId,
    'unique()',
    {
      playerId: b.playerId,
      username: b.username,
      matchId: b.matchId,
      predictions: JSON.stringify(b.predictions),
      betAmount: b.betAmount,
      numMatches: b.numMatches,
      status: 'pending',
      winnings: 0,
      correctPredictions: 0,
    }
  );
  return parseBetDoc(doc);
}

export async function getBetsForMatch(matchId: string): Promise<Bet[]> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  try {
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal('matchId', matchId),
      sdk.Query.orderDesc('$createdAt'),
    ]);
    return (res.documents || []).map(parseBetDoc);
  } catch (e) {
    console.error('getBetsForMatch error', e);
    return [];
  }
}

export async function getBetsForPlayer(playerId: string): Promise<Bet[]> {
  const cli = client();
  const databases = new sdk.Databases(cli);
  try {
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.equal('playerId', playerId),
      sdk.Query.orderDesc('$createdAt'),
    ]);
    return (res.documents || []).map(parseBetDoc);
  } catch (e) {
    console.error('getBetsForPlayer error', e);
    return [];
  }
}

/*
 Resolve bets for a finished match.
 scores: array of rounds with scoreA/scoreB
*/
export async function resolveBets(matchId: string, scores: any[]): Promise<void> {
  const cli = client();
  const databases = new sdk.Databases(cli);

  const allBets = await getBetsForMatch(matchId);
  const pending = allBets.filter(b => b.status === 'pending');

  const winners: ('a'|'b'|'tie')[] = scores.map((s: any) => {
    const a = Number(s.scoreA || 0), b = Number(s.scoreB || 0);
    if (a > b) return 'a';
    if (b > a) return 'b';
    return 'tie';
  });

  for (const bet of pending) {
    let correct = 0;
    if (bet.predictions.match1 && winners[0] === bet.predictions.match1) correct++;
    if (bet.predictions.match2 && winners[1] === bet.predictions.match2) correct++;
    if (bet.predictions.match3 && winners[2] === bet.predictions.match3) correct++;

    const won = correct === bet.numMatches;
    const winnings = won ? (bet.betAmount * (MULTIPLIERS[bet.numMatches] || 1)) : 0;

    try {
      await databases.updateDocument(databaseId, collectionId, bet.$id, {
        status: won ? 'won' : 'lost',
        winnings,
        correctPredictions: correct,
      });
    } catch (e) {
      console.error('failed updating bet doc', e);
    }

    if (won) {
      try {
        const { getPlayerProfile, updatePlayerStats } = await import('./profile');
        const profile = await getPlayerProfile(bet.playerId);
        if (profile) {
          await updatePlayerStats(profile.$id, {
            coins: (profile.coins || 0) + winnings,
          });
        }
      } catch (e) {
        console.error('failed awarding winnings', e);
      }
    }
  }
}

export { MULTIPLIERS };
