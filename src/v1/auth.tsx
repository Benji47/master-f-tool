const sdk = require('node-appwrite');
import { createPlayerProfile } from './profile';

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
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
    console.log('User created:', result.$id);
    
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
    console.log('Session created:', session.$id);
    return session;
  } catch (err: any) {
    console.error('Appwrite login error:', err);
    throw new Error('Invalid username or password');
  }
}