/**
 * Create `player_spin_stats` collection + migrate existing data
 * from each user's prefs.freeSpins into its own document.
 *
 * Doc ID = profile $id (= username).
 *
 * Run: bun run scripts/setup-player-spin-stats.ts
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

const COLLECTION_ID = 'player_spin_stats';

const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);
const users = new sdk.Users(client);

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, COLLECTION_ID);
    console.log(`✓ Collection "${COLLECTION_ID}" already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createCollection(
        databaseId,
        COLLECTION_ID,
        'Player Spin Stats',
        [
          sdk.Permission.read(sdk.Role.any()),
          sdk.Permission.update(sdk.Role.any()),
          sdk.Permission.create(sdk.Role.any()),
        ]
      );
      console.log(`✓ Created collection "${COLLECTION_ID}"`);
    } else {
      throw e;
    }
  }
}

async function ensureAttribute(name: string, type: 'string' | 'integer', size?: number) {
  try {
    await databases.getAttribute(databaseId, COLLECTION_ID, name);
    console.log(`  ✓ attr "${name}" already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      if (type === 'string') {
        await databases.createStringAttribute(databaseId, COLLECTION_ID, name, size || 1024, false);
      } else {
        await databases.createIntegerAttribute(databaseId, COLLECTION_ID, name, false, undefined, undefined, 0);
      }
      console.log(`  ✓ created attr "${name}"`);
    } else {
      throw e;
    }
  }
}

async function waitForAttributes(expectedCount: number) {
  for (let i = 0; i < 30; i++) {
    const list = await databases.listAttributes(databaseId, COLLECTION_ID);
    const ready = (list.attributes || []).filter((a: any) => a.status === 'available').length;
    if (ready >= expectedCount) return;
    console.log(`  ...waiting for attributes (${ready}/${expectedCount})`);
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function migrate() {
  console.log('\nMigrating from user.prefs.freeSpins...');
  let migrated = 0;
  let cursor: string | undefined;
  while (true) {
    const queries = [sdk.Query.limit(100)];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    const res = await users.list(queries);
    const docs = res.users || [];
    if (docs.length === 0) break;

    for (const u of docs) {
      const prefs = (u?.prefs && typeof u.prefs === 'object') ? u.prefs : {};
      const fs = prefs.freeSpins;
      if (!fs || typeof fs !== 'object') continue;
      const username = u.name || u.email || u.$id;
      try {
        const payload = {
          hitsByIndex: JSON.stringify(fs.hitsByIndex || {}),
          totalSpins: Number(fs.totalSpins || 0),
          totalWonAllTime: Number(fs.totalWonAllTime || 0),
          dayKey: String(fs.dayKey || ''),
          used: Number(fs.used || 0),
          totalWon: Number(fs.totalWon || 0),
          bonusSpins: 0,
        };
        try {
          await databases.updateDocument(databaseId, COLLECTION_ID, username, payload);
        } catch (e: any) {
          if (e?.code === 404) {
            await databases.createDocument(databaseId, COLLECTION_ID, username, payload);
          } else {
            throw e;
          }
        }
        migrated++;
        console.log(`  ✓ ${username}`);
      } catch (e: any) {
        console.error(`  ✗ ${username}:`, e?.message || e);
      }
    }
    cursor = docs[docs.length - 1].$id;
    if (docs.length < 100) break;
  }
  console.log(`Migrated ${migrated} players`);
}

(async () => {
  console.log('Setting up player_spin_stats collection...\n');
  await ensureCollection();
  await ensureAttribute('hitsByIndex', 'string', 2000);
  await ensureAttribute('totalSpins', 'integer');
  await ensureAttribute('totalWonAllTime', 'integer');
  await ensureAttribute('dayKey', 'string', 32);
  await ensureAttribute('used', 'integer');
  await ensureAttribute('totalWon', 'integer');
  await ensureAttribute('bonusSpins', 'integer');
  console.log('\nWaiting for attributes...');
  await waitForAttributes(7);
  await migrate();
  console.log('\nDone.');
})();
