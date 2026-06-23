# Live Board

A real-time collaborative Kanban board with **members-only boards**. Sign in, create boards you own, and invite others with a link — everyone with access sees cards added, moved, and deleted **live**, plus who else is currently viewing.

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

# One-time: in the Supabase SQL editor run supabase/migrations/0001_init.sql then
# 0002_auth_ownership.sql (tables + auth/ownership RLS + realtime + demo board), and turn
# OFF "Confirm email" in Authentication → Providers → Email so sign-up logs in instantly.

npm run dev        # http://localhost:3000
npm test           # Vitest unit tests (ordering math + realtime merge)
npm run test:e2e   # Playwright (single-client CRUD + two-client realtime)
```

## Tests
- **Unit (Vitest):** the deterministic core — fractional/midpoint card ordering (`src/lib/ordering.ts`) and the idempotent, echo-safe realtime merge + sorted projection (`src/lib/board-state.ts`).
- **E2E (Playwright):** one spec runs a full create → add → move → delete in a single client; the other opens **two independent browser contexts** on the same board and asserts a move in one appears in the other, with presence showing both.

## Security model
Boards are **members-only**, enforced in the database. Supabase Auth (email + password) identifies users; an `owner_id` on `boards` plus a `board_members` table records membership; and a `SECURITY DEFINER is_board_member()` helper backs every RLS policy (it reads `board_members` without policy recursion). You create boards you own and bring others in with a **tokenized invite link** — opening it calls a `SECURITY DEFINER join_board()` RPC that verifies the secret token and adds you as a member. Realtime keeps working because Postgres Changes are RLS-filtered per subscriber against the signed-in session: members receive their boards' events, non-members receive nothing. (A small public `keep_alive` table exists only so the keep-alive cron can still ping the DB now that `boards` is locked down.)
