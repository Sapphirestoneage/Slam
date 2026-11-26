-- SLAM the Game: guilds between accounts, and their monthly group money date (run Not built, groups 1 to 5, Part 10b).
-- NOT APPLIED. The owner runs this file one time in the Supabase SQL Editor (the same project as the game's
-- sign-in), when guilds should reach people on other accounts. It is safe to run two times.
-- Until it runs, a guild is the people of one game on one device (game/features/guild.js), and nothing goes to the
-- database.
--
-- Private by default: a guild is seen only by its members. A member shares only what they switched on (the era,
-- the steps this month, the day streak, the latest win, the next turn), as a small JSON the game writes; never a
-- money number. There is no public table, no feed and no search of people.
--
-- What it adds:
--   1. guilds: one row for each guild (a name, the day of the month of the money date, who made it).
--   2. guild_members: who is in a guild, their switches and what they share, and whether they offer to be asked
--      (a mentor who finished a track).
--   3. guild_invites: a one-time code a member gives to a person; join_guild(code) uses it.
--   4. The row rules: a person reads a guild and its members only while they are a member.

-- ---------- 1. guilds ----------
create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 40),
  date_day int check (date_day between 1 and 28),
  made_by uuid not null references auth.users (id) on delete cascade,
  made_at timestamptz not null default now()
);
alter table public.guilds enable row level security;

-- ---------- 2. members ----------
create table if not exists public.guild_members (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  shown jsonb not null default '{}'::jsonb check (pg_column_size(shown) < 4000),
  mentor boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);
alter table public.guild_members enable row level security;

-- ---------- 3. invites ----------
create table if not exists public.guild_invites (
  code text primary key,
  guild_id uuid not null references public.guilds (id) on delete cascade,
  made_by uuid not null references auth.users (id) on delete cascade,
  made_at timestamptz not null default now(),
  used_by uuid references auth.users (id) on delete set null
);
alter table public.guild_invites enable row level security;

-- Is this person a member of this guild? (security definer: the rules below call it without a loop of rules)
create or replace function public.is_guild_member(g uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from guild_members m where m.guild_id = g and m.user_id = auth.uid()) $$;
revoke all on function public.is_guild_member(uuid) from public, anon;
grant execute on function public.is_guild_member(uuid) to authenticated;

-- ---------- 4. the grants and the row rules ----------
revoke all on public.guilds from public, anon, authenticated;
revoke all on public.guild_members from public, anon, authenticated;
revoke all on public.guild_invites from public, anon, authenticated;
grant select, insert, update, delete on public.guilds to authenticated;
grant select, insert, update, delete on public.guild_members to authenticated;
grant select, insert on public.guild_invites to authenticated;

drop policy if exists "members read their guild" on public.guilds;
create policy "members read their guild" on public.guilds for select to authenticated using (public.is_guild_member(id));
drop policy if exists "a person makes a guild" on public.guilds;
create policy "a person makes a guild" on public.guilds for insert to authenticated with check (made_by = auth.uid());
drop policy if exists "members change their guild" on public.guilds;
create policy "members change their guild" on public.guilds for update to authenticated using (public.is_guild_member(id)) with check (public.is_guild_member(id));
drop policy if exists "the maker deletes a guild" on public.guilds;
create policy "the maker deletes a guild" on public.guilds for delete to authenticated using (made_by = auth.uid());

drop policy if exists "members read the members" on public.guild_members;
create policy "members read the members" on public.guild_members for select to authenticated using (public.is_guild_member(guild_id));
-- A person adds only themself: the maker right after making the guild; anyone else through join_guild().
drop policy if exists "the maker joins first" on public.guild_members;
create policy "the maker joins first" on public.guild_members for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from guilds g where g.id = guild_id and g.made_by = auth.uid()));
drop policy if exists "a member changes their own row" on public.guild_members;
create policy "a member changes their own row" on public.guild_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "a member leaves" on public.guild_members;
create policy "a member leaves" on public.guild_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "members read the invites" on public.guild_invites;
create policy "members read the invites" on public.guild_invites for select to authenticated using (public.is_guild_member(guild_id));
drop policy if exists "members make invites" on public.guild_invites;
create policy "members make invites" on public.guild_invites for insert to authenticated with check (made_by = auth.uid() and public.is_guild_member(guild_id));

-- Join with a code: one use per code. Returns the guild id.
create or replace function public.join_guild(code_in text) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  g uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  update guild_invites set used_by = me where code = code_in and used_by is null returning guild_id into g;
  if g is null then raise exception 'this code is used or unknown'; end if;
  insert into guild_members (guild_id, user_id) values (g, me) on conflict do nothing;
  return g;
end $$;
revoke all on function public.join_guild(text) from public, anon;
grant execute on function public.join_guild(text) to authenticated;
