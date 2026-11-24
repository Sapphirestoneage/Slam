-- SLAM the Game: add-ons. Run this once in the Supabase SQL Editor (same project as the game's sign-in).
-- An add-on is hidden from everyone until the admin switches it on for a person (game/admin.html).
-- Nothing in this file names an add-on. The rows that do are added by the coach, privately, never from this repo.

create table if not exists content_packs (
  pack text primary key,
  kind text not null default 'sealed',
  payload jsonb not null
);
create table if not exists player_entitlements (
  user_id uuid not null references auth.users on delete cascade,
  pack text not null references content_packs(pack) on delete cascade,
  granted_by uuid not null default auth.uid(),
  granted_at timestamptz not null default now(),
  confirmed_at timestamptz,            -- the person's own one-time yes, where an add-on asks for one
  primary key (user_id, pack)
);
alter table content_packs enable row level security;
alter table player_entitlements enable row level security;

-- who is a coach: the game's existing coaches table
create or replace function is_coach() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from coaches where user_id = auth.uid()) $$;

-- a player reads only their own rows; only a coach adds or removes one
-- (superseded by the admin section at the end of this file)

-- an add-on's row is visible only to someone who has it (and to the coach). Nobody can write it from the app.
drop policy if exists "read entitled packs" on content_packs;
create policy "read entitled packs" on content_packs for select to authenticated using (
  is_coach() or exists (select 1 from player_entitlements e where e.user_id = auth.uid() and e.pack = content_packs.pack)
);

-- the person's own one-time yes: they can stamp their own row once, and change nothing else
create or replace function confirm_pack(p text) returns void language sql security definer set search_path = public as
$$ update player_entitlements set confirmed_at = now() where user_id = auth.uid() and pack = p and confirmed_at is null $$;
revoke all on function confirm_pack(text) from public;
grant execute on function confirm_pack(text) to authenticated;

-- ---------- the admin ----------
-- One account runs the game: it decides who is a coach and who gets which add-on. Its email is a row in app_admins,
-- added privately (never from this repo). Nobody can read that table from the app.
create table if not exists app_admins (email text primary key);
alter table app_admins enable row level security;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from auth.users u join app_admins a on lower(a.email) = lower(u.email) where u.id = auth.uid() and u.email_confirmed_at is not null) $$;
create or replace function admin_overview() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then return jsonb_build_object('admin', false); end if;
  return jsonb_build_object('admin', true,
    'packs', (select coalesce(jsonb_agg(jsonb_build_object('pack', pack, 'title', payload->>'t', 'asks', payload ? 'gate') order by pack), '[]'::jsonb) from content_packs),
    'users', (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'email', u.email, 'joined', u.created_at, 'confirmed', u.email_confirmed_at is not null,
        'coach', exists (select 1 from coaches c where c.user_id = u.id),
        'packs', (select coalesce(jsonb_object_agg(e.pack, jsonb_build_object('yes', e.confirmed_at)), '{}'::jsonb) from player_entitlements e where e.user_id = u.id)) order by u.created_at), '[]'::jsonb) from auth.users u));
end $$;
create or replace function admin_set_coach(target uuid, make boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if make then insert into coaches (user_id) values (target) on conflict do nothing; else delete from coaches where user_id = target; end if;
end $$;
create or replace function admin_set_pack(target uuid, p text, make boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if make then insert into player_entitlements (user_id, pack, granted_by) values (target, p, auth.uid()) on conflict do nothing; else delete from player_entitlements where user_id = target and pack = p; end if;
end $$;
revoke all on function admin_overview() from public; revoke all on function admin_set_coach(uuid, boolean) from public; revoke all on function admin_set_pack(uuid, text, boolean) from public;
grant execute on function is_admin() to authenticated; grant execute on function admin_overview() to authenticated; grant execute on function admin_set_coach(uuid, boolean) to authenticated; grant execute on function admin_set_pack(uuid, text, boolean) to authenticated;
-- add-ons are the admin's to give, not a coach's
drop policy if exists "read own entitlements" on player_entitlements;
drop policy if exists "coach grants" on player_entitlements;
drop policy if exists "coach revokes" on player_entitlements;
drop policy if exists "admin grants" on player_entitlements;
drop policy if exists "admin revokes" on player_entitlements;
create policy "read own entitlements" on player_entitlements for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin grants" on player_entitlements for insert to authenticated with check (is_admin());
create policy "admin revokes" on player_entitlements for delete to authenticated using (is_admin());
drop policy if exists "read entitled packs" on content_packs;
create policy "read entitled packs" on content_packs for select to authenticated using (is_admin() or exists (select 1 from player_entitlements e where e.user_id = auth.uid() and e.pack = content_packs.pack));

-- ---------- the admin can open any account's game, and has account tools ----------
drop policy if exists "admin reads all games" on games;
drop policy if exists "admin edits all games" on games;
drop policy if exists "admin adds game rows" on games;
create policy "admin reads all games" on games for select to authenticated using (is_admin());
create policy "admin edits all games" on games for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin adds game rows" on games for insert to authenticated with check (is_admin());
-- admin_overview() also returns: me, and per account: seen (last sign-in), blocked.
-- admin_account(target, what): what is 'confirm', 'block', 'unblock' or 'delete'. Admin only, and never on the admin's own account.
create or replace function admin_account(target uuid, what text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if target = auth.uid() then raise exception 'not on your own account'; end if;
  if what = 'confirm' then update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = target;
  elsif what = 'block' then update auth.users set banned_until = 'infinity' where id = target;
  elsif what = 'unblock' then update auth.users set banned_until = null where id = target;
  elsif what = 'delete' then
    delete from games where owner = target; delete from player_entitlements where user_id = target; delete from coaches where user_id = target; delete from auth.users where id = target;
  else raise exception 'unknown action'; end if;
end $$;
revoke all on function admin_account(uuid, text) from public;
grant execute on function admin_account(uuid, text) to authenticated;

-- The card library of the card vault: the cards that the admin adds or changes on admin.html ("Add a card").
-- data is one card in the shape of game/data/cardtemplate.js. Everyone can read it (card offers are public).
-- Only the admin can add, change or remove a card. Run this block one time.
create table if not exists card_library (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table card_library enable row level security;
grant select on card_library to anon, authenticated;
grant insert, update, delete on card_library to authenticated;
drop policy if exists "everyone reads cards" on card_library;
create policy "everyone reads cards" on card_library for select to anon, authenticated using (true);
drop policy if exists "admin adds cards" on card_library;
create policy "admin adds cards" on card_library for insert to authenticated with check (is_admin());
drop policy if exists "admin changes cards" on card_library;
create policy "admin changes cards" on card_library for update to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "admin removes cards" on card_library;
create policy "admin removes cards" on card_library for delete to authenticated using (is_admin());

-- TABLE RIGHTS. Run this block one time on a new database. Without it each read and save of a signed-in
-- player is refused ("permission denied for table games"), the game says "couldn't reach your account", and
-- no game is saved. The row rules above (the policies) still decide who sees and changes which row. A new
-- Supabase project does not give these rights by itself. Found and run on the live database on 2026-11-24.
grant select, insert, update, delete on games to authenticated;
grant select on content_packs to authenticated;
grant select, insert, delete on player_entitlements to authenticated;
grant select on coaches to authenticated;
