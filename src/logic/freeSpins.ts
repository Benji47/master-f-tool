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
}

export interface JackpotHit {
  username: string;
  coins: number;
  timestamp: number;
}

export interface SpinStats {
  hitsByIndex: Record<string, number>;
  jackpotHits: JackpotHit[];
  totalSpins: number;
}

function client() {
  if (!projectId || !apiKey) throw new Error('Appwrite credentials not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

// ---------- Global stats (spin_stats collection) ----------

function parseStatsDoc(doc: any): SpinStats {
  let hits: Record<string, number> = {};
  let jackpots: JackpotHit[] = [];
  try { hits = JSON.parse(doc?.hitsByIndex || '{}') || {}; } catch { hits = {}; }
  try { const arr = JSON.parse(doc?.jackpotHits || '[]'); if (Array.isArray(arr)) jackpots = arr; } catch { jackpots = []; }
  return {
    hitsByIndex: hits,
    jackpotHits: jackpots,
    totalSpins: Number(doc?.totalSpins || 0),
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
    });
  } catch (e) {
    console.error('writeStats error', e);
  }
}

export async function getSpinStats(): Promise<SpinStats> {
  return readStats();
}

// ---------- Per-player stats (player_spin_stats collection) ----------

export const RESET_HOUR = 8; // Spins reset at 08:00 local time

function todayKey(): string {
  const d = new Date();
  d.setHours(d.getHours() - RESET_HOUR);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getNextResetIso(): string {
  const now = new Date();
  const reset = new Date();
  reset.setHours(RESET_HOUR, 0, 0, 0);
  if (now.getTime() >= reset.getTime()) {
    reset.setDate(reset.getDate() + 1);
  }
  return reset.toISOString();
}

function parsePlayerStats(doc: any): SpinState {
  const today = todayKey();
  let hits: Record<string, number> = {};
  try { hits = JSON.parse(doc?.hitsByIndex || '{}') || {}; } catch { hits = {}; }
  const storedDayKey = String(doc?.dayKey || '');
  const isToday = storedDayKey === today;
  return {
    dayKey: today,
    used: isToday ? Math.max(0, Number(doc?.used || 0)) : 0,
    totalWon: isToday ? Math.max(0, Number(doc?.totalWon || 0)) : 0,
    hitsByIndex: hits,
    totalSpins: Math.max(0, Number(doc?.totalSpins || 0)),
    totalWonAllTime: Math.max(0, Number(doc?.totalWonAllTime || 0)),
    bonusSpins: Math.max(0, Number(doc?.bonusSpins || 0)),
  };
}

async function readPlayerStats(profileId: string): Promise<SpinState> {
  try {
    const databases = new sdk.Databases(client());
    const doc = await databases.getDocument(databaseId, PLAYER_STATS_COLLECTION, profileId);
    return parsePlayerStats(doc);
  } catch (e: any) {
    if (e?.code === 404) {
      return {
        dayKey: todayKey(), used: 0, totalWon: 0,
        hitsByIndex: {}, totalSpins: 0, totalWonAllTime: 0, bonusSpins: 0,
      };
    }
    console.error('readPlayerStats error', e);
    return {
      dayKey: todayKey(), used: 0, totalWon: 0,
      hitsByIndex: {}, totalSpins: 0, totalWonAllTime: 0, bonusSpins: 0,
    };
  }
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
