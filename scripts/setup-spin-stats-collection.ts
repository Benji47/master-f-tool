/**
 * One-off setup: create the `spin_stats` collection + singleton document.
 *
 * Stores global spin state so it survives deploys:
 *   - hitsByIndex  (string, JSON map e.g. '{"0":12,"1":34}')
 *   - jackpotHits  (string, JSON array of {username, coins, timestamp})
 *   - totalSpins   (integer)
 *
 * Also migrates existing `.spin-stats.json` into the new doc if it exists.
 *
 * Run: bun run scripts/setup-spin-stats-collection.ts
 */
import { existsSync, readFileSync } from 'node:fs';
const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

if (!projectId || !apiKey || !databaseId) {
  console.error('Missing APPWRITE_PROJECT / APPWRITE_KEY / APPWRITE_DATABASE_ID');
  process.exit(1);
}

const COLLECTION_ID = 'spin_stats';
const DOC_ID = 'main';

const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, COLLECTION_ID);
    console.log(`✓ Collection "${COLLECTION_ID}" already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createCollection(
        databaseId,
        COLLECTION_ID,
        'Spin Stats',
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
        await databases.createStringAttribute(databaseId, COLLECTION_ID, name, size || 10000, false);
      } else {
        await databases.createIntegerAttribute(databaseId, COLLECTION_ID, name, false, undefined, undefined, 0);
      }
      console.log(`  ✓ created attr "${name}"`);
    } else {
      throw e;
    }
  }
}

async function waitForAttributes() {
  for (let i = 0; i < 20; i++) {
    const list = await databases.listAttributes(databaseId, COLLECTION_ID);
    const allReady = (list.attributes || []).every((a: any) => a.status === 'available');
    if (allReady && list.attributes.length >= 3) return;
    console.log(`  ...waiting for attributes to become available (attempt ${i + 1})`);
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function ensureDoc() {
  // Migrate from file if it exists
  let seed = { hitsByIndex: '{}', jackpotHits: '[]', totalSpins: 0 };
  if (existsSync('./.spin-stats.json')) {
    try {
      const raw = JSON.parse(readFileSync('./.spin-stats.json', 'utf-8'));
      seed = {
        hitsByIndex: JSON.stringify(raw.hitsByIndex || {}),
        jackpotHits: JSON.stringify(raw.jackpotHits || []),
        totalSpins: Number(raw.totalSpins || 0),
      };
      console.log('  ✓ will migrate existing .spin-stats.json');
    } catch (e) {
      console.warn('  ⚠ could not parse .spin-stats.json, seeding empty');
    }
  }

  try {
    await databases.getDocument(databaseId, COLLECTION_ID, DOC_ID);
    console.log(`✓ Document "${DOC_ID}" already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createDocument(databaseId, COLLECTION_ID, DOC_ID, seed);
      console.log(`✓ Created document "${DOC_ID}"`);
    } else {
      throw e;
    }
  }
}

(async () => {
  console.log('Setting up spin_stats collection...\n');
  await ensureCollection();
  await ensureAttribute('hitsByIndex', 'string', 4000);
  await ensureAttribute('jackpotHits', 'string', 100000);
  await ensureAttribute('totalSpins', 'integer');
  console.log('\nWaiting for attributes to be ready...');
  await waitForAttributes();
  await ensureDoc();
  console.log('\nDone.');
})();
