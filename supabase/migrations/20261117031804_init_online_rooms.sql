-- =============================================================================
-- Online multiplayer: rooms, results, security and game rules.
--
-- Design summary
--   * Each browser gets a Supabase *anonymous* user (no sign-up form). Its JWT
--     is the player's verified identity: auth.uid().
--   * Clients can only READ rooms they belong to (RLS). They can never write
--     to tables directly; every change goes through the SECURITY DEFINER
--     functions below, which lock the room row and enforce the rules.
--   * The board is a 9-character string: '-' empty, '1' player1, '2' player2.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Helpers (private schema: not reachable through the public API)
-- -----------------------------------------------------------------------------

-- Keep in sync with src/lib/game/symbols.ts (a unit test checks this).
create or replace function private.is_valid_symbol(p_symbol text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_symbol = any (array[
    'x', 'o',
    'heart', 'diamond', 'crown', 'bolt', 'fire',
    'star', 'moon', 'sun', 'rainbow', 'snowflake',
    'flower', 'clover', 'sunflower', 'leaf', 'cactus',
    'smile', 'cat', 'fox', 'frog', 'ghost', 'robot',
    'cherry', 'donut', 'pizza', 'avocado'
  ]);
$$;

-- 6-character code from an unambiguous alphabet (no I, O, 0, 1).
-- Uses gen_random_uuid() as a cryptographically secure byte source.
create or replace function private.generate_room_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars
  bytes bytea := uuid_send(gen_random_uuid());
  result text := '';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- Server-side copy of the win/draw rules from src/lib/game/engine.ts.
create or replace function private.evaluate_board(
  p_board text,
  out outcome text,
  out winning_line smallint[]
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  lines constant smallint[] := array[
    0,1,2, 3,4,5, 6,7,8,   -- rows
    0,3,6, 1,4,7, 2,5,8,   -- columns
    0,4,8, 2,4,6           -- diagonals
  ];
  a smallint; b smallint; c smallint;
  mark text;
begin
  for i in 0..7 loop
    a := lines[i * 3 + 1]; b := lines[i * 3 + 2]; c := lines[i * 3 + 3];
    mark := substr(p_board, a + 1, 1);
    if mark <> '-'
       and mark = substr(p_board, b + 1, 1)
       and mark = substr(p_board, c + 1, 1) then
      outcome := case mark when '1' then 'player1' else 'player2' end;
      winning_line := array[a, b, c];
      return;
    end if;
  end loop;

  if position('-' in p_board) = 0 then
    outcome := 'draw';
  end if;
end;
$$;

create or replace function private.clean_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(cleaned) < 1 or char_length(cleaned) > 20 then
    raise exception 'invalid_name';
  end if;
  return cleaned;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),

  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished', 'abandoned')),

  board text not null default '---------' check (board ~ '^[-12]{9}$'),
  current_turn text not null default 'player1' check (current_turn in ('player1', 'player2')),
  starting_player text not null default 'player1' check (starting_player in ('player1', 'player2')),
  round integer not null default 1 check (round > 0),
  outcome text check (outcome in ('player1', 'player2', 'draw')),
  winning_line smallint[] check (winning_line is null or cardinality(winning_line) = 3),

  player1_id uuid not null references auth.users (id) on delete cascade,
  player1_name text not null check (char_length(player1_name) between 1 and 20),
  player1_symbol text not null check (private.is_valid_symbol(player1_symbol)),

  player2_id uuid references auth.users (id) on delete cascade,
  player2_name text check (char_length(player2_name) between 1 and 20),
  player2_symbol text check (private.is_valid_symbol(player2_symbol)),

  player1_score integer not null default 0 check (player1_score >= 0),
  player2_score integer not null default 0 check (player2_score >= 0),
  draws integer not null default 0 check (draws >= 0),

  rematch_requested_by text check (rematch_requested_by in ('player1', 'player2')),
  rematch_requested_at timestamptz,
  rematch_declined boolean not null default false,

  left_by text check (left_by in ('player1', 'player2')),

  -- Incremented on every change so clients can drop stale/out-of-order updates.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',

  constraint different_players check (player2_id is null or player2_id <> player1_id),
  constraint different_symbols check (player2_symbol is null or player2_symbol <> player1_symbol),
  constraint player2_all_or_nothing check (
    (player2_id is null) = (player2_name is null)
    and (player2_id is null) = (player2_symbol is null)
  ),
  constraint active_rooms_have_two_players check (
    status in ('waiting', 'abandoned') or player2_id is not null
  ),
  constraint finished_rooms_have_outcome check (
    (status = 'finished') = (outcome is not null)
  )
);

create index rooms_player1_id_idx on public.rooms (player1_id);
create index rooms_player2_id_idx on public.rooms (player2_id);
create index rooms_expires_at_idx on public.rooms (expires_at);

comment on table public.rooms is
  'Online tic-tac-toe rooms. Written only through SECURITY DEFINER functions.';

-- One row per finished round: an audit trail of results.
create table public.room_rounds (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round integer not null,
  outcome text not null check (outcome in ('player1', 'player2', 'draw')),
  board text not null check (board ~ '^[-12]{9}$'),
  finished_at timestamptz not null default now(),
  primary key (room_id, round)
);

-- -----------------------------------------------------------------------------
-- Row Level Security: players can read only their own rooms. No direct writes.
-- -----------------------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.room_rounds enable row level security;

create policy "Players can read their own rooms"
  on public.rooms for select
  to authenticated
  using ((select auth.uid()) in (player1_id, player2_id));

create policy "Players can read results of their own rooms"
  on public.room_rounds for select
  to authenticated
  using (exists (
    select 1 from public.rooms r
    where r.id = room_id and (select auth.uid()) in (r.player1_id, r.player2_id)
  ));

revoke all on public.rooms, public.room_rounds from anon;
revoke insert, update, delete, truncate on public.rooms, public.room_rounds from authenticated;

-- Broadcast row changes over Supabase Realtime (still filtered by RLS).
alter publication supabase_realtime add table public.rooms;

-- -----------------------------------------------------------------------------
-- Internal: lock a room and work out which seat the caller occupies.
-- -----------------------------------------------------------------------------

create or replace function private.lock_room_for_player(
  p_room_id uuid,
  out room public.rooms,
  out role text
)
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- FOR UPDATE serialises concurrent calls on the same room: two
  -- simultaneous moves are processed one after the other, never both.
  select * into room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'room_not_found';
  end if;

  role := case uid
    when room.player1_id then 'player1'
    when room.player2_id then 'player2'
  end;
  if role is null then
    raise exception 'not_a_player';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Public API (called with supabase.rpc from the browser)
-- -----------------------------------------------------------------------------

create or replace function public.create_room(p_name text, p_symbol text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean text := private.clean_name(p_name);
  result public.rooms;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not private.is_valid_symbol(p_symbol) then raise exception 'invalid_symbol'; end if;

  -- One open lobby per player: close any room this player is still waiting in.
  update public.rooms
     set status = 'abandoned', left_by = 'player1', version = version + 1, updated_at = now()
   where player1_id = uid and status = 'waiting';

  for attempt in 1..10 loop
    begin
      insert into public.rooms (code, player1_id, player1_name, player1_symbol)
      values (private.generate_room_code(), uid, clean, p_symbol)
      returning * into result;
      return result;
    exception when unique_violation then
      -- Code collision: try another one.
    end;
  end loop;
  raise exception 'could_not_create_room';
end;
$$;

-- What a visitor may see about a room before joining it.
create or replace function public.get_room_preview(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.rooms;
  state text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into r from public.rooms where code = upper(btrim(p_code));
  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  state := case
    when uid in (r.player1_id, r.player2_id) then 'member'
    when r.status = 'abandoned' then 'closed'
    when r.expires_at < now() then 'expired'
    when r.player2_id is not null then 'full'
    else 'open'
  end;

  return jsonb_build_object(
    'state', state,
    'room_id', case when state = 'member' then r.id end,
    'host_name', case when state in ('open', 'member') then r.player1_name end,
    'host_symbol', case when state in ('open', 'member') then r.player1_symbol end
  );
end;
$$;

create or replace function public.join_room(p_code text, p_name text, p_symbol text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.rooms;
  clean text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into r from public.rooms where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'room_not_found'; end if;

  -- Reconnecting player: nothing to change.
  if uid in (r.player1_id, r.player2_id) then
    return r;
  end if;

  if r.status = 'abandoned' then raise exception 'room_closed'; end if;
  if r.expires_at < now() then raise exception 'room_expired'; end if;
  if r.player2_id is not null then raise exception 'room_full'; end if;

  clean := private.clean_name(p_name);
  if not private.is_valid_symbol(p_symbol) then raise exception 'invalid_symbol'; end if;
  if p_symbol = r.player1_symbol then raise exception 'symbol_taken'; end if;

  update public.rooms
     set player2_id = uid,
         player2_name = clean,
         player2_symbol = p_symbol,
         status = 'playing',
         current_turn = starting_player,
         version = version + 1,
         updated_at = now(),
         expires_at = now() + interval '1 hour'
   where id = r.id
   returning * into r;
  return r;
end;
$$;

create or replace function public.make_move(p_room_id uuid, p_cell integer)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  r public.rooms;
  me text;
  new_board text;
  result record;
begin
  select * into locked from private.lock_room_for_player(p_room_id);
  r := locked.room;
  me := locked.role;

  if r.expires_at < now() then raise exception 'room_expired'; end if;
  if r.status <> 'playing' then raise exception 'game_not_active'; end if;
  if r.current_turn <> me then raise exception 'not_your_turn'; end if;
  if p_cell is null or p_cell < 0 or p_cell > 8 then raise exception 'invalid_cell'; end if;
  if substr(r.board, p_cell + 1, 1) <> '-' then raise exception 'cell_occupied'; end if;

  new_board := overlay(r.board placing (case me when 'player1' then '1' else '2' end)
                       from p_cell + 1 for 1);
  select * into result from private.evaluate_board(new_board);

  update public.rooms
     set board = new_board,
         outcome = result.outcome,
         winning_line = result.winning_line,
         status = case when result.outcome is null then 'playing' else 'finished' end,
         current_turn = case
           when result.outcome is not null then current_turn
           when me = 'player1' then 'player2'
           else 'player1'
         end,
         player1_score = player1_score + (result.outcome is not distinct from 'player1')::int,
         player2_score = player2_score + (result.outcome is not distinct from 'player2')::int,
         draws = draws + (result.outcome is not distinct from 'draw')::int,
         version = version + 1,
         updated_at = now(),
         expires_at = now() + interval '1 hour'
   where id = r.id
   returning * into r;

  if result.outcome is not null then
    insert into public.room_rounds (room_id, round, outcome, board)
    values (r.id, r.round, result.outcome, new_board);
  end if;

  return r;
end;
$$;

-- Ask for a rematch, or accept the opponent's pending request.
create or replace function public.request_rematch(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  r public.rooms;
  me text;
begin
  select * into locked from private.lock_room_for_player(p_room_id);
  r := locked.room;
  me := locked.role;

  if r.status <> 'finished' then raise exception 'rematch_unavailable'; end if;

  if r.rematch_requested_by is not null
     and r.rematch_requested_by <> me
     and not r.rematch_declined
     and r.rematch_requested_at > now() - interval '60 seconds' then
    -- Both players agreed: start the next round. Scores are kept.
    update public.rooms
       set board = '---------',
           outcome = null,
           winning_line = null,
           status = 'playing',
           round = round + 1,
           starting_player = case starting_player when 'player1' then 'player2' else 'player1' end,
           current_turn = case starting_player when 'player1' then 'player2' else 'player1' end,
           rematch_requested_by = null,
           rematch_requested_at = null,
           rematch_declined = false,
           version = version + 1,
           updated_at = now(),
           expires_at = now() + interval '1 hour'
     where id = r.id
     returning * into r;
  else
    update public.rooms
       set rematch_requested_by = me,
           rematch_requested_at = now(),
           rematch_declined = false,
           version = version + 1,
           updated_at = now(),
           expires_at = now() + interval '1 hour'
     where id = r.id
     returning * into r;
  end if;
  return r;
end;
$$;

create or replace function public.decline_rematch(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  r public.rooms;
begin
  select * into locked from private.lock_room_for_player(p_room_id);
  r := locked.room;

  if r.status <> 'finished' or r.rematch_requested_by is null then
    raise exception 'no_rematch_request';
  end if;
  if r.rematch_requested_by = locked.role then
    -- Withdrawing your own request.
    update public.rooms
       set rematch_requested_by = null, rematch_requested_at = null,
           rematch_declined = false, version = version + 1, updated_at = now()
     where id = r.id returning * into r;
  else
    update public.rooms
       set rematch_declined = true, version = version + 1, updated_at = now()
     where id = r.id returning * into r;
  end if;
  return r;
end;
$$;

-- Change your symbol between rounds (or while waiting for an opponent).
create or replace function public.change_symbol(p_room_id uuid, p_symbol text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  r public.rooms;
begin
  select * into locked from private.lock_room_for_player(p_room_id);
  r := locked.room;

  if r.status not in ('waiting', 'finished') then raise exception 'symbol_locked'; end if;
  if not private.is_valid_symbol(p_symbol) then raise exception 'invalid_symbol'; end if;

  if locked.role = 'player1' then
    if p_symbol is not distinct from r.player2_symbol then raise exception 'symbol_taken'; end if;
    update public.rooms set player1_symbol = p_symbol, version = version + 1, updated_at = now()
     where id = r.id returning * into r;
  else
    if p_symbol = r.player1_symbol then raise exception 'symbol_taken'; end if;
    update public.rooms set player2_symbol = p_symbol, version = version + 1, updated_at = now()
     where id = r.id returning * into r;
  end if;
  return r;
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  r public.rooms;
begin
  select * into locked from private.lock_room_for_player(p_room_id);
  r := locked.room;
  if r.status = 'abandoned' then return r; end if;

  update public.rooms
     set status = 'abandoned',
         left_by = locked.role,
         outcome = null,
         rematch_requested_by = null,
         rematch_requested_at = null,
         version = version + 1,
         updated_at = now()
   where id = r.id
   returning * into r;
  return r;
end;
$$;

-- -----------------------------------------------------------------------------
-- Housekeeping: delete expired / abandoned rooms and stale anonymous users.
-- -----------------------------------------------------------------------------

create or replace function private.cleanup_expired_rooms()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rooms
   where expires_at < now() - interval '15 minutes'
      or (status = 'abandoned' and updated_at < now() - interval '15 minutes');

  delete from auth.users u
   where u.is_anonymous
     and u.created_at < now() - interval '30 days'
     and not exists (
       select 1 from public.rooms r where u.id in (r.player1_id, r.player2_id)
     );
end;
$$;

create extension if not exists pg_cron;
select cron.schedule(
  'cleanup-expired-rooms',
  '*/15 * * * *',
  $$ select private.cleanup_expired_rooms(); $$
);

-- -----------------------------------------------------------------------------
-- Function privileges: only signed-in (anonymous) players may call the API.
-- -----------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.create_room(text, text),
  public.get_room_preview(text),
  public.join_room(text, text, text),
  public.make_move(uuid, integer),
  public.request_rematch(uuid),
  public.decline_rematch(uuid),
  public.change_symbol(uuid, text),
  public.leave_room(uuid)
from public, anon;

grant execute on function
  public.create_room(text, text),
  public.get_room_preview(text),
  public.join_room(text, text, text),
  public.make_move(uuid, integer),
  public.request_rematch(uuid),
  public.decline_rematch(uuid),
  public.change_symbol(uuid, text),
  public.leave_room(uuid)
to authenticated;
