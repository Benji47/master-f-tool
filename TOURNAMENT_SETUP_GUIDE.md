# Tournament System - Complete Setup Guide

## Overview

This guide explains how to set up your tournament system with double elimination brackets. The system includes:
- Tournament creation and management
- Team/couple formation (2 players per team)
- Double elimination bracket generation
- Match scoring and results
- Reward distribution (coins and medals)

---

## Database Setup - Appwrite Collections

You need to create **4 new collections** in your Appwrite database. Here are the exact structure and attributes:

### 1. **`tournaments`** Collection

**Collection ID:** `tournaments`

**Attributes:**

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `name` | String | 256 | ✅ | - |
| `description` | String | 1000 | ❌ | Empty |
| `status` | String | 50 | ✅ | `setup` |
| `creatorId` | String | 256 | ✅ | - |
| `maxTeams` | Integer | - | ✅ | 16 |
| `rewards` | JSON | - | ✅ | See below |
| `startedAt` | DateTime | - | ❌ | - |
| `finishedAt` | DateTime | - | ❌ | - |

**Rewards JSON structure:**
```json
{
  "first": 500000,
  "second": 300000,
  "third": 200000,
  "fourth": 50000
}
```

**Status Values:** `setup`, `registration`, `started`, `finished`

---

### 2. **`tournament-teams`** Collection

**Collection ID:** `tournament-teams`

**Attributes:**

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `tournamentId` | String | 256 | ✅ | - |
| `player1` | JSON | - | ✅ | - |
| `player2` | JSON | - | ❌ | - |
| `status` | String | 50 | ✅ | `looking` |
| `lockedAt` | DateTime | - | ❌ | - |

**Player1 JSON structure:**
```json
{
  "id": "userid",
  "username": "username",
  "elo": 500
}
```

**Player2** has same structure when player joins.

**Status Values:** `looking`, `locked`, `disqualified`

---

### 3. **`tournament-matches`** Collection

**Collection ID:** `tournament-matches`

**Attributes:**

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `tournamentId` | String | 256 | ✅ | - |
| `team1Id` | String | 256 | ✅ | - |
| `team2Id` | String | 256 | ❌ | - |
| `bracket` | String | 50 | ✅ | - |
| `round` | Integer | - | ✅ | - |
| `position` | Integer | - | ✅ | - |
| `isBye` | Boolean | - | ✅ | false |
| `isFinal` | Boolean | - | ✅ | false |
| `state` | String | 50 | ✅ | `waiting` |
| `winner` | String | 256 | ❌ | - |
| `scores` | JSON | - | ❌ | - |

**Bracket Values:** `winners`, `losers`, `final`

**State Values:** `waiting`, `playing`, `finished`

**Scores JSON structure (when match is finished):**
```json
{
  "team1Score": 5,
  "team2Score": 3
}
```

---

### 4. **`tournament-results`** Collection

**Collection ID:** `tournament-results`

**Attributes:**

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `tournamentId` | String | 256 | ✅ | - |
| `rank` | Integer | - | ✅ | - |
| `teamId` | String | 256 | ✅ | - |
| `player1Id` | String | 256 | ✅ | - |
| `player2Id` | String | 256 | ✅ | - |
| `coinsAwarded` | Integer | - | ✅ | - |
| `medalType` | String | 50 | ✅ | - |

**Rank Values:** `1`, `2`, `3`, `4`

**Medal Types:** `gold`, `silver`, `bronze`

---

## Appwrite Console Steps

1. Go to your **Appwrite Console**
2. Select your **Project**
3. Navigate to **Database**
4. Create a new Database (if not using existing)
5. For each collection above:
   - Click "Create Collection"
   - Use the Collection ID from above
   - Add all attributes with specified types and sizes
   - Set Required flag as shown in tables

---

## Features Implemented

### ✅ Tournament Management
- Create tournaments with custom max teams and reward pools
- List active and completed tournaments
- Tournament creator can start the tournament

### ✅ Team Formation
- Players create teams (couple - 2 players)
- Other players can join looking-for-partner teams
- Teams locked once both players confirm

### ✅ Double Elimination Bracket
- **Winners Bracket** - players who haven't lost yet
- **Losers Bracket** - players who lost in winners bracket
- **Grand Final** - winners bracket winner vs losers bracket winner
- **Bye Matches** - automatic wins for non-power-of-two participants

### ✅ Bracket Features
- By round visualization (winners, losers, grand final)
- Team average ELO displayed
- Match status tracking (waiting → playing → finished)
- Score input with winner determination

### ✅ Rewards System
- Top 4 teams receive coins:
  - 1st Place: 500,000 coins each player + 🥇 Gold Medal
  - 2nd Place: 300,000 coins each player + 🥈 Silver Medal
  - 3rd Place: 200,000 coins each player + 🥉 Bronze Medal
  - 4th Place: 50,000 coins each player
- No ELO changes during tournament matches
- Reward distribution happens when tournament finishes

### ✅ UI Components
- Tournament list with filtering (active/completed)
- Create tournament form
- Tournament detail page with team management
- Bracket visualization with horizontal scroll
- Team creation and joining interface
- Match playing interface with score input
- Results/standings page with medal display

---

## Routes Created

### Pages (HTML):
- `GET /v1/tournaments` - List all tournaments
- `GET /v1/tournaments/create` - Create tournament form
- `GET /v1/tournaments/:id` - Tournament details & team management
- `GET /v1/tournaments/:id/bracket` - View bracket
- `GET /v1/tournaments/:id/match/:matchId` - Play a match
- `GET /v1/tournaments/:id/results` - View final standings
- `GET /v1/tournaments/:id/teams/create` - Create team form
- `GET /v1/tournaments/:id/teams/join` - Join team form

### API Endpoints:
- `POST /v1/api/tournaments/create` - Create new tournament
- `POST /v1/api/tournaments/:id/teams/create` - Create team
- `POST /v1/api/tournaments/:tourId/teams/:teamId/join` - Join team
- `POST /v1/api/tournaments/:id/start` - Start tournament + generate bracket
- `POST /v1/api/tournaments/:tourId/match/:matchId/start` - Start match
- `POST /v1/api/tournaments/:tourId/match/:matchId/finish` - Submit match score

---

## Usage Flow

### For Tournament Creator:
1. Go to `/v1/tournaments`
2. Click "Create Tournament"
3. Fill in details (name, max teams, optional description)
4. Tournament is created in **setup** status
5. Status changes to **registration** after creation
6. Wait for teams to register
7. Click "Start Tournament" when ready (min 2 teams)
8. Bracket is generated and tournament enters **started** status

### For Players:
1. Browse tournaments
2. Join a tournament by:
   - Creating a new team (you're player 1)
   - Share team ID so player 2 can join
   OR
   - Browse looking-for-partner teams
   - Click "Join Team"
3. Once team is locked (both confirmed), wait for tournament to start
4. When bracket is ready, compete in matches
5. View bracket progression
6. Enter scores when playing

---

## Technical Details

### Double Elimination Algorithm

The bracket generation (`generateDoubleEliminationBracket` function):

1. **Seeding:** Teams sorted by highest average ELO
2. **Bye Matches:** If team count not power of 2, top seeds get byes
3. **Winners Bracket:** Traditional single elimination
4. **Losers Bracket:** Players beaten in winners bracket compete here
5. **Grand Final:** Winners bracket champion vs losers bracket champion

**Example with 8 teams:**
```
Winners Bracket:
Round 1: 4 matches
Round 2: 2 matches (semifinals)
Round 3: 1 match (final)

Losers Bracket:
Round 1: 2 matches (from winners R1 losers)
Round 2: 1 match
Round 3: 1 match

Grand Final: Winner of each bracket
```

**Example with 10 teams:**
```
Winners Bracket:
Round 1: 4 matches (2 byes for top 2 seeds, 6 teams play)
```

### Match Scoring

- Teams enter final score (0-10 range works well for foosball)
- Higher score = winner
- No ELO changes for tournament matches
- Score stored in match document

---

## Future Enhancements

Consider adding:
1. **Real-time Bracket Updates** - WebSockets for live bracket updates
2. **Tournament Chat** - In-tournament team communication
3. **Replay System** - Save match replays with timestamps
4. **Seeding Options** - Custom seeding vs ELO-based
5. **Best of Series** - Multiple matches per bracket position
6. **Spectator Mode** - Live viewing of ongoing matches
7. **Schedule/Calendar** - Tournament timeline and match times
8. **Statistics** - Win rate, average score, performance stats
9. **ELO Inflation Limits** - Tournament coins don't inflate account ELO
10. **Automatic Round Management** - Auto-advance when all matches finished

---

## Troubleshooting

**Problem:** "No teams registered yet"
- **Solution:** Make sure players are creating/joining teams before starting

**Problem:** "Not enough teams to start"
- **Solution:** Need minimum 2 locked teams

**Problem:** Bracket not generating
- **Solution:** Check all teams have `status: "locked"`

**Problem:** Match scores not saving
- **Solution:** Ensure both teams have valid IDs in `team1Id` and `team2Id`

**Problem:** Players not getting rewards
- **Solution:** Tournament must be in `finished` status for results to display

---

## API Token Reminder

Make sure you have set env variables:
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT`
- `APPWRITE_KEY`
- `APPWRITE_DATABASE_ID`

These are needed for all tournament database operations.

---

**Good luck with your tournament system! 🎉⚡**
