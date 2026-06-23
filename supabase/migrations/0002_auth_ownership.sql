-- 0002_auth_ownership.sql — turn the public shared-by-link demo into members-only boards.
--
-- Run once in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- ALSO: Authentication → Providers → Email → turn OFF "Confirm email" so sign-up logs in instantly.

-- ── Schema: ownership + invite token + membership ──────────────────────────────
alter table public.boards
  add column if not exists owner_id     uuid references auth.users(id) on delete cascade,
  add column if not exists invite_token uuid not null default gen_random_uuid();

create table if not exists public.board_members (
  board_id   uuid not null references public.boards(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
alter table public.board_members enable row level security;

-- Membership check. SECURITY DEFINER so policies can read board_members without recursing
-- into board_members' own RLS (and runs as the table owner, which bypasses RLS).
create or replace function public.is_board_member(b_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.board_members where board_id = b_id and user_id = auth.uid()
  );
$$;

-- Join via an invite link: verify the board's secret token, then add the caller as a member.
create or replace function public.join_board(b_id uuid, token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.boards where id = b_id and invite_token = token) then
    raise exception 'invalid invite';
  end if;
  insert into public.board_members (board_id, user_id, role)
  values (b_id, auth.uid(), 'member')
  on conflict (board_id, user_id) do nothing;
end;
$$;
grant execute on function public.join_board(uuid, uuid) to authenticated;

-- A new board's creator becomes its owner-member automatically.
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    insert into public.board_members (board_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (board_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_board_created on public.boards;
create trigger on_board_created after insert on public.boards
  for each row execute function public.add_owner_as_member();

-- ── RLS: drop the wide-open anon demo policies, re-grant to authenticated members ──
revoke select, insert, update, delete on public.boards, public.columns, public.cards from anon;
grant  select, insert, update, delete on public.boards, public.columns, public.cards to authenticated;
grant  select, delete on public.board_members to authenticated;  -- INSERT only via join_board / the trigger

drop policy if exists "demo read boards"    on public.boards;
drop policy if exists "demo insert boards"  on public.boards;
drop policy if exists "demo update boards"  on public.boards;
drop policy if exists "demo read columns"   on public.columns;
drop policy if exists "demo insert columns" on public.columns;
drop policy if exists "demo update columns" on public.columns;
drop policy if exists "demo delete columns" on public.columns;
drop policy if exists "demo read cards"     on public.cards;
drop policy if exists "demo insert cards"   on public.cards;
drop policy if exists "demo update cards"   on public.cards;
drop policy if exists "demo delete cards"   on public.cards;

-- boards: members read; owner manages the board row (title/token) and can delete.
create policy "members read boards" on public.boards for select to authenticated using (public.is_board_member(id));
create policy "owner inserts board" on public.boards for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates board" on public.boards for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes board" on public.boards for delete to authenticated using (owner_id = auth.uid());

-- columns + cards: any member of the board has full CRUD (both tables carry board_id).
create policy "members read columns"   on public.columns for select to authenticated using (public.is_board_member(board_id));
create policy "members insert columns" on public.columns for insert to authenticated with check (public.is_board_member(board_id));
create policy "members update columns" on public.columns for update to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "members delete columns" on public.columns for delete to authenticated using (public.is_board_member(board_id));

create policy "members read cards"   on public.cards for select to authenticated using (public.is_board_member(board_id));
create policy "members insert cards" on public.cards for insert to authenticated with check (public.is_board_member(board_id));
create policy "members update cards" on public.cards for update to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "members delete cards" on public.cards for delete to authenticated using (public.is_board_member(board_id));

-- board_members: members see the roster; you may leave; the owner may remove anyone.
create policy "members read roster" on public.board_members for select to authenticated using (public.is_board_member(board_id));
create policy "leave or owner kick" on public.board_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()));

-- ── Demo board: a fixed invite token so the homepage "try the demo" link auto-joins ──
-- (matches DEMO_INVITE_TOKEN in src/lib/constants.ts)
update public.boards
  set invite_token = '22222222-2222-2222-2222-222222222222'
  where id = '11111111-1111-1111-1111-111111111111';

-- ── Keep-alive: boards/cards are now members-only, so the anon cron can't read them.
-- A trivial public heartbeat table the keep-alive workflow reads instead. ─────────
create table if not exists public.keep_alive (id int primary key, pinged_at timestamptz not null default now());
insert into public.keep_alive (id) values (1) on conflict (id) do nothing;
alter table public.keep_alive enable row level security;
grant select on public.keep_alive to anon, authenticated;
drop policy if exists "keep_alive public read" on public.keep_alive;
create policy "keep_alive public read" on public.keep_alive for select to anon, authenticated using (true);
