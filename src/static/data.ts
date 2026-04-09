export interface PlayerData {
  username: string;
  elo: number;
  xp: number;
  wins: number;
  loses: number;
  ultimate_wins: number;
  ultimate_loses: number;
  goals_scored: number;
  goals_conceded: number;
  vyrazecky: number;
  ten_zero_wins: number;
  ten_zero_loses: number;
}

export interface Badge {
  name: string;
  minLevel: number;
  maxLevel: number;
  bg: string;
  text: string;
  iconUrl?: string;
  rainbow?: boolean;
}

export const levelsXp = [
  75, 150, 225, 300, 400, 500, 650, 800, 1000, 1400, 2000, 2500,
  75, 150, 225, 300, 400, 500, 650, 800, 1000, 1400, 2000, 2500,
];

export const badges: Badge[] = [
  { name: "Rookie ♖", minLevel: 0, maxLevel: 75, bg: "bg-red-600", text: "text-red-100" },
  { name: "Šnekpán 🐌", minLevel: 75, maxLevel: 225, bg: "bg-orange-600", text: "text-orange-100" },
  { name: "Cleaner 🧹", minLevel: 225, maxLevel: 450, bg: "bg-yellow-600", text: "text-yellow-100" },
  { name: "Own goals master 🥅🫣", minLevel: 450, maxLevel: 750, bg: "bg-lime-600", text: "text-lime-100" },
  { name: "Zlodej míčku 🫳⚽", minLevel: 750, maxLevel: 1150, bg: "bg-green-600", text: "text-green-100" },
  { name: "Ťukač do tyček", minLevel: 1150, maxLevel: 1650, bg: "bg-cyan-600", text: "text-cyan-100" },
  { name: "Mad Max 😡", minLevel: 1650, maxLevel: 2300, bg: "bg-blue-600", text: "text-blue-100" },
  { name: "Fotograf 📷", minLevel: 2300, maxLevel: 3100, bg: "bg-indigo-600", text: "text-indigo-100" },
  { name: "▄︻デ══━一💥", minLevel: 3100, maxLevel: 4100, bg: "bg-purple-600", text: "text-purple-100" },
  { name: "Vyrážeč ➜] ", minLevel: 4100, maxLevel: 5500, bg: "bg-black", text: "text-neutral-100" },
  {
      name: "Zmrd",
      iconUrl:
        "https://raw.githubusercontent.com/Benji47/master-f-tool/refs/heads/main/public/obrázek.png",
      minLevel: 5500,
      maxLevel: 7500,
      bg: "bg-white",
      text: "text-black",
  },
  { name: "XXX0m3g4Pl4y3rXXX", minLevel: 7500, maxLevel: 10000, bg: "bg-pink-600", text: "text-neutral-100" },
  // Rainbow tier (levels 13-24) — same names with ✦ suffix, rainbow border
  { name: "Rookie ♖ ✦", minLevel: 10000, maxLevel: 10075, bg: "bg-red-600", text: "text-red-100", rainbow: true },
  { name: "Šnekpán 🐌 ✦", minLevel: 10075, maxLevel: 10225, bg: "bg-orange-600", text: "text-orange-100", rainbow: true },
  { name: "Cleaner 🧹 ✦", minLevel: 10225, maxLevel: 10450, bg: "bg-yellow-600", text: "text-yellow-100", rainbow: true },
  { name: "Own goals master 🥅🫣 ✦", minLevel: 10450, maxLevel: 10750, bg: "bg-lime-600", text: "text-lime-100", rainbow: true },
  { name: "Zlodej míčku 🫳⚽ ✦", minLevel: 10750, maxLevel: 11150, bg: "bg-green-600", text: "text-green-100", rainbow: true },
  { name: "Ťukač do tyček ✦", minLevel: 11150, maxLevel: 11650, bg: "bg-cyan-600", text: "text-cyan-100", rainbow: true },
  { name: "Mad Max 😡 ✦", minLevel: 11650, maxLevel: 12300, bg: "bg-blue-600", text: "text-blue-100", rainbow: true },
  { name: "Fotograf 📷 ✦", minLevel: 12300, maxLevel: 13100, bg: "bg-indigo-600", text: "text-indigo-100", rainbow: true },
  { name: "▄︻デ══━一💥 ✦", minLevel: 13100, maxLevel: 14100, bg: "bg-purple-600", text: "text-purple-100", rainbow: true },
  { name: "Vyrážeč ➜] ✦", minLevel: 14100, maxLevel: 15500, bg: "bg-black", text: "text-neutral-100", rainbow: true },
  { name: "Zmrd ✦", iconUrl: "https://raw.githubusercontent.com/Benji47/master-f-tool/refs/heads/main/public/obrázek.png", minLevel: 15500, maxLevel: 17500, bg: "bg-white", text: "text-black", rainbow: true },
  { name: "XXX0m3g4Pl4y3rXXX ✦", minLevel: 17500, maxLevel: 20000, bg: "bg-pink-600", text: "text-neutral-100", rainbow: true },
];

// Shop-exclusive badges (not earned by leveling)
export const shopBadges: Badge[] = [
  { name: "Millionaire 💰", minLevel: 0, maxLevel: 999999, bg: "bg-gradient-to-r from-yellow-400 to-amber-500", text: "text-black" },
  { name: "Billionaire 💎", minLevel: 0, maxLevel: 999999, bg: "bg-gradient-to-r from-emerald-400 to-cyan-500", text: "text-black" },
];

// Get all available badges (level-based + shop)
export function getAllBadges(): Badge[] {
  return [...badges, ...shopBadges];
}

// Get badge by name
export function getBadgeByName(name: string): Badge | undefined {
  return getAllBadges().find(b => b.name === name);
}

export const rankTiers = [
  { name: "zElo", min: -1000, max: -1, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },
  { name: "Bronze I", min: 0, max: 49, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },
  { name: "Bronze II", min: 50, max: 99, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },
  { name: "Bronze III", min: 100, max: 199, color: "from-amber-900 to-amber-700", textColor: "text-amber-800" },
  { name: "Silver I", min: 200, max: 249, color: "from-gray-900 to-gray-500", textColor: "text-gray-500" },
  { name: "Silver II", min: 250, max: 299, color: "from-gray-900 to-gray-500", textColor: "text-gray-500" },
  { name: "Silver III", min: 300, max: 399, color: "from-gray-900 to-gray-500", textColor: "text-gray-500" },
  { name: "Gold I", min: 400, max: 449, color: "from-amber-900 to-amber-500", textColor: "text-amber-500" },
  { name: "Gold II", min: 450, max: 499, color: "from-amber-900 to-amber-500", textColor: "text-amber-500" },
  { name: "Gold III", min: 500, max: 599, color: "from-amber-900 to-amber-500", textColor: "text-amber-500" },
  { name: "Platinum I", min: 600, max: 649, color: "from-sky-900 to-sky-500", textColor: "text-sky-500" },
  { name: "Platinum II", min: 650, max: 699, color: "from-sky-900 to-sky-500", textColor: "text-sky-500" },
  { name: "Platinum III", min: 700, max: 799, color: "from-sky-900 to-sky-500", textColor: "text-sky-500" },
  { name: "Diamond I", min: 800, max: 849, color: "from-indigo-900 to-indigo-500", textColor: "text-indigo-500" },
  { name: "Diamond II", min: 850, max: 899, color: "from-indigo-900 to-indigo-500", textColor: "text-indigo-500" },
  { name: "Diamond III", min: 900, max: 999, color: "from-indigo-900 to-indigo-500", textColor: "text-indigo-500" },
  { name: "Master", min: 1000, max: 1049, color: "from-purple-900 to-purple-500", textColor: "text-purple-500" },
  { name: "Master F", min: 1050, max: 1099, color: "from-purple-900 to-purple-500", textColor: "text-purple-500" },
  { name: "Masters Blythe", min: 1100, max: 1199, color: "from-purple-900 to-purple-500", textColor: "text-purple-500" },
  { name: "Grandmaster", min: 1200, max: 5000, color: "from-red-900 to-red-500", textColor: "text-red-500" },
];

export function getCumulativeThresholds(): number[] {
  let cumulative = 0;
  return levelsXp.map((xp) => {
    const threshold = cumulative;
    cumulative += xp;
    return threshold;
  });
}

const cumulativeLevelsXp = getCumulativeThresholds();

export function computeLevel(xp: number) { 
  let level = 1;
  let currentLevelXp = 0;
  let nextLevelXp = levelsXp[1];

  for (let i = 0; i < cumulativeLevelsXp.length; i++) {
    if (xp >= cumulativeLevelsXp[i]) {
      level = i + 1;
      currentLevelXp = cumulativeLevelsXp[i];
      nextLevelXp = cumulativeLevelsXp[i] + (levelsXp[i] || 0);
    } else {
      break;
    }
  }

  const xpInCurrentLevel = xp - currentLevelXp;
  const xpNeededForNext = levelsXp[level - 1] || 0;
  const progress = xpNeededForNext > 0 ? Math.round((xpInCurrentLevel / xpNeededForNext) * 100) : 100;
  const missing = Math.max(0, nextLevelXp - xp);

  return { level, currentLevelXp, nextLevelXp, xpInCurrentLevel, xpNeededForNext, missing, progress };
}

export function getLevelBadgeColor(level: number): { bg: string; text: string, textInLeaderboards: string } {
  if (level <= 1) return { bg: "bg-red-600", text: "text-red-100", textInLeaderboards: "text-red-500" };
  if (level <= 2) return { bg: "bg-orange-600", text: "text-orange-100", textInLeaderboards: "text-orange-500" };
  if (level <= 3) return { bg: "bg-yellow-600", text: "text-yellow-100", textInLeaderboards: "text-yellow-500" };
  if (level <= 4) return { bg: "bg-lime-600", text: "text-lime-100", textInLeaderboards: "text-lime-500" };
  if (level <= 5) return { bg: "bg-green-600", text: "text-green-100", textInLeaderboards: "text-green-500" };
  if (level <= 6) return { bg: "bg-cyan-600", text: "text-cyan-100", textInLeaderboards: "text-cyan-500" };
  if (level <= 7) return { bg: "bg-blue-600", text: "text-blue-100", textInLeaderboards: "text-blue-500" };
  if (level <= 8) return { bg: "bg-indigo-600", text: "text-indigo-100", textInLeaderboards: "text-indigo-500" };
  if (level <= 9) return { bg: "bg-purple-600", text: "text-purple-100", textInLeaderboards: "text-purple-500" };
  if (level <= 10) return { bg: "bg-black", text: "text-neutral-100", textInLeaderboards: "text-neutral-500" };
  if (level <= 11) return { bg: "bg-white", text: "text-black", textInLeaderboards: "text-white" };
  if (level <= 12) return { bg: "bg-pink-600", text: "text-black", textInLeaderboards: "text-white" };
  // Rainbow tier (levels 13-24) — same colors as 1-12
  if (level <= 13) return { bg: "bg-red-600", text: "text-red-100", textInLeaderboards: "text-red-500" };
  if (level <= 14) return { bg: "bg-orange-600", text: "text-orange-100", textInLeaderboards: "text-orange-500" };
  if (level <= 15) return { bg: "bg-yellow-600", text: "text-yellow-100", textInLeaderboards: "text-yellow-500" };
  if (level <= 16) return { bg: "bg-lime-600", text: "text-lime-100", textInLeaderboards: "text-lime-500" };
  if (level <= 17) return { bg: "bg-green-600", text: "text-green-100", textInLeaderboards: "text-green-500" };
  if (level <= 18) return { bg: "bg-cyan-600", text: "text-cyan-100", textInLeaderboards: "text-cyan-500" };
  if (level <= 19) return { bg: "bg-blue-600", text: "text-blue-100", textInLeaderboards: "text-blue-500" };
  if (level <= 20) return { bg: "bg-indigo-600", text: "text-indigo-100", textInLeaderboards: "text-indigo-500" };
  if (level <= 21) return { bg: "bg-purple-600", text: "text-purple-100", textInLeaderboards: "text-purple-500" };
  if (level <= 22) return { bg: "bg-black", text: "text-neutral-100", textInLeaderboards: "text-neutral-500" };
  if (level <= 23) return { bg: "bg-white", text: "text-black", textInLeaderboards: "text-white" };
  if (level <= 24) return { bg: "bg-pink-600", text: "text-black", textInLeaderboards: "text-white" };
  return { bg: "bg-indigo-600", text: "text-indigo-100", textInLeaderboards: "text-red-500" };
}

export function getRankInfoFromElo(elo: number) {
  const tiers = rankTiers;
  const tier = tiers.find(t => elo >= t.min && elo <= t.max) ?? tiers[0];
  const span = tier.max - tier.min + 1;
  const progress = Math.round(((elo - tier.min) / span) * 100);
  const tierIndex = tiers.indexOf(tier);
  const prevTier = tierIndex > 0 ? tiers[tierIndex - 1] : null;
  const nextTier = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;
  return { 
    name: tier.name, 
    progress, 
    color: tier.color, 
    colorKey: tier.textColor, 
    min: tier.min, 
    max: tier.max,
    prevTierName: prevTier?.name,
    nextTierName: nextTier?.name,
  };
}

export function eloColor(elo: number): string {
  return getRankInfoFromElo(elo).colorKey;
}
