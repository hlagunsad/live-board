-- Live Board — schema, RLS, realtime, and a seeded demo board.
-- Run once in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.boards (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Untitled board',
  created_at timestamptz not null default now()
);

create table if not exists public.columns (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  title      text not null default 'New list',
  position   double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  column_id  uuid not null references public.columns(id) on delete cascade,
  -- board_id is denormalized onto cards so Realtime can filter card events by board
  -- directly (Postgres Changes filters are single-column, with no joins).
  board_id   uuid not null references public.boards(id) on delete cascade,
  title      text not null,
  position   double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists columns_board_position_idx on public.columns (board_id, position);
create index if not exists cards_column_position_idx  on public.cards (column_id, position);
create index if not exists cards_board_idx            on public.cards (board_id);

-- ── Row-Level Security ─────────────────────────────────────────────────────────
-- This is a PUBLIC, shared-by-link demo: anyone who knows a board's UUID can edit it.
-- The anon (publishable) key performs all reads/writes, so anon gets full CRUD here,
-- and anon needs SELECT for Realtime to deliver Postgres Changes (RLS is checked per
-- event, per subscriber). This is INTENTIONALLY permissive — see the README for how it
-- tightens under real auth (owner_id + board_members + an is_board_member() helper).
alter table public.boards  enable row level security;
alter table public.columns enable row level security;
alter table public.cards   enable row level security;

grant select, insert, update, delete on public.boards, public.columns, public.cards to anon;

create policy "demo read boards"   on public.boards  for select to anon using (true);
create policy "demo insert boards" on public.boards  for insert to anon with check (true);
create policy "demo update boards" on public.boards  for update to anon using (true) with check (true);

create policy "demo read columns"   on public.columns for select to anon using (true);
create policy "demo insert columns" on public.columns for insert to anon with check (true);
create policy "demo update columns" on public.columns for update to anon using (true) with check (true);
create policy "demo delete columns" on public.columns for delete to anon using (true);

create policy "demo read cards"   on public.cards for select to anon using (true);
create policy "demo insert cards" on public.cards for insert to anon with check (true);
create policy "demo update cards" on public.cards for update to anon using (true) with check (true);
create policy "demo delete cards" on public.cards for delete to anon using (true);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Postgres Changes are only emitted for tables in the supabase_realtime publication.
alter publication supabase_realtime add table public.boards, public.columns, public.cards;

-- ── Seed: a public demo board (fixed id) so the homepage links somewhere live ──
do $$
declare
  todo_id  uuid;
  doing_id uuid;
  done_id  uuid;
  demo_id  uuid := '11111111-1111-1111-1111-111111111111';  -- matches DEMO_BOARD_ID in src/lib/constants.ts
begin
  insert into public.boards (id, title) values (demo_id, 'Demo board')
    on conflict (id) do nothing;

  -- Only seed lanes/cards the first time (skip if the demo board already has lanes).
  if not exists (select 1 from public.columns where board_id = demo_id) then
    insert into public.columns (board_id, title, position) values (demo_id, 'To Do', 1024)       returning id into todo_id;
    insert into public.columns (board_id, title, position) values (demo_id, 'In Progress', 2048) returning id into doing_id;
    insert into public.columns (board_id, title, position) values (demo_id, 'Done', 3072)         returning id into done_id;

    insert into public.cards (column_id, board_id, title, position) values
      (todo_id,  demo_id, 'Open this board in a second tab', 1024),
      (todo_id,  demo_id, 'Use the arrow buttons to move a card', 2048),
      (doing_id, demo_id, 'Watch it move in the other tab, live', 1024),
      (done_id,  demo_id, 'Built with Next.js + Supabase Realtime', 1024);
  end if;
end $$;
