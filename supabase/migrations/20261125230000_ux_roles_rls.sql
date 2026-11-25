-- SLAM the Game: a coach reads and changes only the games of their own players (UX pass, phase 2).
-- NOT APPLIED. Eli: paste this whole file in the Supabase SQL Editor (the same project as the game's sign-in)
-- and press Run, one time. It is safe to run two times. It needs 20261124170000_roles_audit_coach.sql (applied)
-- and 20261125210000_live_sessions.sql (the table coach_clients; applied, the live database has it).
--
-- WHAT WAS READ ON 2026-11-25 (read only, no data copied): every table in public has row level security on.
-- Players read and write only their own games. The admin reads all. The admin pages are functions that each
-- start with "if not is_admin()". The gaps:
--   1. games, "coach reads shared games": ANY coach account reads EVERY game that has share_with_coach on,
--      not only the games of their own players.
--   2. games, "coach edits shared games": the same, for changes.
--   3. games, "coach adds rows to shared games": game_shared(owner) checks the share flag, not the coach.
--   4. live_session_open(): a coach can open a session with any player who shares, not only their own.
-- A player of a coach is a row in coach_clients (the invite link writes it). On 2026-11-25 the database had
-- 2 coach accounts, 0 coach_clients rows and 0 shared games, so this file changes what nobody sees today.
--
-- WHO CAN SEE WHAT AFTER THIS FILE
--   A player: their own games. Nothing else (as before).
--   A coach: their own games, and the shared games of the players linked to them in coach_clients.
--   The admin: everything (as before).

create or replace function public.is_my_player(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_coach() and exists (select 1 from coach_clients where coach = auth.uid() and client = o)
$$;
revoke all on function public.is_my_player(uuid) from public, anon;
grant execute on function public.is_my_player(uuid) to authenticated;

create or replace function public.game_shared(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or (is_my_player(o) and exists (select 1 from games where owner = o and share_with_coach))
$$;

drop policy if exists "coach reads shared games" on public.games;
create policy "coach reads shared games" on public.games for select to authenticated
  using (share_with_coach and is_my_player(owner));

drop policy if exists "coach edits shared games" on public.games;
create policy "coach edits shared games" on public.games for update to authenticated
  using (share_with_coach and is_my_player(owner))
  with check (share_with_coach and is_my_player(owner));

drop policy if exists "coach adds rows to shared games" on public.games;
create policy "coach adds rows to shared games" on public.games for insert to authenticated
  with check (share_with_coach and is_my_player(owner) and game_shared(owner));

-- live_session_open: the coach's own player only (the admin keeps the older rule of the function).
do $$
declare src text;
begin
  select pg_get_functiondef('public.live_session_open(uuid)'::regprocedure) into src;
  if src like '%or exists (select 1 from games where owner = target and share_with_coach)%' then
    src := replace(src,
      'or exists (select 1 from games where owner = target and share_with_coach)',
      'or (is_admin() and exists (select 1 from games where owner = target and share_with_coach))');
    execute src;
  end if;
end $$;

-- Check after the run (each line should say true):
--   select count(*) = 3 from pg_policies where tablename = 'games' and policyname like 'coach%'
--     and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_my_player%';
--   select pg_get_functiondef('public.live_session_open(uuid)'::regprocedure) like '%is_admin() and exists%';
