/**
 * One-off setup: add `downvotes` + `downvotedBy` attributes to the
 * `feature_requests` collection so the new downvote UI has somewhere to write.
 *
 * Run: bun run scripts/setup-feature-request-downvotes.ts
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

const COLLECTION_ID = 'feature_requests';

const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);

async function ensureIntegerAttr(name: string, defaultValue: number) {
  try {
    await databases.getAttribute(databaseId, COLLECTION_ID, name);
    console.log(`  ✓ attr "${name}" already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createIntegerAttribute(
        databaseId,
        COLLECTION_ID,
        name,
        false,
        undefined,
        undefined,
        defaultValue,
      );
      console.log(`  ✓ created integer attr "${name}" (default ${defaultValue})`);
    } else {
      throw e;
    }
  }
}

async function ensureStringAttr(name: string, size: number, defaultValue: string) {
  try {
    await databases.getAttribute(databaseId, COLLECTION_ID, name);
    console.log(`  ✓ attr "${name}" already exists`);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createStringAttribute(
        databaseId,
        COLLECTION_ID,
        name,
        size,
        false,
        defaultValue,
      );
      console.log(`  ✓ created string attr "${name}" (size ${size})`);
    } else {
      throw e;
    }
  }
}

async function waitForAttributesReady() {
  for (let i = 0; i < 30; i++) {
    const list = await databases.listAttributes(databaseId, COLLECTION_ID);
    const targeted = (list.attributes || []).filter((a: any) =>
      a.key === 'downvotes' || a.key === 'downvotedBy'
    );
    const allReady = targeted.length === 2 && targeted.every((a: any) => a.status === 'available');
    if (allReady) return;
    console.log(`  ...waiting (attempt ${i + 1})`);
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function backfillExistingDocs() {
  let total = 0;
  let cursor: string | null = null;
  while (true) {
    const queries: any[] = [sdk.Query.limit(100)];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    const res = await databases.listDocuments(databaseId, COLLECTION_ID, queries);
    const docs = res.documents || [];
    if (docs.length === 0) break;

    for (const doc of docs) {
      const updates: any = {};
      if (doc.downvotes === undefined || doc.downvotes === null) updates.downvotes = 0;
      if (doc.downvotedBy === undefined || doc.downvotedBy === null) updates.downvotedBy = '[]';
      if (Object.keys(updates).length > 0) {
        await databases.updateDocument(databaseId, COLLECTION_ID, doc.$id, updates);
        total += 1;
      }
    }

    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  console.log(`  ✓ backfilled ${total} existing documents`);
}

(async () => {
  console.log(`Setting up downvote attributes on "${COLLECTION_ID}"...\n`);
  try {
    await databases.getCollection(databaseId, COLLECTION_ID);
  } catch (e: any) {
    if (e?.code === 404) {
      console.error(`✗ Collection "${COLLECTION_ID}" does not exist. Create it first.`);
      process.exit(1);
    }
    throw e;
  }

  await ensureIntegerAttr('downvotes', 0);
  await ensureStringAttr('downvotedBy', 5000, '[]');

  console.log('\nWaiting for attributes to become available...');
  await waitForAttributesReady();

  console.log('\nBackfilling existing documents...');
  await backfillExistingDocs();

  console.log('\nDone.');
})();
