-- SLAM the Game: add-ons. Run this once in the Supabase SQL Editor (same project as the game's sign-in).
-- An add-on is hidden from everyone until the coach switches it on for a person.
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
drop policy if exists "read own entitlements" on player_entitlements;
drop policy if exists "coach grants" on player_entitlements;
drop policy if exists "coach revokes" on player_entitlements;
create policy "read own entitlements" on player_entitlements for select to authenticated using (user_id = auth.uid() or is_coach());
create policy "coach grants" on player_entitlements for insert to authenticated with check (is_coach());
create policy "coach revokes" on player_entitlements for delete to authenticated using (is_coach());

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
