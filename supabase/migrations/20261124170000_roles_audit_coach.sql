-- SLAM the Game: roles, the audit log, the coach page, the admin page.
-- APPLIED to the live database on 2026-11-25 (by the owner, in the Supabase SQL Editor) and checked after.
-- For a new database: run this file one time in the Supabase SQL Editor (the same project as the game's sign-in).
-- It is safe to run two times. Until it runs, the game works as before: the coach page and the admin page
-- say which part waits for this file.
-- Checked against the live database on 2026-11-24 (read only): each admin_* function already checks is_admin()
-- before it does anything. is_admin() and is_coach() could be called with no sign-in. The default of
-- games.share_with_coach was false. The tables gave TRUNCATE, TRIGGER and REFERENCES to the API roles.

-- ---------- 1. coach mode is on by default ----------
alter table public.games alter column share_with_coach set default true;

-- ---------- 2. rights ----------
-- is_admin() and is_coach() are for signed-in accounts only.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_coach() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_coach() to authenticated;
-- The API never needs these three rights. TRUNCATE does not follow the row rules.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- One call for the "switch hat" control.
create or replace function public.my_roles() returns jsonb language sql stable security definer set search_path = public as
$$ select jsonb_build_object('admin', is_admin(), 'coach', is_coach()) $$;
revoke all on function public.my_roles() from public, anon;
grant execute on function public.my_roles() to authenticated;

-- ---------- 3. the audit log ----------
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_email text,
  role text,
  action text not null,
  target uuid,
  target_email text,
  note text
);
alter table public.admin_audit enable row level security;
-- No policy and no rights: nobody reads or writes this table from the app. Only the functions below do.
revoke all on public.admin_audit from public, anon, authenticated;

-- The inside writer. Only other functions of this file call it.
create or replace function public.audit_row(act text, tgt uuid, nt text) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into admin_audit (actor, actor_email, role, action, target, target_email, note)
  values (auth.uid(), (select email from auth.users where id = auth.uid()),
          case when is_admin() then 'admin' when is_coach() then 'coach' else 'player' end,
          left(act, 60), tgt, (select email from auth.users where id = tgt), left(nt, 500));
end $$;
revoke all on function public.audit_row(text, uuid, text) from public, anon, authenticated;

-- The writer that the app calls: for a coach or the admin, and only for the actions in the list.
create or replace function public.audit_write(act text, tgt uuid default null, nt text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or is_coach()) then raise exception 'coach or admin only'; end if;
  if act not in ('open_game', 'view_roster', 'assign_quest', 'session_note', 'invite', 'export', 'reset_password') then raise exception 'unknown action'; end if;
  perform audit_row(act, tgt, nt);
end $$;
revoke all on function public.audit_write(text, uuid, text) from public, anon;
grant execute on function public.audit_write(text, uuid, text) to authenticated;

create or replace function public.admin_audit_list(n int default 200) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(a) order by a.at desc), '[]'::jsonb)
          from (select at, actor_email, role, action, target_email, note from admin_audit order by at desc limit least(greatest(n, 1), 1000)) a);
end $$;
revoke all on function public.admin_audit_list(int) from public, anon;
grant execute on function public.admin_audit_list(int) to authenticated;

-- The three admin actions, as before, and each one now writes a line in the log.
create or replace function public.admin_set_coach(target uuid, make boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if make then insert into coaches (user_id) values (target) on conflict do nothing; else delete from coaches where user_id = target; end if;
  perform audit_row(case when make then 'coach_on' else 'coach_off' end, target, null);
end $$;
create or replace function public.admin_set_pack(target uuid, p text, make boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if make then insert into player_entitlements (user_id, pack, granted_by) values (target, p, auth.uid()) on conflict do nothing; else delete from player_entitlements where user_id = target and pack = p; end if;
  perform audit_row(case when make then 'pack_on' else 'pack_off' end, target, p);
end $$;
create or replace function public.admin_account(target uuid, what text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if target = auth.uid() then raise exception 'not on your own account'; end if;
  if what not in ('confirm', 'block', 'unblock', 'delete') then raise exception 'unknown action'; end if;
  perform audit_row('account_' || what, target, null);
  if what = 'confirm' then update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = target;
  elsif what = 'block' then update auth.users set banned_until = 'infinity' where id = target;
  elsif what = 'unblock' then update auth.users set banned_until = null where id = target;
  else
    delete from games where owner = target; delete from player_entitlements where user_id = target; delete from coaches where user_id = target; delete from auth.users where id = target;
  end if;
end $$;
revoke all on function public.admin_set_coach(uuid, boolean) from public, anon;
revoke all on function public.admin_set_pack(uuid, text, boolean) from public, anon;
revoke all on function public.admin_account(uuid, text) from public, anon;
grant execute on function public.admin_set_coach(uuid, boolean) to authenticated;
grant execute on function public.admin_set_pack(uuid, text, boolean) to authenticated;
grant execute on function public.admin_account(uuid, text) to authenticated;

-- ---------- 4. a coach inside a shared game ----------
-- A coach could read and change the rows of a shared game, but could not add a row. A game that grows by one
-- piece needs a new row. This lets a coach add it, for a game that is shared, and nothing else.
create or replace function public.game_shared(o uuid) returns boolean language sql stable security definer set search_path = public as
$$ select (is_coach() or is_admin()) and exists (select 1 from games where owner = o and share_with_coach) $$;
revoke all on function public.game_shared(uuid) from public, anon;
grant execute on function public.game_shared(uuid) to authenticated;
drop policy if exists "coach adds rows to shared games" on public.games;
create policy "coach adds rows to shared games" on public.games for insert to authenticated
  with check (is_coach() and share_with_coach and game_shared(owner));

-- ---------- 5. the coach's own notes ----------
-- Session notes, the numbers a coach saw last time, invites and assigned quests. They are the coach's, not the
-- client's: a client cannot read them. The admin can.
create table if not exists public.coach_notes (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  coach uuid not null default auth.uid(),
  client uuid,
  kind text not null default 'note' check (kind in ('note', 'seen', 'invite', 'quest')),
  body text not null default ''
);
alter table public.coach_notes enable row level security;
revoke all on public.coach_notes from public, anon, authenticated;
grant select, insert, delete on public.coach_notes to authenticated;
drop policy if exists "coach reads own notes" on public.coach_notes;
drop policy if exists "coach writes own notes" on public.coach_notes;
drop policy if exists "coach removes own notes" on public.coach_notes;
create policy "coach reads own notes" on public.coach_notes for select to authenticated using ((coach = auth.uid() and is_coach()) or is_admin());
create policy "coach writes own notes" on public.coach_notes for insert to authenticated with check (coach = auth.uid() and (is_coach() or is_admin()));
create policy "coach removes own notes" on public.coach_notes for delete to authenticated using (coach = auth.uid() and (is_coach() or is_admin()));

-- ---------- 6. failed saves ----------
-- When a save to the account is refused, the game writes one line here, so the admin sees it.
create table if not exists public.save_failures (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  msg text not null default ''
);
alter table public.save_failures enable row level security;
revoke all on public.save_failures from public, anon, authenticated;
grant select, insert on public.save_failures to authenticated;
drop policy if exists "a player reports a failed save" on public.save_failures;
drop policy if exists "admin reads failed saves" on public.save_failures;
create policy "a player reports a failed save" on public.save_failures for insert to authenticated with check (user_id = auth.uid());
create policy "admin reads failed saves" on public.save_failures for select to authenticated using (is_admin());

-- ---------- 7. the health view and the backup ----------
create or replace function public.admin_health() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'confirmed', (select count(*) from auth.users where email_confirmed_at is not null),
    'signups7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signups30', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'with_game', (select count(distinct owner) from games),
    'no_game', (select count(*) from auth.users u where not exists (select 1 from games g where g.owner = u.id)),
    'last_save', (select max(updated_at) from games),
    'fails7', (select count(*) from save_failures where at > now() - interval '7 days'),
    'fails', (select coalesce(jsonb_agg(jsonb_build_object('at', f.at, 'email', (select email from auth.users where id = f.user_id), 'msg', f.msg) order by f.at desc), '[]'::jsonb)
              from (select * from save_failures order by at desc limit 20) f));
end $$;
revoke all on function public.admin_health() from public, anon;
grant execute on function public.admin_health() to authenticated;

-- Everything, as one JSON document, for "Download everything". It writes a line in the log.
create or replace function public.admin_backup() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  perform audit_row('backup', null, null);
  return jsonb_build_object(
    'made', now(),
    'accounts', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'joined', created_at, 'seen', last_sign_in_at, 'confirmed', email_confirmed_at is not null, 'blocked', banned_until is not null and banned_until > now()) order by created_at), '[]'::jsonb) from auth.users),
    'coaches', (select coalesce(jsonb_agg(user_id), '[]'::jsonb) from coaches),
    'entitlements', (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from player_entitlements e),
    'games', (select coalesce(jsonb_agg(jsonb_build_object('owner', owner, 'name', name, 'data', data, 'updated_at', updated_at, 'share_with_coach', share_with_coach)), '[]'::jsonb) from games),
    'coach_notes', (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) from coach_notes n),
    'card_library', (select coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb) from card_library k),
    'audit', (select coalesce(jsonb_agg(to_jsonb(a) order by a.at), '[]'::jsonb) from admin_audit a));
end $$;
revoke all on function public.admin_backup() from public, anon;
grant execute on function public.admin_backup() to authenticated;
