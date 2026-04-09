# CLAUDE.md - Master F Tool (Mars Empire)

## Projekt

Foosball tournament management platforma. Hono.js + Bun + Appwrite + Tailwind CSS + HTMX.

- Entry point: `src/server.tsx`
- Business logika: `src/logic/`
- Stránky: `src/pages/`
- Statické dáta (levely, badges, ranky): `src/static/data.ts`
- DB: Appwrite (fra.cloud.appwrite.io)

## Appwrite kolekcie

| Kolekcia | Účel |
|---|---|
| `players-profile` | Profily hráčov (elo, xp, coins, wins, loses, vyrazecky...) |
| `matches` | Aktívne zápasy (vymazané po dokončení) |
| `matches_history` | Archív dokončených zápasov |
| `bets` | Stávky na zápasy |
| `player-achievements` | Odomknuté achievementy |
| `player-achievement-progress` | Progres achievementov (matches played, win streak...) |
| `player-achievement-claims` | Claimnuté odmeny za achievementy |
| `daily-achievements` | Feed denných udalostí (level up, rank change, shutout...) |
| `shop_orders` | Objednávky zo shopu |
| `site_content` | Editovateľný obsah (FAQ, pravidlá, oznámenia) |
| `global_stats` | Globálne štatistiky (1 dokument) |
| `tournaments` | Turnaje |
| `tournament-teams` | Turnajové tímy |
| `tournament-matches` (kolekcia "F") | Zápasy v turnajovom brackete |
| `tournament-results` | Výsledky turnajov |

## Caching

In-memory cache (`src/logic/cache.ts`) s TTL. Cachované sú: profily, global stats, match history, daily achievements, site content, player achievements. **NIE SÚ cachované:** aktívne zápasy (`matches`), zoznam zápasov v lobby.

## Polling

- `matchGame.tsx`: `setInterval(pollState, 4000)` - GET `/v1/match/state` - polluje stav zápasu počas hry
- `matchLobby.tsx`: `setInterval(fetchMatches, 4000)` - GET `/v1/match/list` - polluje dostupné zápasy
- `lobby.tsx`: `setInterval(updateTimer, 1000)` - len client-side timer, žiadne DB volania

Polling endpointy robia DB reads (nie writes), ale nie sú cachované.

## Analýza DB reads (problém: 30-80k reads/deň pri 20 useroch)

### Čo je cachované vs. necachované

**Cachované (in-memory, `src/logic/cache.ts`):**
- `getPlayerProfile()` - TTL 10min (profile.tsx:86)
- `getAllPlayerProfiles()` - TTL 10min, paginované (100/stránku)
- `getGlobalStats()` - TTL 10min
- `listAllMatchHistoryDocs()` - TTL 10min, paginované (100/stránku, max 10k docs) **ALE invalidované po KAŽDOM match finish!**
- `getDailyAchievements()` - TTL 2min
- `getAllBets(500)` - TTL len 60s
- Site content, player achievements - TTL 10min

**NIE JE cachované (priamy DB hit zakaždým):**
- `getMatch()` - `databases.getDocument()` (match.ts:176)
- `listAvailableMatches()` - `databases.listDocuments()` (match.ts:406)
- `getBetsForPlayerPaginated()` - `databases.listDocuments()` (betting.ts:328)
- `getAllBetsPaginated()` - `databases.listDocuments()` (betting.ts:358)
- `unlockAchievement()` kontroly - 16× `databases.listDocuments()` per hráč (achievements.ts:272)

### 1. `listAllMatchHistoryDocs()` - NAJVÄČŠÍ PROBLÉM

Funkcia (server.tsx:688) **paginuje cez CELÚ match history** po 100 dokumentoch.
Ak existuje N match history docs: **ceil(N/100) reads na cache miss**.
Príklad: 3000 zápasov v histórii = **30 reads per cache miss**.

Cache je **invalidovaný po KAŽDOM dokončenom zápase** cez `invalidateMatchHistoryCache()` (server.tsx:2535).

Používa ju **7 rôznych stránok:**
- `/v1/match-history` (server.tsx:437)
- `/v1/match-history/players/:username` (server.tsx:488)
- `/v1/lobby` pri season scope != overall (server.tsx:611)
- `/v1/leaderboard` (server.tsx:755)
- `/v1/profile/summary/:username` (server.tsx:888)
- `/v1/f-bet` (server.tsx:2718)
- `/v1/hall-of-fame` (server.tsx:2963)

Po každom zápase, prvý user čo otvorí ktorúkoľvek z týchto stránok spustí kompletné znovunačítanie.
Ak nie je mutex, viacero simultánnych requestov môže spustiť duplicitné fetche.

**Výpočet:** 200 zápasov/deň × 30 reads per invalidáciu = **6,000 reads/deň** len z match history repaginovania.

### 2. F-Bet stránka - najdrahšia stránka v celej apke (server.tsx:2706)

Každé jedno načítanie `/v1/f-bet` robí:

| Volanie | Cachované? | Reads |
|---|---|---|
| `getPlayerProfile()` | áno (10min) | 0-1 |
| `listAvailableMatches()` | **NIE** | **1 vždy** |
| `listAllMatchHistoryDocs()` | áno (10min), invalidované po match finish | 0 alebo N/100 |
| `getAllPlayerProfilesCached()` | áno (10min) | 0-1 |
| `getAllBets(500)` | áno ale len **60s TTL** | 0-1 (každých 60s) |
| `getBetsForPlayerPaginated()` | **NIE** | **1 vždy** |
| `getAllBetsPaginated()` | **NIE** | **1 vždy** |

**= minimálne 3 uncachované reads zakaždým**, plus match history po invalidácii.

Ak 20 userov načíta f-bet 30× za deň: 600 page loads × 3 = **1,800 reads** len z necachovaných bet queries.
Plus `getAllBets(500)` cache miss každých 60s = ďalších **~1,400 reads/deň**.

### 3. Leaderboard (server.tsx:750)

| Volanie | Cachované? | Reads |
|---|---|---|
| `getAllPlayerProfilesCached()` | áno (10min) | 0-1 |
| `listAllMatchHistoryDocs()` | áno, invalidované po match finish | 0 alebo N/100 |

Leaderboard samotný je OK keď cache žije. Problém je keď je match history invalidovaný - vtedy spustí plnú repaginaciu.

### 4. Match-history stránka + getAllBets (server.tsx:435)

Každé načítanie `/v1/match-history` volá:
- `listAllMatchHistoryDocs()` - cachované (ale invalidované po match finish)
- `getAllBets(500)` - cachované 60s

### 5. Match state polling (matchGame.tsx:408)

`setInterval(pollState, 4000)` → `GET /v1/match/state` → `getMatch()` = **1 uncachovaný DB read za 4s per hráč**.
- 2 hráči × 20min zápas: **600 reads per zápas**
- 200 zápasov/deň: **120,000 reads/deň**

### 6. Lobby polling (matchLobby.tsx:257)

`setInterval(fetchMatches, 4000)` → `GET /v1/match/list` → `listAvailableMatches()` = **1 uncachovaný DB read za 4s per hráč v lobby**.

### 7. Score update reads (server.tsx:1641/1674/1710)

Každé kliknutie +1/-1 gól najprv volá `getMatch()` (1 uncachovaný read) a potom `updateGameScores()` (1 write).
~60 kliknutí per zápas × 200 zápasov = **12,000 reads/deň**.

### 8. Achievement checking pri match finish (achievements.ts:272)

`unlockAchievement()` volá `listDocuments()` pre KAŽDÚ z 16 definícií per hráč.
2 hráči × 16 = **32 reads per zápas**, 200 zápasov = **6,400 reads/deň**.

### Celkový výpočet reads

| Zdroj | Konzervatívne | Aktívny deň |
|---|---|---|
| Match state polling (4s) | 36,000 | 120,000 |
| Lobby polling (4s) | 5,000 | 13,500 |
| Score update getMatch() | 5,000 | 12,000 |
| listAllMatchHistoryDocs() repaginovanie | 3,000 | 6,000 |
| Achievement checks (16 per hráč) | 3,200 | 6,400 |
| F-bet uncachované queries | 1,000 | 3,200 |
| getAllBets cache misses | 700 | 1,400 |
| Ostatné page loads | 500 | 2,000 |
| **SPOLU reads** | **~54,000** | **~165,000** |

### Prioritizácia optimalizácií

1. **P0 - Cache getMatch() a listAvailableMatches():** Pridať do in-memory cache s krátkym TTL (~2-3s). Polling každé 4s by väčšinou hitol cache. **Zníži reads o ~70%** (polling + score updates).
2. **P1 - In-memory score tracking:** Držať skóre v `Map<matchId, scores>` na serveri. Eliminuje getMatch() pri score updates (~60 reads per zápas) aj writes.
3. **P2 - Inkrementálna match history:** Namiesto repaginovania celej history pri cache miss, načítať len nové záznamy od poslednej známej `$createdAt`. Alebo neinnvalidovať celý cache, len appendnúť nový zápas.
4. **P3 - Cache bet queries:** `getBetsForPlayerPaginated()` a `getAllBetsPaginated()` nemajú žiadny cache. Pridať s TTL ~30-60s.
5. **P4 - Batch achievement checks:** Jeden query na všetky achievementy hráča namiesto 16 individuálnych = 2 reads namiesto 32.
6. **P5 - Predĺžiť polling interval alebo WebSocket:** 4s → 8-10s, alebo Appwrite Realtime namiesto pollingu.

## Development

```bash
bun run dev        # Start server (port 3000)
bun bundle         # Build for Appwrite deployment
bun run css        # Watch Tailwind CSS compilation
```
