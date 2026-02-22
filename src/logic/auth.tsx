const sdk = require('node-appwrite');
import { createPlayerProfile } from './profile';

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;

if (!projectId || !apiKey) {
  console.warn('⚠️ Missing APPWRITE_PROJECT or APPWRITE_KEY env vars');
}

export async function registerUser(username: string, password: string) {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const users = new sdk.Users(client);
  const email = `${username}@local.example`;

  try {
    const result = await users.create('unique()', email, null, password, username);
    
    // Create player profile in database
    await createPlayerProfile(result.$id, username);
    
    return result;
  } catch (err: any) {
    console.error('Appwrite create error:', err);
    throw new Error(err?.message || 'Failed to create user');
  }
}

export async function loginUser(username: string, password: string) {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const account = new sdk.Account(client);
  const email = `${username}@local.example`;

  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (err: any) {
    console.error('Appwrite login error:', err);
    throw new Error('Invalid username or password');
  }
}

export type AppwriteUserSummary = {
  $id: string;
  name: string;
  email?: string;
};

export async function listAllUsersForAdmin(): Promise<AppwriteUserSummary[]> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const users = new sdk.Users(client);

  const allUsers: AppwriteUserSummary[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await users.list([
      sdk.Query.limit(limit),
      sdk.Query.offset(offset),
    ]);

    const pageUsers = (res?.users ?? []).map((u: any) => ({
      $id: u.$id,
      name: u.name || '',
      email: u.email,
    }));

    allUsers.push(...pageUsers);

    if (!pageUsers.length || pageUsers.length < limit) {
      break;
    }

    offset += limit;

    if (offset > 10000) {
      break;
    }
  }

  return allUsers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function resetUserPasswordById(userId: string, newPassword: string) {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const users = new sdk.Users(client);
  await users.updatePassword(userId, newPassword);
}