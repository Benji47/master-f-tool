# Copilot Instructions for Mars Empire

## Architecture Overview

**Mars Empire** is a foosball tournament management platform built with:
- **Backend**: Hono.js web framework with server-side rendering (SSR) using JSX
- **Runtime**: Bun (TypeScript runtime)
- **Database**: Appwrite (self-hosted backend-as-a-service for users, profiles, matches)
- **UI**: React JSX components styled with Tailwind CSS v4
- **Entry Point**: `/src/server.tsx` - Hono app with routes for auth, lobby, matches, leaderboards

## Core Data Model

**Three interconnected systems:**

1. **Player Profiles** (`src/logic/profile.tsx`):
   - Collection: `players-profile` in Appwrite
   - Key fields: `userId`, `username`, `elo`, `xp`, `wins/loses`, `coins`
   - Interfaces: `PlayerProfile`, `GlobalStats`
   - XP levels define badges; Elo determines rank tiers (see `src/static/data.ts`)

2. **Matches** (`src/logic/match.ts`):
   - Collection: `matches` - active/completed games
   - States: `open` (accepting players) → `full` (4 players) → `playing` → `finished`
   - Data stored as JSON strings: `players_json`, `scores_json` (parsed via `parseDoc()`, `parseMatchHistoryDoc()`)
   - Match history stored separately for audit trail

3. **Static Game Data** (`src/static/data.ts`):
   - `levelsXp[]`: XP thresholds for 10 levels
   - `badges[]`: Level-based badges with color coding (e.g., "Rookie" level 0-75)
   - `rankTiers[]`: Elo-based ranks (Bronze → Gold → Diamond → Grandmaster)
   - Helper functions: `computeLevel()`, `getRankInfoFromElo()` - always use these, don't calculate Elo/level directly

## Page Structure & Auth Flow

**Auth-Free Routes** (no cookie check):
- `/` - homepage
- `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/logout`

**Protected Routes** (require sessionCookie):
- `/v1/lobby` - main hub with player profile, season timer, daily achievements
- `/v1/match/lobby` - join/create matches
- `/v1/match/game` - live match with scoring
- `/v1/match/result` - match outcome & stats update
- `/v1/leaderboard`, `/v1/achievements`, `/v1/tournaments` - info pages

**Pattern**: Server.tsx middleware checks cookies; if missing, routes redirect to login or show auth-required message. Pages use `async` components that fetch data server-side.

## Key Patterns & Conventions

1. **Component Organization**: Pages under `src/pages/` are async server components (not interactive). Interactive UI like timers use `useState`/`useEffect`. Example: `SeasonTimerPanel` in `pages/menu/lobby.tsx` - self-contained component with local state.

2. **Appwrite Client Initialization**: Always check for env vars (`APPWRITE_PROJECT`, `APPWRITE_KEY`) before creating client. Pattern (from `profile.tsx`, `match.ts`):
   ```typescript
   if (!projectId || !apiKey) throw new Error('Appwrite credentials not configured');
   const client = new sdk.Client().setEndpoint(...).setProject(...).setKey(apiKey);
   ```

3. **JSON Serialization in DB**: Appwrite stores complex objects as JSON strings. Use `parseDoc()`, `parseMatchHistoryDoc()` helpers in `match.ts` - they handle both string and object formats defensively.

4. **Data Update Flow**: Match results (via `/v1/match/finish`) call both `finishMatch()` (update match state) and `updatePlayerStats()` (update player profiles with new Elo, XP, wins). Must handle both in transaction-like manner or accept eventual consistency.

5. **Season Timer Logic**: Fixed `SEASON_START_DATE` in `SeasonTimerPanel` calculates end date + duration. Edit the date variable to control season timing (e.g., set to Feb 1 for 21-day seasons).

## Development Commands

- `bun run dev` - Start Hono server with hot reload on port (default 3000)
- `bun bundle` - Build `appwrite.tsx` entrypoint for Appwrite deployment
- `bun run css` - Watch Tailwind CSS compilation (input: `src/styles/Homepage.css`, output: `dist/styles.css`)

**Debugging**: Check server logs for Appwrite connection errors. Console.logs appear in Bun runtime output. No test framework configured.

## Common Workflows

- **Adding a Leaderboard**: Define query in `profile.tsx` using `databases.listDocuments()`, create page under `pages/`, add route in `server.tsx`
- **New Match Feature**: Extend `MatchDoc` type in `match.ts`, add field to scores/players JSON, update `parseDoc()`, modify game logic and result calculation
- **Player Stat Adjustments**: Edit `updatePlayerStats()` in `profile.tsx` - recalculates Elo using match deltas, updates profile doc
- **UI Styling**: Use Tailwind arbitrary values for custom colors (e.g., `text-neutral-900/50` for opacity). See `lobby.tsx` for grid/flex layout patterns.

## Critical Points

- **Always use Appwrite SDK methods** - don't make raw HTTP calls; SDK handles serialization
- **Validate Elo/XP calculations** with functions from `data.ts`, not hardcoded logic
- **Match state transitions** must be sequential: `open` → `full` → `playing` → `finished`; no direct jumps
- **Environment variables required**: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT`, `APPWRITE_KEY`, `APPWRITE_DATABASE_ID`
- **Hono middleware order matters**: Auth check runs before route handlers; routes after `/v1/auth/` are skipped
