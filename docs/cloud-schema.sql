-- Accounts and spaces for Stress Less About Money (Supabase). Paste all of this into SQL Editor and press Run, once.
-- One row per person (their list of spaces), one row per space (the packed plan), and who may open each space.
create table if not exists accounts (owner uuid primary key default auth.uid() references auth.users on delete cascade, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists spaces (id text primary key, packed text not null, updated_at timestamptz not null default now());
create table if not exists space_members (space_id text not null references spaces(id) on delete cascade, member uuid not null default auth.uid() references auth.users on delete cascade, primary key (space_id, member));
alter table accounts enable row level security; alter table spaces enable row level security; alter table space_members enable row level security;
-- Your account is yours alone.
drop policy if exists "own account" on accounts;
create policy "own account" on accounts for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
-- A space opens for its members (two, three, any number) and nobody else. Anyone signed in can start a new one; joining needs its long id.
drop policy if exists "member reads space" on spaces; drop policy if exists "member writes space" on spaces; drop policy if exists "signed in creates a space" on spaces;
create policy "member reads space" on spaces for select to authenticated using (exists (select 1 from space_members m where m.space_id = id and m.member = auth.uid()));
create policy "member writes space" on spaces for update to authenticated using (exists (select 1 from space_members m where m.space_id = id and m.member = auth.uid()));
create policy "signed in creates a space" on spaces for insert to authenticated with check (true);
drop policy if exists "see own memberships" on space_members; drop policy if exists "join as yourself" on space_members;
create policy "see own memberships" on space_members for select to authenticated using (member = auth.uid());
create policy "join as yourself" on space_members for insert to authenticated with check (member = auth.uid());
-- Newer projects expose a table through the Data API only when it is granted. Signed-in people only; nothing for visitors.
grant usage on schema public to authenticated;
grant select, insert, update on accounts, spaces to authenticated;
grant select, insert on space_members to authenticated;
