import { getPlayerProfile, updatePlayerStats } from "./profile";

const sdk = require('node-appwrite');

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

export const SPIN_PRIZES: SpinPrize[] = [
  { index: 0, coins: 0,      label: 'TRY AGAIN', color: '#4b5563', weight: 18 },
  { index: 1, coins: 10,     label: '10',        color: '#7c3aed', weight: 20 },
  { index: 2, coins: 25,     label: '25',        color: '#ec4899', weight: 18 },
  { index: 3, coins: 50,     label: '50',        color: '#f59e0b', weight: 15 },
  { index: 4, coins: 100,    label: '100',       color: '#10b981', weight: 12 },
  { index: 5, coins: 250,    label: '250',       color: '#06b6d4', weight: 8 },
  { index: 6, coins: 500,    label: '500',       color: '#3b82f6', weight: 5 },
  { index: 7, coins: 1000,   label: '1K',        color: '#ef4444', weight: 2.5 },
  { index: 8, coins: 2500,   label: '2.5K',      color: '#a855f7', weight: 1 },
  { index: 9, coins: 10000,  label: 'JACKPOT',   color: '#fbbf24', weight: 0.5 },
];

export interface SpinState {
  dayKey: string;
  used: number;
  totalWon: number;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function client() {
  if (!projectId || !apiKey) throw new Error('Appwrite credentials not configured');
  return new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

async function readPrefs(userId: string): Promise<{ prefs: any; state: SpinState }> {
  const users = new sdk.Users(client());
  const user = await users.get(userId);
  const prefs = (user?.prefs && typeof user.prefs === 'object') ? user.prefs : {};
  const raw = prefs.freeSpins;
  const today = todayKey();
  let state: SpinState = { dayKey: today, used: 0, totalWon: 0 };
  if (raw && typeof raw === 'object' && raw.dayKey === today) {
    state = {
      dayKey: today,
      used: Math.max(0, Math.min(FREE_SPINS_PER_DAY, Number(raw.used || 0))),
      totalWon: Math.max(0, Number(raw.totalWon || 0)),
    };
  }
  return { prefs, state };
}

export async function getSpinState(userId: string): Promise<SpinState> {
  try {
    const { state } = await readPrefs(userId);
    return state;
  } catch (e) {
    console.error('getSpinState error', e);
    return { dayKey: todayKey(), used: 0, totalWon: 0 };
  }
}

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
}

export async function spin(userId: string, profileId: string): Promise<SpinResult> {
  try {
    const { prefs, state } = await readPrefs(userId);
    if (state.used >= FREE_SPINS_PER_DAY) {
      return { ok: false, message: 'No free spins left today. Come back tomorrow!' };
    }

    const prize = pickPrize();

    const profile = await getPlayerProfile(profileId);
    if (!profile) return { ok: false, message: 'Profile not found' };

    const newCoins = (profile.coins || 0) + prize.coins;
    if (prize.coins > 0) {
      await updatePlayerStats(profileId, { coins: newCoins });
    }

    const nextState: SpinState = {
      dayKey: state.dayKey,
      used: state.used + 1,
      totalWon: state.totalWon + prize.coins,
    };

    const users = new sdk.Users(client());
    await users.updatePrefs(userId, { ...prefs, freeSpins: nextState });

    return {
      ok: true,
      prize,
      remaining: FREE_SPINS_PER_DAY - nextState.used,
      newCoins,
      totalWonToday: nextState.totalWon,
    };
  } catch (e: any) {
    console.error('spin error', e);
    return { ok: false, message: e?.message || 'Spin failed' };
  }
}
