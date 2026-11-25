-- SLAM the Game: Live Session Mode. Invite links, the tag "coaching client of this coach", the session room
-- and the transcript lines (text only).
-- NOT APPLIED. Eli: paste this whole file in the Supabase SQL Editor (the same project as the game's sign-in)
-- and press Run, one time. It is safe to run two times. It needs the file of 2026-11-24
-- (20261124170000_roles_audit_coach.sql: is_admin(), is_coach()), which is applied.
-- Until it runs, Live Session Mode cannot work for real: the coach page and the session page say that this
-- part waits for this file. The feature is also behind one switch in the code (game/account/liveflag.js).
--
-- WHO CAN SEE WHAT (nothing here widens an older rule)
--   An invite: the coach who made it, and the admin. A visitor never reads the table: a visitor checks one
--     link through live_invite_check() and uses it through live_invite_use().
--   The tag coach_clients: that coach, that client, the admin.
--   A session and its transcript lines: that coach, that client, the admin. NOT each coach account.
--   No audio exists anywhere. The lines are text.
--
-- REALTIME: WHAT ELI MUST SWITCH ON IN THE SUPABASE DASHBOARD
--   Nothing, on a project with the default settings. The two devices talk through one Realtime channel with
--   the name "live:" + the id of the session (Broadcast and Presence). That needs no table in a publication,
--   no secret and no key in the repository: the page uses the public key and the sign-in of the person.
--   One thing to look at one time: Dashboard, Realtime, Settings: "Allow public access" must be ON (it is ON
--   by default). If it is OFF, the room says "The live link between the two devices is not on yet" and each
--   side still saves its own lines.
--   The id of a session is a random uuid that only the two members and the admin can read, so the name of the
--   channel cannot be guessed. The channel carries: who is in the room, the consent taps, Start, Pause, End,
--   the mic lights, and each heard line (for the echo filter). The database keeps the lines.
--   This file does NOT add a table to the publication supabase_realtime (Postgres Changes are not used).
--   Assumed limits of the Free plan (from memory, not read again on 2026-11-25; check under Dashboard, Usage):
--   200 devices connected at one time, 100 messages each second, 2 million messages each month. One call of
--   one hour sends a few thousand small messages.

-- ---------- 1. the invite links ----------
create table if not exists public.live_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  coach uuid not null references auth.users (id) on delete cascade,
  coach_name text not null default '',
  client_name text not null default '',
  made_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);
alter table public.live_invites enable row level security;
revoke all on public.live_invites from public, anon, authenticated;
-- The coach reads their own invites. Nobody adds, changes or removes a row from the app: the functions do.
grant select on public.live_invites to authenticated;
drop policy if exists "a coach reads own invites" on public.live_invites;
create policy "a coach reads own invites" on public.live_invites for select to authenticated
  using (coach = auth.uid() or is_admin());

-- ---------- 2. the tag: this account is the coaching client of that coach ----------
create table if not exists public.coach_clients (
  coach uuid not null references auth.users (id) on delete cascade,
  client uuid not null references auth.users (id) on delete cascade,
  since timestamptz not null default now(),
  invite uuid references public.live_invites (id) on delete set null,
  primary key (coach, client)
);
alter table public.coach_clients enable row level security;
revoke all on public.coach_clients from public, anon, authenticated;
grant select on public.coach_clients to authenticated;
drop policy if exists "the coach, the client and the admin read the tag" on public.coach_clients;
create policy "the coach, the client and the admin read the tag" on public.coach_clients for select to authenticated
  using (coach = auth.uid() or client = auth.uid() or is_admin());

-- ---------- 3. the sessions ----------
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  coach uuid not null references auth.users (id) on delete cascade,
  client uuid not null references auth.users (id) on delete cascade,
  invite uuid references public.live_invites (id) on delete set null,
  state text not null default 'waiting' check (state in ('waiting', 'live', 'paused', 'ended')),
  made_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  paused_at timestamptz,
  paused_ms bigint not null default 0,
  coach_ok_at timestamptz,
  client_ok_at timestamptz,
  coach_headphones boolean,
  client_headphones boolean,
  coach_listens boolean,
  client_listens boolean,
  coach_mic boolean,
  client_mic boolean,
  coach_seen_at timestamptz,
  client_seen_at timestamptz,
  check (coach <> client)
);
-- Added in Part 8 and 9 of the build (Nov 25 2026), for a project where an older copy of this file ran: the answer
-- of each side to the microphone step. Start waits for the client's answer (or the coach goes on alone).
alter table public.live_sessions add column if not exists coach_mic boolean;
alter table public.live_sessions add column if not exists client_mic boolean;
create index if not exists live_sessions_coach on public.live_sessions (coach, made_at desc);
create index if not exists live_sessions_client on public.live_sessions (client, made_at desc);
alter table public.live_sessions enable row level security;
revoke all on public.live_sessions from public, anon, authenticated;
-- The two members read the row. Each change goes through live_session_set(), which checks each rule.
grant select on public.live_sessions to authenticated;
drop policy if exists "the two members and the admin read a session" on public.live_sessions;
create policy "the two members and the admin read a session" on public.live_sessions for select to authenticated
  using (coach = auth.uid() or client = auth.uid() or is_admin());

-- ---------- 4. the transcript lines (text only) ----------
create table if not exists public.live_lines (
  id uuid primary key,
  session uuid not null references public.live_sessions (id) on delete cascade,
  side text not null check (side in ('coach', 'client')),
  by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  at timestamptz not null,
  saved_at timestamptz not null default now()
);
create index if not exists live_lines_session on public.live_lines (session, at);
alter table public.live_lines enable row level security;
revoke all on public.live_lines from public, anon, authenticated;
-- Read, add, and remove ("Delete this transcript", Part 9). No change of a line from the app.
grant select, insert, delete on public.live_lines to authenticated;

-- True when the signed-in account may add a line to this session as this side: it is that member, and the
-- session has started. After End, a line that waited on a device can still arrive for one hour.
create or replace function public.live_can_write(sid uuid, sd text) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from live_sessions s where s.id = sid
     and ((sd = 'coach' and s.coach = auth.uid()) or (sd = 'client' and s.client = auth.uid()))
     and (s.state in ('live', 'paused') or (s.state = 'ended' and s.ended_at > now() - interval '1 hour'))) $$;
revoke all on function public.live_can_write(uuid, text) from public, anon;
grant execute on function public.live_can_write(uuid, text) to authenticated;
-- True when the signed-in account is a member of this session, or the admin.
create or replace function public.live_member(sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select is_admin() or exists (select 1 from live_sessions s where s.id = sid and (s.coach = auth.uid() or s.client = auth.uid())) $$;
revoke all on function public.live_member(uuid) from public, anon;
grant execute on function public.live_member(uuid) to authenticated;

drop policy if exists "the two members and the admin read the lines" on public.live_lines;
drop policy if exists "a member adds own lines" on public.live_lines;
drop policy if exists "the two members delete the lines" on public.live_lines;
create policy "the two members and the admin read the lines" on public.live_lines for select to authenticated
  using (live_member(session));
create policy "a member adds own lines" on public.live_lines for insert to authenticated
  with check (by = auth.uid() and live_can_write(session, side));
-- "Delete this transcript": the coach or the client of the session removes all of its lines, after End. Not the
-- admin, and not another coach. (Delete my account and the removal of a sign-in also remove them: section 7.)
create policy "the two members delete the lines" on public.live_lines for delete to authenticated
  using (exists (select 1 from live_sessions s where s.id = session and s.state = 'ended'
                 and (s.coach = auth.uid() or s.client = auth.uid())));

-- ---------- 5. the functions of the invite ----------
-- Make one link. For a coach or the admin. The token is 64 random characters (two random uuids): it cannot
-- be guessed. The link works one time and for 7 days.
create or replace function public.live_invite_make(client_name text default '', coach_name text default '') returns jsonb language plpgsql security definer set search_path = public as $$
declare r live_invites;
begin
  if not (is_coach() or is_admin()) then raise exception 'coach or admin only'; end if;
  insert into live_invites (token, coach, coach_name, client_name)
  values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), auth.uid(),
          left(coalesce(coach_name, ''), 60), left(coalesce(client_name, ''), 60))
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.token, 'client_name', r.client_name, 'made_at', r.made_at, 'expires_at', r.expires_at);
end $$;
revoke all on function public.live_invite_make(text, text) from public, anon;
grant execute on function public.live_invite_make(text, text) to authenticated;

-- Look at one link. A visitor who is not signed in can call it. It gives the state and the two names that
-- the invite screen shows, and nothing else: no id, no email.
--   state: 'open' (can be used), 'used', 'expired', 'none' (no such link)
create or replace function public.live_invite_check(tok text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r live_invites;
begin
  select * into r from live_invites where token = tok;
  if not found then return jsonb_build_object('state', 'none'); end if;
  return jsonb_build_object(
    'state', case when r.used_at is not null then (case when r.used_by = auth.uid() then 'mine' else 'used' end)
                  when r.expires_at <= now() then 'expired' else 'open' end,
    'coach_name', r.coach_name, 'client_name', r.client_name);
end $$;
revoke all on function public.live_invite_check(text) from public;
grant execute on function public.live_invite_check(text) to anon, authenticated;

-- Use one link. For a signed-in account. One time: the row is locked, so two accounts cannot both use it.
-- It tags the account as the client of that coach and opens the session room for the two.
-- The same account can call it again (a reload): it gets the same session back.
--   state: 'ok' (with session), 'used', 'expired', 'none', 'own' (the coach opened their own link)
create or replace function public.live_invite_use(tok text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r live_invites; s live_sessions;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into r from live_invites where token = tok for update;
  if not found then return jsonb_build_object('state', 'none'); end if;
  if r.coach = auth.uid() then return jsonb_build_object('state', 'own'); end if;
  if r.used_at is not null and r.used_by is distinct from auth.uid() then return jsonb_build_object('state', 'used'); end if;
  if r.used_at is null then
    if r.expires_at <= now() then return jsonb_build_object('state', 'expired'); end if;
    update live_invites set used_at = now(), used_by = auth.uid() where id = r.id;
    insert into coach_clients (coach, client, invite) values (r.coach, auth.uid(), r.id) on conflict do nothing;
  end if;
  select * into s from live_sessions where coach = r.coach and client = auth.uid() and state <> 'ended' order by made_at desc limit 1;
  if not found then
    insert into live_sessions (coach, client, invite) values (r.coach, auth.uid(), r.id) returning * into s;
  end if;
  return jsonb_build_object('state', 'ok', 'session', to_jsonb(s), 'coach_name', r.coach_name);
end $$;
revoke all on function public.live_invite_use(text) from public, anon;
grant execute on function public.live_invite_use(text) to authenticated;

-- ---------- 6. the functions of the session ----------
-- "Start session" for a person who is on the coach's roster. For a coach or the admin. The person must be the
-- coach's client already (the tag), or share their game with their coach (the rule that the roster uses).
-- It gives back the open session of the two, or makes one. The client is tagged when the client joins the
-- room, not before: the tag is the client's own step.
create or replace function public.live_session_open(target uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s live_sessions;
begin
  if not (is_coach() or is_admin()) then raise exception 'coach or admin only'; end if;
  if target is null or target = auth.uid() then raise exception 'not with your own account'; end if;
  if not (exists (select 1 from coach_clients where coach = auth.uid() and client = target)
          or exists (select 1 from games where owner = target and share_with_coach)) then
    raise exception 'not your client';
  end if;
  select * into s from live_sessions where coach = auth.uid() and client = target and state <> 'ended' order by made_at desc limit 1;
  if not found then
    insert into live_sessions (coach, client) values (auth.uid(), target) returning * into s;
  end if;
  return to_jsonb(s);
end $$;
revoke all on function public.live_session_open(uuid) from public, anon;
grant execute on function public.live_session_open(uuid) to authenticated;

-- One change of a session, by one of its two members. Each rule of the room is checked here again:
--   'seen'        I am in the room now (the page calls it when it joins and then each 30 seconds)
--   'ok'          I tapped OK on the consent screen (kept with the time; it cannot be taken back)
--   'headphones'  my answer to "Using headphones?" (flag: true or false)
--   'listens'     my browser can listen (flag: true or false)
--   'mic'         my answer to the microphone step (flag: true = allowed, false = refused)
--   'start'       the coach only, one time, and only when both tapped OK and the client finished the microphone
--                 and headphones steps. flag true: the coach goes on with their side only (the client's steps
--                 are not done).
--   'pause', 'resume', 'end'   each member
-- It gives the row back. A step that the rules do not allow changes nothing and gives the row back as it is.
create or replace function public.live_session_set(sid uuid, what text, flag boolean default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare s live_sessions; me text;
begin
  select * into s from live_sessions where id = sid for update;
  if not found then raise exception 'no such session'; end if;
  if s.coach = auth.uid() then me := 'coach'; elsif s.client = auth.uid() then me := 'client'; else raise exception 'not a member'; end if;
  if what not in ('seen', 'ok', 'headphones', 'listens', 'mic', 'start', 'pause', 'resume', 'end') then raise exception 'unknown step'; end if;
  if what = 'seen' then
    if me = 'coach' then update live_sessions set coach_seen_at = now() where id = sid;
    else
      update live_sessions set client_seen_at = now() where id = sid;
      insert into coach_clients (coach, client, invite) values (s.coach, s.client, s.invite) on conflict do nothing;
    end if;
  elsif s.state = 'ended' then
    null;
  elsif what = 'ok' then
    if me = 'coach' then update live_sessions set coach_ok_at = coalesce(coach_ok_at, now()) where id = sid;
    else update live_sessions set client_ok_at = coalesce(client_ok_at, now()) where id = sid; end if;
  elsif what = 'headphones' then
    if me = 'coach' then update live_sessions set coach_headphones = flag where id = sid;
    else update live_sessions set client_headphones = flag where id = sid; end if;
  elsif what = 'listens' then
    if me = 'coach' then update live_sessions set coach_listens = flag where id = sid;
    else update live_sessions set client_listens = flag where id = sid; end if;
  elsif what = 'mic' then
    if me = 'coach' then update live_sessions set coach_mic = flag where id = sid;
    else update live_sessions set client_mic = flag where id = sid; end if;
  elsif what = 'start' then
    if me = 'coach' and s.state = 'waiting' and s.coach_ok_at is not null and s.client_ok_at is not null
       and (flag is true or (s.client_headphones is not null and (s.client_mic is not null or s.client_listens is false))) then
      update live_sessions set state = 'live', started_at = coalesce(started_at, now()) where id = sid;
    end if;
  elsif what = 'pause' then
    if s.state = 'live' then update live_sessions set state = 'paused', paused_at = now() where id = sid; end if;
  elsif what = 'resume' then
    if s.state = 'paused' then
      update live_sessions set state = 'live', paused_at = null,
        paused_ms = paused_ms + greatest(0, floor(extract(epoch from (now() - coalesce(paused_at, now()))) * 1000)::bigint) where id = sid;
    end if;
  elsif what = 'end' then
    update live_sessions set state = 'ended', ended_at = now(), paused_at = null,
      paused_ms = paused_ms + (case when s.state = 'paused' then greatest(0, floor(extract(epoch from (now() - coalesce(s.paused_at, now()))) * 1000)::bigint) else 0 end)
      where id = sid;
  end if;
  select * into s from live_sessions where id = sid;
  return to_jsonb(s);
end $$;
revoke all on function public.live_session_set(uuid, text, boolean) from public, anon;
grant execute on function public.live_session_set(uuid, text, boolean) to authenticated;

-- ---------- 7. Delete my account ----------
-- Each table of this file points at auth.users with "on delete cascade": when delete_my_account()
-- (20261125200000) or the admin removes a sign-in, the invites, the tag, the sessions and the lines of that
-- account go with it. A session has two members: it goes when either one deletes their account.
-- delete_my_account() also names the four tables, each behind "if the table exists", so the two files can run in
-- any order.
