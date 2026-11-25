-- SLAM the Game and the web app: reports (a bug, an idea, a confusing screen).
-- NOT APPLIED. The owner runs this file one time in the Supabase SQL Editor (the same project as the game's
-- sign-in). It is safe to run two times. It needs the file 20261124170000_roles_audit_coach.sql first (is_admin()).
-- Until it runs, the game and the web app work as before: a report stays on the device of the person who made it
-- ("Saved on this device") and sends itself when this table exists. The admin page says that its Reports inbox
-- waits for this file.
-- Tried on 2026-11-25 against a local PostgreSQL 16 with stand-ins for the auth schema and is_admin(): two runs,
-- then the rows rules as each role. Not run against the live database.
--
-- Who can do what:
--   a visitor who is not signed in (anon): add a report with no owner. Cannot read, change or remove any row.
--   a signed-in account: add a report as its own, and read its own rows. Cannot change or remove a row.
--   the admin (is_admin()): read all rows, and set status and fixed_at ("Mark Fixed"). Nobody removes rows
--   from the app.
-- A report holds no money number: the names of the screen and of the last 3 buttons, the device, the width, the
-- app version, the person's own note, and a small picture if the person chose one (stored in the row as text,
-- at most 200,000 letters, about 150 KB; no storage bucket).

-- ---------- 1. the table ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  made_at timestamptz not null default now(),   -- the clock of the device
  got_at timestamptz not null default now(),    -- the clock of the database
  owner uuid default auth.uid() references auth.users (id) on delete set null,
  type text not null check (type in ('bug', 'idea', 'confusing')),
  note text not null default '' check (char_length(note) <= 1000),
  app text not null default 'game' check (app in ('game', 'web')),
  screen text not null default '' check (char_length(screen) <= 120),
  taps jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(taps) = 'array' then jsonb_array_length(taps) <= 3 and char_length(taps::text) <= 200 else false end),
  width int check (width is null or (width >= 0 and width <= 20000)),
  device text not null default '' check (char_length(device) <= 60),
  browser text not null default '' check (char_length(browser) <= 60),
  version text not null default '' check (char_length(version) <= 40),
  shot text check (shot is null or (char_length(shot) <= 200000 and shot like 'data:image/%')),
  has_shot boolean generated always as (shot is not null) stored,
  status text not null default 'open' check (status in ('open', 'fixed')),
  fixed_at timestamptz
);
create index if not exists reports_owner_idx on public.reports (owner);
create index if not exists reports_made_idx on public.reports (made_at desc);

-- ---------- 2. rights ----------
-- A new table has no rights on this project. Each right below is given by name.
alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
-- Add: only the columns a report is made of. The owner, the status and the two database clocks are not in the
-- list, so the database sets them.
grant insert (id, made_at, type, note, app, screen, taps, width, device, browser, version, shot)
  on public.reports to anon, authenticated;
-- Read: signed-in accounts only (the rows rule below limits which rows).
grant select on public.reports to authenticated;
-- Change: the two columns of "Mark Fixed" only (the rows rule below limits it to the admin).
grant update (status, fixed_at) on public.reports to authenticated;

-- ---------- 3. the rows rules ----------
drop policy if exists "a visitor adds a report with no owner" on public.reports;
drop policy if exists "a person adds their own report" on public.reports;
drop policy if exists "a person reads their own reports, the admin reads all" on public.reports;
drop policy if exists "the admin marks a report fixed" on public.reports;
create policy "a visitor adds a report with no owner" on public.reports for insert to anon
  with check (owner is null and status = 'open' and fixed_at is null);
create policy "a person adds their own report" on public.reports for insert to authenticated
  with check (owner = auth.uid() and status = 'open' and fixed_at is null);
create policy "a person reads their own reports, the admin reads all" on public.reports for select to authenticated
  using (owner = auth.uid() or is_admin());
create policy "the admin marks a report fixed" on public.reports for update to authenticated
  using (is_admin()) with check (is_admin());

-- ---------- 4. a limit on how many ----------
-- A visitor needs no account to add a report, so the table needs a ceiling: 100 reports an hour from all visitors
-- together, and 30 an hour from one account. Over the ceiling, the report is refused and stays on the device.
create or replace function public.reports_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.got_at := now();
  if new.owner is null then
    if (select count(*) from reports where owner is null and got_at > now() - interval '1 hour') >= 100 then
      raise exception 'too many reports this hour';
    end if;
  elsif (select count(*) from reports where owner = new.owner and got_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many reports this hour';
  end if;
  return new;
end $$;
revoke all on function public.reports_guard() from public, anon, authenticated;
drop trigger if exists reports_guard on public.reports;
create trigger reports_guard before insert on public.reports for each row execute function public.reports_guard();
