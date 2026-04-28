/**
 * One-off: give every player +1 super spin (added to superBonusSpins).
 *
 * Run: bun run scripts/grant-super-spin-all.ts
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

const PROFILES = 'players-profile';
const STATS = 'player_spin_stats';
const SUPER_SPINS_PER_DAY = 1;

const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);

function todayKey(): string {
  // Mirror logic from src/logic/freeSpins.ts (Bratislava day bucket, reset 08:00)
  const RESET_HOUR = 8;
  const TIMEZONE = 'Europe/Bratislava';
  const shifted = new Date(Date.now() - RESET_HOUR * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour12: false,
  });
  const obj: any = {};
  fmt.formatToParts(shifted).forEach(p => { if (p.type !== 'literal') obj[p.type] = p.value; });
  return `${obj.year}-${obj.month}-${obj.day}`;
}

async function listAllProfiles(): Promise<{ $id: string; username?: string }[]> {
  const all: any[] = [];
  let cursor: string | undefined;
  while (true) {
    const queries = [sdk.Query.limit(100)];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    const res = await databases.listDocuments(databaseId, PROFILES, queries);
    const docs = res.documents || [];
    if (docs.length === 0) break;
    all.push(...docs);
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  return all;
}

async function grantOne(profileId: string, username: string): Promise<{ before: number; after: number; created: boolean }>{
  let existing: any = null;
  try {
    existing = await databases.getDocument(databaseId, STATS, profileId);
  } catch (e: any) {
    if (e?.code !== 404) throw e;
  }
  const today = todayKey();
  if (existing) {
    const before = Math.max(0, Number(existing.superBonusSpins || 0));
    const storedDay = String(existing.superDayKey || '');
    const isToday = storedDay === today;
    const dailyUsed = isToday ? Math.max(0, Number(existing.superDailyUsed || 0)) : 0;
    const payload: any = {
      superBonusSpins: before + 1,
    };
    // If day rolled over, refresh tracking fields so available count is correct.
    if (!isToday) {
      payload.superDayKey = today;
      payload.superDailyUsed = 0;
    } else {
      payload.superDailyUsed = dailyUsed;
    }
    await databases.updateDocument(databaseId, STATS, profileId, payload);
    return { before, after: before + 1, created: false };
  }
  // No stats doc yet — create with bonus = 1 plus the daily allowance untouched.
  const payload = {
    hitsByIndex: '{}',
    totalSpins: 0,
    totalWonAllTime: 0,
    dayKey: today,
    used: 0,
    totalWon: 0,
    bonusSpins: 0,
    superDayKey: today,
    superDailyUsed: 0,
    superBonusSpins: 1,
    superSpinsTotal: 0,
    wonTockar: false,
  };
  await databases.createDocument(databaseId, STATS, profileId, payload);
  return { before: 0, after: 1, created: true };
}

(async () => {
  console.log(`Granting +1 super spin to every player in "${PROFILES}"...\n`);
  const profiles = await listAllProfiles();
  console.log(`Found ${profiles.length} profiles\n`);
  let ok = 0, created = 0, failed = 0;
  for (const p of profiles) {
    const username = (p as any).username || p.$id;
    try {
      const res = await grantOne(p.$id, username);
      ok++;
      if (res.created) created++;
      console.log(`  ✓ ${username}: superBonusSpins ${res.before} → ${res.after}${res.created ? ' (new doc)' : ''}`);
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${username}: ${e?.message || e}`);
    }
  }
  console.log(`\nDone. ok=${ok} (created=${created}) failed=${failed}`);
})();
