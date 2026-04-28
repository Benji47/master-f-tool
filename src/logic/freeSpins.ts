import { getPlayerProfile, updatePlayerStats } from "./profile";

const sdk = require('node-appwrite');

const databaseId = process.env.APPWRITE_DATABASE_ID;
const STATS_COLLECTION = 'spin_stats';
const STATS_DOC_ID = 'main';
const PLAYER_STATS_COLLECTION = 'player_spin_stats';
const MAX_JACKPOT_LOG = 200;

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;

export const FREE_SPINS_PER_DAY = 10;

export interface SpinPrize {
  index: number;
  coins: number;
  label: string;
  color: string;
  weight: number;
}

// Order is the visual clockwise order on the wheel — alternating big/small slices
// so the thin (low-chance) slices aren't clumped together. Indexes are stable
// identifiers (used for stats lookup) — do NOT change their values.
export const SPIN_PRIZES: SpinPrize[] = [
  { index: 1, coins: 10,     label: '10',        color: '#7c3aed', weight: 20 },
  { index: 9, coins: 10000,  label: 'JACKPOT',   color: '#fbbf24', weight: 0.5 },
  { index: 0, coins: 0,      label: 'TRY AGAIN', color: '#4b5563', weight: 18 },
  { index: 8, coins: 2500,   label: '2.5K',      color: '#a855f7', weight: 1 },
  { index: 2, coins: 25,     label: '25',        color: '#ec4899', weight: 18 },
  { index: 7, coins: 1000,   label: '1K',        color: '#ef4444', weight: 2.5 },
  { index: 3, coins: 50,     label: '50',        color: '#f59e0b', weight: 15 },
  { index: 6, coins: 500,    label: '500',       color: '#3b82f6', weight: 5 },
  { index: 4, coins: 100,    label: '100',       color: '#10b981', weight: 12 },
  { index: 5, coins: 250,    label: '250',       color: '#06b6d4', weight: 8 },
];

export interface SpinState {
  dayKey: string;
  used: number;
  totalWon: number;
  hitsByIndex: Record<string, number>;
  totalSpins: number;
  totalWonAllTime: number;
  bonusSpins: number;
  // Super spin tracking — 1 free per day (resets 08:00 Bratislava) + persistent bonus.
  superDayKey: string;
  superDailyUsed: number;
  superBonusSpins: number;
  superSpinsAvailable: number; // computed: dailyLeft + bonus
  superSpinsTotal: number;
  wonTockar: boolean;
}

export interface SuperSpinEntry {
  username: string;
  won: boolean;
  timestamp: number;
}

export const SUPER_SPIN_WIN_RATE = 0.01; // 1 in 100
export const SUPER_SPINS_PER_DAY = 1;
export const TOCKAR_BADGE_NAME = "Točkář 🍀";
const MAX_SUPER_SPIN_LOG = 500;

export interface JackpotHit {
  username: string;
  coins: number;
  timestamp: number;
}

export interface SpinStats {
  hitsByIndex: Record<string, number>;
  jackpotHits: JackpotHit[];
  totalSpins: number;
  superSpinLog: SuperSpinEntry[];
}

function client() {
  if (!projectId || !apiKey) throw new Error('Appwrite credentials not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

// ---------- Global stats (spin_stats collection) ----------

function parseStatsDoc(doc: any): SpinStats {
  let hits: Record<string, number> = {};
  let jackpots: JackpotHit[] = [];
  let superLog: SuperSpinEntry[] = [];
  try { hits = JSON.parse(doc?.hitsByIndex || '{}') || {}; } catch { hits = {}; }
  try { const arr = JSON.parse(doc?.jackpotHits || '[]'); if (Array.isArray(arr)) jackpots = arr; } catch { jackpots = []; }
  try { const arr = JSON.parse(doc?.superSpinLog || '[]'); if (Array.isArray(arr)) superLog = arr; } catch { superLog = []; }
  return {
    hitsByIndex: hits,
    jackpotHits: jackpots,
    totalSpins: Number(doc?.totalSpins || 0),
    superSpinLog: superLog,
  };
}

async function readStats(): Promise<SpinStats> {
  try {
    const databases = new sdk.Databases(client());
    const doc = await databases.getDocument(databaseId, STATS_COLLECTION, STATS_DOC_ID);
    return parseStatsDoc(doc);
  } catch (e) {
    console.error('readStats error (is the spin_stats collection set up?)', e);
    return { hitsByIndex: {}, jackpotHits: [], totalSpins: 0 };
  }
}

async function writeStats(stats: SpinStats): Promise<void> {
  try {
    const databases = new sdk.Databases(client());
    await databases.updateDocument(databaseId, STATS_COLLECTION, STATS_DOC_ID, {
      hitsByIndex: JSON.stringify(stats.hitsByIndex || {}),
      jackpotHits: JSON.stringify(stats.jackpotHits || []),
      totalSpins: Number(stats.totalSpins || 0),
      superSpinLog: JSON.stringify(stats.superSpinLog || []),
    });
  } catch (e) {
    console.error('writeStats error', e);
  }
}

export async function getSpinStats(): Promise<SpinStats> {
  return readStats();
}

// ---------- Per-player stats (player_spin_stats collection) ----------

export const RESET_HOUR = 8; // Spins reset at 08:00 Bratislava time
const TIMEZONE = 'Europe/Bratislava';

function bratislavaParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const obj: any = {};
  fmt.formatToParts(d).forEach(p => { if (p.type !== 'literal') obj[p.type] = Number(p.value); });
  if (obj.hour === 24) obj.hour = 0;
  return obj;
}

// Offset between Bratislava wall-clock time and UTC in ms. Positive (+1h winter,
// +2h summer). Resolves DST automatically because Intl handles it.
function bratislavaOffsetMs(at: Date): number {
  const p = bratislavaParts(at);
  const fakeUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const realMs = Math.floor(at.getTime() / 1000) * 1000;
  return fakeUtc - realMs;
}

function todayKey(): string {
  // "Day bucket" in Bratislava: shift now by -RESET_HOUR hours then take the
  // Bratislava date. At 07:59 Bratislava we're still in yesterday's bucket.
  const shifted = new Date(Date.now() - RESET_HOUR * 60 * 60 * 1000);
  const p = bratislavaParts(shifted);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function getNextResetIso(): string {
  const now = new Date();
  const offsetMs = bratislavaOffsetMs(now);
  const p = bratislavaParts(now);
  // Bratislava {today, RESET_HOUR}:00 expressed as a real UTC instant.
  let resetMs = Date.UTC(p.year, p.month - 1, p.day, RESET_HOUR, 0, 0) - offsetMs;
  if (resetMs <= now.getTime()) resetMs += 24 * 60 * 60 * 1000;
  return new Date(resetMs).toISOString();
}

function parsePlayerStats(doc: any): SpinState {
  const today = todayKey();
  let hits: Record<string, number> = {};
  try { hits = JSON.parse(doc?.hitsByIndex || '{}') || {}; } catch { hits = {}; }
  const storedDayKey = String(doc?.dayKey || '');
  const isToday = storedDayKey === today;
  const storedSuperDayKey = String(doc?.superDayKey || '');
  const isSuperToday = storedSuperDayKey === today;
  const superDailyUsed = isSuperToday ? Math.max(0, Number(doc?.superDailyUsed || 0)) : 0;
  const superBonusSpins = Math.max(0, Number(doc?.superBonusSpins || 0));
  const superDailyLeft = Math.max(0, SUPER_SPINS_PER_DAY - superDailyUsed);
  return {
    dayKey: today,
    used: isToday ? Math.max(0, Number(doc?.used || 0)) : 0,
    totalWon: isToday ? Math.max(0, Number(doc?.totalWon || 0)) : 0,
    hitsByIndex: hits,
    totalSpins: Math.max(0, Number(doc?.totalSpins || 0)),
    totalWonAllTime: Math.max(0, Number(doc?.totalWonAllTime || 0)),
    bonusSpins: Math.max(0, Number(doc?.bonusSpins || 0)),
    superDayKey: today,
    superDailyUsed,
    superBonusSpins,
    superSpinsAvailable: superDailyLeft + superBonusSpins,
    superSpinsTotal: Math.max(0, Number(doc?.superSpinsTotal || 0)),
    wonTockar: doc?.wonTockar === true || doc?.wonTockar === 'true',
  };
}

async function readPlayerStats(profileId: string): Promise<SpinState> {
  try {
    const databases = new sdk.Databases(client());
    const doc = await databases.getDocument(databaseId, PLAYER_STATS_COLLECTION, profileId);
    return parsePlayerStats(doc);
  } catch (e: any) {
    if (e?.code === 404) {
      return defaultEmptyState();
    }
    console.error('readPlayerStats error', e);
    return defaultEmptyState();
  }
}

function defaultEmptyState(): SpinState {
  const today = todayKey();
  return {
    dayKey: today, used: 0, totalWon: 0,
    hitsByIndex: {}, totalSpins: 0, totalWonAllTime: 0, bonusSpins: 0,
    superDayKey: today, superDailyUsed: 0, superBonusSpins: 0,
    superSpinsAvailable: SUPER_SPINS_PER_DAY,
    superSpinsTotal: 0, wonTockar: false,
  };
}

async function writePlayerStats(profileId: string, state: SpinState): Promise<void> {
  const payload = {
    hitsByIndex: JSON.stringify(state.hitsByIndex || {}),
    totalSpins: Number(state.totalSpins || 0),
    totalWonAllTime: Number(state.totalWonAllTime || 0),
    dayKey: String(state.dayKey || ''),
    used: Number(state.used || 0),
    totalWon: Number(state.totalWon || 0),
    bonusSpins: Number(state.bonusSpins || 0),
    superDayKey: String(state.superDayKey || ''),
    superDailyUsed: Number(state.superDailyUsed || 0),
    superBonusSpins: Number(state.superBonusSpins || 0),
    superSpinsTotal: Number(state.superSpinsTotal || 0),
    wonTockar: state.wonTockar === true,
  };
  const databases = new sdk.Databases(client());
  try {
    await databases.updateDocument(databaseId, PLAYER_STATS_COLLECTION, profileId, payload);
  } catch (e: any) {
    if (e?.code === 404) {
      await databases.createDocument(databaseId, PLAYER_STATS_COLLECTION, profileId, payload);
    } else {
      console.error('writePlayerStats error', e);
      throw e;
    }
  }
}

export async function getSpinState(profileId: string): Promise<SpinState> {
  return readPlayerStats(profileId);
}

export async function addBonusSpins(profileId: string, amount: number): Promise<SpinState> {
  const state = await readPlayerStats(profileId);
  state.bonusSpins = Math.max(0, (state.bonusSpins || 0) + Math.floor(amount));
  await writePlayerStats(profileId, state);
  return state;
}

export async function addSuperSpins(profileId: string, amount: number): Promise<SpinState> {
  const state = await readPlayerStats(profileId);
  state.superBonusSpins = Math.max(0, (state.superBonusSpins || 0) + Math.floor(amount));
  // Recompute available
  const dailyLeft = Math.max(0, SUPER_SPINS_PER_DAY - state.superDailyUsed);
  state.superSpinsAvailable = dailyLeft + state.superBonusSpins;
  await writePlayerStats(profileId, state);
  return state;
}

export interface SuperSpinResult {
  ok: boolean;
  message?: string;
  won?: boolean;
  badgeName?: string;
  superSpinsAvailable?: number;
  superSpinsTotal?: number;
  wonTockar?: boolean;
}

export async function superSpin(profileId: string): Promise<SuperSpinResult> {
  try {
    const state = await readPlayerStats(profileId);
    if (state.wonTockar) {
      return { ok: false, message: 'You already won the badge — no more super spins for you.' };
    }
    const dailyLeft = Math.max(0, SUPER_SPINS_PER_DAY - state.superDailyUsed);
    const bonusLeft = Math.max(0, state.superBonusSpins);
    if (dailyLeft + bonusLeft <= 0) {
      return { ok: false, message: 'No super spins left. Come back tomorrow or buy more in the Shop!' };
    }

    const profile = await getPlayerProfile(profileId);
    if (!profile) return { ok: false, message: 'Profile not found' };

    const won = Math.random() < SUPER_SPIN_WIN_RATE;

    // Consume daily first; once exhausted, burn bonus.
    let nextDailyUsed = state.superDailyUsed;
    let nextBonus = state.superBonusSpins;
    if (dailyLeft > 0) {
      nextDailyUsed += 1;
    } else {
      nextBonus -= 1;
    }
    const nextDailyLeft = Math.max(0, SUPER_SPINS_PER_DAY - nextDailyUsed);

    const nextState: SpinState = {
      ...state,
      superDailyUsed: nextDailyUsed,
      superBonusSpins: nextBonus,
      superSpinsAvailable: nextDailyLeft + nextBonus,
      superSpinsTotal: (state.superSpinsTotal || 0) + 1,
      wonTockar: state.wonTockar || won,
    };

    if (won) {
      try {
        const ownedBadges: string[] = profile.ownedBadges
          ? (typeof profile.ownedBadges === 'string'
              ? JSON.parse(profile.ownedBadges)
              : profile.ownedBadges)
          : [];
        if (!ownedBadges.includes(TOCKAR_BADGE_NAME)) {
          ownedBadges.push(TOCKAR_BADGE_NAME);
          await updatePlayerStats(profileId, {
            ownedBadges: JSON.stringify(ownedBadges),
          });
        }
      } catch (e) {
        console.error('superSpin: failed to grant badge', e);
      }
    }

    await writePlayerStats(profileId, nextState);

    // Append to global super-spin log so the leaderboard sees the attempt.
    try {
      const stats = await readStats();
      const log = Array.isArray(stats.superSpinLog) ? stats.superSpinLog : [];
      log.unshift({
        username: profile.username || profileId,
        won,
        timestamp: Date.now(),
      });
      stats.superSpinLog = log.slice(0, MAX_SUPER_SPIN_LOG);
      await writeStats(stats);
    } catch (e) {
      console.error('failed to update super spin global log', e);
    }

    return {
      ok: true,
      won,
      badgeName: won ? TOCKAR_BADGE_NAME : undefined,
      superSpinsAvailable: nextState.superSpinsAvailable,
      superSpinsTotal: nextState.superSpinsTotal,
      wonTockar: nextState.wonTockar,
    };
  } catch (e: any) {
    console.error('superSpin error', e);
    return { ok: false, message: e?.message || 'Super spin failed' };
  }
}

// Remaining spins available right now (daily allowance + bonus).
export function computeRemainingSpins(state: Pick<SpinState, 'used' | 'bonusSpins'>): number {
  const daily = Math.max(0, FREE_SPINS_PER_DAY - (state.used || 0));
  return daily + (state.bonusSpins || 0);
}

// ---------- Spin logic ----------

function pickPrize(): SpinPrize {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of SPIN_PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return SPIN_PRIZES[0];
}

export interface SpinResult {
  ok: boolean;
  message?: string;
  prize?: SpinPrize;
  remaining?: number;
  newCoins?: number;
  totalWonToday?: number;
  bonusSpinsLeft?: number;
}

const jackpotCoins = SPIN_PRIZES.reduce((m, p) => p.coins > m ? p.coins : m, 0);

export async function spin(profileId: string): Promise<SpinResult> {
  try {
    const state = await readPlayerStats(profileId);
    const dailyLeft = Math.max(0, FREE_SPINS_PER_DAY - (state.used || 0));
    const bonusLeft = Math.max(0, state.bonusSpins || 0);
    if (dailyLeft + bonusLeft <= 0) {
      return { ok: false, message: 'No spins left. Come back tomorrow or buy more in the Shop!' };
    }

    const prize = pickPrize();
    const profile = await getPlayerProfile(profileId);
    if (!profile) return { ok: false, message: 'Profile not found' };

    const newCoins = (profile.coins || 0) + prize.coins;
    if (prize.coins > 0) {
      await updatePlayerStats(profileId, { coins: newCoins });
    }

    // Consume daily spin first; once daily are exhausted, burn bonus spins.
    let nextUsed = state.used || 0;
    let nextBonus = state.bonusSpins || 0;
    if (dailyLeft > 0) {
      nextUsed = nextUsed + 1;
    } else {
      nextBonus = nextBonus - 1;
    }

    const key = String(prize.index);
    const nextHitsByIndex = { ...(state.hitsByIndex || {}) };
    nextHitsByIndex[key] = (Number(nextHitsByIndex[key]) || 0) + 1;

    const nextState: SpinState = {
      dayKey: state.dayKey,
      used: nextUsed,
      totalWon: (state.totalWon || 0) + prize.coins,
      hitsByIndex: nextHitsByIndex,
      totalSpins: (state.totalSpins || 0) + 1,
      totalWonAllTime: (state.totalWonAllTime || 0) + prize.coins,
      bonusSpins: nextBonus,
    };

    await writePlayerStats(profileId, nextState);

    // Update global stats doc
    try {
      const stats = await readStats();
      stats.hitsByIndex[key] = (stats.hitsByIndex[key] || 0) + 1;
      stats.totalSpins = (stats.totalSpins || 0) + 1;
      if (prize.coins === jackpotCoins) {
        stats.jackpotHits.unshift({
          username: profile.username || profileId,
          coins: prize.coins,
          timestamp: Date.now(),
        });
        if (stats.jackpotHits.length > MAX_JACKPOT_LOG) {
          stats.jackpotHits = stats.jackpotHits.slice(0, MAX_JACKPOT_LOG);
        }
      }
      await writeStats(stats);
    } catch (e) {
      console.error('failed to update global spin stats', e);
    }

    return {
      ok: true,
      prize,
      remaining: computeRemainingSpins(nextState),
      newCoins,
      totalWonToday: nextState.totalWon,
      bonusSpinsLeft: nextState.bonusSpins,
    };
  } catch (e: any) {
    console.error('spin error', e);
    return { ok: false, message: e?.message || 'Spin failed' };
  }
}
