-- SLAM the Game: time to the first number (run CC-1, item 8).
-- NOT APPLIED. The owner runs this file one time in the Supabase SQL Editor (the same project as the game's
-- sign-in). It is safe to run two times. It needs the file 20261124170000_roles_audit_coach.sql first (is_admin()).
-- Until it runs, the game works as before: the record of a new player stays on the device and in the saved game
-- of an account, and sends itself when this table exists. The admin page then counts players with an account
-- only, and says that visitors with no account wait for this file.
-- Not run against any database. Written after the pattern of 20261125190000_reports.sql.
--
-- Who can do what:
--   a visitor who is not signed in (anon) and a signed-in account: add one row. Cannot read, change or remove
--   any row.
--   the admin (is_admin()): read all rows. Nobody changes or removes rows from the app.
-- A row holds nothing about the person: the seconds and the taps from the first screen to the first number, the
-- build version, and whether an account was signed in. No owner, no email, no device, no money number.

-- ---------- 1. the table ----------
create table if not exists public.first_numbers (
  id uuid primary key,
  got_at timestamptz not null default now(),    -- the clock of the database
  secs int not null check (secs >= 0 and secs <= 86400),
  taps int not null check (taps >= 1 and taps <= 500),
  version text not null default '' check (char_length(version) <= 40),
  signed boolean not null default false
);
create index if not exists first_numbers_got_idx on public.first_numbers (got_at desc);

-- ---------- 2. rights ----------
-- A new table has no rights on this project. Each right below is given by name.
alter table public.first_numbers enable row level security;
revoke all on public.first_numbers from public, anon, authenticated;
grant insert (id, secs, taps, version, signed) on public.first_numbers to anon, authenticated;
grant select on public.first_numbers to authenticated;

-- ---------- 3. the rows rules ----------
drop policy if exists "anyone adds a first number" on public.first_numbers;
drop policy if exists "the admin reads the first numbers" on public.first_numbers;
create policy "anyone adds a first number" on public.first_numbers for insert to anon, authenticated
  with check (true);
create policy "the admin reads the first numbers" on public.first_numbers for select to authenticated
  using (is_admin());

-- ---------- 4. a limit on how many ----------
-- A visitor needs no account to add a row, so the table needs a ceiling: 300 rows an hour from all together.
-- Over the ceiling, the row is refused and stays on the device.
create or replace function public.first_numbers_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.got_at := now();
  if (select count(*) from first_numbers where got_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many rows this hour';
  end if;
  return new;
end $$;
revoke all on function public.first_numbers_guard() from public, anon, authenticated;
drop trigger if exists first_numbers_guard on public.first_numbers;
create trigger first_numbers_guard before insert on public.first_numbers for each row execute function public.first_numbers_guard();
