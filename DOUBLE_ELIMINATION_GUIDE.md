# Double Elimination Bracket - Explained

## What is Double Elimination?

Double elimination is a tournament format where a team must **lose TWICE** to be eliminated. This gives teams a second chance after their first loss.

It's perfect for competitive tournaments because:
- 🏆 True champion emerges
- ⚖️ Fair - one bad match doesn't eliminate you
- 📊 Determines positions 1-4 accurately
- 🎮 More matches = more playtime

---

## How It Works - Visual Example

### Tournament with 4 Teams (A, B, C, D)

#### **Winners Bracket** (For Undefeated Teams)
```
Round 1:          Round 2 (Finals):
A ─┐
   ├─ Winner1 ─┐
B ─┘           │
               ├─ Champions
C ─┐           │
   ├─ Winner2 ─┘
D ─┘
```

**Winners Bracket Result:** 
- Winner1 = 1️⃣ Champion (wins without losing)
- Winner2 = undefeated finalist

---

#### **Losers Bracket** (For Beaten Teams)
```
Loser1 (from Winners R1)
     ├─ Losers Bracket Winner
Loser2 (from Winners R1)
```

**Losers Bracket Result:**
- Losers champion goes to Grand Final

---

#### **Grand Final** (Championship)
```
Winners Bracket Champion vs Losers Bracket Champion
```

**Final Results:**
- 🥇 1st Place: Grand Final Winner
- 🥈 2nd Place: Grand Final Loser
- 🥉 3rd/4th Place: Determined by losers bracket

---

## Real Tournament With 8 Teams

### Full Bracket Flow

```
╔═══════════════════════════════════════════════════════════════╗
║                    TOURNAMENT BRACKET (8 Teams)               ║
╚═══════════════════════════════════════════════════════════════╝

================== WINNERS BRACKET ==================

Round 1:              Round 2:            Round 3:
Team A │             │                    │
       ├─ W1 ────────┤                    │
Team B │             │                    │
                     ├─ W3 ───────┐       │
Team C │             │            │       │
       ├─ W2 ────────┤            ├─ W5 ──┤
Team D │             │            │       │
                     ├─ W4 ────────       │
Team E │             │                    │
       ├─ W6 ────────┤                    │
Team F │             │                    │
                                          │
                                 (Winners Final)
Team G │                          │
       ├─ W7 ────────────────────┤
Team H │

       └─ Losers from Round 1 & 2 go to Losers Bracket ─┐
                                                        │
================== LOSERS BRACKET ==================  │
                                                    ↓
L1 (L from W1) │                          │
               ├─ LW1 ────────┤           │
L2 (L from W2) │              │           │
                              ├─ LW3 ──┐  │
L3 (L from W3) │              │        │  │
               ├─ LW2 ────────┤        │  │
L4 (L from W4) │              │        │  │
                              ├─ LW4 ──┤  │
         (More losers...)                 │
                                          │
                           (Losers Final) │
                                    ┌─────┴─────┐
================== GRAND FINAL ==================
                                    │
        Winners Champion (W5) ───┐  │
                                │  │
                                ├─ GRAND WINNER = 1st Place
                                │  │
   Losers Champion (LW4) ───────┘  │
                                    │
                    If Losers wins ──→ Must play again!
                    (Best of all formats)
```

---

## Tournament Positions (8 Teams Example)

After all matches:

| 🏆 Position | 📍 Path | 🎯 Achievement |
|-----------|--------|--------------|
| **1st** | Won Winners Finals → Won Grand Final | Undefeated or beat finals opponent |
| **2nd** | Lost Winners Finals OR won Losers Finals | Lost only in championship |
| **3rd** | Lost Losers Finals | Lost twice, but made it far |
| **4th** | Lost early in Losers Bracket | Lost twice early |

---

## With Bye Matches (Non-Power-of-2 Teams)

### 5 Teams (Not power of 2 = 2²=4, next is 2³=8)

```
Seeding by ELO (highest gets bye):

Round 1:
Team A (Bye) ────────┐
                     │
Team B ──┐           │
         ├─ W1 ──────┤
Team C ──┘           │
                     ├─ W3
Team D ──┐           │
         ├─ W2 ──────┤
Team E ──┘

Team A advances WITHOUT PLAYING (bye)
```

**Why?** With 5 teams,  we need only 2 matches to get 4 teams for the next round:
- Match 1: Teams B vs C → 1 winner
- Match 2: Teams D vs E → 1 winner  
- Team A gets bye
- Next round: A, W1, W2, and... (we need 4 but only have 3)

So higher-ranked teams (by ELO) get byes in Round 1 to make 8 spots eventually.

---

## Rewards Distribution

Based on final positions:

| Position | 🏅 Medal | 💰 Coins (per player) | Example |
|----------|---------|-------|---------|
| 1st | 🥇 Gold | 500,000 | Team A (2 players) = 1,000,000 coins total |
| 2nd | 🥈 Silver | 300,000 | Team B (2 players) = 600,000 coins total |
| 3rd | 🥉 Bronze | 200,000 | Team C (2 players) = 400,000 coins total |
| 4th | - | 50,000 | Team D (2 players) = 100,000 coins total |

---

## Key Features in Your Implementation

### ✅ Bye Matches
- Automatically generated for non-power-of-2 counts
- High ELO teams get byes (seeded advantage)
- Marked as "finished" automatically

### ✅ Three Brackets
- **Winners Bracket:** Undefeated teams only
- **Losers Bracket:** Teams with 1 loss
- **Grand Final:** Champions from each bracket

### ✅ Dynamic Seeding
- Teams seed by their **average team ELO**
- Average = (Player1 ELO + Player2 ELO) / 2
- Prevents completely new players facing champions in round 1

### ✅ Match Flow
```
State Progression:
waiting → playing → finished

Visual Indicators:
⏳ Waiting  = Gray, selectable
⚡ Playing  = Orange, in progress
✓ Finished = Green, shows score and winner
```

### ✅ ELO Display
Each match card shows:
- Average Team ELO
- Both players' individual ELO
- Team member names

---

## Example Tournament Progression

### Scenario: 6 Teams

**Setup:** 1 bye match (8 slots - 6 teams = 2 byes)

**Round 1 (Winners):**
```
Team A: 600 ELO (bye)
Team B: 580 ELO (bye)
Team C: 550 ELO vs Team D: 520 ELO
Team E: 480 ELO vs Team F: 450 ELO
```
→ Winners: A, B, C-winner, E-winner

**Round 2 (Winners):**
```
A vs B
C-winner vs E-winner
```
→ Final winners: W1, W2

**Losers Bracket (for losers):**
```
D vs F (from Winners R1)
→ LW1

LW1 vs C-loser or E-loser (from Winners R2)
→ Finals loser

Losers Final → LW2
```

**Grand Final:**
```
W1 vs LW2
```

---

## FAQ

**Q: What if I lose in the Grand Final but I won Winners Bracket?**
A: You're 2nd place. Losers bracket winner beat you in the final, so they're 1st. You lost only once (at the end).

**Q: What if both me and my partner are eliminated?**
A: You're out! Double elimination means lose TWICE to stay alive. But losing twice takes at least 2 matches for each of you.

**Q: Do tournament matches count toward my ELO rank?**
A: No! Tournament matches are for fun/prizes only. Your ranked ELO stays the same.

**Q: Why do bye matches matter?**
A: They keep brackets balanced. With 5 teams, someone would wait forever. Bye = "beat someone who didn't show" = advances.

**Q: Can the Grand Final winner be from the Losers Bracket?**
A: Absolutely! If they win the Losers Bracket, they earn the right to play the Winners Bracket champ. If they win THAT match, they're #1.

---

## Implementation in Your Code

Main function: **`generateDoubleEliminationBracket(teams)`**

Located in: `src/logic/tournament.ts`

**What it does:**
1. Takes all **locked teams**
2. Seeds by ELO (highest first)
3. Calculates bye count
4. Creates Winners Bracket matches
5. Creates Losers Bracket matches
6. Creates Grand Final match
7. Returns all matches organized by bracket

**Output:** Array of TournamentMatch objects with:
- `bracket`: "winners" | "losers" | "final"
- `round`: 1, 2, 3, etc.
- `position`: Position in round (for ordering)
- `isBye`: true for automatic winner matches
- `team1Id` and `team2Id`: Team references

---

Enjoy your tournament system! 🎮⚡
