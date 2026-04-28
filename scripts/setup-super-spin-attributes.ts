/**
 * Add super-spin attributes to existing collections so the new feature has
 * somewhere to write.
 *
 * Targets:
 *  - `player_spin_stats`: superDayKey (string), superDailyUsed (int),
 *      superBonusSpins (int), superSpinsTotal (int), wonTockar (boolean)
 *  - `spin_stats`:        superSpinLog  (string, JSON array)
 *
 * Run: bun run scripts/setup-super-spin-attributes.ts
 */
const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

if (!projectId || !apiKey || !databaseId) {
  console.error('Missing APPWRITE_PROJECT / APPWRITE_KEY / APPWRITE_DATABASE_ID');
  process.exit(1);
}

const PLAYER_COLLECTION = 'player_spin_stats';
const GLOBAL_COLLECTION = 'spin_stats';

const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);

async function ensureIntAttr(collectionId: string, name: string, defaultValue: number) {
  try {
    await databases.getAttribute(databaseId, collectionId, name);
    console.log(`  ✓ ${collectionId}.${name} already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createIntegerAttribute(
        databaseId, collectionId, name,
        false, undefined, undefined, defaultValue,
      );
      console.log(`  ✓ created int ${collectionId}.${name} (default ${defaultValue})`);
    } else {
      throw e;
    }
  }
}

async function ensureStringAttr(collectionId: string, name: string, size: number, defaultValue?: string) {
  try {
    await databases.getAttribute(databaseId, collectionId, name);
    console.log(`  ✓ ${collectionId}.${name} already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createStringAttribute(
        databaseId, collectionId, name, size, false, defaultValue,
      );
      console.log(`  ✓ created string ${collectionId}.${name} (size ${size})`);
    } else {
      throw e;
    }
  }
}

async function ensureBooleanAttr(collectionId: string, name: string, defaultValue: boolean) {
  try {
    await databases.getAttribute(databaseId, collectionId, name);
    console.log(`  ✓ ${collectionId}.${name} already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createBooleanAttribute(
        databaseId, collectionId, name, false, defaultValue,
      );
      console.log(`  ✓ created bool ${collectionId}.${name} (default ${defaultValue})`);
    } else {
      throw e;
    }
  }
}

async function waitForAvailable(collectionId: string, names: string[]) {
  for (let i = 0; i < 30; i++) {
    const list = await databases.listAttributes(databaseId, collectionId);
    const targeted = (list.attributes || []).filter((a: any) => names.includes(a.key));
    const allReady = targeted.length === names.length && targeted.every((a: any) => a.status === 'available');
    if (allReady) return;
    console.log(`  ...waiting on ${collectionId} attrs (${targeted.length}/${names.length})`);
    await new Promise(r => setTimeout(r, 1500));
  }
}

(async () => {
  console.log('Setting up super-spin attributes...\n');

  // Player-level
  console.log(`-- ${PLAYER_COLLECTION} --`);
  try {
    await databases.getCollection(databaseId, PLAYER_COLLECTION);
  } catch (e: any) {
    if (e?.code === 404) {
      console.error(`Collection "${PLAYER_COLLECTION}" does not exist. Run setup-player-spin-stats.ts first.`);
      process.exit(1);
    }
    throw e;
  }
  await ensureStringAttr(PLAYER_COLLECTION, 'superDayKey', 32, '');
  await ensureIntAttr(PLAYER_COLLECTION, 'superDailyUsed', 0);
  await ensureIntAttr(PLAYER_COLLECTION, 'superBonusSpins', 0);
  await ensureIntAttr(PLAYER_COLLECTION, 'superSpinsTotal', 0);
  await ensureBooleanAttr(PLAYER_COLLECTION, 'wonTockar', false);

  console.log('\n-- Waiting for player_spin_stats attributes --');
  await waitForAvailable(PLAYER_COLLECTION, [
    'superDayKey', 'superDailyUsed', 'superBonusSpins', 'superSpinsTotal', 'wonTockar',
  ]);

  // Global
  console.log(`\n-- ${GLOBAL_COLLECTION} --`);
  try {
    await databases.getCollection(databaseId, GLOBAL_COLLECTION);
  } catch (e: any) {
    if (e?.code === 404) {
      console.error(`Collection "${GLOBAL_COLLECTION}" does not exist. Run setup-spin-stats-collection.ts first.`);
      process.exit(1);
    }
    throw e;
  }
  await ensureStringAttr(GLOBAL_COLLECTION, 'superSpinLog', 100000, '[]');

  console.log('\n-- Waiting for spin_stats attribute --');
  await waitForAvailable(GLOBAL_COLLECTION, ['superSpinLog']);

  console.log('\nDone.');
})();
