-- SLAM the Game: "Delete my account" for the player (run Launch ready, Part 4, Trust).
-- NOT APPLIED. The owner runs this file one time in the Supabase SQL Editor (the same project as the game's
-- sign-in). It is safe to run two times.
-- Until it runs, the button "Delete my account" on game/privacy.html removes the saved game with the player's
-- own rights (the row rule "players own their games") and the copy on the device, and the sign-in stays.
-- After it runs, the same button calls this function, and the function removes all of it.
--
-- What the function does, for the account that calls it and for no other account (it has no argument):
--   1. removes the saved game (games), the add-on permissions (player_entitlements), the coach role (coaches),
--      the notes a coach kept about this person and the notes this person kept as a coach (coach_notes),
--      and the lines of failed saves (save_failures);
--   2. removes the reports this person sent with the button "Report", if that table exists
--      (20261125190000_reports.sql), the row of the finished setup with the share code, if that table exists
--      (20261125190000_founding_and_referrals.sql), and the rows of the web app, if its tables exist (docs/cloud-schema.sql:
--      accounts, space_members);
--      and the rows of Live Session Mode, if its tables exist (20261125210000_live_sessions.sql): the transcript
--      lines, the sessions, the tag "coaching client of this coach", the invite links;
--   3. keeps the lines of the audit log, with the email of this person removed from them, and adds one line
--      "account_self_delete" with no email;
--   4. removes the sign-in (auth.users). The database then removes the sessions of that sign-in by itself.
-- The admin account is refused: the game must never be left with no admin, and an admin email with no account
-- could be taken by a new sign-up.
-- A table that is added later and holds rows of a player needs one more delete line here, or a foreign key to
-- auth.users with "on delete cascade".

create or replace function public.delete_my_account() returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n_games int := 0;
begin
  if me is null then raise exception 'sign in first'; end if;
  if is_admin() then raise exception 'the admin account is not deleted from the app'; end if;
  delete from games where owner = me;
  get diagnostics n_games = row_count;
  delete from player_entitlements where user_id = me;
  delete from coaches where user_id = me;
  delete from coach_notes where coach = me or client = me;
  delete from save_failures where user_id = me;
  if to_regclass('public.reports') is not null then execute 'delete from public.reports where owner = $1' using me; end if;
  if to_regclass('public.account_setup') is not null then execute 'delete from public.account_setup where user_id = $1' using me; end if;
  if to_regclass('public.space_members') is not null then execute 'delete from public.space_members where member = $1' using me; end if;
  if to_regclass('public.accounts') is not null then execute 'delete from public.accounts where owner = $1' using me; end if;
  -- Live Session Mode (20261125210000_live_sessions.sql), if its tables exist: the transcript lines, the sessions,
  -- the tag "coaching client of this coach", and the invite links. A session has two members: it goes with either one.
  if to_regclass('public.live_lines') is not null then execute 'delete from public.live_lines where by = $1 or session in (select id from public.live_sessions where coach = $1 or client = $1)' using me; end if;
  if to_regclass('public.live_sessions') is not null then execute 'delete from public.live_sessions where coach = $1 or client = $1' using me; end if;
  if to_regclass('public.coach_clients') is not null then execute 'delete from public.coach_clients where coach = $1 or client = $1' using me; end if;
  if to_regclass('public.live_invites') is not null then execute 'delete from public.live_invites where coach = $1' using me; end if;
  update admin_audit set actor_email = null where actor = me;
  update admin_audit set target_email = null where target = me;
  insert into admin_audit (actor, role, action) values (me, 'player', 'account_self_delete');
  delete from auth.users where id = me;
  return jsonb_build_object('games', n_games, 'account', true);
end $$;
-- REQUIRED rights: a function is open to everyone until it is closed. Signed-in accounts only.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
