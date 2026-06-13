# Live Board

A real-time collaborative Kanban board. Create a board, share the link, and everyone on it sees cards added, moved, and deleted **live** — plus who else is currently viewing. No sign-up: pick a display name and you're in.

**Live demo:** https://live-board-one.vercel.app

> Open the board in two windows side by side, move a card in one, and watch it move in the other.

## How it works
1. **Boards live at a URL** — `/board/<id>`. Creating a board seeds three lanes (To Do / In Progress / Done) and drops you on its page; that URL is the invite.
2. **State lives in Postgres** — boards, columns, and cards are plain rows. Every client reads the same rows and writes back with the Supabase publishable key (Row-Level Security guards the data).
3. **Realtime sync** — each board opens one Supabase Realtime channel carrying both **Postgres Changes** (card/column inserts, updates, deletes) and **Presence** (who's online). Incoming rows are merged into a map keyed by card id, so a client re-applying its own echoed change — or a remote one — is idempotent.
4. **Ordering without re-indexing** — each card has a numeric `position`; a move sets it to the midpoint between the new neighbors, so moving a card is a single-row write.

## Tech
Next.js (App Router) · TypeScript · Supabase (Postgres + Realtime) · Tailwind · Vitest · Playwright · Vercel.

## Run locally
```bash
npm install

# .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# One-time: paste supabase/migrations/0001_init.sql into the Supabase SQL editor and run it
# (creates the tables + RLS, adds them to the realtime publication, seeds a demo board).

npm run dev        # http://localhost:3000
npm test           # Vitest unit tests (ordering math + realtime merge)
npm run test:e2e   # Playwright (single-client CRUD + two-client realtime)
```

## Tests
- **Unit (Vitest):** the deterministic core — fractional/midpoint card ordering (`src/lib/ordering.ts`) and the idempotent, echo-safe realtime merge + sorted projection (`src/lib/board-state.ts`).
- **E2E (Playwright):** one spec runs a full create → add → move → delete in a single client; the other opens **two independent browser contexts** on the same board and asserts a move in one appears in the other, with presence showing both.

## A note on security
This is a **public, shared-by-link demo**: anyone who knows a board's URL can edit it, and the RLS policies are deliberately open to the anonymous key (which is also what lets Realtime deliver changes — RLS is enforced per event). For a real product you'd add Supabase Auth, an `owner_id` / `board_members` table, and tighten the policies to `authenticated` members (a `SECURITY DEFINER is_board_member()` helper avoids policy recursion). The component and data structure stay the same — only the policies and the source of identity change.
