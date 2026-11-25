-- SLAM the Game: Founding Testers (the first 50 accounts that finish setup) and the personal share links.
-- NOT APPLIED. The owner runs this file one time in the Supabase SQL Editor (the same project as the game's
-- sign-in). It needs the file 20261124170000_roles_audit_coach.sql first (it uses is_admin()).
-- It is safe to run two times. Until it runs, the game works as before: it shows no Founding Tester mark and
-- no card, it keeps the code a person arrived with on the device, and the admin page says that this part
-- waits for this file.
--
-- What it adds:
--   1. The table account_setup: one row for each account that finished setup.
--   2. setup_finished(ref): the game calls it one time when setup is finished. It gives the next founding
--      number (1 to 50) while one is free, and returns the person's own row.
--   3. admin_founding(): for the admin only. The live count, and who joined through whom.
--
-- The share code of an account is the first 8 letters of the SHA-256 of its user id, in hex. It is not the
-- user id and not the email, and nobody can get either one back from it. The game works out the same 8
-- letters on the device (game/features/founding.js, fdCode), thus a share link works before this file runs.

-- ---------- 1. the table ----------
create table if not exists public.account_setup (
  user_id uuid primary key references auth.users (id) on delete cascade,
  finished_at timestamptz not null default now(),
  founding_no int unique check (founding_no between 1 and 50),
  share_code text not null unique,
  arrived_with text
);
alter table public.account_setup enable row level security;
-- The API can read, and nothing else. Only setup_finished() below writes a row.
revoke all on public.account_setup from public, anon, authenticated;
grant select on public.account_setup to authenticated;
drop policy if exists "a person reads their own setup row" on public.account_setup;
create policy "a person reads their own setup row" on public.account_setup for select to authenticated
  using (user_id = auth.uid());

-- ---------- 2. the share code ----------
-- The same rule as fdCode() in the game. n is the number of letters (8, or more when two accounts collide).
create or replace function public.share_code_of(u uuid, n int default 8) returns text language sql immutable set search_path = public as
$$ select substr(encode(sha256(convert_to(u::text, 'UTF8')), 'hex'), 1, least(greatest(n, 8), 32)) $$;
revoke all on function public.share_code_of(uuid, int) from public, anon, authenticated;

-- ---------- 3. the game says "setup is finished" ----------
-- One call for each account. A second call changes nothing and returns the same row.
-- No race: the lock makes two calls at the same moment wait for each other, thus two people cannot both get
-- the number 50. The check and the unique rule of the column are a second guard.
-- The admin account gets a row and a share code, and no founding number.
create or replace function public.setup_finished(ref text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r public.account_setup;
  code text;
  len int := 8;
  num int;
  came text;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into r from account_setup where user_id = me;
  if not found then
    perform pg_advisory_xact_lock(hashtext('slam_account_setup'));
    select * into r from account_setup where user_id = me;
  end if;
  if not found then
    -- the code the person arrived with: from the call, or from the sign-up form
    came := lower(nullif(trim(coalesce(ref, (select raw_user_meta_data ->> 'ref' from auth.users where id = me), '')), ''));
    if came is not null and came !~ '^[a-z0-9]{4,32}$' then came := null; end if;
    -- the person's own code: 8 letters, or one more while a different account has the same letters
    loop
      code := share_code_of(me, len);
      exit when not exists (select 1 from account_setup where share_code = code) or len >= 32;
      len := len + 1;
    end loop;
    if came = code then came := null; end if; -- a person's own link does not count
    -- the smallest free number from 1 to 50, or nothing when all 50 are taken
    if is_admin() then
      num := null;
    else
      select min(n) into num from generate_series(1, 50) n
        where not exists (select 1 from account_setup a where a.founding_no = n);
    end if;
    insert into account_setup (user_id, founding_no, share_code, arrived_with) values (me, num, code, came)
      returning * into r;
  end if;
  return jsonb_build_object('at', r.finished_at, 'no', r.founding_no, 'code', r.share_code, 'ref', r.arrived_with, 'limit', 50);
end $$;
revoke all on function public.setup_finished(text) from public, anon;
grant execute on function public.setup_finished(text) to authenticated;

-- ---------- 4. the admin page ----------
-- The live count, the Founding Testers, and who joined through whom (the newest first). Emails are for the
-- admin only: the function stops for anyone else.
create or replace function public.admin_founding() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'limit', 50,
    'count', (select count(*) from account_setup where founding_no is not null),
    'finished', (select count(*) from account_setup),
    'founders', (select coalesce(jsonb_agg(jsonb_build_object('no', a.founding_no, 'at', a.finished_at,
                   'email', (select email from auth.users where id = a.user_id)) order by a.founding_no), '[]'::jsonb)
                 from account_setup a where a.founding_no is not null),
    'joined', (select coalesce(jsonb_agg(jsonb_build_object('at', a.finished_at, 'code', a.arrived_with,
                 'email', (select email from auth.users where id = a.user_id),
                 'through', (select u.email from account_setup b join auth.users u on u.id = b.user_id
                             where b.share_code = a.arrived_with and b.user_id <> a.user_id limit 1)) order by a.finished_at desc), '[]'::jsonb)
               from account_setup a where a.arrived_with is not null));
end $$;
revoke all on function public.admin_founding() from public, anon;
grant execute on function public.admin_founding() to authenticated;
