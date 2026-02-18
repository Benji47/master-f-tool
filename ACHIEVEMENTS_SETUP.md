# 🏆 Achievement System - Setup Guide

## ✅ What's Been Implemented

### 1. **Achievement Logic** (`src/logic/achievements.ts`)
- `ACHIEVEMENT_DEFINITIONS` - 10 basic achievements
- `unlockAchievement()` - Awards achievement to player
- `getPlayerAchievements()` - Gets player's unlocked achievements  
- `getAllAchievementsForPlayer()` - Gets both unlocked + locked achievements
- `getAchievementColorClass()` - Color coding by rarity
- `formatUnlockDate()` - Human-readable unlock times

### 2. **Updated Achievements Page** (`src/pages/menu/achievements.tsx`)
- Shows progress bar with completion percentage
- Displays all unlocked achievements with unlock timestamps
- Displays all locked achievements with requirements
- Search functionality to view other players' achievements
- Color-coded by rarity (common/rare/epic/legendary)
- Responsive grid layout

### 3. **Server Routes**
- `GET /v1/achievements` - View achievements (own or other player)
- `POST /v1/api/achievements/unlock` - Unlock achievement
- `GET /v1/api/achievements/player/:playerId` - Get achievements via API

### 4. **10 Basic Achievements Ready**:

| Icon | Name | Description | Rarity | Requirement |
|------|------|-------------|--------|-------------|
| 🎮 | Nova Start | Win your first foosball match | Common | 1 win |
| 🔥 | Shut Them Down | Win with perfect 10-0 score | Rare | Shutout |
| ✨ | Golden Touch | Achieve a golden vyrážečka | Epic | Golden vyrazecka |
| 🔥 | On Fire | Win 5 consecutive matches | Rare | 5-win streak |
| ⭐ | Maximum Level | Reach level 10 | Epic | Level 10 |
| 📈 | Rising Star | Reach 500 Elo rating | Rare | 500 Elo |
| 👑 | Master Player | Reach 1000 Elo rating | Epic | 1000 Elo |
| 🏆 | Century Player | Win 100 matches | Legendary | 100 wins |
| ⚡ | Vyrážečka Artist | Score 10 vyrážečky total | Rare | 10 vyrazecky |
| 📅 | The Steady One | Win matches across 10 days | Rare | Days played |

---

## 📦 Manual Database Setup (In Appwrite)

### Collection 1: `player-achievements`
Create collection with these attributes:

```
- playerId (string, 256 chars) - Required
- username (string, 256 chars) - Required  
- achievementId (string, 256 chars) - Required
- unlockedAt (datetime) - Required
- data (json) - Optional (extra match/event data)
```

**Create these indexes:**
- Key index on `playerId`
- Key index on `achievementId`
- Descending key index on `unlockedAt`

### Collection 2: `achievement-definitions` 
*Optional - For future expansion when you add more achievements via UI*

```
- achievementId (string, 256 chars) - Required, Unique
- name (string, 256 chars) - Required
- description (string, 1000 chars) - Required
- icon (string, 256 chars) - Required (emoji)
- category (string, 100 chars) - Required (skill/milestone/social)
- requirement (json) - Optional (unlock conditions)
- rarity (string, 50 chars) - Required (common/rare/epic/legendary)
```

**Create these indexes:**
- Unique key index on `achievementId`
- Key index on `category`
- Key index on `rarity`

---

## 🚀 How to Unlock Achievements Programmatically

### From Server-Side Code
```typescript
import { unlockAchievement } from "./logic/achievements";

// When player wins a match
await unlockAchievement(
  playerId,
  username,
  'first_match',
  { matchId: '123', value: 10 }
);
```

### From Client-Side
```javascript
// Call the API endpoint
const response = await fetch('/v1/api/achievements/unlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    playerId: 'user123',
    username: 'John',
    achievementId: 'shutout_master',
    data: JSON.stringify({ matchId: 'match456', value: 10 })
  })
});
```

---

## 🔧 Where to Add Achievement Unlock Logic

### In Match Finish Logic (`src/logic/match.ts` → `finishMatch()`)
Add achievement checks:
```typescript
// After determining winners
if (isShutout) {
  await unlockAchievement(winnerId, winnerName, 'shutout_master');
}
```

### In Player Stats Update (`src/logic/profile.tsx` → `updatePlayerStats()`)
Add checks like:
```typescript
// When player reaches new level
if (newLevel === 10) {
  await unlockAchievement(playerId, profile.username, 'level_10');
}

// When player reaches new Elo
if (newElo >= 1000 && oldElo < 1000) {
  await unlockAchievement(playerId, profile.username, 'elo_1000');
}
```

---

## 📊 Achievement Categories

- **milestone**: Level ups, Elo milestones, win counts, days played
- **skill**: Shutouts, vyrážečka achievements, combo achievements
- **social**: Team achievements, tournament achievements (future)

---

## 🎨 Rarity Color Coding

- **Common** - Gray border/background
- **Rare** - Blue border/background
- **Epic** - Purple border/background
- **Legendary** - Red border/background

---

## ✨ Features Already Integrated

✅ Daily achievements logging (already integrated with system)
✅ Player view to see other players' achievements  
✅ Progress tracking and completion percentage
✅ Unlock timestamps and time-ago formatting
✅ Locked achievement requirement descriptions
✅ Icon and description display for all achievements

---

## 📝 Next Steps to Add more Achievements

1. Open `src/logic/achievements.ts`
2. Add new achievement to `ACHIEVEMENT_DEFINITIONS` array
3. Add unlock logic where needed in match/profile logic
4. Test by running the game and triggering the condition

Example new achievement:
```typescript
{
  achievementId: 'revenge_win',
  name: 'Sweet Revenge',
  description: 'Win against same opponent 3 times in a row',
  icon: '⚔️',
  category: 'skill',
  rarity: 'rare',
  requirement: { type: 'revenge_streak', value: 3 }
}
```

---

**Ready to use!** Just set up those 2 collections in Appwrite and the system will start tracking achievements! 🎉
