/**
 * One-off script: reset all free-spin state.
 *
 * - Clears `prefs.freeSpins` for every user (removes per-player stats and today's usage)
 * - Wipes the global `.spin-stats.json` file (clears counters + jackpot log)
 *
 * Run: bun run scripts/reset-spins.ts
 */
const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

if (!projectId || !apiKey) {
  console.error('Missing APPWRITE_PROJECT or APPWRITE_KEY env vars');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const users = new sdk.Users(client);
const databases = new sdk.Databases(client);

async function resetAllUsers() {
  let cleared = 0;
  let scanned = 0;
  let cursor: string | undefined;

  while (true) {
    const queries = [sdk.Query.limit(100)];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    const res = await users.list(queries);
    const docs = res.users || [];
    if (docs.length === 0) break;

    for (const u of docs) {
      scanned++;
      const prefs = (u?.prefs && typeof u.prefs === 'object') ? u.prefs : {};
      if (!prefs || !('freeSpins' in prefs)) continue;
      const { freeSpins, ...rest } = prefs;
      try {
        await users.updatePrefs(u.$id, rest);
        cleared++;
        console.log(`  ✓ cleared ${u.name || u.email || u.$id}`);
      } catch (e: any) {
        console.error(`  ✗ failed for ${u.$id}:`, e?.message || e);
      }
    }

    cursor = docs[docs.length - 1].$id;
    if (docs.length < 100) break;
  }

  console.log(`\nScanned ${scanned} users, cleared freeSpins on ${cleared}`);
}

async function resetGlobalStats() {
  try {
    await databases.updateDocument(databaseId, 'spin_stats', 'main', {
      hitsByIndex: '{}',
      jackpotHits: '[]',
      totalSpins: 0,
    });
    console.log('✓ Wiped spin_stats/main in Appwrite');
  } catch (e: any) {
    console.error('✗ failed resetting spin_stats doc:', e?.message || e);
  }
}

(async () => {
  console.log('Resetting global spin stats...');
  await resetGlobalStats();
  console.log('\nResetting per-user freeSpins prefs...');
  await resetAllUsers();
  console.log('\nDone.');
})();
