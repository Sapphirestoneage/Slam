-- SLAM the Game: the registry tables for the admin app (modules, flow steps, features, fields, links).
-- NOT APPLIED. Eli's Claude chat applies it. Paste the whole file in the Supabase SQL Editor (the same project
-- as the game's sign-in) and press Run. It is safe to run two times.
-- It needs is_admin() (supabase/migrations/20261124170000_roles_audit_coach.sql, applied). The same check is
-- used by every admin_* function and by game/account/roles.js (my_roles).
--
-- WHAT IT DOES: five new tables in public, each with the prefix reg_. No game file reads them. No existing
-- table, function or row rule changes. The admin reads and writes every row; nobody else sees anything.
-- The rows come from supabase/admin/002_seed.sql (made by scripts/registry-to-sql.mjs from
-- game/registry/modules.json and game/registry/fields.json).
--
-- THE ADMIN COLUMNS (on every table): sort_order, enabled, placement_tab, placement_area, admin_note, updated_at.
-- The seed fills sort_order and placement only on the first insert. A second seed run updates the content
-- columns and never changes enabled, sort_order, placement_tab, placement_area or admin_note, so what the admin
-- set in the admin app stays.

-- ---------- 1. the tables ----------
create table if not exists public.reg_modules (
  id             text primary key,
  name           text not null,
  purpose        text,
  status         text not null check (status in ('working', 'partial', 'broken', 'unfinished', 'dead', 'unsure')),
  evidence       jsonb not null default '[]'::jsonb,
  who            jsonb not null default '[]'::jsonb,
  addon_gate     text,
  screen_ids     jsonb not null default '[]'::jsonb,
  entry_points   jsonb not null default '[]'::jsonb,
  files          jsonb not null default '[]'::jsonb,
  field_count    int not null default 0,
  sort_order     int,
  enabled        boolean not null default true,
  placement_tab  text,
  placement_area text,
  admin_note     text,
  updated_at     timestamptz not null default now()
);

create table if not exists public.reg_flow_steps (
  id             text primary key,                -- module_id:step
  module_id      text not null references public.reg_modules (id) on delete cascade,
  step           int not null,
  screen_id      text,
  does           text,
  field_ids      jsonb not null default '[]'::jsonb,
  sort_order     int,
  enabled        boolean not null default true,
  placement_tab  text,
  placement_area text,
  admin_note     text,
  updated_at     timestamptz not null default now()
);

create table if not exists public.reg_features (
  id             text primary key,                -- module_id:feature number
  module_id      text not null references public.reg_modules (id) on delete cascade,
  name           text not null,
  status         text not null check (status in ('working', 'partial', 'broken', 'unfinished', 'dead', 'unsure')),
  field_ids      jsonb not null default '[]'::jsonb,
  sort_order     int,
  enabled        boolean not null default true,
  placement_tab  text,
  placement_area text,
  admin_note     text,
  updated_at     timestamptz not null default now()
);

create table if not exists public.reg_fields (
  id               text primary key,              -- the id in fields.json
  module_id        text references public.reg_modules (id) on delete set null,
  label            text,
  what             text,                          -- tap_single, range_chips, computed ... (fields.json meta.what_values)
  io               text,                          -- asks or shows
  status           text,                          -- live, hidden, coming_soon, dead (the field's own status)
  confidence       text,                          -- low when found by a scan
  why              text,
  help             text,
  where_subtab     text,
  facts            jsonb not null default '[]'::jsonb,
  who              jsonb not null default '[]'::jsonb,
  options          jsonb,
  "when"           jsonb,
  how              jsonb,
  source           jsonb,                         -- { "file": ..., "lines": ..., "raw": ... }
  missing_behavior jsonb,
  depends_on       jsonb not null default '[]'::jsonb,
  feeds_into       jsonb not null default '[]'::jsonb,
  note             text,
  sort_order       int,
  enabled          boolean not null default true,
  placement_tab    text,
  placement_area   text,
  admin_note       text,
  updated_at       timestamptz not null default now()
);

create table if not exists public.reg_links (
  from_type      text not null check (from_type in ('module', 'field', 'screen')),
  from_id        text not null,
  to_type        text not null check (to_type in ('module', 'field', 'screen')),
  to_id          text not null,
  kind           text not null check (kind in ('depends_on', 'feeds_into')),
  sort_order     int,
  enabled        boolean not null default true,
  placement_tab  text,
  placement_area text,
  admin_note     text,
  updated_at     timestamptz not null default now(),
  primary key (from_type, from_id, to_type, to_id, kind)
);

create index if not exists reg_flow_steps_module on public.reg_flow_steps (module_id, step);
create index if not exists reg_features_module on public.reg_features (module_id);
create index if not exists reg_fields_module on public.reg_fields (module_id);
create index if not exists reg_links_to on public.reg_links (to_type, to_id);

-- ---------- 2. updated_at follows each change ----------
create or replace function public.reg_touch() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.reg_touch() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['reg_modules', 'reg_flow_steps', 'reg_features', 'reg_fields', 'reg_links'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.reg_touch()', t || '_touch', t);
  end loop;
end $$;

-- ---------- 3. the grants and the row rules: the admin only ----------
do $$
declare t text;
begin
  foreach t in array array['reg_modules', 'reg_flow_steps', 'reg_features', 'reg_fields', 'reg_links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', 'admin reads ' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (is_admin())', 'admin reads ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'admin writes ' || t, t);
    execute format('create policy %I on public.%I for all to authenticated using (is_admin()) with check (is_admin())', 'admin writes ' || t, t);
  end loop;
end $$;

-- ---------- 4. check (read only) ----------
--   select tablename, count(*) from pg_policies where tablename like 'reg\_%' group by 1;   -- 5 rows, 2 each
--   select count(*) from reg_modules;                                                    -- after 002_seed.sql
