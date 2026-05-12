const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'polls';

function getDb() {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

export interface Poll {
  $id: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // userId -> optionIndex
  createdBy: string;
  createdByName: string;
  closed: boolean;
  createdAt: string;
}

function safeParseArray(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeParseObject(raw: any): Record<string, number> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = Number(v);
    return out;
  }
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) out[k] = Number(v);
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function parseDoc(doc: any): Poll {
  return {
    $id: doc.$id,
    question: doc.question || '',
    options: safeParseArray(doc.options),
    votes: safeParseObject(doc.votes),
    createdBy: doc.createdBy || '',
    createdByName: doc.createdByName || '',
    closed: doc.closed === true || doc.closed === 'true',
    createdAt: doc.$createdAt || '',
  };
}

export async function listPolls(): Promise<Poll[]> {
  try {
    const databases = getDb();
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(100),
    ]);
    return (res.documents || []).map(parseDoc);
  } catch (e: any) {
    if (e?.code === 404) return [];
    console.error('listPolls error:', e);
    return [];
  }
}

export async function createPoll(question: string, options: string[], userId: string, username: string): Promise<Poll> {
  const databases = getDb();
  const doc = await databases.createDocument(databaseId, collectionId, sdk.ID.unique(), {
    question,
    options: JSON.stringify(options),
    votes: JSON.stringify({}),
    createdBy: userId,
    createdByName: username,
    closed: false,
  });
  return parseDoc(doc);
}

export async function voteOnPoll(pollId: string, userId: string, optionIndex: number): Promise<Poll> {
  const databases = getDb();
  const raw = await databases.getDocument(databaseId, collectionId, pollId);
  const poll = parseDoc(raw);
  if (poll.closed) throw new Error('Poll is closed');
  if (optionIndex < 0 || optionIndex >= poll.options.length) throw new Error('Invalid option');
  poll.votes[userId] = optionIndex;
  const doc = await databases.updateDocument(databaseId, collectionId, pollId, {
    votes: JSON.stringify(poll.votes),
  });
  return parseDoc(doc);
}

export async function deletePoll(pollId: string): Promise<void> {
  const databases = getDb();
  await databases.deleteDocument(databaseId, collectionId, pollId);
}

export async function setPollClosed(pollId: string, closed: boolean): Promise<Poll> {
  const databases = getDb();
  const doc = await databases.updateDocument(databaseId, collectionId, pollId, { closed });
  return parseDoc(doc);
}

export async function updatePoll(pollId: string, question: string, options: string[]): Promise<Poll> {
  const databases = getDb();
  const raw = await databases.getDocument(databaseId, collectionId, pollId);
  const existing = parseDoc(raw);
  // Reset votes if options changed (length differs OR any label changed)
  const optionsChanged = existing.options.length !== options.length
    || existing.options.some((o, i) => o !== options[i]);
  const update: any = { question, options: JSON.stringify(options) };
  if (optionsChanged) update.votes = JSON.stringify({});
  const doc = await databases.updateDocument(databaseId, collectionId, pollId, update);
  return parseDoc(doc);
}

export async function clearMyVote(pollId: string, userId: string): Promise<Poll> {
  const databases = getDb();
  const raw = await databases.getDocument(databaseId, collectionId, pollId);
  const poll = parseDoc(raw);
  delete poll.votes[userId];
  const doc = await databases.updateDocument(databaseId, collectionId, pollId, {
    votes: JSON.stringify(poll.votes),
  });
  return parseDoc(doc);
}

export async function ensurePollsCollection(): Promise<void> {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(client);
  try {
    await databases.getCollection(databaseId, collectionId);
    return; // already exists
  } catch (e: any) {
    if (e?.code !== 404) {
      console.error('[polls] getCollection failed:', e?.message || e);
      return;
    }
  }
  try {
    await databases.createCollection(
      databaseId,
      collectionId,
      'Polls',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.any()),
        sdk.Permission.update(sdk.Role.any()),
        sdk.Permission.delete(sdk.Role.any()),
      ],
      false,
      true,
    );
    await databases.createStringAttribute(databaseId, collectionId, 'question', 200, true);
    await databases.createStringAttribute(databaseId, collectionId, 'options', 2000, true);
    await databases.createStringAttribute(databaseId, collectionId, 'votes', 10000, false, '{}');
    await databases.createStringAttribute(databaseId, collectionId, 'createdBy', 100, true);
    await databases.createStringAttribute(databaseId, collectionId, 'createdByName', 100, true);
    await databases.createBooleanAttribute(databaseId, collectionId, 'closed', false, false);
    console.log('[polls] collection created');
  } catch (e: any) {
    console.error('[polls] ensurePollsCollection failed:', e?.message || e);
  }
}
