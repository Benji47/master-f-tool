# 🏆 Tournament System - Quick Reference

## 📋 Database Collections Checklist

Create these 4 collections in Appwrite with exact IDs:

- [ ] `tournaments`
- [ ] `tournament-teams`
- [ ] `tournament-matches`
- [ ] `tournament-results`

**See:** `TOURNAMENT_SETUP_GUIDE.md` for full specifications

---

## 🎯 Tournament Lifecycle

```
1️⃣ CREATE (Creator)
    └─ Tournament Status: setup
        └─ Players register

2️⃣ REGISTRATION (All Players)
    └─ Create/join teams
    └─ Teams become "locked" when both confirm
    └─ Tournament Status: registration

3️⃣ START (Creator Only)
    └─ Min 2 locked teams required
    └─ Bracket auto-generated
    └─ Tournament Status: started

4️⃣ PLAY (All Players)
    └─ Match by match in bracket
    └─ Winners/Losers advancement
    └─ Grand Final match-up

5️⃣ FINISH (Auto)
    └─ Results stored
    └─ Medals & coins assigned
    └─ Tournament Status: finished
```

---

## 🚀 Quick Routes

**Browse Tournaments:**
- `/v1/tournaments` - Tournament list

**Create:**
- `/v1/tournaments/create` - Form to create new tournament

**Tournament Page:**
- `/v1/tournaments/:id` - Main tournament hub
- `/v1/tournaments/:id/bracket` - View bracket
- `/v1/tournaments/:id/results` - View final standings

**Teams:**
- `/v1/tournaments/:id/teams/create` - Create team form
- `/v1/tournaments/:id/teams/join` - Browse teams to join

**Matches:**
- `/v1/tournaments/:id/match/:matchId` - Play a match

---

## 💾 Database Tables Quick Reference

### tournaments
```
name: string
description: string
status: setup|registration|started|finished
creatorId: string
maxTeams: number
rewards: {first, second, third, fourth}
startedAt: datetime
finishedAt: datetime
```

### tournament-teams
```
tournamentId: string
player1: {id, username, elo}
player2: {id, username, elo} (null if looking)
status: looking|locked|disqualified
lockedAt: datetime
```

### tournament-matches
```
tournamentId: string
team1Id: string
team2Id: string (null for bye)
bracket: winners|losers|final
round: number
position: number
isBye: boolean
isFinal: boolean
state: waiting|playing|finished
winner: string (teamId)
scores: {team1Score, team2Score}
```

### tournament-results
```
tournamentId: string
rank: 1|2|3|4
teamId: string
player1Id: string
player2Id: string
coinsAwarded: number
medalType: gold|silver|bronze
```

---

## 🎮 Tournament Features at a Glance

| Feature | Status | Notes |
|---------|--------|-------|
| Create Tournament | ✅ | Custom name, teams, rules |
| Form Teams | ✅ | 2 players per team |
| Join Teams | ✅ | Find looking-for-partner teams |
| Lock Teams | ✅ | Both confirm to lock |
| Bracket Generation | ✅ | Double elimination, bye matches |
| Seeding | ✅ | By average team ELO |
| Match Playing | ✅ | Score input, winner determination |
| Bracket View | ✅ | Visual winners/losers/grand final |
| Rewards | ✅ | Coins + medals for top 4 |
| Results Page | ✅ | Show final standings |
| ELO Changes | ❌ | Intentional - tournaments for fun |

---

## ⚙️ Configuration

These are already set in the code. Modify if needed:

**Coin Rewards (src/logic/tournament.ts line ~60):**
```typescript
rewards: {
  first: 500000,    // Edit here
  second: 300000,   // Edit here
  third: 200000,    // Edit here
  fourth: 50000,    // Edit here
}
```

**Max Teams Options (src/pages/tournaments/create.tsx):**
```tsx
<option value="4">4 Teams (2 matches)</option>
<option value="8">8 Teams (Double Elimination)</option>
<option value="16" selected>16 Teams (Recommended)</option>
<option value="32">32 Teams (Large)</option>
```

---

## 🛠️ Common Tasks

### Start a Tournament
1. Go to `/v1/tournaments/:id`
2. Click "Start Tournament" (if creator, 2+ teams locked)
3. Bracket auto-generates
4. Redirects to bracket view

### Join Existing Team
1. Go to `/v1/tournaments/:id`
2. Click "Join Existing Team"
3. Click "Join Team" on desired team
4. You become player2
5. Team auto-locks

### Play a Match
1. On bracket view, click match card
2. Click "Start Match"
3. Enter final scores (0-10)
4. Click "Submit Score"
5. Match finishes, displays winner

### View Results
1. Go to `/v1/tournaments/:id/results`
2. Shows top 4 with medals & coins

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't create tournament | Check if logged in |
| Can't create team | Must be on tournament page |
| Can't start tournament | Need 2+ locked teams, must be creator |
| Bracket not generating | Check all teams are "locked" status |
| Match scores not saving | Ensure both team IDs exist |
| Rewards not showing | Check tournament is in "finished" status |

---

## 📚 Three Docs Included

1. **`TOURNAMENT_SETUP_GUIDE.md`** ← READ FIRST
   - How to create database collections
   - Full attribute specifications
   - Step-by-step Appwrite setup

2. **`DOUBLE_ELIMINATION_GUIDE.md`** ← Understanding brackets
   - What is double elimination
   - Visual examples with 4, 6, 8 teams
   - Bye match explanation
   - Reward distribution

3. **`IMPLEMENTATION_SUMMARY.md`** ← Technical reference
   - Code organization
   - All exported functions
   - Data flow examples
   - Debug tips

---

## 🎯 API Endpoints Reference

```bash
# Create Tournament
POST /v1/api/tournaments/create
body: { name, description?, maxTeams }

# Create Team (auto joins with logged-in user as player1)
POST /v1/api/tournaments/:id/teams/create

# Join Team (logged-in user becomes player2)
POST /v1/api/tournaments/:tourId/teams/:teamId/join

# Start Tournament (generate bracket)
POST /v1/api/tournaments/:id/start
requires: 2+ locked teams, user is creator

# Start Match (change state to playing)
POST /v1/api/tournaments/:tourId/match/:matchId/start

# Finish Match (submit scores)
POST /v1/api/tournaments/:tourId/match/:matchId/finish
body: { team1Score, team2Score }
```

---

## 📊 Example Tournament Flow (8 Teams)

```
Create Tournament
    ↓
Players create/join 8 teams (all locked)
    ↓
Creator starts tournament
    ↓
Bracket generated:
  Winners: 4→2→1 final (3 rounds)
  Losers: losers from each round
  Grand: winner of each bracket
    ↓
Players play Winners Round 1 (4 matches)
  - Losers go to Losers R1
  - Winners go to Winners R2
    ↓
Winners R2 (2 matches) & Losers R1 (2 matches)
    ↓
Winners Final & Losers continue
    ↓
Grand Final: Winners Champ vs Losers Champ
    ↓
Results:
  🥇 Grand Final Winner (1st)
  🥈 Grand Final Loser (2nd)
  🥉 Losers Finalist but lost (3rd)
  4️⃣ Other top loser (4th)
    ↓
Coins distributed + Medals awarded
```

---

## 🎮 Player Experience Summary

**As Tournament Creator:**
- ✅ Create tournament with custom settings
- ✅ Watch teams register
- ✅ Start tournament when ready
- ✅ Can't play but can view bracket
- ✅ See final results

**As Tournament Player:**
- ✅ Create new team or find existing
- ✅ Wait for tournament to start
- ✅ Play matches in bracket order
- ✅ Win/lose through double elimination
- ✅ Win coins and medals if top 4

---

## 🎉 You're All Set!

Next steps:
1. Open `TOURNAMENT_SETUP_GUIDE.md`
2. Create the 4 database collections
3. Test a tournament from start to finish
4. Celebrate! 🏆

---

**Made with ⚡ by your coding buddy**
