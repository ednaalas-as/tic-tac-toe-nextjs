# Triad — Tic-tac-toe, three ways

A polished tic-tac-toe app built with **Next.js (App Router), React, TypeScript and Supabase**.
Play against the computer, with a friend on the same device, or online in a private room — with
your own name and symbol (hearts, moons, foxes… not just X and O).

**Live app:** https://tic-tac-toe-nextjs-brown.vercel.app

---

## Features

### Three game modes

| Mode | What it does |
| --- | --- |
| **Player vs Computer** | Easy, Medium and Hard opponents with genuinely different logic. Choose who moves first; the computer "thinks" briefly before replying. |
| **Local multiplayer** | Two players on one device. Works fully offline — it never touches Supabase. |
| **Online multiplayer** | Private rooms with a 6-character code and an invite link. Real-time moves, presence (online/offline), reconnection, rematch handshake, and server-side rule enforcement. |

### Computer difficulty

- **Easy** — random legal moves; takes an immediate win only 25% of the time and never defends.
- **Medium** — takes wins, blocks threats (most of the time), prefers center then corners, and deliberately "blunders" ~20% of the time.
- **Hard** — Minimax with alpha-beta pruning. A test exhaustively plays **every possible human line** against it (both as first and second player) and proves it never loses.

### Player customization (all modes)

- Custom names and a curated library of 27 symbols in 6 categories.
- Two players can never share a symbol: the other player's symbol is shown as taken (with a strike-through, not just colour) and can't be selected. Online, the database enforces it too.
- Symbols appear everywhere: board, player cards, turn indicator, scoreboard, results, history, rematch screens.
- Preferences are remembered in `localStorage`; online player info lives in Supabase.

### Match experience

- Scoreboard with wins per player, draws and total games; session history across all modes (in `sessionStorage`, filterable).
- Winning-line strike animation, draw "settle" animation, synthesized sound effects (toggle in the header).
- Restart round, rematch / play again, reset scores (with confirmation).
- Light / dark / system theme, `prefers-reduced-motion` support.
- Accessible: semantic HTML, full keyboard play on the board (arrow keys + Enter/Space), visible focus, live-region status updates, descriptive cell labels ("Row 1, column 3: Ana's heart, winning cell").

---

## Tech stack

- **Next.js 16** (App Router, Turbopack, Cache Components) · **React 19** · **TypeScript** (strict)
- **CSS Modules** + CSS custom properties (no UI framework)
- **Supabase**: Postgres, Row Level Security, Realtime (Postgres changes + Presence), anonymous auth, `pg_cron`
- **Vitest** + **React Testing Library** (unit/component), **Playwright** (end-to-end, incl. two-browser online tests)
- **Vercel** for hosting, **GitHub** for source

No state-management library: `useReducer` + a small `useSyncExternalStore`-based storage hook are enough.

---

## Architecture

```
src/
├── app/                      # Routes (thin: each renders a feature component)
│   ├── page.tsx              # Landing / mode picker
│   ├── play/computer/        # Player vs Computer
│   ├── play/local/           # Local multiplayer
│   ├── online/               # Online lobby (create / join)
│   ├── online/[code]/        # Room page (invite links land here)
│   └── history/              # Session history
├── lib/
│   ├── game/                 # ★ UI-independent game engine
│   │   ├── engine.ts         #   board, moves, win/draw rules
│   │   ├── ai.ts             #   easy / medium / minimax
│   │   ├── match.ts          #   reducer: rounds + scoring
│   │   ├── symbols.ts        #   symbol library
│   │   └── history.ts
│   ├── supabase/             # Browser client + generated DB types
│   ├── storage.ts            # localStorage/sessionStorage hook (SSR-safe)
│   └── preferences.ts        # Validated stored preferences
├── features/                 # One folder per mode (setup + game screens)
│   ├── computer/  local/  online/
├── components/               # Shared UI: Board, SymbolPicker, PlayerCard, GameScreen…
├── context/AppProviders.tsx  # Settings + session history
└── hooks/                    # useLocalMatch, useSound
supabase/
├── config.toml
└── migrations/               # Schema, RLS, functions, cron cleanup
tests/
├── e2e/                      # Playwright
└── integration/              # Server-rule tests against a real Supabase project
```

### Key decisions

1. **Player identity ≠ symbol.** The engine only knows two seats, `player1` and `player2`. Names and
   symbols are display data mapped onto those seats, so winners and scores are always computed from
   stable ids — never from emoji. The computer is simply the `player2` seat with `kind: "computer"`.
2. **One engine, three modes.** Local and computer modes run the same pure reducer (`match.ts`). Online
   mode renders the same `GameScreen` and `Board` components; only the *source of truth* differs.
3. **The database is the authoritative game server (online).**
   - Each browser gets a Supabase **anonymous user** — a real, verified identity (JWT) without any sign-up
     form. It survives refreshes, which is what makes reconnection work.
   - Clients can **read** only rooms they belong to (RLS) and **cannot write** to any table.
   - Every action (`create_room`, `join_room`, `make_move`, `request_rematch`, `decline_rematch`,
     `change_symbol`, `leave_room`) is a `SECURITY DEFINER` Postgres function that identifies the caller with
     `auth.uid()`, locks the room row with `SELECT … FOR UPDATE`, validates turn / cell / status, and
     computes the result with a SQL port of the win rules. Two simultaneous moves are serialized; the
     second one is rejected with `not_your_turn`.
   - Because the rules live in Postgres, **no service-role key is needed anywhere** — nothing secret ships
     to Vercel or the browser.
4. **Realtime + recovery.** Clients subscribe to Postgres changes for their room (still filtered by RLS) and
   use Presence for the online/offline badge. Every update carries a `version`; stale updates are dropped,
   and the room is re-fetched after any reconnect, tab focus or `online` event.
5. **Room lifecycle.** Codes use an unambiguous 32-character alphabet from a cryptographically random
   source. Rooms expire after 1 hour without activity; a `pg_cron` job deletes expired/abandoned rooms every
   15 minutes and prunes old anonymous users.

### Database

| Table | Purpose |
| --- | --- |
| `rooms` | One row per room: code, status (`waiting` / `playing` / `finished` / `abandoned`), board (9-char string, `-`/`1`/`2`), current turn, starting player, round, outcome, winning line, both players' ids/names/symbols, scores, rematch state, `left_by`, `version`, timestamps, `expires_at`. Check constraints enforce valid symbols, distinct players and symbols, and consistent status/outcome. |
| `room_rounds` | Audit trail of every finished round (`room_id`, `round`, `outcome`, final board). |

Indexes on `player1_id`, `player2_id`, `expires_at`; unique index on `code`.

---

## Getting started

### Requirements

- Node.js **20.9+** (22+ recommended)
- A Supabase project (only for online mode)

### Install & run

```bash
git clone https://github.com/ednaalas-as/tic-tac-toe-nextjs.git
cd tic-tac-toe-nextjs
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev                  # http://localhost:3000
```

Player vs Computer and Local multiplayer work without any environment variables.

### Environment variables

| Variable | Where to find it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → *Publishable key* | Public, safe in the browser |

There is intentionally **no** service-role / secret key.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or `supabase projects create`).
2. Link and apply the migration:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. Enable anonymous sign-ins (already set in `supabase/config.toml`):
   ```bash
   supabase config push
   ```
   or in the dashboard: **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
4. (Optional) regenerate types after schema changes: `npm run db:types`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit + component tests (Vitest) |
| `npm run test:integration` | Server-rule tests against the Supabase project in `.env.local` |
| `npm run test:e2e` | Playwright (starts the dev server). Set `E2E_BASE_URL` to test a deployment. |

First-time Playwright setup: `npx playwright install chromium`.

### What the tests cover

- **Engine:** all 8 winning lines, draws, occupied/out-of-range/wrong-turn rejection, game-over lock, turn alternation, next round / restart.
- **AI:** every difficulty only plays legal moves and refuses to play on a finished board; Easy is random, Medium wins/blocks/prefers center and sometimes errs; Hard is exhaustively proven unbeatable.
- **Customization:** duplicate-symbol prevention, persistence, rendering custom symbols, scores tied to the right player, TS symbol list == database allow-list.
- **Online (integration):** unauthenticated calls, preview privacy, duplicate/invalid symbols, full rooms, RLS read isolation, blocked direct writes, turn order, simultaneous moves, occupied cells, winner detection, game-over lock, rematch handshake keeping scores, leaving.
- **E2E (two independent browser contexts):** create room → copy invite → join via link → live sync → turn locking → win → rematch → disconnect shows *Offline* → reconnect resumes → third player sees *Room is full* → leaving notifies the opponent; invalid codes; offline modes on desktop and mobile viewports; keyboard play; no console errors; no horizontal overflow.

---

## Deployment

The app is deployed on **Vercel** from the `main` branch of this repository:

1. Import the GitHub repo in Vercel (framework preset: Next.js, no build overrides needed).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production (and Preview).
3. Deploy. Every push to `main` redeploys automatically.
4. In Supabase → Authentication → URL Configuration, set the Site URL to the Vercel URL.

Verify the deployment end-to-end:

```bash
E2E_BASE_URL=https://tic-tac-toe-nextjs-brown.vercel.app npm run test:e2e
```

This suite (including the two-browser online match) passes against the production URL above.

---

## Known limitations

- Presence (the online/offline badge) is advisory; it can take a few seconds to notice a dropped connection. Game state itself never depends on it.
- Anonymous identities live in the browser's storage. Clearing site data or switching browsers mid-game means you can't rejoin that room as the same player.
- To play both sides of an online game on one computer, use two different browsers or a private window (same-browser tabs share one identity, which is how reconnecting works).
- Rematch expiry (60 s) is computed against the client clock for display; the server enforces its own window.

## How this was built

Planned, implemented, tested and deployed with AI-assisted development (Claude Code): architecture and
security design, the Postgres functions, the test suites, and debugging were all done iteratively with
every test actually executed against the real backend.
