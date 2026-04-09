const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'feature_requests';

function getDb() {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new sdk.Databases(client);
}

export interface FeatureRequest {
  $id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  status: 'open' | 'done' | 'rejected';
  upvotes: number;
  upvotedBy: string[];
  createdAt: string;
}

function parseDoc(doc: any): FeatureRequest {
  return {
    $id: doc.$id,
    userId: doc.userId || '',
    username: doc.username || '',
    title: doc.title || '',
    description: doc.description || '',
    status: doc.status || 'open',
    upvotes: Number(doc.upvotes || 0),
    upvotedBy: doc.upvotedBy ? (typeof doc.upvotedBy === 'string' ? JSON.parse(doc.upvotedBy) : doc.upvotedBy) : [],
    createdAt: doc.$createdAt || doc.createdAt || '',
  };
}

export async function listFeatureRequests(): Promise<FeatureRequest[]> {
  try {
    const databases = getDb();
    const res = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(100),
    ]);
    return (res.documents || []).map(parseDoc);
  } catch (e: any) {
    if (e?.code === 404) return []; // collection doesn't exist yet
    console.error('listFeatureRequests error:', e);
    return [];
  }
}

export async function createFeatureRequest(userId: string, username: string, title: string, description: string): Promise<FeatureRequest> {
  const databases = getDb();
  const doc = await databases.createDocument(databaseId, collectionId, sdk.ID.unique(), {
    userId, username, title, description,
    status: 'open',
    upvotes: 0,
    upvotedBy: JSON.stringify([]),
    createdAt: new Date().toISOString(),
  });
  return parseDoc(doc);
}

export async function updateFeatureRequest(id: string, title: string, description: string): Promise<FeatureRequest> {
  const databases = getDb();
  const doc = await databases.updateDocument(databaseId, collectionId, id, { title, description });
  return parseDoc(doc);
}

export async function deleteFeatureRequest(id: string): Promise<void> {
  const databases = getDb();
  await databases.deleteDocument(databaseId, collectionId, id);
}

export async function toggleUpvote(id: string, userId: string): Promise<FeatureRequest> {
  const databases = getDb();
  const raw = await databases.getDocument(databaseId, collectionId, id);
  const req = parseDoc(raw);
  const voters = req.upvotedBy;
  const idx = voters.indexOf(userId);
  if (idx >= 0) {
    voters.splice(idx, 1);
  } else {
    voters.push(userId);
  }
  const doc = await databases.updateDocument(databaseId, collectionId, id, {
    upvotes: voters.length,
    upvotedBy: JSON.stringify(voters),
  });
  return parseDoc(doc);
}

export async function setRequestStatus(id: string, status: 'open' | 'done' | 'rejected'): Promise<FeatureRequest> {
  const databases = getDb();
  const doc = await databases.updateDocument(databaseId, collectionId, id, { status });
  return parseDoc(doc);
}
