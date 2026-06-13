# Live Board — what it is and how it works

## The idea
Most of my other demos are "you click, the server responds" apps. This one is different: it's **collaborative in real time**. Open a board, send someone the link, and you both watch the same board change as either of you moves cards around — a tiny Trello where everyone's edits show up instantly. There's no sign-up; you just type a display name.

I built it to cover the one thing the other demos didn't: **realtime / WebSockets**, which sits under almost every modern collaborative product — docs, chat, dashboards, design tools.

## The flow
- The home page has one main button: **New board**. It creates a board with three lanes — To Do, In Progress, Done — and sends you to it.
- The board's web address *is* the invite. Anyone you send it to lands on the same board.
- You add cards, move them between lanes (or up and down within a lane), and delete them. Everyone watching sees each change land within about a second, and a small bar shows who's online.

## The interesting parts

**Keeping everyone in sync.** Each board opens a single realtime connection to the database. Two kinds of messages travel over it: *data changes* (a card was added, moved, or deleted) and *presence* (who's viewing right now). When a change arrives, it's merged into an in-memory map of cards keyed by id. Keying by id matters — your own change echoes back over the same channel, and re-applying it has to be a no-op, or you'd get duplicates and flicker. The database row is always the source of truth, so if a client's optimistic guess differs slightly, the real row simply overwrites it.

**Moving a card without shuffling the rest.** Each card has a numeric position. To drop one between two others, it takes the *midpoint* of their two positions — so a move is a single database write instead of renumbering the whole lane. (If two positions ever drift too close to split cleanly, there's a rebalance step.) This small bit of math is the most heavily tested part of the code.

**Drag vs. buttons.** Drag-and-drop looks great but is notoriously flaky to test, and the drag libraries are in an awkward spot on the latest React. So the source of truth for moving a card is a set of plain arrow buttons with proper accessibility labels, which the automated tests can drive deterministically. Drag can be layered on later, calling the exact same move function — without the tests depending on it.

**Security, honestly.** This is a public toy: anyone with a board's link can edit it, and the database rules are intentionally open. That openness is also what lets the realtime feed reach anonymous visitors. The README spells out exactly how this tightens for a real product — accounts, board membership, per-member rules — and the structure doesn't change, just the rules and where identity comes from.

## How it's tested
- **Unit tests** cover the pure logic: the card-positioning math and the merge that keeps every client consistent.
- **End-to-end tests** open two separate browser sessions on the same board and prove that a move in one shows up in the other — the actual promise of the app.

## Tech
Next.js (App Router) · TypeScript · Supabase (Postgres + Realtime) · Tailwind · Vitest · Playwright · deployed on Vercel.
